import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateLocationDescription } from './services/descriptionService.js';
import { generateCharacterDescription } from './services/characterDescriptionService.js';
import { generateCharacterInsights } from './services/characterInsightsService.js';
import { generateCharacterCompatibility } from './services/characterCompatibilityService.js';
import { evaluateLocationDescription } from './services/locationEvaluationService.js';
import { evaluateCharacterDescription } from './services/characterEvaluationService.js';
import { semanticSearch } from './services/searchService.js';

console.log('Loading environment variables...');
dotenv.config();
console.log('Environment loaded');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate location description endpoint
app.post('/api/location/:id/description', async (req, res) => {
  try {
    const locationId = req.params.id;

    const result = await generateLocationDescription(locationId);

    res.json({ 
      description: result.description
    });
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ 
      error: 'Failed to generate description',
      message: error.message 
    });
  }
});

// Evaluate location description endpoint
app.post('/api/location/:id/evaluate', async (req, res) => {
  try {
    const locationId = req.params.id;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'description is required'
      });
    }

    // Generate description to get locationData and promptData
    const result = await generateLocationDescription(locationId);
    
    // Evaluate the provided description using LLM
    const evaluation = await evaluateLocationDescription(
      description,
      result.locationData,
      result.promptData
    );

    res.json({ 
      evaluation,
      cached: false 
    });
  } catch (error) {
    console.error('Error evaluating description:', error);
    res.status(500).json({ 
      error: 'Failed to evaluate description',
      message: error.message 
    });
  }
});

// Generate character description endpoint
app.post('/api/character/:id/description', async (req, res) => {
  try {
    const characterId = req.params.id;

    // Generate description using vision + LLM (no database caching - frontend handles caching)
    const result = await generateCharacterDescription(characterId);

    res.json({ 
      description: result.description
    });
  } catch (error) {
    console.error('Error generating character description:', error);
    res.status(500).json({ 
      error: 'Failed to generate character description',
      message: error.message 
    });
  }
});

// Evaluate character description endpoint
app.post('/api/character/:id/evaluate', async (req, res) => {
  try {
    const characterId = req.params.id;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'description is required'
      });
    }

    // Generate description to get characterData, locationData, and promptData
    const result = await generateCharacterDescription(characterId, false);
    
    // Evaluate the provided description using LLM
    const evaluation = await evaluateCharacterDescription(
      description,
      result.characterData,
      result.locationData,
      result.promptData
    );

    res.json({ 
      evaluation
    });
  } catch (error) {
    console.error('Error evaluating character description:', error);
    res.status(500).json({ 
      error: 'Failed to evaluate description',
      message: error.message 
    });
  }
});

// Generate character insights endpoint
app.post('/api/character/:id/insights', async (req, res) => {
  try {
    const characterId = req.params.id;

    // Generate 5 insight suggestions using vision + LLM
    const insights = await generateCharacterInsights(characterId);

    res.json({ 
      insights,
      cached: false 
    });
  } catch (error) {
    console.error('Error generating character insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate character insights',
      message: error.message 
    });
  }
});

// Generate character compatibility/conflict analysis endpoint
app.post('/api/compatibility', async (req, res) => {
  try {
    const { character1Id, character2Id, locationId } = req.body;

    if (!character1Id || !character2Id || !locationId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'character1Id, character2Id, and locationId are required'
      });
    }

    // Generate compatibility analysis using vision + LLM
    const analysis = await generateCharacterCompatibility(character1Id, character2Id, locationId);

    res.json({ 
      analysis,
      cached: false 
    });
  } catch (error) {
    console.error('Error generating compatibility analysis:', error);
    res.status(500).json({ 
      error: 'Failed to generate compatibility analysis',
      message: error.message 
    });
  }
});

// Semantic search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query, limit } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'query is required and must be a non-empty string'
      });
    }

    const searchLimit = limit && Number.isInteger(limit) && limit > 0 ? limit : 6;
    const results = await semanticSearch(query.trim(), searchLimit);

    res.json({ 
      ...results 
    });
  } catch (error) {
    console.error('Error performing semantic search:', error);
    res.status(500).json({ 
      error: 'Failed to perform search',
      message: error.message 
    });
  }
});

// Start server
console.log(`Starting server on port ${PORT}...`);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

