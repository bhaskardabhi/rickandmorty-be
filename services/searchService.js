/**
 * Semantic search service using vector embeddings
 * Searches both characters and locations based on query similarity
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rickandmorty',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Initialize Google Gemini AI for embeddings
const embeddingClient = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || '',
});

/**
 * Generate embedding for search query
 */
async function generateQueryEmbedding(query) {
  try {
    const response = await embeddingClient.models.embedContent({
      model: 'text-embedding-004',
      contents: query,
    });
    
    let embedding;
    if (response.embeddings && response.embeddings.length > 0) {
      const emb = response.embeddings[0];
      if (emb.values && Array.isArray(emb.values)) {
        embedding = emb.values;
      } else if (Array.isArray(emb)) {
        embedding = emb;
      } else {
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
    
    // Truncate to 768 dimensions if longer
    if (embedding.length > 768) {
      return embedding.slice(0, 768);
    }
    
    return embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    throw error;
  }
}

/**
 * Search characters by semantic similarity
 */
async function searchCharacters(queryEmbedding, limit = 10) {
  const client = await pool.connect();
  
  try {
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    const result = await client.query(`
      SELECT 
        id,
        name,
        status,
        species,
        type,
        gender,
        image,
        location_name,
        embedding <=> $1::vector AS distance
      FROM characters
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [embeddingString, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      species: row.species,
      type: row.type,
      gender: row.gender,
      image: row.image,
      location: row.location_name,
      distance: parseFloat(row.distance),
      type: 'character',
    }));
  } finally {
    client.release();
  }
}

/**
 * Search locations by semantic similarity
 */
async function searchLocations(queryEmbedding, limit = 10) {
  const client = await pool.connect();
  
  try {
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    const result = await client.query(`
      SELECT 
        id,
        name,
        type,
        dimension,
        embedding <=> $1::vector AS distance
      FROM locations
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [embeddingString, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      locationType: row.type,
      dimension: row.dimension,
      distance: parseFloat(row.distance),
      type: 'location',
    }));
  } finally {
    client.release();
  }
}

/**
 * Perform semantic search across characters and locations
 */
export async function semanticSearch(query, limit = 20) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Search both characters and locations
    const characterLimit = Math.ceil(limit / 2);
    const locationLimit = Math.ceil(limit / 2);
    
    const [characters, locations] = await Promise.all([
      searchCharacters(queryEmbedding, characterLimit),
      searchLocations(queryEmbedding, locationLimit),
    ]);
    
    // Combine and sort by distance (lower is better)
    const results = [...characters, ...locations].sort((a, b) => a.distance - b.distance);
    
    return {
      query,
      results: results.slice(0, limit),
      total: results.length,
    };
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw error;
  }
}

