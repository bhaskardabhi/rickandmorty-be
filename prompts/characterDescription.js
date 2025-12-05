/**
 * Prompt templates for character description generation
 * Use template replacement with {{variableName}} syntax
 */

export const prompts = {
  characterDescription: {
    system: `You are a creative writer who specializes in describing characters from the Rick and Morty universe. Your descriptions are engaging, humorous, and capture the unique style of the show.`,
    
    user: `You are a knowledgeable expert about the Rick and Morty universe. Generate a creative and engaging description about the character "{{characterName}}".

Use your general knowledge of Rick and Morty lore and incorporate all the provided details. Make it interesting, fun, and true to the show's style.

Character Details:
- Name: {{characterName}}
- Status: {{characterStatus}}
- Species: {{characterSpecies}}
- Type: {{characterType}}
- Gender: {{characterGender}}
- Origin: {{characterOrigin}}
- Current Location: {{characterLocation}}

Visual Appearance:
{{visualAppearance}}

Location Information:
- Name: {{locationName}}
- Type: {{locationType}}
- Dimension: {{locationDimension}}

Episodes ({{episodesCount}} total, showing latest 10):
{{episodesList}}

Generate a compelling description (1-2 paragraphs maximum with no more than 150 words) that captures the essence of this character in the Rick and Morty universe. Include their visual appearance, background, and role in the show.`,
    
    insightsSystem: `You are an expert analyst of the Rick and Morty universe. You provide insightful, thought-provoking observations about characters that help users understand their deeper significance, personality traits, and narrative roles.`,
    
    insightsUser: `Based on the following information about the character "{{characterName}}", generate exactly 5 insightful observations or notes that would be valuable for someone studying or analyzing this character. Each insight should be:
- Concise (one sentence or short paragraph)
- Thought-provoking and analytical
- Based on the character's traits, appearance, background, and role
- Written in a clear, professional tone

Character Details:
- Name: {{characterName}}
- Status: {{characterStatus}}
- Species: {{characterSpecies}}
- Type: {{characterType}}
- Gender: {{characterGender}}
- Origin: {{characterOrigin}}
- Current Location: {{characterLocation}}

Visual Appearance:
{{visualAppearance}}

Episodes ({{episodesCount}} total, showing latest 10):
{{episodesList}}

Provide exactly 5 insights, one per line, numbered 1-2. Each insight should be a complete, standalone observation that could serve as a note about this character. The note can be funny or sarcastic or just a fact about the character. Add emojis in notes to make it more engaging.`,
    
    compatibilitySystem: `You are an expert analyst of character dynamics in the Rick and Morty universe. You provide insightful, entertaining, and accurate assessments of how characters would interact, work together, conflict, and handle pressure. Your analysis is based on character traits, backgrounds, and the show's established lore.`,
    
    compatibilityUser: `Analyze the compatibility and conflict potential between two characters from the Rick and Morty universe when placed together at a specific location.

Character 1: {{character1Name}}
- Status: {{character1Status}}
- Species: {{character1Species}}
- Type: {{character1Type}}
- Gender: {{character1Gender}}
- Origin: {{character1Origin}}
- Current Location: {{character1Location}}
- Visual Appearance: {{character1VisualAppearance}}
- Episodes ({{character1EpisodesCount}} total, latest 10):
{{character1EpisodesList}}

Character 2: {{character2Name}}
- Status: {{character2Status}}
- Species: {{character2Species}}
- Type: {{character2Type}}
- Gender: {{character2Gender}}
- Origin: {{character2Origin}}
- Current Location: {{character2Location}}
- Visual Appearance: {{character2VisualAppearance}}
- Episodes ({{character2EpisodesCount}} total, latest 10):
{{character2EpisodesList}}

Location Context: {{locationName}}
- Type: {{locationType}}
- Dimension: {{locationDimension}}
- Residents: {{locationResidentsCount}}

Provide a detailed analysis in three sections. Each section should be a JSON array of bullet points (strings). Return ONLY valid JSON in this exact format:

{
  "teamWork": ["point 1", "point 2", "point 3", ...],
  "conflicts": ["point 1", "point 2", "point 3", ...],
  "breaksFirst": ["point 1", "point 2", "point 3", ...]
}

1. TEAM WORK: Provide 5-8 bullet points about how well {{character1Name}} and {{character2Name}} would work together as a team. Consider their personalities, skills, backgrounds, and how they complement or clash with each other. Each point should be a complete, standalone observation.

2. CONFLICTS: Provide 5-8 bullet points about what {{character1Name}} and {{character2Name}} would fight over. Include their fundamental disagreements, competing interests, or personality clashes. Each point should be specific and entertaining.

3. BREAKS FIRST: Provide 3-5 bullet points about who would break first under pressure and why. Consider their mental resilience, past experiences, and character traits. Each point should explain the reasoning.

Make it engaging, funny, and true to the Rick and Morty style. Return ONLY the JSON object, no additional text.`,
  },
  
  characterEvaluation: {
    system: `You are an expert evaluator of character descriptions in the Rick and Morty universe. You analyze descriptions for accuracy, completeness, and quality based on your knowledge of Rick and Morty lore and the provided character data. You provide objective, detailed evaluations.`,
    
    user: `Evaluate the following character description for quality and accuracy.

Character Information:
- Name: {{characterName}}
- Status: {{characterStatus}}
- Species: {{characterSpecies}}
- Type: {{characterType}}{{characterTypeNote}}
- Gender: {{characterGender}}
- Origin: {{characterOrigin}}{{originNote}}
- Current Location: {{characterLocation}}{{locationNote}}

Visual Appearance:
{{visualAppearance}}

Location Information:
- Name: {{locationName}}{{locationNameNote}}
- Type: {{locationType}}{{locationTypeNote}}
- Dimension: {{locationDimension}}{{dimensionNote}}

Episodes ({{episodesCount}} total, showing latest 10):
{{episodesList}}

Generated Description:
{{description}}

Evaluate the description and return ONLY a valid JSON object in this exact format:
{
  "checks": {
    "nameMentioned": true/false,
    "statusMentioned": true/false,
    "speciesMentioned": true/false,
    "typeMentioned": true/false,
    "genderMentioned": true/false,
    "originMentioned": true/false,
    "locationMentioned": true/false,
    "visualAppearanceMentioned": true/false
  },
  "qualityChecks": {
    "hasEpisodeContext": true/false,
    "hasLocationContext": true/false,
    "hasRickAndMortyStyle": true/false,
    "hasCharacterDepth": true/false
  },
  "autoScore": number (0-10),
  "explanation": "Brief explanation of the score"
}

Scoring Guidelines:
- Name mentioned: 2 points (most important)
- Status mentioned: 1 point
- Species mentioned: 1 point
- Type mentioned: 0.5 points (only if type is not "Unknown")
- Gender mentioned: 0.5 points
- Origin mentioned: 1 point (only if origin is not "Unknown")
- Location mentioned: 1 point (only if location is not "Unknown")
- Visual appearance mentioned: 1 point
- Quality indicators: up to 2 bonus points (episode context: 0.5, location context: 0.5, Rick & Morty style: 0.5, character depth: 0.5)
- Maximum score: 10

For "mentioned" checks, consider if the information is clearly present in the description, even if not using exact words. Use semantic understanding. Set typeMentioned, originMentioned, and locationMentioned to false if the corresponding value is "Unknown". Evaluate how well the description matches your knowledge of this character from Rick and Morty lore and the provided data.`,
  },
};

/**
 * Get a prompt template by name
 * @param {string} templateName - Name of the template (e.g., 'characterDescription.system')
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
 * @param {string} templateName - Name of the template (e.g., 'characterDescription.user')
 * @param {Object} data - Data object for template replacement
 * @returns {string} Rendered prompt
 */
export function renderPrompt(templateName, data = {}) {
  const template = getPromptTemplate(templateName);
  return replaceTemplateVariables(template, data);
}

