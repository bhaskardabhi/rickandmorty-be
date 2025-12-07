# Rick and Morty Backend API

Backend service for generating character and location descriptions, evaluations, and semantic search using LLM models and vector embeddings.

## Demo

Watch the demo video: [YouTube Demo](https://www.youtube.com/watch?v=8hYPYQutoio)

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

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher) with **pgvector** extension
- **API Keys**:
  - Groq API key (for LLM operations)
  - Google API key (for embeddings and vision analysis)

### Installing PostgreSQL with pgvector

**macOS (Homebrew):**
```bash
brew install postgresql
brew install pgvector
```

**Docker (Recommended):**
```bash
docker run -d \
  --name rickandmorty-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rickandmorty \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create a `.env` file:**
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

3. **Setup database (required for semantic search):**
```bash
# Create database schema and enable pgvector extension
npm run setup-db

# Sync all characters and locations from GraphQL API with embeddings
npm run sync-data
```

4. **Run the server:**
```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

### Verifying Setup

- Health check: `GET http://localhost:3001/health`
- Should return: `{ "status": "ok" }`

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

## Architecture & Design Decisions

This section documents the key architectural decisions made in building this backend service.

### REST API vs GraphQL

**Decision: REST endpoints for our API, GraphQL for external data fetching**

**Rationale:**
- **GraphQL for external API**: We use GraphQL to fetch data from the Rick and Morty API because:
  - **Efficiency**: The external API provides GraphQL, allowing us to fetch exactly the fields we need in a single request
  - **Nested relationships**: GraphQL excels at fetching related data (character → episodes, location → residents) in one query
  - **Reduced over-fetching**: We can request only the specific fields needed for each service (e.g., character description vs. character insights)
  - **API design**: The external API is already GraphQL, so we leverage its existing schema

### Database Architecture

**Decision: Unified `entities` table for characters and locations**

**Rationale:**
- **Semantic search**: Our primary use case is semantic search across both characters and locations. A unified table allows:
  - Single query to search both entity types
  - Consistent embedding storage and similarity search
  - Simplified query logic in `searchService.js`
  - Efficient distance-based filtering: We can pull only entities that are close to the match distance threshold, regardless of entity type, in a single query
  
- **Schema design**: The table uses:
  - `entity_type` field to distinguish between 'character' and 'location'
  - Character-specific fields (status, species, gender, image) are NULL for locations
  - Location-specific fields (location_type, dimension) are NULL for characters
  - Composite primary key `(id, entity_type)` to handle cases where character ID 1 and location ID 1 both exist
  
- **Vector embeddings**: 
  - Single `embedding vector(768)` column for both entity types
  - Uses pgvector extension with IVFFlat index for fast cosine similarity search
  - Embeddings generated from Google Gemini's `text-embedding-004` model (truncated to 768 dimensions)
  - **Dimension limitation**: PostgreSQL's pgvector extension supports a maximum of 768 dimensions, which is why we truncate embeddings to 768. Alternative databases like SingleStore, Pinecone, or Weaviate support higher dimensions (e.g., 1536, 3072) and could enable the use of higher-dimensional embedding models for potentially better semantic understanding
  - **PostgreSQL choice**: We chose PostgreSQL because it can be easily set up locally (via Homebrew, Docker, or standard installation) and is free/open-source, making it accessible for development and deployment without additional costs

### LLM Configuration System

**Decision: JSON-based configuration for LLM settings**

**Rationale:**
- **Centralized configuration**: All LLM model settings, temperatures, and prompt references in `config/llm-config.json`
- **Environment agnostic**: Same configuration works across dev/staging/prod without code changes
- **Easy model switching**: Change models (OpenAI, Groq, Anthropic) by updating JSON, not code
- **Template-based**: Each use case (location description, character insights, etc.) has its own configuration template
- **Separation of concerns**: Prompt templates live in `prompts/` directory, referenced by name in config

### Service Layer Architecture

**Decision: Modular service functions for each feature**

