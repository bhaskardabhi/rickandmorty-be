import OpenAI from 'openai';
import dotenv from 'dotenv';
import { renderPrompt as renderLocationPrompt } from '../prompts/locationDescription.js';
import { renderPrompt as renderCharacterPrompt } from '../prompts/characterDescription.js';
import { renderPrompt as renderLocationEvaluationPrompt } from '../prompts/locationEvaluation.js';
import { renderPrompt as renderQueryExpansionPrompt } from '../prompts/queryExpansion.js';
import {
  getModelForTemplate,
  getTemperatureForTemplate,
  getSystemPromptTemplate,
  getUserPromptTemplate,
  getPromptRenderer,
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
  const systemPromptTemplate = getSystemPromptTemplate(templateConfigName);
  const userPromptTemplate = getUserPromptTemplate(templateConfigName);

  // Get prompt renderer from config
  const promptRendererName = getPromptRenderer(templateConfigName);
  
  // Map renderer name to actual renderer function
  const rendererMap = {
    'location': renderLocationPrompt,
    'character': renderCharacterPrompt,
    'locationEvaluation': renderLocationEvaluationPrompt,
    'queryExpansion': renderQueryExpansionPrompt,
  };
  
  const renderPrompt = rendererMap[promptRendererName] || renderLocationPrompt;
  
  if (!rendererMap[promptRendererName]) {
    console.warn(`Unknown prompt renderer "${promptRendererName}" for template "${templateConfigName}", using default location renderer`);
  }
  
  // Get prompts from template files
  if (!systemPromptTemplate || !userPromptTemplate) {
    throw new Error(`Missing prompt templates for "${templateConfigName}". Both system_prompt and user_prompt must be specified in config.`);
  }
  
  const systemPrompt = renderPrompt(systemPromptTemplate, promptData);
  const userPrompt = renderPrompt(userPromptTemplate, promptData);
  
  if (!systemPrompt || !userPrompt) {
    throw new Error(`Failed to render prompts for "${templateConfigName}". Check that the prompt template names are correct.`);
  }

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

    const response = await groqClient.chat.completions.create(completionOptions);

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Groq API error (${model}):`, error);
    throw error;
  }
}

