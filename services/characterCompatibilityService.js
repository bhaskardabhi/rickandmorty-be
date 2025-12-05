import { GraphQLClient } from 'graphql-request';
import dotenv from 'dotenv';
import { analyzeCharacterImage } from './visionService.js';
import { generateWithLLM } from './llmService.js';

dotenv.config();

const graphqlClient = new GraphQLClient(
  process.env.RICK_AND_MORTY_GRAPHQL_URL || 'https://rickandmortyapi.com/graphql'
);

// Template configuration name
const TEMPLATE_CONFIG_NAME = 'character_compatibility_generation';

const GET_CHARACTER_QUERY = `
  query GetCharacter($id: ID!) {
    character(id: $id) {
      id
      name
      status
      species
      type
      gender
      image
      origin {
        id
        name
        type
        dimension
      }
      location {
        id
        name
        type
        dimension
      }
      episode {
        id
        name
        episode
        air_date
      }
    }
  }
`;

const GET_LOCATION_QUERY = `
  query GetLocation($id: ID!) {
    location(id: $id) {
      id
      name
      type
      dimension
      residents {
        id
        name
      }
    }
  }
`;

export async function generateCharacterCompatibility(character1Id, character2Id, locationId) {
  // Fetch both characters and location data
  const [char1Data, char2Data, locationData] = await Promise.all([
    graphqlClient.request(GET_CHARACTER_QUERY, { id: character1Id }),
    graphqlClient.request(GET_CHARACTER_QUERY, { id: character2Id }),
    graphqlClient.request(GET_LOCATION_QUERY, { id: locationId }),
  ]);

  const character1 = char1Data.character;
  const character2 = char2Data.character;
  const location = locationData.location;

  if (!character1) {
    throw new Error(`Character 1 with id ${character1Id} not found`);
  }
  if (!character2) {
    throw new Error(`Character 2 with id ${character2Id} not found`);
  }
  if (!location) {
    throw new Error(`Location with id ${locationId} not found`);
  }

  // Analyze character images
  console.log('Analyzing character images...');
  const [visualAppearance1, visualAppearance2] = await Promise.all([
    analyzeCharacterImage(character1.image, character1.name),
    analyzeCharacterImage(character2.image, character2.name),
  ]);
  console.log('Visual appearances extracted');

  // Prepare character data
  const prepareCharacterData = (char, visualAppearance) => {
    const episodes = (char.episode || [])
      .slice(-10)
      .reverse()
      .map((ep) => ({
        name: ep.name,
        episode: ep.episode,
        airDate: ep.air_date || 'Unknown',
      }));

    return {
      name: char.name,
      status: char.status,
      species: char.species,
      type: char.type || 'Unknown',
      gender: char.gender,
      origin: char.origin?.name || 'Unknown',
      location: char.location?.name || 'Unknown',
      visualAppearance: visualAppearance,
      episodesCount: char.episode?.length || 0,
      episodesList: episodes
        .map((ep, i) => `${i + 1}. "${ep.name}" (${ep.episode}) - ${ep.airDate}`)
        .join('\n'),
    };
  };

  const char1Data_prep = prepareCharacterData(character1, visualAppearance1);
  const char2Data_prep = prepareCharacterData(character2, visualAppearance2);

  // Prepare location data
  const locationData_prep = {
    name: location.name,
    type: location.type || 'Unknown',
    dimension: location.dimension || 'Unknown',
    residentsCount: location.residents?.length || 0,
  };

  // Prepare data for prompt template
  const promptData = {
    character1Name: char1Data_prep.name,
    character1Status: char1Data_prep.status,
    character1Species: char1Data_prep.species,
    character1Type: char1Data_prep.type,
    character1Gender: char1Data_prep.gender,
    character1Origin: char1Data_prep.origin,
    character1Location: char1Data_prep.location,
    character1VisualAppearance: char1Data_prep.visualAppearance,
    character1EpisodesCount: char1Data_prep.episodesCount,
    character1EpisodesList: char1Data_prep.episodesList || 'No episodes available.',
    
    character2Name: char2Data_prep.name,
    character2Status: char2Data_prep.status,
    character2Species: char2Data_prep.species,
    character2Type: char2Data_prep.type,
    character2Gender: char2Data_prep.gender,
    character2Origin: char2Data_prep.origin,
    character2Location: char2Data_prep.location,
    character2VisualAppearance: char2Data_prep.visualAppearance,
    character2EpisodesCount: char2Data_prep.episodesCount,
    character2EpisodesList: char2Data_prep.episodesList || 'No episodes available.',
    
    locationName: locationData_prep.name,
    locationType: locationData_prep.type,
    locationDimension: locationData_prep.dimension,
    locationResidentsCount: locationData_prep.residentsCount,
  };

  // Generate compatibility analysis using LLM service
  try {
    const analysis = await generateWithLLM(TEMPLATE_CONFIG_NAME, promptData);
    return parseCompatibilityAnalysis(analysis);
  } catch (error) {
    console.error('LLM generation failed, using fallback:', error);
    return generateFallbackCompatibility(char1Data_prep, char2Data_prep, locationData_prep);
  }
}

