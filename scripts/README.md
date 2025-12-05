# Data Sync Scripts

Scripts to sync Rick and Morty data from the GraphQL API to PostgreSQL with vector embeddings.

## Prerequisites

1. **PostgreSQL with pgvector extension**
   ```bash
   # Install PostgreSQL
   # Install pgvector extension
   # On macOS with Homebrew:
   brew install postgresql
   brew install pgvector
   
   # Or use Docker:
   docker run -d \
     --name rickandmorty-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=rickandmorty \
     -p 5432:5432 \
     pgvector/pgvector:pg16
   ```

2. **Environment Variables**
   
   Add to your `.env` file:
   ```bash
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=rickandmorty
   DB_USER=postgres
   DB_PASSWORD=postgres
   
   # Google API Key (for embeddings using Gemini)
   GOOGLE_API_KEY=your_google_api_key_here
   # Groq API Key (optional, for LLM operations)
   GROQ_API_KEY=your_groq_api_key_here
   ```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup database schema:**
   ```bash
   npm run setup-db
   ```
   
   This will:
   - Enable pgvector extension
   - Create `characters` and `locations` tables
   - Create vector indexes for similarity search
   - Create regular indexes for common queries

3. **Sync data:**
   ```bash
   npm run sync-data
   ```
   
   This will:
   - Fetch all characters from the Rick and Morty API (with pagination)
   - Fetch all locations from the Rick and Morty API (with pagination)
   - Analyze character images to generate appearance descriptions (using vision AI)
   - Generate embeddings for each character and location
   - Store everything in PostgreSQL

## Database Schema

### Characters Table
- `id` (INTEGER, PRIMARY KEY)
- `name`, `status`, `species`, `type`, `gender`, `image`
- `origin_id`, `origin_name`, `origin_type`, `origin_dimension`
- `location_id`, `location_name`, `location_type`, `location_dimension`
- `episode_ids`, `episode_names`, `episode_codes`, `episode_air_dates` (arrays)
- `appearance` (TEXT) - visual appearance description generated from character image using vision AI
- `embedding` (vector(1536)) - for semantic search (Gemini embeddings are truncated from 3072 to 1536 dimensions)
- `created_at`, `updated_at`

### Locations Table
- `id` (INTEGER, PRIMARY KEY)
- `name`, `type`, `dimension`
- `resident_ids`, `resident_names` (arrays)
- `embedding` (vector(1536)) - for semantic search
- `created_at`, `updated_at`

## Usage Examples

### Query similar characters
```sql
SELECT name, species, status
FROM characters
ORDER BY embedding <=> (
  SELECT embedding FROM characters WHERE name = 'Rick Sanchez'
)::vector
LIMIT 10;
```

### Query similar locations
```sql
SELECT name, type, dimension
FROM locations
ORDER BY embedding <=> (
  SELECT embedding FROM locations WHERE name = 'Earth (C-137)'
)::vector
LIMIT 10;
```

### Search by text (using embedding)
```sql
-- First generate embedding for search text, then:
SELECT name, species
FROM characters
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

## Notes

- The script includes rate limiting delays to avoid API limits
- Embeddings are generated using OpenAI's `text-embedding-3-small` model (1536 dimensions)
- The script uses `ON CONFLICT` to update existing records
- Vector indexes use IVFFlat for fast approximate similarity search

