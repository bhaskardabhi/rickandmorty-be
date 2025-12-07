import { GraphQLClient } from 'graphql-request';
import dotenv from 'dotenv';
import { analyzeCharacterImage } from './visionService.js';
import { generateWithLLM } from './llmService.js';

dotenv.config();

const graphqlClient = new GraphQLClient(
  process.env.RICK_AND_MORTY_GRAPHQL_URL
);

// Template configuration name - defined in config/llm-config.json
const TEMPLATE_CONFIG_NAME = 'character_description_generation';

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

export async function generateCharacterDescription(characterId, generateDescription = true) {
  // Fetch character data from GraphQL API
  const data = await graphqlClient.request(GET_CHARACTER_QUERY, { id: characterId });
  const character = data.character;

  if (!character) {
    throw new Error(`Character with id ${characterId} not found`);
  }

  // Step 1: Analyze character image to get visual appearance
  console.log('Analyzing character image...');
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

  // Step 3: Prepare location data
  const locationData = {
    name: character.location?.name || 'Unknown',
    type: character.location?.type || 'Unknown',
    dimension: character.location?.dimension || 'Unknown',
  };

  // Step 4: Prepare episodes data (latest 10)
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

  // Step 5: Prepare data for prompt template
  const promptData = {
    characterName: characterData.name,
    characterStatus: characterData.status,
    characterSpecies: characterData.species,
    characterType: characterData.type,
    characterGender: characterData.gender,
    characterOrigin: characterData.origin,
    characterLocation: characterData.location,
    visualAppearance: visualAppearance,
    locationName: locationData.name,
    locationType: locationData.type,
    locationDimension: locationData.dimension,
    episodesCount: character.episode?.length || 0,
    episodesList: episodesList || 'No episodes available.',
  };

  if(!generateDescription) {
    return {
      characterData,
      locationData,
      promptData,
    };
  }

  // Step 6: Generate description using LLM service
  try {
    const description = await generateWithLLM(TEMPLATE_CONFIG_NAME, promptData);
    // Return both the description and metadata for evaluation
    return {
      description,
      characterData,
      locationData,
      promptData,
    };
  } catch (error) {
    console.error('LLM generation failed, using fallback:', error);
    throw error;
  }
}