**Rationale:**
- **Single Responsibility**: Each service (`characterDescriptionService.js`, `locationEvaluationService.js`, etc.) handles one feature
- **Reusability**: Services can be imported and used across different endpoints
- **Testability**: Services can be unit tested independently
- **Maintainability**: Changes to one feature don't affect others
- **Consistent patterns**: All services follow similar patterns (fetch data → process → generate with LLM → return)

### Vector Embeddings & Semantic Search

**Decision: Google Gemini embeddings with query expansion**

**Rationale:**
- **Embedding model**: Google Gemini's `text-embedding-004` provides high-quality embeddings
  - 768 dimensions (truncated from original) balances quality and storage/performance
  - Good semantic understanding for character and location descriptions
  - **Database constraint**: We chose `text-embedding-004` and truncated to 768 dimensions because PostgreSQL's pgvector extension has a maximum dimension limit of 768. While other databases like SingleStore, Pinecone, or Weaviate support higher dimensions (1536, 3072+) and could enable the use of higher-dimensional embedding models for potentially better semantic understanding, we prioritized PostgreSQL for its robustness, familiarity, easy local setup, and being free/open-source. The unified table design benefits also made PostgreSQL an ideal choice for this project
  
- **Query expansion**: Short queries (1-2 words) are expanded using LLM before embedding
  - Improves search quality for vague queries like "scientist" or "dangerous place"
  - Uses dedicated `queryExpansion` prompt template
  - Only applied to short queries to avoid unnecessary LLM calls

- **Similarity search**: Uses cosine distance (`<=>`) for semantic similarity
  - IVFFlat index for approximate nearest neighbor search (fast, good enough accuracy)
  - Returns top 6 results by default (configurable via `limit` parameter)

### Vision AI Integration

**Decision: Google Gemini Vision for character appearance analysis**

**Rationale:**
- **Visual analysis**: Character descriptions benefit from analyzing actual character images
- **Gemini Vision**: Provides accurate visual understanding of character appearance, clothing, expressions
- **Integration**: Vision analysis is seamlessly integrated into character description and insights generation
- **Caching**: Visual appearance descriptions are generated once and reused across multiple operations

### Error Handling & Validation

**Decision: Explicit error handling with meaningful messages**

**Rationale:**
- **User-friendly errors**: All endpoints return structured error responses with clear messages
- **Input validation**: Required parameters are validated before processing
- **Graceful degradation**: Services handle missing optional data (e.g., character type, origin) gracefully
- **Logging**: Errors are logged with context for debugging while returning safe messages to clients

### Technology Stack Choices

- **Express.js**: Lightweight, flexible web framework for REST API
- **PostgreSQL + pgvector**: Robust relational database with vector search capabilities
- **GraphQL Request**: Simple GraphQL client for fetching external data
- **Google Gemini**: Unified API for embeddings and vision (reduces vendor dependencies)
- **Groq**: Fast LLM inference for generation tasks (via configurable model selection)
  - **Free API access**: We chose Groq primarily because it provides free API access, making it cost-effective for development and deployment without API usage costs. Groq also offers fast inference speeds with models like Llama 3.3, making it ideal for real-time generation tasks

## Model Selection & Rationale

This section documents all AI models used in the project and the reasoning behind each selection.

### LLM Models (via Groq API)

#### 1. **Creative Generation Models**

**`llama-3.3-70b-versatile`** - Used for:
- Location description generation
- Character description generation
- Character insights generation

**Rationale**:
- **Quality**: 70B parameter model provides high-quality, creative outputs
- **Context**: 131K token context window handles complex character/location data
- **Output length**: 32K max completion tokens supports longer creative descriptions
- **Performance**: 280 tokens/second provides good balance of speed and quality
- **Cost**: $0.59/$0.79 per 1M tokens (input/output) - reasonable for creative tasks requiring quality

#### 2. **Reasoning Models**

**`openai/gpt-oss-20b`** - Used for:
- Location description evaluation
- Character description evaluation

