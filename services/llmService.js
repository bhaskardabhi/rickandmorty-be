import OpenAI from 'openai';
import dotenv from 'dotenv';
import { renderPrompt as renderLocationPrompt } from '../prompts/locationDescription.js';
import { renderPrompt as renderCharacterPrompt } from '../prompts/characterDescription.js';
import { renderPrompt as renderLocationEvaluationPrompt } from '../prompts/locationEvaluation.js';
import {
  getModelForTemplate,
  getTemperatureForTemplate,
  getMaxTokensForTemplate,
  getSystemPromptTemplate,
  getUserPromptTemplate,
} from '../config/configLoader.js';

dotenv.config();

// Initialize Groq client (Groq uses OpenAI-compatible API)
const groqClient = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Generate text using Grok/Groq LLM based on template configuration
 * @param {string} templateConfigName - Name of the template configuration from llm-config.json
 * @param {Object} promptData - Data object to pass to the user prompt template
 * @returns {Promise<string>} Generated text
 */
export async function generateWithLLM(templateConfigName, promptData = {}) {
  // Get configuration from config/llm-config.json
  const model = getModelForTemplate(templateConfigName);
  const temperature = getTemperatureForTemplate(templateConfigName);
  const maxTokens = getMaxTokensForTemplate(templateConfigName);
  const systemPromptTemplate = getSystemPromptTemplate(templateConfigName);
  const userPromptTemplate = getUserPromptTemplate(templateConfigName);

  // Determine which prompt renderer to use based on template name
  const isCharacterTemplate = templateConfigName.includes('character');
  const isEvaluationTemplate = templateConfigName.includes('evaluation');
  const isCharacterEvaluation = isCharacterTemplate && isEvaluationTemplate;
  
  let renderPrompt;
  if (isCharacterEvaluation) {
    renderPrompt = renderCharacterPrompt;
  } else if (isEvaluationTemplate) {
    renderPrompt = renderLocationEvaluationPrompt;
  } else if (isCharacterTemplate) {
    renderPrompt = renderCharacterPrompt;
  } else {
    renderPrompt = renderLocationPrompt;
  }
  
  // Get prompts from template files
  const systemPrompt = systemPromptTemplate 
    ? renderPrompt(systemPromptTemplate, promptData)
    : renderPrompt(isCharacterEvaluation ? 'characterEvaluation.system' :
                   isEvaluationTemplate ? 'locationEvaluation.system' : 
                   isCharacterTemplate ? 'characterDescription.system' : 
                   'locationDescription.system', promptData);
  
  const userPrompt = userPromptTemplate
    ? renderPrompt(userPromptTemplate, promptData)
    : renderPrompt(isCharacterEvaluation ? 'characterEvaluation.user' :
                   isEvaluationTemplate ? 'locationEvaluation.user' : 
                   isCharacterTemplate ? 'characterDescription.user' : 
                   'locationDescription.user', promptData);

  try {
    const completionOptions = {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: temperature,
    };

    // Add max_tokens if specified in config
    if (maxTokens !== null) {
      completionOptions.max_tokens = maxTokens;
    }

    const response = await groqClient.chat.completions.create(completionOptions);

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Groq API error (${model}):`, error);
    throw error;
  }
}

