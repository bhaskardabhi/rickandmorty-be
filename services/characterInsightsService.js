import { GraphQLClient } from 'graphql-request';
import dotenv from 'dotenv';
import { analyzeCharacterImage } from './visionService.js';
import { generateWithLLM } from './llmService.js';

dotenv.config();

const graphqlClient = new GraphQLClient(
  process.env.RICK_AND_MORTY_GRAPHQL_URL
);

// Template configuration name - will be added to config/llm-config.json
const TEMPLATE_CONFIG_NAME = 'character_insights_generation';

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

export async function generateCharacterInsights(characterId) {
  // Fetch character data from GraphQL API
  const data = await graphqlClient.request(GET_CHARACTER_QUERY, { id: characterId });
  const character = data.character;

  if (!character) {
    throw new Error(`Character with id ${characterId} not found`);
  }

  // Step 1: Analyze character image to get visual appearance
  console.log('Analyzing character image for insights...');
  const visualAppearance = await analyzeCharacterImage(character.image, character.name);
  console.log('Visual appearance extracted');

  // Step 2: Prepare character data
  const characterData = {
    name: character.name,
    status: character.status,
    species: character.species,
    type: character.type || 'Unknown',
    gender: character.gender,
    origin: character.origin?.name || 'Unknown',
    location: character.location?.name || 'Unknown',
    visualAppearance: visualAppearance,
  };

  // Step 3: Prepare episodes data (latest 10)
  const episodes = (character.episode || [])
    .slice(-10) // Get latest 10 episodes
    .reverse() // Most recent first
    .map((ep) => ({
      name: ep.name,
      episode: ep.episode,
      airDate: ep.air_date || 'Unknown',
    }));

  const episodesList = episodes
    .map((ep, i) => `${i + 1}. "${ep.name}" (${ep.episode}) - Aired: ${ep.airDate}`)
    .join('\n');

  // Step 4: Prepare data for prompt template
  const promptData = {
    characterName: characterData.name,
    characterStatus: characterData.status,
    characterSpecies: characterData.species,
    characterType: characterData.type,
    characterGender: characterData.gender,
    characterOrigin: characterData.origin,
    characterLocation: characterData.location,
    visualAppearance: visualAppearance,
    episodesCount: character.episode?.length || 0,
    episodesList: episodesList || 'No episodes available.',
  };

  // Step 5: Generate insights using LLM service
  try {
    const insightsText = await generateWithLLM(TEMPLATE_CONFIG_NAME, promptData);
    
    // Parse the insights from the response (expecting a list format)
    const insights = parseInsights(insightsText);
    
    // Ensure we have exactly 5 insights
    return insights.slice(0, 5);
  } catch (error) {
    // Fallback insights if LLM fails
    console.error('LLM generation failed, using fallback:', error);
    return generateFallbackInsights(characterData);
  }
}

function parseInsights(insightsText) {
  // Try to parse insights from various formats
  // Format 1: Numbered list (1. ... 2. ...)
  // Format 2: Bullet points (- ...)
  // Format 3: JSON array
  // Format 4: Line-separated
  
  // Try JSON first
  try {
    const parsed = JSON.parse(insightsText);
    if (Array.isArray(parsed)) {
      return parsed.map(insight => typeof insight === 'string' ? insight : insight.text || insight.insight || String(insight));
    }
  } catch (e) {
    // Not JSON, continue with text parsing
  }

  // Try numbered list
  const numberedMatches = insightsText.match(/^\d+[\.\)]\s*(.+)$/gm);
  if (numberedMatches && numberedMatches.length > 0) {
    return numberedMatches.map(match => match.replace(/^\d+[\.\)]\s*/, '').trim());
  }

  // Try bullet points
  const bulletMatches = insightsText.match(/^[-•*]\s*(.+)$/gm);
  if (bulletMatches && bulletMatches.length > 0) {
    return bulletMatches.map(match => match.replace(/^[-•*]\s*/, '').trim());
  }

  // Fallback: split by newlines and filter empty
  const lines = insightsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.match(/^(insights?|suggestions?):?$/i));
  
  return lines.slice(0, 5);
}

function generateFallbackInsights(characterData) {
  return [
    `${characterData.name} is a ${characterData.status} ${characterData.species} with a unique role in the Rick and Morty universe.`,
    `The character's origin from ${characterData.origin} suggests interesting backstory potential.`,
    `${characterData.name}'s current location at ${characterData.location} indicates their current story arc.`,
    `The visual appearance of ${characterData.name} reflects their species and personality traits.`,
    `This character's journey through the multiverse offers rich narrative possibilities.`,
  ];
}

