# Rick and Morty Backend API

Backend service for generating location descriptions using LLM models.

## Features

- **Location Description Generation**: Generates creative descriptions about locations in the Rick and Morty universe
- **GraphQL Integration**: Fetches location and resident data from the Rick and Morty GraphQL API
- **Grok/Groq Integration**: Uses Groq's API directly for fast LLM inference with models like Llama 3.3 70B
- **Frontend Caching**: Frontend handles caching via localStorage to avoid redundant API calls

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
# Option 1: Use the setup script
./setup-env.sh

# Option 2: Create manually
# Copy the template from setup-env.sh or create .env with the variables below
```

3. Edit `.env` and add your Groq API key:
```
PORT=3001
RICK_AND_MORTY_GRAPHQL_URL=https://rickandmortyapi.com/graphql

# Groq API Key (get from https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key_here
```

**Model Configuration:**
- Model is configured in `config/llm-config.json`
- Default model: `llama-3.3-70b-versatile`
- Other available Groq models: `llama-3-70b-8192`, `mixtral-8x7b-32768`, `gemma-7b-it`

4. Run the server:
```bash
npm run dev
```

## API Endpoints

### POST `/api/location/:id/description`

Generates or retrieves a description for a location.

**Response:**
```json
{
  "description": "Generated description text...",
  "cached": false
}
```

## How It Works

1. When a request is made for a location description:
   - Fetches location data (name, type, dimension) and up to 20 residents from the GraphQL API
   - For each resident, collects: name, status, species, type, gender, origin.name, location.name
   - Sends this data to Groq's API (Grok) to generate a creative description
   - Returns the description
2. Frontend handles caching via localStorage to avoid redundant API calls

