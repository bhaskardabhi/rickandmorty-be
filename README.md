# Rick and Morty Backend API

Backend service for generating character and location descriptions, evaluations, and semantic search using LLM models and vector embeddings.

## Features

- **Location Description Generation**: Generates creative descriptions about locations in the Rick and Morty universe
- **Character Description Generation**: Generates descriptions with visual appearance analysis using vision AI
- **Description Evaluation**: Evaluates description quality and accuracy (for both locations and characters)
- **Character Insights**: Generates AI-powered insights about characters
- **Character Compatibility Analysis**: Analyzes compatibility and conflicts between characters
- **Semantic Search**: Vector-based search across characters and locations using embeddings
- **Database Integration**: PostgreSQL with pgvector for storing and searching embeddings
- **GraphQL Integration**: Fetches data from the Rick and Morty GraphQL API
- **Groq Integration**: Uses Groq's API for fast LLM inference
- **Google Gemini**: Uses Gemini for embeddings and vision analysis

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
PORT=3001
RICK_AND_MORTY_GRAPHQL_URL=https://rickandmortyapi.com/graphql

# Groq API Key (for LLM operations)
GROQ_API_KEY=your_groq_api_key_here

# Google API Key (for embeddings and vision)
GOOGLE_API_KEY=your_google_api_key_here

# Database Configuration (for semantic search)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rickandmorty
DB_USER=postgres
DB_PASSWORD=postgres
```

3. Setup database (optional, for semantic search):
```bash
npm run setup-db
npm run sync-data
```

4. Run the server:
```bash
npm run dev
```

## API Endpoints

### Location Endpoints
- `POST /api/location/:id/description` - Generate location description
- `POST /api/location/:id/evaluate` - Evaluate location description

### Character Endpoints
- `POST /api/character/:id/description` - Generate character description
- `POST /api/character/:id/evaluate` - Evaluate character description
- `POST /api/character/:id/insights` - Generate character insights

### Compatibility
- `POST /api/compatibility` - Analyze character compatibility

### Search
- `POST /api/search` - Semantic search across characters and locations

## Database Scripts

- `npm run setup-db` - Setup PostgreSQL database with vector support
- `npm run sync-data` - Sync all characters and locations to database with embeddings

