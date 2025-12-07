import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load LLM configuration from JSON file
 * @param {string} configPath - Path to the config JSON file
 * @returns {Array} Array of configuration objects
 */
export function loadLLMConfig(configPath = null) {
  const defaultPath = path.join(__dirname, 'llm-config.json');
  const configFile = configPath || defaultPath;

  try {
    const configData = fs.readFileSync(configFile, 'utf8');
    const config = JSON.parse(configData);
    
    if (!Array.isArray(config)) {
      throw new Error('LLM config must be an array');
    }
    
    return config;
  } catch (error) {
    console.error(`Error loading LLM config from ${configFile}:`, error);
    throw error;
  }
}

/**
 * Get configuration by template name
 * @param {string} templateName - Name of the template configuration
 * @param {string} configPath - Optional path to config file
 * @returns {Object|null} Configuration object or null if not found
 */
export function getConfigByTemplateName(templateName, configPath = null) {
  const configs = loadLLMConfig(configPath);
  const config = configs.find(c => c.template_name === templateName);
  
  if (!config) {
    throw new Error(`Configuration for template "${templateName}" not found`);
  }
  
  return config;
}

/**
 * Get model from config (required - no fallback)
 * @param {string} templateName - Name of the template configuration
 * @returns {string} Model name
 * @throws {Error} If configuration is not found
 */
export function getModelForTemplate(templateName) {
  try {
    const config = getConfigByTemplateName(templateName);
    return config.model;
  } catch (error) {
    throw error;
  }
}

/**
 * Get temperature from config or use default
 * @param {string} templateName - Name of the template configuration
 * @param {number} defaultTemp - Default temperature if not in config
 * @returns {number} Temperature value
 */
export function getTemperatureForTemplate(templateName, defaultTemp = 0.8) {
  try {
    const config = getConfigByTemplateName(templateName);
    return config.temperature !== undefined ? config.temperature : defaultTemp;
  } catch (error) {
    throw error;
  }
}

/**
 * Get system prompt template name from config
 * @param {string} templateName - Name of the template configuration
 * @returns {string|null} System prompt template name
 */
export function getSystemPromptTemplate(templateName) {
  try {
    const config = getConfigByTemplateName(templateName);
    return config.system_prompt || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get user prompt template name from config
 * @param {string} templateName - Name of the template configuration
 * @returns {string|null} User prompt template name
 */
export function getUserPromptTemplate(templateName) {
  try {
    const config = getConfigByTemplateName(templateName);
    return config.user_prompt || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get prompt renderer name from config
 * @param {string} templateName - Name of the template configuration
 * @returns {string} Prompt renderer name (defaults to "location" if not found)
 */
export function getPromptRenderer(templateName) {
  try {
    const config = getConfigByTemplateName(templateName);
    return config.prompt_renderer || 'location';
  } catch (error) {
    return 'location';
  }
}

