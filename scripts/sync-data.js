/**
 * Sync script to fetch all characters and locations from Rick and Morty API
 * and store them in PostgreSQL with vector embeddings
 */

import { GraphQLClient } from 'graphql-request';
import pkg from 'pg';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { analyzeCharacterImage } from '../services/visionService.js';

const { Pool } = pkg;
dotenv.config();

// Initialize clients
const graphqlClient = new GraphQLClient(
  process.env.RICK_AND_MORTY_GRAPHQL_URL
);

// Initialize Google Gemini AI for embeddings
const embeddingClient = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rickandmorty',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// GraphQL queries
const GET_ALL_CHARACTERS_QUERY = `
  query GetAllCharacters($page: Int!) {
    characters(page: $page) {
      info {
        count
        pages
        next
        prev
      }
      results {
        id
        name
        status
        species
        type
        gender
        image
        origin {
          id
          name
          type
          dimension
        }
        location {
          id
          name
          type
          dimension
        }
        episode {
          id
          name
          episode
          air_date
        }
      }
    }
  }
`;

const GET_ALL_LOCATIONS_QUERY = `
  query GetAllLocations($page: Int!) {
    locations(page: $page) {
      info {
        count
        pages
        next
        prev
      }
      results {
        id
        name
        type
        dimension
        residents {
          id
          name
        }
      }
    }
  }
`;

/**
 * Generate embedding for text using Google Gemini
 * Note: Gemini embeddings are 3072 dimensions, but we truncate to 1536 for storage
 */
async function generateEmbedding(text) {
  try {
    const response = await embeddingClient.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    
    // Extract embedding from response
    // Response format: { embeddings: [{ values: [number, ...] }] }
    let embedding;
    if (response.embeddings && response.embeddings.length > 0) {
      const emb = response.embeddings[0];
      // The embedding object should have a 'values' property containing the array
      if (emb.values && Array.isArray(emb.values)) {
        embedding = emb.values;
      } else if (Array.isArray(emb)) {
        embedding = emb;
      } else {
        // Fallback: try to find array in the embedding object
        const values = Object.values(emb).find(v => Array.isArray(v));
        if (values) {
          embedding = values;
        } else {
          throw new Error('Could not extract embedding values from response');
        }
      }
    } else {
      throw new Error('No embeddings found in response');
    }
    
    // Truncate to 768 dimensions if longer (to match database schema)
    if (embedding.length > 768) {
      return embedding.slice(0, 768);
    }
    
    return embedding;
  } catch (error) {
    throw error;
  }
}

/**
 * Create text representation of character for embedding
 * Returns descriptive, natural language text optimized for RAG
 * @param {Object} character - Character data
 * @param {string} appearance - Visual appearance description (optional)
 */
function createCharacterText(character, appearance = null) {
  const sections = [];
  
  // Character identity
  sections.push(`${character.name} is a ${character.species}${character.type ? ` of type ${character.type}` : ''} who is ${character.status.toLowerCase()}.`);
  
  // Gender and basic info
  if (character.gender && character.gender !== 'unknown') {
    sections.push(`They are ${character.gender.toLowerCase()}.`);
  }
  
  // Origin information
  if (character.origin?.name) {
    const originDesc = character.origin.dimension 
      ? `originally from ${character.origin.name} in the ${character.origin.dimension} dimension`
      : `originally from ${character.origin.name}`;
    sections.push(`This character is ${originDesc}.`);
  }
  
  // Current location
  if (character.location?.name) {
    const locationDesc = character.location.dimension
      ? `currently located at ${character.location.name} in the ${character.location.dimension} dimension`
      : `currently located at ${character.location.name}`;
    sections.push(`They are ${locationDesc}.`);
  }
  
  // Episode appearances with context
  if (character.episode && character.episode.length > 0) {
    const episodeCount = character.episode.length;
    const episodeList = character.episode.slice(0, 5).map(ep => ep.name).join(', ');
    const moreEpisodes = episodeCount > 5 ? ` and ${episodeCount - 5} more` : '';
    sections.push(`This character appears in ${episodeCount} episode${episodeCount > 1 ? 's' : ''} including: ${episodeList}${moreEpisodes}.`);
  }
  
  // Visual appearance - most important for RAG as it provides rich semantic information
  if (appearance) {
    sections.push(`Physical appearance: ${appearance}`);
  }
  
  // Additional context for better semantic understanding
  const contextParts = [];
  if (character.status === 'Alive') {
    contextParts.push('living');
  } else if (character.status === 'Dead') {
    contextParts.push('deceased');
  }
  
  if (character.species === 'Human') {
    contextParts.push('human character');
  } else if (character.species === 'Alien') {
    contextParts.push('alien being');
  } else if (character.species) {
    contextParts.push(`${character.species.toLowerCase()} species`);
  }
  
  if (contextParts.length > 0) {
    sections.push(`This is a ${contextParts.join(', ')} in the Rick and Morty universe.`);
  }
  
  return sections.join(' ');
}

