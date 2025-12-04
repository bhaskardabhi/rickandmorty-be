import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateLocationDescription } from './services/descriptionService.js';
import { generateCharacterDescription } from './services/characterDescriptionService.js';
import { generateCharacterInsights } from './services/characterInsightsService.js';
import { generateCharacterCompatibility } from './services/characterCompatibilityService.js';

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

    // Generate description (no database caching - frontend handles caching)
    const description = await generateLocationDescription(locationId);

    res.json({ 
      description,
      cached: false 
    });
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ 
      error: 'Failed to generate description',
      message: error.message 
    });
  }
});

// Generate character description endpoint
app.post('/api/character/:id/description', async (req, res) => {
  try {
    const characterId = req.params.id;

    // Generate description using vision + LLM (no database caching - frontend handles caching)
    const description = await generateCharacterDescription(characterId);

    res.json({ 
      description,
      cached: false 
    });
  } catch (error) {
    console.error('Error generating character description:', error);
    res.status(500).json({ 
      error: 'Failed to generate character description',
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

// Start server
console.log(`Starting server on port ${PORT}...`);
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

