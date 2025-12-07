/**
 * Semantic search service using vector embeddings
 * Searches both characters and locations based on query similarity
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { generateWithLLM } from './llmService.js';

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
 * Enhance query using LLM for better semantic matching
 * Short queries (1-2 words) are expanded using LLM to create more descriptive queries
 */
async function enhanceQueryWithLLM(query) {
  const trimmedQuery = query.trim();
  const words = trimmedQuery.split(/\s+/).filter(w => w.length > 0);
  
  // Only use LLM for short queries (1-2 words) that might need expansion
  if (words.length <= 2 && trimmedQuery.length > 0) {
    try {
      const expandedQuery = await generateWithLLM('query_expansion', { query: trimmedQuery });
      console.log(`Query expanded from "${query}" to "${expandedQuery}"`);
      return expandedQuery.trim();
    } catch (error) {
      throw error;
    }
  }
  
  return query;
}

/**
 * Generate embedding for search query
 */
async function generateQueryEmbedding(query) {
  try {
    // Enhance the query using LLM for better semantic matching (for short queries)
    const enhancedQuery = await enhanceQueryWithLLM(query);
    
    const response = await embeddingClient.models.embedContent({
      model: 'text-embedding-004',
      contents: enhancedQuery,
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
 * Perform semantic search across characters and locations using unified table
 * Returns top 6 results only
 */
export async function semanticSearch(query, limit = 6) {
  const client = await pool.connect();
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    // Semantic search using vector embeddings
    // Using cosine distance (<=>) - lower is better (0 = identical, 1 = orthogonal)
    const result = await client.query(`
      SELECT 
        id,
        entity_type,
        name,
        status,
        species,
        type,
        gender,
        image,
        location_name,
        location_type,
        dimension,
        embedding <=> $1::vector AS distance
      FROM entities
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [embeddingString, limit]);
    
    console.log(`Found ${result.rows.length} semantic results for query: "${query}"`);
    
    // Format results based on entity type
    const results = result.rows.map(row => {
      const distance = parseFloat(row.distance);
      
      if (row.entity_type === 'character') {
        return {
          id: row.id,
          name: row.name,
          status: row.status,
          species: row.species,
          type: row.type,
          gender: row.gender,
          image: row.image,
          location: row.location_name,
          distance: distance,
          type: 'character',
        };
      } else {
        return {
          id: row.id,
          name: row.name,
          locationType: row.location_type,
          dimension: row.dimension,
          distance: distance,
          type: 'location',
        };
      }
    });
    
    return {
      query,
      results,
      total: results.length,
    };
  } catch (error) {
    console.error('Error performing semantic search:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    client.release();
  }
}

