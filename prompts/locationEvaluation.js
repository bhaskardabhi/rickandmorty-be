/**
 * Prompt templates for location description evaluation
 * Use template replacement with {{variableName}} syntax
 */

export const prompts = {
  locationEvaluation: {
    system: `You are an expert evaluator of location descriptions in the Rick and Morty universe. You analyze descriptions for accuracy, completeness, and quality. You provide objective, detailed evaluations.`,
    
    user: `Evaluate the following Rick and Morty location description for correctness, completeness, and stylistic quality based on the original generation instructions.

========================
LOCATION INFORMATION
- Name: {{locationName}}
- Type: {{locationType}}{{locationTypeNote}}
- Dimension: {{locationDimension}}{{dimensionNote}}
- Total Residents: {{totalResidentCount}}

GENERATED DESCRIPTION:
{{description}}
========================

Your task is to evaluate whether the description correctly incorporates the required elements from the prompt:

REQUIRED MENTIONS (explicit or clear semantic reference):
- Location Name ({{locationName}})
- Location Type ({{locationType}})
- Location Dimension ({{locationDimension}})
- Total Residents ({{totalResidentCount}})

QUALITY EXPECTATIONS:
- The description should reflect or allude to characteristics of the residents (even if not naming them explicitly).
- It should provide meaningful context about the location beyond just listing details.
- It should match Rick and Morty's narrative tone: humorous, weird, chaotic, whimsical, sci-fi absurdity.

Return ONLY a valid JSON object in this exact format:

{
  "checks": {
    "nameMentioned": true/false,
    "typeMentioned": true/false,
    "dimensionMentioned": true/false,
    "totalResidentsMentioned": true/false
  },
  "qualityChecks": {
    "hasResidentInfo": true/false,
    "hasContext": true/false,
    "hasRickAndMortyStyle": true/false
  },
  "autoScore": number (0-10),
  "explanation": "Brief explanation of the score"
}

SCORING RULES:
- Name mentioned: 4 points (most important).
- Type mentioned: 2 points (skip if type is "Unknown").
- Dimension mentioned: 2 points (skip if dimension is "Unknown").
- Total residents mentioned: 1 point.
- Quality bonuses (up to +2):
    - Resident info present or implied: +0.5
    - Meaningful contextual worldbuilding: +0.5
    - Rick & Morty-style tone: +1

Maximum score: 10.

NOTES:
- “Mentioned” means the model explicitly states or semantically refers to the information.  
- If type or dimension is "Unknown", automatically set the corresponding "mentioned" fields to false and award no points.
- The evaluator must judge based on *semantic meaning*, not exact keyword matching.`,
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

