import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Groq client for vision (primary choice)
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Initialize OpenAI client as fallback
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Analyze character image and extract visual appearance details
 * Uses Groq's vision model (llama-3.2-90b-vision-preview) as primary choice
 * Falls back to OpenAI if Groq fails
 * @param {string} imageUrl - URL of the character image
 * @param {string} characterName - Name of the character for context
 * @returns {Promise<string>} Visual appearance description
 */
export async function analyzeCharacterImage(imageUrl, characterName) {
  // Try Groq vision first (primary choice), then OpenAI as fallback
  const clients = [
    { client: groqClient, model: 'llama-3.2-90b-vision-preview', name: 'Groq' },
  ];
  
  // Add OpenAI as fallback if available
  if (openaiClient) {
    clients.push({ client: openaiClient, model: 'gpt-4o', name: 'OpenAI' });
  }

  for (const { client, model, name } of clients) {
    try {
      console.log(`Trying ${name} vision model: ${model}`);
      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image of ${characterName} from Rick and Morty. Provide a detailed visual description including:
- Physical appearance (hair color/style, eyes, skin color, body type, facial features)
- Clothing and accessories
- Distinctive features or markings
- Overall appearance style
- Any notable visual characteristics

Be specific and descriptive. Focus on visual details that would help someone understand what this character looks like.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const visualDescription = response.choices[0].message.content.trim();
      console.log(`✅ Vision analysis successful using ${name}`);
      return visualDescription;
    } catch (error) {
      console.log(`❌ ${name} vision model failed:`, error.message);
      // Try next client
      continue;
    }
  }

  // If all vision models fail, return a basic description
  console.log('All vision models failed, using fallback description');
  return `Visual appearance details for ${characterName} from Rick and Morty. Character image available but detailed visual analysis could not be performed. The character appears in the Rick and Morty animated series.`;
}

