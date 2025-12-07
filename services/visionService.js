import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Groq client for vision
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Analyze character image and extract visual appearance details
 * Uses Groq's vision model (meta-llama/llama-4-scout-17b-16e-instruct) as configured
 * @param {string} imageUrl - URL of the character image
 * @param {string} characterName - Name of the character for context
 * @returns {Promise<string>} Visual appearance description
 */
export async function analyzeCharacterImage(imageUrl, characterName) {
  const model = 'meta-llama/llama-4-scout-17b-16e-instruct';
  
  try {
    console.log(`Analyzing character image using Groq vision model: ${model}`);
    const response = await groqClient.chat.completions.create({
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
    console.log(`✅ Vision analysis successful`);
    return visualDescription;
  } catch (error) {
    console.error(`❌ Vision model failed:`, error.message);
    throw error;
  }
}

