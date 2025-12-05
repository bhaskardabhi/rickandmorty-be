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
  process.env.RICK_AND_MORTY_GRAPHQL_URL || 'https://rickandmortyapi.com/graphql'
);

// Initialize Groq client (Groq uses OpenAI-compatible API)
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

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
    if (!process.env.GOOGLE_API_KEY) {
      console.warn('⚠️  GOOGLE_API_KEY is required for embeddings.');
      console.warn('   Set GOOGLE_API_KEY in your .env file to generate embeddings.');
    }
    console.error('Error generating embedding:', error.message);
    // Return null if embedding fails - data will still be stored without embedding
    return null;
  }
}

/**
 * Create text representation of character for embedding
 * @param {Object} character - Character data
 * @param {string} appearance - Visual appearance description (optional)
 */
function createCharacterText(character, appearance = null) {
  const parts = [
    `Character: ${character.name}`,
    `Status: ${character.status}`,
    `Species: ${character.species}`,
    character.type ? `Type: ${character.type}` : '',
    `Gender: ${character.gender}`,
    character.origin?.name ? `Origin: ${character.origin.name} (${character.origin.dimension || 'Unknown dimension'})` : '',
    character.location?.name ? `Location: ${character.location.name} (${character.location.dimension || 'Unknown dimension'})` : '',
    character.episode?.length > 0 ? `Appears in ${character.episode.length} episodes` : '',
    appearance ? `Visual Appearance: ${appearance}` : '',
  ].filter(Boolean);
  
  return parts.join('. ');
}

/**
 * Create text representation of location for embedding
 */
function createLocationText(location) {
  const parts = [
    `Location: ${location.name}`,
    location.type ? `Type: ${location.type}` : '',
    location.dimension ? `Dimension: ${location.dimension}` : '',
    location.residents?.length > 0 ? `Has ${location.residents.length} residents` : '',
  ].filter(Boolean);
  
  return parts.join('. ');
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
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
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
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching locations page ${page}:`, error);
      hasNextPage = false;
    }
  }
  
  console.log(`✅ Fetched ${allLocations.length} locations total\n`);
  return allLocations;
}

/**
 * Store character in database with embedding and appearance
 */
async function storeCharacter(client, character) {
  // Analyze character image to get appearance description FIRST
  // so we can include it in the embedding
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
  
  const episodeIds = character.episode?.map(ep => parseInt(ep.id)) || [];
  const episodeNames = character.episode?.map(ep => ep.name) || [];
  const episodeCodes = character.episode?.map(ep => ep.episode) || [];
  const episodeAirDates = character.episode?.map(ep => ep.air_date) || [];
  
  // Build query with embedding
  const embeddingValue = embedding 
    ? `'[${embedding.join(',')}]'::vector` 
    : 'NULL';
  
  const query = `
    INSERT INTO characters (
      id, name, status, species, type, gender, image,
      origin_id, origin_name, origin_type, origin_dimension,
      location_id, location_name, location_type, location_dimension,
      episode_ids, episode_names, episode_codes, episode_air_dates,
      appearance, embedding, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, ${embeddingValue}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      species = EXCLUDED.species,
      type = EXCLUDED.type,
      gender = EXCLUDED.gender,
      image = EXCLUDED.image,
      origin_id = EXCLUDED.origin_id,
      origin_name = EXCLUDED.origin_name,
      origin_type = EXCLUDED.origin_type,
      origin_dimension = EXCLUDED.origin_dimension,
      location_id = EXCLUDED.location_id,
      location_name = EXCLUDED.location_name,
      location_type = EXCLUDED.location_type,
      location_dimension = EXCLUDED.location_dimension,
      episode_ids = EXCLUDED.episode_ids,
      episode_names = EXCLUDED.episode_names,
      episode_codes = EXCLUDED.episode_codes,
      episode_air_dates = EXCLUDED.episode_air_dates,
      appearance = EXCLUDED.appearance,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()
  `;
  
  await client.query(query, [
    parseInt(character.id),
    character.name,
    character.status,
    character.species,
    character.type || null,
    character.gender,
    character.image,
    character.origin?.id ? parseInt(character.origin.id) : null,
    character.origin?.name || null,
    character.origin?.type || null,
    character.origin?.dimension || null,
    character.location?.id ? parseInt(character.location.id) : null,
    character.location?.name || null,
    character.location?.type || null,
    character.location?.dimension || null,
    episodeIds.length > 0 ? episodeIds : null,
    episodeNames.length > 0 ? episodeNames : null,
    episodeCodes.length > 0 ? episodeCodes : null,
    episodeAirDates.length > 0 ? episodeAirDates : null,
    appearance,
  ]);
}

/**
 * Store location in database with embedding
 */
async function storeLocation(client, location) {
  const locationText = createLocationText(location);
  const embedding = await generateEmbedding(locationText);
  
  const residentIds = location.residents?.map(r => parseInt(r.id)) || [];
  const residentNames = location.residents?.map(r => r.name) || [];
  
  // Build query with embedding
  const embeddingValue = embedding 
    ? `'[${embedding.join(',')}]'::vector` 
    : 'NULL';
  
  const query = `
    INSERT INTO locations (
      id, name, type, dimension,
      resident_ids, resident_names,
      embedding, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, ${embeddingValue}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      dimension = EXCLUDED.dimension,
      resident_ids = EXCLUDED.resident_ids,
      resident_names = EXCLUDED.resident_names,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()
  `;
  
  await client.query(query, [
    parseInt(location.id),
    location.name,
    location.type || null,
    location.dimension || null,
    residentIds.length > 0 ? residentIds : null,
    residentNames.length > 0 ? residentNames : null,
  ]);
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
    
    // Store characters
    console.log(`\n📝 Storing ${characters.length} characters in database...`);
    let stored = 0;
    for (const character of characters) {
      try {
        await storeCharacter(client, character);
        stored++;
        if (stored % 50 === 0) {
          console.log(`  Stored ${stored}/${characters.length} characters...`);
        }
        // Small delay to avoid rate limiting on embeddings and vision API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error storing character ${character.id} (${character.name}):`, error.message);
      }
    }
    console.log(`✅ Stored ${stored} characters\n`);
    
    // Store locations
    console.log(`📝 Storing ${locations.length} locations in database...`);
    stored = 0;
    for (const location of locations) {
      try {
        await storeLocation(client, location);
        stored++;
        if (stored % 20 === 0) {
          console.log(`  Stored ${stored}/${locations.length} locations...`);
        }
        // Small delay to avoid rate limiting on embeddings and vision API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error storing location ${location.id} (${location.name}):`, error.message);
      }
    }
    console.log(`✅ Stored ${stored} locations\n`);
    
    console.log('🎉 Data sync complete!');
    
    // Print summary
    const charCount = await client.query('SELECT COUNT(*) FROM characters');
    const locCount = await client.query('SELECT COUNT(*) FROM locations');
    const charWithEmbedding = await client.query('SELECT COUNT(*) FROM characters WHERE embedding IS NOT NULL');
    const locWithEmbedding = await client.query('SELECT COUNT(*) FROM locations WHERE embedding IS NOT NULL');
    
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

