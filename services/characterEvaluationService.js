/**
 * Evaluation service for character descriptions
 * Uses LLM to evaluate description quality and accuracy
 */

import { generateWithLLM } from './llmService.js';

export async function evaluateCharacterDescription(description, characterData, locationData, promptData) {
  // Prepare evaluation prompt data
  const evaluationPromptData = {
    characterName: characterData.name || 'Unknown',
    characterStatus: characterData.status || 'Unknown',
    characterSpecies: characterData.species || 'Unknown',
    characterType: characterData.type || 'Unknown',
    characterTypeNote: (!characterData.type || characterData.type === 'Unknown') ? ' (may be "Unknown")' : '',
    characterGender: characterData.gender || 'Unknown',
    characterOrigin: characterData.origin || 'Unknown',
    originNote: (!characterData.origin || characterData.origin === 'Unknown') ? ' (may be "Unknown")' : '',
    characterLocation: characterData.location || 'Unknown',
    locationNote: (!characterData.location || characterData.location === 'Unknown') ? ' (may be "Unknown")' : '',
    visualAppearance: promptData.visualAppearance || 'No visual appearance data available.',
    locationName: locationData.name || 'Unknown',
    locationNameNote: (!locationData.name || locationData.name === 'Unknown') ? ' (may be "Unknown")' : '',
    locationType: locationData.type || 'Unknown',
    locationTypeNote: (!locationData.type || locationData.type === 'Unknown') ? ' (may be "Unknown")' : '',
    locationDimension: locationData.dimension || 'Unknown',
    dimensionNote: (!locationData.dimension || locationData.dimension === 'Unknown') ? ' (may be "Unknown")' : '',
    episodesCount: promptData.episodesCount || 0,
    episodesList: promptData.episodesList || 'No episodes available.',
    description: description,
  };

  try {
    // Use LLM to evaluate the description
    const evaluationText = await generateWithLLM('character_description_evaluation', evaluationPromptData);
    
    // Parse the JSON response
    const evaluation = parseEvaluationResponse(evaluationText);
    
    return {
      ...evaluation,
      characterData,
      locationData,
      promptData,
      description,
    };
  } catch (error) {
    console.error('LLM evaluation failed:', error);
    throw error;
  }
}

function parseEvaluationResponse(evaluationText) {
  // Try to parse JSON from the response
  let cleanedText = evaluationText.trim();
  
  console.log('Raw evaluation response:', cleanedText.substring(0, 200)); // Log first 200 chars for debugging
  
  // Remove markdown code blocks if present
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/```json\s*/i, '').replace(/```\s*/g, '').trim();
  }
  
  // Try to extract JSON object
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed evaluation:', JSON.stringify(parsed, null, 2));
      
      const result = {
        checks: parsed.checks || {},
        qualityChecks: parsed.qualityChecks || {},
        autoScore: parsed.autoScore !== undefined ? parsed.autoScore : 0,
        explanation: parsed.explanation || 'No explanation provided',
      };
      
      // Ensure all required fields exist
      const requiredChecks = [
        'nameMentioned', 'statusMentioned', 'speciesMentioned', 'typeMentioned',
        'genderMentioned', 'originMentioned', 'locationMentioned', 'visualAppearanceMentioned'
      ];
      
      requiredChecks.forEach(check => {
        if (result.checks[check] === undefined) {
          result.checks[check] = false;
        }
      });
      
      const requiredQualityChecks = [
        'hasEpisodeContext', 'hasLocationContext', 'hasRickAndMortyStyle', 'hasCharacterDepth'
      ];
      
      requiredQualityChecks.forEach(check => {
        if (result.qualityChecks[check] === undefined) {
          result.qualityChecks[check] = false;
        }
      });
      
      return result;
    } catch (e) {
      console.warn('Failed to parse JSON from evaluation response:', e);
      console.warn('JSON match was:', jsonMatch[0].substring(0, 200));
    }
  } else {
    console.warn('No JSON object found in evaluation response');
  }
  
  // Fallback: return empty evaluation with error explanation
  return {
    checks: {
      nameMentioned: false,
      statusMentioned: false,
      speciesMentioned: false,
      typeMentioned: false,
      genderMentioned: false,
      originMentioned: false,
      locationMentioned: false,
      visualAppearanceMentioned: false,
    },
    qualityChecks: {
      hasEpisodeContext: false,
      hasLocationContext: false,
      hasRickAndMortyStyle: false,
      hasCharacterDepth: false,
    },
    autoScore: 0,
    explanation: `Failed to parse evaluation response. Raw response: ${cleanedText.substring(0, 100)}...`,
  };
}

