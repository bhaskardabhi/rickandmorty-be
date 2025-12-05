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
      typeMentioned: false,
      dimensionMentioned: false,
    },
    qualityChecks: {
      hasResidentInfo: false,
      hasContext: false,
      hasRickAndMortyStyle: false,
    },
    autoScore: 0,
    explanation: `Failed to parse evaluation response. Raw response: ${cleanedText.substring(0, 100)}...`,
  };
}