function parseCompatibilityAnalysis(analysisText) {
  const result = {
    teamWork: [],
    conflicts: [],
    breaksFirst: [],
  };

  // First, try to parse as JSON
  try {
    // Clean the text - remove markdown code blocks if present
    let cleanedText = analysisText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```json\s*/i, '').replace(/```\s*/g, '').trim();
    }
    
    const parsed = JSON.parse(cleanedText);
    
    if (parsed.teamWork && Array.isArray(parsed.teamWork)) {
      result.teamWork = parsed.teamWork;
    }
    if (parsed.conflicts && Array.isArray(parsed.conflicts)) {
      result.conflicts = parsed.conflicts;
    }
    if (parsed.breaksFirst && Array.isArray(parsed.breaksFirst)) {
      result.breaksFirst = parsed.breaksFirst;
    }
    
    // If we got valid arrays, return them
    if (result.teamWork.length > 0 || result.conflicts.length > 0 || result.breaksFirst.length > 0) {
      return result;
    }
  } catch (e) {
    // Not JSON, continue with text parsing
    console.log('Not JSON format, parsing as text...');
  }

  // Fallback: Parse text into arrays by splitting into bullet points
  const parseTextToArray = (text) => {
    if (!text) return [];
    
    // Split by various bullet point markers
    const items = text
      .split(/(?:\n\s*[-•*]\s+|\n\s*\d+\.\s+|\n\s*[•]\s+)/)
      .map(item => item.trim())
      .filter(item => item.length > 10 && !item.match(/^(team\s+work|conflict|breaks\s+first|and|or|but|however|therefore|thus|so|also|furthermore|moreover|in addition|additionally)$/i));
    
    // If no bullet points found, split by sentences
    if (items.length <= 1) {
      const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
      return sentences;
    }
    
    return items;
  };

  // Try to extract sections from text
  const teamWorkMatch = analysisText.match(/(?:1\.?\s*)?(?:TEAM\s+WORK|Team\s+Work|team\s+work)[:\s]*(.*?)(?=\d+\.?\s*(?:CONFLICT|Conflict|conflict)|2\.?\s*|CONFLICT|Conflict|conflict|BREAKS|Breaks|breaks)/is);
  const conflictMatch = analysisText.match(/(?:2\.?\s*)?(?:CONFLICT|Conflict|conflict|FIGHT|Fight|fight)[:\s]*(.*?)(?=\d+\.?\s*(?:BREAKS|Breaks|breaks)|3\.?\s*|BREAKS|Breaks|breaks|Who|who)/is);
  const breaksMatch = analysisText.match(/(?:3\.?\s*)?(?:BREAKS\s+FIRST|Breaks\s+First|breaks\s+first|Who\s+breaks)[:\s]*(.*?)$/is);

  if (teamWorkMatch) {
    result.teamWork = parseTextToArray(teamWorkMatch[1]);
  }
  if (conflictMatch) {
    result.conflicts = parseTextToArray(conflictMatch[1]);
  }
  if (breaksMatch) {
    result.breaksFirst = parseTextToArray(breaksMatch[1]);
  }

  // If still empty, try splitting the entire text into three parts
  if (result.teamWork.length === 0 && result.conflicts.length === 0 && result.breaksFirst.length === 0) {
    const sections = analysisText.split(/\n\s*\n/);
    if (sections.length >= 3) {
      result.teamWork = parseTextToArray(sections[0]);
      result.conflicts = parseTextToArray(sections[1]);
      result.breaksFirst = parseTextToArray(sections[2]);
    } else {
      // Final fallback: split text into three equal parts
      const length = analysisText.length;
      const third = Math.floor(length / 3);
      result.teamWork = parseTextToArray(analysisText.substring(0, third));
      result.conflicts = parseTextToArray(analysisText.substring(third, 2 * third));
      result.breaksFirst = parseTextToArray(analysisText.substring(2 * third));
    }
  }

  return result;
}

function generateFallbackCompatibility(char1, char2, location) {
  return {
    teamWork: [
      `${char1.name} and ${char2.name} would have a ${char1.species === char2.species ? 'natural' : 'challenging'} dynamic as a team.`,
      `Their different backgrounds from ${char1.origin} and ${char2.origin} could create interesting synergies.`,
      `${char1.name}'s ${char1.status} status and ${char2.name}'s ${char2.status} status would influence their teamwork.`,
      `Their combined skills could be complementary in navigating ${location.name}.`,
    ],
    conflicts: [
      `They might clash over differences in their ${char1.species !== char2.species ? 'species and' : ''} approaches to situations.`,
      `${char1.name}'s ${char1.status} status and ${char2.name}'s ${char2.status} status could create underlying tensions.`,
      `Different perspectives on how to handle challenges at ${location.name} would likely cause disagreements.`,
    ],
    breaksFirst: [
      `Given their characteristics, ${char1.status === 'Dead' ? char1.name : char2.status === 'Dead' ? char2.name : 'either character'} might be more likely to break under pressure.`,
      `The specific circumstances at ${location.name} would test their mental resilience.`,
    ],
  };
}

