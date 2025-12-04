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
    teamWork: '',
    conflicts: '',
    breaksFirst: '',
  };

  // Try multiple patterns to extract sections
  // Pattern 1: Look for numbered sections or headers
  const patterns = [
    // Pattern: "1. TEAM WORK:" or "TEAM WORK:" followed by content
    {
      teamWork: /(?:1\.?\s*)?(?:TEAM\s+WORK|Team\s+Work|team\s+work)[:\s]*(.*?)(?=\d+\.?\s*(?:CONFLICT|Conflict|conflict|FIGHT|Fight|fight)|2\.?\s*|CONFLICT|Conflict|conflict|FIGHT|Fight|fight|BREAKS|Breaks|breaks)/is,
      conflicts: /(?:2\.?\s*)?(?:CONFLICT|Conflict|conflict|FIGHT|Fight|fight|What\s+they['']d\s+fight)[:\s]*(.*?)(?=\d+\.?\s*(?:BREAKS|Breaks|breaks|Who|who)|3\.?\s*|BREAKS|Breaks|breaks|Who|who)/is,
      breaksFirst: /(?:3\.?\s*)?(?:BREAKS\s+FIRST|Breaks\s+First|breaks\s+first|Who\s+breaks|who\s+breaks)[:\s]*(.*?)$/is,
    },
    // Pattern: Look for emoji or symbols followed by section names
    {
      teamWork: /(?:🤝|👥|1)[\s\-:]*(?:TEAM|Team|team)[\s\-:]*(?:WORK|Work|work)?[\s\-:]*(.*?)(?=(?:⚔️|⚔|2|CONFLICT|Conflict|conflict|FIGHT|Fight|fight))/is,
      conflicts: /(?:⚔️|⚔|2)[\s\-:]*(?:CONFLICT|Conflict|conflict|FIGHT|Fight|fight|What)[\s\-:]*(.*?)(?=(?:💥|💣|3|BREAKS|Breaks|breaks|Who|who))/is,
      breaksFirst: /(?:💥|💣|3)[\s\-:]*(?:BREAKS|Breaks|breaks|Who|who)[\s\-:]*(?:FIRST|First|first)?[\s\-:]*(.*?)$/is,
    },
  ];

  for (const pattern of patterns) {
    const teamMatch = analysisText.match(pattern.teamWork);
    const conflictMatch = analysisText.match(pattern.conflicts);
    const breaksMatch = analysisText.match(pattern.breaksFirst);

    if (teamMatch && conflictMatch && breaksMatch) {
      result.teamWork = teamMatch[1].trim();
      result.conflicts = conflictMatch[1].trim();
      result.breaksFirst = breaksMatch[1].trim();
      break;
    }
  }

  // If still not found, try splitting by double newlines or section markers
  if (!result.teamWork || !result.conflicts || !result.breaksFirst) {
    const sections = analysisText.split(/\n\s*\n|---|\*\*\*/);
    if (sections.length >= 3) {
      // Try to identify which section is which
      sections.forEach((section, index) => {
        const lowerSection = section.toLowerCase();
        if (!result.teamWork && (lowerSection.includes('team') || lowerSection.includes('work'))) {
          result.teamWork = section.replace(/^[^\w]*/, '').trim();
        } else if (!result.conflicts && (lowerSection.includes('conflict') || lowerSection.includes('fight'))) {
          result.conflicts = section.replace(/^[^\w]*/, '').trim();
        } else if (!result.breaksFirst && (lowerSection.includes('break') || lowerSection.includes('first'))) {
          result.breaksFirst = section.replace(/^[^\w]*/, '').trim();
        }
      });

      // If still not found, assign by position
      if (!result.teamWork && sections[0]) {
        result.teamWork = sections[0].replace(/^[^\w]*/, '').trim();
      }
      if (!result.conflicts && sections[1]) {
        result.conflicts = sections[1].replace(/^[^\w]*/, '').trim();
      }
      if (!result.breaksFirst && sections[2]) {
        result.breaksFirst = sections[2].replace(/^[^\w]*/, '').trim();
      }
    }
  }

  // Final fallback: split text into three equal parts
  if (!result.teamWork || !result.conflicts || !result.breaksFirst) {
    const length = analysisText.length;
    const third = Math.floor(length / 3);
    result.teamWork = result.teamWork || analysisText.substring(0, third).trim();
    result.conflicts = result.conflicts || analysisText.substring(third, 2 * third).trim();
    result.breaksFirst = result.breaksFirst || analysisText.substring(2 * third).trim();
  }

  return result;
}

function generateFallbackCompatibility(char1, char2, location) {
  return {
    teamWork: `${char1.name} and ${char2.name} would have a ${char1.species === char2.species ? 'natural' : 'challenging'} dynamic as a team. Their different backgrounds from ${char1.origin} and ${char2.origin} could create interesting synergies or tensions.`,
    conflicts: `They might clash over differences in their ${char1.species !== char2.species ? 'species and' : ''} approaches to situations. ${char1.name}'s ${char1.status} status and ${char2.name}'s ${char2.status} status could also create underlying tensions.`,
    breaksFirst: `Given their characteristics, ${char1.status === 'Dead' ? char1.name : char2.status === 'Dead' ? char2.name : 'either character'} might be more likely to break under pressure, depending on the specific circumstances at ${location.name}.`,
  };
}