**Rationale**:
- **Reasoning capability**: Optimized for step-by-step analysis and logical deduction ([Groq Reasoning Docs](https://console.groq.com/docs/reasoning))
- **Speed**: 1000 tokens/second - fastest reasoning model, ideal for evaluation tasks
- **Cost**: $0.075/$0.30 per 1M tokens - significantly cheaper than larger models
- **Task fit**: Evaluation requires fact-checking and structured analysis, not creative generation
- **Output length**: 65K max completion tokens - more than sufficient for 500-token evaluations

**`openai/gpt-oss-120b`** - Used for:
- Character compatibility analysis

**Rationale**:
- **Complex reasoning**: Enhanced reasoning capabilities for intricate analyses ([Groq Reasoning Docs](https://console.groq.com/docs/reasoning))
- **Task complexity**: Compatibility analysis requires understanding relationships, predicting interactions, and structured thinking
- **Context**: 131K token context window handles multiple characters, locations, and episode data
- **Output length**: 65K max completion tokens supports detailed 1000-token analyses
- **Performance**: 500 tokens/second provides good speed for complex reasoning tasks
- **Cost**: $0.15/$0.60 per 1M tokens - reasonable for complex reasoning tasks

#### 3. **Lightweight Models**

**`llama-3.1-8b-instant`** - Used for:
- Query expansion

**Rationale**:
- **Speed**: 560 tokens/second - fast enough for real-time search autosuggest
- **Cost**: $0.05/$0.08 per 1M tokens - extremely cost-effective for simple tasks
- **Task simplicity**: Query expansion is a straightforward task that doesn't require large models
- **Output length**: 131K max completion tokens - far exceeds the 100-token requirement
- **Efficiency**: Using a 70B model for 100-token outputs would be wasteful

### Vision Models (via Groq API)

**`meta-llama/llama-4-scout-17b-16e-instruct`** - Used for:
- Character image analysis (visual appearance extraction)

**Rationale**:
- **Vision capability**: Specialized vision model for image understanding and analysis
- **Speed**: 750 tokens/second - fast image analysis
- **Cost**: $0.11/$0.34 per 1M tokens - reasonable for vision tasks
- **File support**: 20 MB max file size - sufficient for character images
- **Output length**: 8K max completion tokens - more than enough for 300-token visual descriptions
- **Preview model**: Currently in preview, but provides good balance of speed and quality

### Embedding Models (via Google Gemini API)

**`text-embedding-004`** - Used for:
- Character embeddings (for semantic search)
- Location embeddings (for semantic search)
- Query embeddings (for semantic search)

**Rationale**:
- **Quality**: High-quality embeddings with good semantic understanding
- **Dimension**: Original embeddings are high-dimensional, truncated to 768 for PostgreSQL compatibility
- **Unified API**: Same provider (Google Gemini) used for embeddings and vision reduces vendor dependencies
- **Database constraint**: PostgreSQL's pgvector extension supports maximum 768 dimensions, so embeddings are truncated accordingly
- **Alternative consideration**: Other databases (SingleStore, Pinecone, Weaviate) support higher dimensions and could enable full-dimensional embeddings, but we prioritized PostgreSQL for local setup and cost

### Model Selection Summary

| Use Case | Model | Type | Speed (t/s) | Cost (per 1M tokens) | Reason |
|----------|-------|------|-------------|---------------------|--------|
| **Creative Generation** | `llama-3.3-70b-versatile` | LLM | 280 | $0.59/$0.79 | Quality for creative tasks |
| **Description Evaluation** | `openai/gpt-oss-20b` | Reasoning | 1000 | $0.075/$0.30 | Fast, cheap, good at analysis |
| **Compatibility Analysis** | `openai/gpt-oss-120b` | Reasoning | 500 | $0.15/$0.60 | Complex reasoning capability |
| **Query Expansion** | `llama-3.1-8b-instant` | LLM | 560 | $0.05/$0.08 | Fast, cheap for simple tasks |
| **Vision Analysis** | `llama-4-scout-17b-16e-instruct` | Vision | 750 | $0.11/$0.34 | Specialized vision model |
| **Embeddings** | `text-embedding-004` | Embedding | - | - | High quality, PostgreSQL compatible |

### Key Design Principles

1. **Right model for the task**: Reasoning models for analytical tasks, creative models for generation
2. **Cost optimization**: Use smaller, faster models for simple tasks (query expansion, evaluations)
3. **Quality where it matters**: Larger models for complex creative and reasoning tasks
4. **Free API access**: All models chosen from Groq's free API tier for cost-effectiveness
5. **Performance balance**: Consider speed vs. quality trade-offs for each use case

## LLM Configuration

This directory contains JSON configuration files for managing LLM settings, models, and prompts.

### Configuration File: `llm-config.json`

The configuration file is an array of configuration objects. Each object defines settings for a specific template/use case.

### Configuration Object Structure

```json
{
  "template_name": "location_description_generation",
  "model": "openai/gpt-4",
  "temperature": 0.8,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": null
}
```

### Fields

- **`template_name`** (required): Unique identifier for this configuration. Used to reference it in code.
- **`model`** (required): LLM model to use. Format: `provider/model` (e.g., `openai/gpt-4`, `groq/llama-3.3-70b-versatile`)
- **`temperature`** (optional): Temperature setting (0.0 to 2.0). Default: 0.8
- **`system_prompt`** (optional): Reference to system prompt template (e.g., `locationDescription.system`)
- **`user_prompt`** (optional): Reference to user prompt template (e.g., `locationDescription.user`)
- **`max_tokens`** (optional): Maximum tokens to generate. Set to `null` to use model default.

### Usage

#### In Code

```javascript
import {
  getModelForTemplate,
  getTemperatureForTemplate,
  getMaxTokensForTemplate,
  getSystemPromptTemplate,
  getUserPromptTemplate,
} from '../config/configLoader.js';

const templateName = 'location_description_generation';

const model = getModelForTemplate(templateName);
const temperature = getTemperatureForTemplate(templateName);
const maxTokens = getMaxTokensForTemplate(templateName);
```

#### Adding New Configurations

1. Add a new object to the `llm-config.json` array:

```json
{
  "template_name": "my_new_template",
  "model": "anthropic/claude-3-opus",
  "temperature": 0.7,
  "system_prompt": "myPrompt.system",
  "user_prompt": "myPrompt.user",
  "max_tokens": 1000
}
```

2. Use it in your service:

```javascript
const templateName = 'my_new_template';
const model = getModelForTemplate(templateName);
// ... rest of your code
```

### Examples

#### Example 1: OpenAI GPT-4
```json
{
  "template_name": "location_description_generation",
  "model": "openai/gpt-4",
  "temperature": 0.8,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": null
}
```

#### Example 2: Llama 3.3 via Groq
```json
{
  "template_name": "location_description_generation_llama",
  "model": "groq/llama-3.3-70b-versatile",
  "temperature": 0.6,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": 500
}
```

#### Example 3: Claude 3 Opus
```json
{
  "template_name": "location_description_generation_claude",
  "model": "anthropic/claude-3-opus-20240229",
  "temperature": 0.7,
  "system_prompt": "locationDescription.system",
  "user_prompt": "locationDescription.user",
  "max_tokens": 600
}
```

### Benefits

- ✅ **Centralized Configuration**: All LLM settings in one place
- ✅ **Easy Model Switching**: Change models without code changes
- ✅ **Multiple Configurations**: Different settings for different use cases
- ✅ **Version Control**: Track configuration changes in git
- ✅ **Environment Agnostic**: Same config works across dev/staging/prod

### Notes

- The `model` field supports Groq models (e.g., `llama-3.3-70b-versatile`)
- If a configuration is not found, the system falls back to environment variables
- `max_tokens: null` means the model will use its default maximum
- Prompt template references must match template names in the prompts directory

## Development Notes

**Git Workflow**: This project was developed as a small, solo project, and commits were made directly to the `master` branch for simplicity. While this approach worked well for a single-developer project, it's worth noting that in team environments or production settings, it's generally recommended to use feature branches, pull requests, and a more structured git workflow to facilitate code review, collaboration, and maintain a stable main branch.

