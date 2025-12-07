/**
 * Prompt templates for search query expansion
 * Expands short or ambiguous queries into more descriptive search queries
 */

export const prompts = {
  queryExpansion: {
    system: `You are a search query enhancement assistant for the Rick and Morty universe database. Your job is to expand short or ambiguous search queries into more descriptive, semantically rich queries that will help find relevant characters and locations.`,
    
    user: `Expand the following search query into a more descriptive and semantically rich query that will help find relevant characters or locations in the Rick and Morty universe.

Original query: "{{query}}"

Transform this into a descriptive query that:
- Maintains the original intent
- Adds context about what the user might be looking for (character, location, type, etc.)
- Uses natural language that would match how characters and locations are described
- Is concise (1-2 sentences maximum)

Examples:
- "earth" → "a location similar to Earth or planet Earth in the Rick and Morty universe"
- "monster" → "a character or creature that is a monster or monstrous being in Rick and Morty"
- "alien" → "an alien character or alien species in the Rick and Morty universe"
- "rick" → "Rick Sanchez or characters similar to Rick in the Rick and Morty universe"

Return ONLY the expanded query text, nothing else.`,
  },
};

/**
 * Get a prompt template by name
 * @param {string} templateName - Name of the template (e.g., 'queryExpansion.system')
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
function replaceVariables(template, data = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (data[key] === undefined) {
      console.warn(`Warning: Variable "${key}" not found in data for template`);
      return match;
    }
    return String(data[key]);
  });
}

/**
 * Render a prompt template with optional data
 * @param {string} templateName - Name of the template (e.g., 'queryExpansion.user')
 * @param {Object} data - Data object for variable replacement
 * @returns {string} Rendered prompt
 */
export function renderPrompt(templateName, data = {}) {
  const template = getPromptTemplate(templateName);
  return replaceVariables(template, data);
}

