import { GraphQLClient } from 'graphql-request';
import dotenv from 'dotenv';
import { generateWithLLM } from './llmService.js';

dotenv.config();

const graphqlClient = new GraphQLClient(
  process.env.RICK_AND_MORTY_GRAPHQL_URL || 'https://rickandmortyapi.com/graphql'
);

// Template configuration name - defined in config/llm-config.json
const TEMPLATE_CONFIG_NAME = 'location_description_generation';

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
        status
        species
        type
        gender
        origin {
          name
        }
        location {
          name
        }
      }
    }
  }
`;

export async function generateLocationDescription(locationId) {
  // Fetch location data from GraphQL API
  const data = await graphqlClient.request(GET_LOCATION_QUERY, { id: locationId });
  const location = data.location;

  if (!location) {
    throw new Error(`Location with id ${locationId} not found`);
  }

  // Prepare location data
  const locationData = {
    name: location.name,
    type: location.type,
    dimension: location.dimension,
  };

  // Prepare residents data (max 20 characters)
  const residents = (location.residents || [])
    .slice(0, 20)
    .map((resident) => ({
      name: resident.name,
      status: resident.status,
      species: resident.species,
      type: resident.type || 'Unknown',
      gender: resident.gender,
      originName: resident.origin?.name || 'Unknown',
      locationName: resident.location?.name || 'Unknown',
    }));

  // Format residents list for prompt
  const residentsList = residents
    .map((r, i) => 
      `${i + 1}. ${r.name} - ${r.status} ${r.species}${r.type !== 'Unknown' ? ` (${r.type})` : ''}, ${r.gender}, from ${r.originName}, currently at ${r.locationName}`
    )
    .join('\n');

  // Get total resident count (before limiting to 20)
  const totalResidents = location.residents?.length || 0;
  const residentsPassed = residents.length; // Number of residents we're actually passing (max 20)

  // Prepare residents list note
  const residentsListNote = totalResidents === 0 
    ? 'No known residents in this location.'
    : `Showing ${residentsPassed} sample residents out of ${totalResidents} total.`;

  // Prepare data for prompt template
  const promptData = {
    locationName: locationData.name,
    locationType: locationData.type,
    locationDimension: locationData.dimension,
    totalResidentCount: totalResidents,
    residentsPassed: residentsPassed,
    residentsListNote: residentsListNote,
    residentsList: residentsList || 'No residents listed.',
  };

  // Generate description using LLM service
  try {
    const description = await generateWithLLM(TEMPLATE_CONFIG_NAME, promptData);
    return description;
  } catch (error) {
    // Fallback description if LLM fails
    console.error('LLM generation failed, using fallback:', error);
    return generateFallbackDescription(locationData, residents, totalResidents);
  }
}

function generateFallbackDescription(locationData, residents, totalResidents) {
  const residentCount = totalResidents || residents.length;
  const aliveCount = residents.filter((r) => r.status === 'Alive').length;
  const deadCount = residents.filter((r) => r.status === 'Dead').length;
  const speciesTypes = [...new Set(residents.map((r) => r.species))];

  return `${locationData.name} is a ${locationData.type} located in the ${locationData.dimension} dimension. This location is home to ${residentCount} known residents${residents.length > 0 ? `, with ${aliveCount} currently alive and ${deadCount} deceased` : ''}. ${speciesTypes.length > 0 ? `The population includes various species such as ${speciesTypes.slice(0, 3).join(', ')}${speciesTypes.length > 3 ? ', and more' : ''}.` : ''} This location represents another fascinating corner of the multiverse explored by Rick and Morty.`;
}