/**
 * Create text representation of location for embedding
 * Returns descriptive, natural language text optimized for RAG
 * @param {Object} location - Location data
 */
function createLocationText(location) {
  const sections = [];
  
  // Location identity and type
  if (location.type) {
    sections.push(`${location.name} is a ${location.type.toLowerCase()} in the Rick and Morty universe.`);
  } else {
    sections.push(`${location.name} is a location in the Rick and Morty universe.`);
  }
  
  // Dimension information
  if (location.dimension) {
    sections.push(`This location exists in the ${location.dimension} dimension.`);
  } else {
    sections.push(`This location's dimension is unknown.`);
  }
  
  // Resident information with context
  if (location.residents && location.residents.length > 0) {
    const residentCount = location.residents.length;
    const residentList = location.residents.slice(0, 5).map(r => r.name).join(', ');
    const moreResidents = residentCount > 5 ? ` and ${residentCount - 5} more` : '';
    
    if (residentCount === 1) {
      sections.push(`The resident of this location is ${residentList}.`);
    } else if (residentCount <= 5) {
      sections.push(`This location is home to ${residentCount} residents: ${residentList}.`);
    } else {
      sections.push(`This location is home to ${residentCount} residents including: ${residentList}${moreResidents}.`);
    }
  } else {
    sections.push(`This location has no known residents.`);
  }
  
  // Additional context based on location type
  if (location.type) {
    sections.push(`This is a ${location.type.toLowerCase()} location in the Rick and Morty universe.`);
  }
  
  return sections.join(' ');
}

/**
 * Fetch all characters with pagination
 */
async function fetchAllCharacters() {
  const allCharacters = [];
  let page = 1;
  let hasNextPage = true;
  
  console.log('Fetching all characters...');
  
  while (hasNextPage) {
    try {
      const data = await graphqlClient.request(GET_ALL_CHARACTERS_QUERY, { page });
      const characters = data.characters?.results || [];
      allCharacters.push(...characters);
      
      console.log(`  Fetched page ${page}: ${characters.length} characters (Total: ${allCharacters.length})`);
      
      hasNextPage = data.characters?.info?.next !== null;
      page++;
    } catch (error) {
      console.error(`Error fetching characters page ${page}:`, error);
      hasNextPage = false;
    }
  }
  
  console.log(`✅ Fetched ${allCharacters.length} characters total\n`);
  return allCharacters;
}

/**
 * Fetch all locations with pagination
 */
async function fetchAllLocations() {
  const allLocations = [];
  let page = 1;
  let hasNextPage = true;
  
  console.log('Fetching all locations...');
  
  while (hasNextPage) {
    try {
      const data = await graphqlClient.request(GET_ALL_LOCATIONS_QUERY, { page });
      const locations = data.locations?.results || [];
      allLocations.push(...locations);
      
      console.log(`  Fetched page ${page}: ${locations.length} locations (Total: ${allLocations.length})`);
      
      hasNextPage = data.locations?.info?.next !== null;
      page++;
    } catch (error) {
      console.error(`Error fetching locations page ${page}:`, error);
      hasNextPage = false;
    }
  }
  
  console.log(`✅ Fetched ${allLocations.length} locations total\n`);
  return allLocations;
}

/**
 * Process character: analyze image and generate embedding
 * Returns data ready for database insertion
 */
async function processCharacter(character) {
  // Analyze character image to get appearance description
  let appearance = null;
  if (character.image) {
    try {
      appearance = await analyzeCharacterImage(character.image, character.name);
    } catch (error) {
      console.error(`Error analyzing image for character ${character.id} (${character.name}):`, error.message);
      // Continue without appearance if image analysis fails
    }
  }
  
  // Create character text including appearance for embedding
  const characterText = createCharacterText(character, appearance);
  const embedding = await generateEmbedding(characterText);
  
  return {
    id: parseInt(character.id),
    name: character.name,
    status: character.status,
    species: character.species,
    type: character.type || null,
    gender: character.gender,
    image: character.image,
    location_name: character.location?.name || null,
    embedding,
  };
}

/**
 * Store processed character in database
 */
async function storeCharacter(client, processedCharacter) {
  const embeddingValue = processedCharacter.embedding 
    ? `'[${processedCharacter.embedding.join(',')}]'::vector` 
    : 'NULL';
  
  const query = `
    INSERT INTO entities (
      id, entity_type, name, status, species, type, gender, image, location_name, embedding
    ) VALUES ($1, 'character', $2, $3, $4, $5, $6, $7, $8, ${embeddingValue})
    ON CONFLICT (id, entity_type) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      species = EXCLUDED.species,
      type = EXCLUDED.type,
      gender = EXCLUDED.gender,
      image = EXCLUDED.image,
      location_name = EXCLUDED.location_name,
      embedding = EXCLUDED.embedding
  `;
  
  await client.query(query, [
    processedCharacter.id,
    processedCharacter.name,
    processedCharacter.status,
    processedCharacter.species,
    processedCharacter.type,
    processedCharacter.gender,
    processedCharacter.image,
    processedCharacter.location_name,
  ]);
}

