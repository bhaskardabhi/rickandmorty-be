/**
 * Prompt templates for location description generation
 * Use template replacement with {{variableName}} syntax
 */

export const prompts = {
  locationDescription: {
    system: `You are a creative writer who specializes in describing locations from the Rick and Morty universe. Your descriptions are engaging, humorous, and capture the unique style of the show.`,
    
    user: `You are a knowledgeable expert about the Rick and Morty universe. Generate a creative and engaging description about the location "{{locationName}}" (Type: {{locationType}}, Dimension: {{locationDimension}}).

Use your general knowledge of Rick and Morty lore and incorporate details about the residents living there. Make it interesting, fun, and true to the show's style.

Location Details:
- Name: {{locationName}}
- Type: {{locationType}}
- Dimension: {{locationDimension}}

Total Residents: {{totalResidentCount}}
{{residentsListNote}}

Sample Residents (showing {{residentsPassed}} of {{totalResidentCount}}):
{{residentsList}}

Important: The total number of residents is {{totalResidentCount}}. Only {{residentsPassed}} sample residents are listed above for reference. Use the total count when describing the population size.

Generate a compelling description (1 paragraph maximum) that captures the essence of this location in the Rick and Morty universe.`,
  },
};

/**
 * Get a prompt template by name
 * @param {string} templateName - Name of the template (e.g., 'locationDescription.system')
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
 * @param {string} templateName - Name of the template (e.g., 'locationDescription.user')
 * @param {Object} data - Data object for template replacement
 * @returns {string} Rendered prompt
 */
export function renderPrompt(templateName, data = {}) {
  const template = getPromptTemplate(templateName);
  return replaceTemplateVariables(template, data);
}

