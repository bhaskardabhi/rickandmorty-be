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

  try {
    const parsed = JSON.parse(cleanedText);
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
    console.warn('JSON match was:', cleanedText.substring(0, 200));
    throw new Error('Failed to parse evaluation response');
  }
}