/**
 * Process location: generate embedding
 * Returns data ready for database insertion
 */
async function processLocation(location) {
  const locationText = createLocationText(location);
  const embedding = await generateEmbedding(locationText);
  
  return {
    id: parseInt(location.id),
    name: location.name,
    type: location.type || null,
    dimension: location.dimension || null,
    embedding,
  };
}

/**
 * Store processed location in database
 */
async function storeLocation(client, processedLocation) {
  const embeddingValue = processedLocation.embedding 
    ? `'[${processedLocation.embedding.join(',')}]'::vector` 
    : 'NULL';
  
  const query = `
    INSERT INTO entities (
      id, entity_type, name, location_type, dimension, embedding
    ) VALUES ($1, 'location', $2, $3, $4, ${embeddingValue})
    ON CONFLICT (id, entity_type) DO UPDATE SET
      name = EXCLUDED.name,
      location_type = EXCLUDED.location_type,
      dimension = EXCLUDED.dimension,
      embedding = EXCLUDED.embedding
  `;
  
  await client.query(query, [
    processedLocation.id,
    processedLocation.name,
    processedLocation.type,
    processedLocation.dimension,
  ]);
}

/**
 * Process items in parallel with concurrency limit
 */
async function processInBatches(items, processFn, batchSize = 10) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(item => processFn(item).catch(error => {
        console.error(`Error processing item:`, error.message);
        return null;
      }))
    );
    results.push(...batchResults.filter(r => r !== null));
  }
  return results;
}

/**
 * Main sync function
 */
async function syncData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting data sync...\n');
    
    // Fetch all data
    const characters = await fetchAllCharacters();
    const locations = await fetchAllLocations();
    
    // Process and store characters sequentially to avoid rate limits
    console.log(`\n📝 Processing ${characters.length} characters...`);
    console.log('  Processing sequentially to avoid rate limits (this may take a while due to image analysis)...');
    
    let stored = 0;
    for (const character of characters) {
      try {
        // Process character (image analysis + embedding) sequentially
        const processedCharacter = await processCharacter(character);
        
        // Store in database
        await storeCharacter(client, processedCharacter);
        
        stored++;
        if (stored % 10 === 0 || stored === characters.length) {
          console.log(`  Processed and stored ${stored}/${characters.length} characters...`);
        }
      } catch (error) {
        console.error(`Error processing character ${character.id} (${character.name}):`, error.message);
      }
    }
    console.log(`✅ Stored ${stored} characters\n`);
    
    // Process and store locations in parallel batches
    console.log(`📝 Processing ${locations.length} locations...`);
    
    // Process locations in batches (higher concurrency since no image analysis)
    const processedLocations = await processInBatches(
      locations,
      processLocation,
      15 // Higher batch size for locations
    );
    
    console.log(`  Processed ${processedLocations.length} locations, storing in database...`);
    
    // Store locations in batches
    stored = 0;
    const storeBatchSize = 20;
    for (let i = 0; i < processedLocations.length; i += storeBatchSize) {
      const batch = processedLocations.slice(i, i + storeBatchSize);
      await Promise.all(
        batch.map(pl => storeLocation(client, pl).catch(error => {
          console.error(`Error storing location ${pl.id} (${pl.name}):`, error.message);
        }))
      );
      stored += batch.length;
      if (stored % 50 === 0 || stored === processedLocations.length) {
        console.log(`  Stored ${stored}/${processedLocations.length} locations...`);
      }
    }
    console.log(`✅ Stored ${stored} locations\n`);
    
    console.log('🎉 Data sync complete!');
    
    // Print summary
    const charCount = await client.query("SELECT COUNT(*) FROM entities WHERE entity_type = 'character'");
    const locCount = await client.query("SELECT COUNT(*) FROM entities WHERE entity_type = 'location'");
    const charWithEmbedding = await client.query("SELECT COUNT(*) FROM entities WHERE entity_type = 'character' AND embedding IS NOT NULL");
    const locWithEmbedding = await client.query("SELECT COUNT(*) FROM entities WHERE entity_type = 'location' AND embedding IS NOT NULL");
    
    console.log('\n📊 Database Summary:');
    console.log(`  Characters: ${charCount.rows[0].count} (${charWithEmbedding.rows[0].count} with embeddings)`);
    console.log(`  Locations: ${locCount.rows[0].count} (${locWithEmbedding.rows[0].count} with embeddings)`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run sync
syncData().catch(console.error);

