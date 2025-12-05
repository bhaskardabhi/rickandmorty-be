/**
 * Database setup script
 * Creates PostgreSQL tables for characters and locations with vector support
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
    
    // Create characters table
    console.log('Creating characters table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT,
        species TEXT,
        type TEXT,
        gender TEXT,
        image TEXT,
        origin_id INTEGER,
        origin_name TEXT,
        origin_type TEXT,
        origin_dimension TEXT,
        location_id INTEGER,
        location_name TEXT,
        location_type TEXT,
        location_dimension TEXT,
        episode_ids INTEGER[],
        episode_names TEXT[],
        episode_codes TEXT[],
        episode_air_dates TEXT[],
        appearance TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        embedding vector(768)
      );
    `);
    
    // Add appearance column if table exists but column doesn't
    console.log('Ensuring appearance column exists...');
    await client.query(`
      ALTER TABLE characters 
      ADD COLUMN IF NOT EXISTS appearance TEXT;
    `);
    
    // Create locations table
    console.log('Creating locations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT,
        dimension TEXT,
        resident_ids INTEGER[],
        resident_names TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        embedding vector(768)
      );
    `);
    
    // Create indexes for vector similarity search
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS characters_embedding_idx 
      ON characters USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS locations_embedding_idx 
      ON locations USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    `);
    
    // Create indexes for common queries
    await client.query('CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_characters_species ON characters(species);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_locations_dimension ON locations(dimension);');
    
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

