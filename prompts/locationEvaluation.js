/**
 * Prompt templates for location description evaluation
 * Use template replacement with {{variableName}} syntax
 */

export const prompts = {
  locationEvaluation: {
    system: `You are an expert evaluator of location descriptions in the Rick and Morty universe. You analyze descriptions for accuracy, completeness, and quality. You provide objective, detailed evaluations.`,
    
    user: `Evaluate the following location description for quality and accuracy.

Location Information:
- Name: {{locationName}}
- Type: {{locationType}}{{locationTypeNote}}
- Dimension: {{locationDimension}}{{dimensionNote}}

Generated Description:
{{description}}

Evaluate the description and return ONLY a valid JSON object in this exact format:
{
  "checks": {
    "nameMentioned": true/false,
    "typeMentioned": true/false,
    "dimensionMentioned": true/false
  },
  "qualityChecks": {
    "hasResidentInfo": true/false,
    "hasContext": true/false,
    "hasRickAndMortyStyle": true/false
  },
  "autoScore": number (0-10),
  "explanation": "Brief explanation of the score"
}

Scoring Guidelines:
- Name mentioned: 4 points (most important)
- Type mentioned: 3 points (only if type is not "Unknown")
- Dimension mentioned: 3 points (only if dimension is not "Unknown")
- Quality indicators: up to 2 bonus points (resident info: 0.5, context: 0.5, Rick & Morty style: 1)
- Maximum score: 10

For "mentioned" checks, consider if the information is clearly present in the description, even if not using exact words. Use semantic understanding. Set typeMentioned and dimensionMentioned to false if the corresponding value is "Unknown".`,
  },
};

/**
 * Get a prompt template by name
 * @param {string} templateName - Name of the template (e.g., 'locationEvaluation.system')
 * @returns {string} The prompt template
 */
export function getPromptTemplate(templateName) {
  const parts = templateName.split('.');
  let template = prompts;
  
  for (const part of parts) {
    if (template[part] === undefined) {
      throw new Error(`Prompt template "${templateName}" not found`);
    }
    template = template[part];
  }
  
  if (typeof template !== 'string') {
    throw new Error(`Prompt template "${templateName}" is not a string`);
  }
  
  return template;
}

/**
 * Replace template variables in a string
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} data - Data object with values to replace
 * @returns {string} Template with variables replaced
 */
export function replaceTemplateVariables(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] === undefined || data[key] === null) {
      console.warn(`Template variable "${key}" not found in data, leaving placeholder`);
      return match;
    }
    return String(data[key]);
  });
}

/**
 * Get and render a prompt template
 * @param {string} templateName - Name of the template (e.g., 'locationEvaluation.user')
 * @param {Object} data - Data object for template replacement
 * @returns {string} Rendered prompt
 */
export function renderPrompt(templateName, data = {}) {
  const template = getPromptTemplate(templateName);
  return replaceTemplateVariables(template, data);
}

