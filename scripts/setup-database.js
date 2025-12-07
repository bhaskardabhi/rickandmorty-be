/**
 * Database setup script
 * Creates unified PostgreSQL table for characters and locations with vector support
 */

import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rickandmorty',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up database...');
    
    // Enable pgvector extension
    console.log('Enabling pgvector extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    
    // Create unified entities table for both characters and locations
    // Only includes fields used by /api/search endpoint
    console.log('Creating unified entities table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('character', 'location')),
        name TEXT NOT NULL,
        -- Character-specific fields (NULL for locations)
        status TEXT,
        species TEXT,
        type TEXT,
        gender TEXT,
        image TEXT,
        location_name TEXT,
        -- Location-specific fields (NULL for characters)
        location_type TEXT,
        dimension TEXT,
        -- Embedding for semantic search
        embedding vector(768),
        PRIMARY KEY (id, entity_type)
      );
    `);
    
    // Create indexes for vector similarity search
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS entities_embedding_idx 
      ON entities USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
      WHERE embedding IS NOT NULL;
    `);
    
    // Create indexes for common queries
    await client.query('CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);');
    
    console.log('✅ Database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase().catch(console.error);

