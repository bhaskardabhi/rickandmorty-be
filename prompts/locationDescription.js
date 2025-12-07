/**
 * Prompt templates for location description generation
 * Use template replacement with {{variableName}} syntax
 */

export const prompts = {
  locationDescription: {
    system: `You are a creative writer who specializes in describing locations from the Rick and Morty universe. Your descriptions are engaging, humorous, and capture the unique style of the show.`,
    
    user: `You are a knowledgeable expert on the Rick and Morty universe. Write a creative, engaging, and lore-aware description of the location "{{locationName}}".

Use a tone that matches the humor, energy, and absurd sci-fi style of the show. Incorporate insights based on the location type, dimension, and the nature of the residents who live there—while keeping the description fun, vivid, and consistent with the Rick and Morty universe.

***Location Information***
Name: {{locationName}}
Type: {{locationType}}
Dimension: {{locationDimension}}
Total Residents: {{totalResidentCount}}
Sample Residents
(Showing {{residentsPassed}} of {{totalResidentCount}}):
{{residentsList}}

Additional Notes:
{{residentsListNote}}

***Instructions***
1. Write one paragraph only.
2. Mention all of the following explicitly in your description:
  Location Name
  Location Type
  Location Dimension
  Total Residents
3. Use the sample residents only as reference, but base your population mention on the total count ({{totalResidentCount}}).
4. The tone should feel like it fits naturally inside a Rick and Morty episode—quirky, witty, slightly chaotic, and imaginative.
5. Stay consistent with known Rick and Morty lore where possible, but you may creatively extrapolate as long as it fits the universe.
`,
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

