/**
 * Evaluation service for location descriptions
 * Uses LLM to evaluate description quality and accuracy
 */

import { generateWithLLM } from './llmService.js';

export async function evaluateLocationDescription(description, locationData, promptData) {
  // Prepare evaluation prompt data
  const evaluationPromptData = {
    locationName: locationData.name || 'Unknown',
    locationType: locationData.type || 'Unknown',
    locationDimension: locationData.dimension || 'Unknown',
    locationTypeNote: (!locationData.type || locationData.type === 'Unknown') ? ' (may be "Unknown")' : '',
    dimensionNote: (!locationData.dimension || locationData.dimension === 'Unknown') ? ' (may be "Unknown")' : '',
    totalResidentCount: promptData?.totalResidentCount ?? 0,
    description: description,
  };

  try {
    // Use LLM to evaluate the description
    const evaluationText = await generateWithLLM('location_description_evaluation', evaluationPromptData);

    // Parse the JSON response
    const evaluation = parseEvaluationResponse(evaluationText);
    
    return {
      ...evaluation,
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
    console.log('Successfully parsed entire text as JSON');
    return formatEvaluationResult(parsed);
  } catch (e) {
    throw new Error('Failed to parse evaluation response');
  }
}

/**
 * Format parsed evaluation result with required fields
 * @param {Object} parsed - Parsed JSON object
 * @returns {Object} Formatted evaluation result
 */
function formatEvaluationResult(parsed) {
  const result = {
    checks: parsed.checks || {},
    qualityChecks: parsed.qualityChecks || {},
    autoScore: parsed.autoScore !== undefined ? parsed.autoScore : 0,
    explanation: parsed.explanation || 'No explanation provided',
  };
  
  // Ensure all required fields exist
  if (!result.checks.nameMentioned && result.checks.nameMentioned !== false) {
    result.checks.nameMentioned = false;
  }
  if (!result.checks.typeMentioned && result.checks.typeMentioned !== false) {
    result.checks.typeMentioned = false;
  }
  if (!result.checks.dimensionMentioned && result.checks.dimensionMentioned !== false) {
    result.checks.dimensionMentioned = false;
  }
  
  return result;
}

