// scripts/build-tcg-data.js

/**
 * TCG Data Builder
 * Node.js script to fetch and organize TCG card data for local use
 * Only fetches Sword & Shield and Scarlet & Violet sets
 * 
 * Run with: node build-tcg-data.js
 */

// Load environment variables from .env file
require('dotenv').config();

// Fix for fetch import (use CommonJS version)
const fetch = require('node-fetch').default; // Note the .default here
const fs = require('fs-extra');
const path = require('path');

// Configuration
const TCGAPI_BASE_URL = 'https://api.pokemontcg.io/v2';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'data', 'tcg');
const INDEX_FILE = 'tcg-index.json';
const SET_INDEX_FILE = 'set-index.json';
const SUPERTYPE_INDEX_FILE = 'supertype-index.json';
const TYPE_INDEX_FILE = 'type-index.json';
const RARITY_INDEX_FILE = 'rarity-index.json';
const TCG_ENERGY_TYPES = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];

// Store your API key securely in environment variables
const API_KEY = process.env.POKEMON_TCG_API_KEY;

if (!API_KEY) {
  console.error('Error: POKEMON_TCG_API_KEY environment variable not set.');
  console.error('Please set your API key in a .env file before running this script.');
  process.exit(1);
}

// Helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 1000) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorBody}`);
    }
    
    return await response.json();
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.warn(`Fetch error: ${error.message}. Retrying in ${delayMs}ms... (${retries} retries left)`);
    await delay(delayMs);
    return fetchWithRetry(url, options, retries - 1, delayMs * 2);
  }
}

// Main build functions
async function fetchAllSets() {
  console.log('Fetching all TCG sets...');
  
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  };
  
  const url = `${TCGAPI_BASE_URL}/sets?orderBy=-releaseDate`;
  const data = await fetchWithRetry(url, options);
  
  if (!data || !data.data) {
    throw new Error('Failed to fetch TCG sets or received invalid data');
  }
  
  // Filter for only Sword & Shield and Scarlet & Violet sets
  const filteredSets = data.data.filter(set => 
    set.series === 'Sword & Shield' || set.series === 'Scarlet & Violet'
  );
  
  console.log(`Found ${data.data.length} total TCG sets.`);
  console.log(`Filtered to ${filteredSets.length} Sword & Shield and Scarlet & Violet sets.`);
  
  return filteredSets;
}

async function fetchCardsBySet(setId) {
  console.log(`Fetching cards for set ${setId}...`);
  
  const options = {
    headers: {
      'X-Api-Key': API_KEY
    }
  };
  
  const url = `${TCGAPI_BASE_URL}/cards?q=set.id:${setId}&orderBy=number&pageSize=250`;
  const data = await fetchWithRetry(url, options);
  
  if (!data || !data.data) {
    throw new Error(`Failed to fetch cards for set ${setId} or received invalid data`);
  }
  
  // Check if we need to paginate
  const totalCount = data.totalCount || data.data.length;
  const pageSize = data.pageSize || 250;
  const pages = Math.ceil(totalCount / pageSize);
  
  let allCards = [...data.data];
  
  // Fetch additional pages if needed
  if (pages > 1) {
    console.log(`Set ${setId} has ${pages} pages of cards. Fetching all...`);
    
    for (let page = 2; page <= pages; page++) {
      console.log(`Fetching page ${page}/${pages} for set ${setId}...`);
      const pageUrl = `${TCGAPI_BASE_URL}/cards?q=set.id:${setId}&page=${page}&orderBy=number&pageSize=${pageSize}`;
      const pageData = await fetchWithRetry(pageUrl, options);
      
      if (pageData && pageData.data) {
        allCards = [...allCards, ...pageData.data];
      }
      
      // Add a small delay between requests to avoid rate limiting
      await delay(500);
    }
  }
  
  console.log(`Found ${allCards.length} cards for set ${setId}.`);
  return allCards;
}

async function buildTcgData() {
  console.log('Starting TCG data build (SWSH & SV sets only)...');
  
  // Create output directory
  await fs.ensureDir(OUTPUT_DIR);
  
  // Fetch all sets (filtered to SWSH & SV)
  const allSets = await fetchAllSets();
  
  // Initialize indexes
  const setIndex = {};
  const supertypeIndex = {};
  const typeIndex = {};
  const rarityIndex = {};
  
  // Process sets and cards
  let completedSets = 0;
  
  // Process all SWSH and SV sets (already filtered)
  const setsToProcess = allSets;
  
  for (const set of setsToProcess) {
    try {
      console.log(`Processing set ${completedSets + 1}/${setsToProcess.length}: ${set.name} (${set.id}) [${set.series}]`);
      
      // Fetch cards for this set
      const setCards = await fetchCardsBySet(set.id);
      
      // Create set directory
      const setDir = path.join(OUTPUT_DIR, 'sets', set.id);
      await fs.ensureDir(setDir);
      
      // Clean and process set data
      const setData = {
        id: set.id,
        name: set.name,
        series: set.series,
        printedTotal: set.printedTotal,
        total: set.total,
        legalities: set.legalities || {},
        ptcgoCode: set.ptcgoCode,
        releaseDate: set.releaseDate,
        updatedAt: set.updatedAt,
        images: set.images
      };
      
      // Save set data
      await fs.writeFile(
        path.join(setDir, 'set-info.json'), 
        JSON.stringify(setData, null, 2)
      );
      
      // Process cards by supertype
      const setCardsBySupertype = {};
      
      for (const card of setCards) {
        const supertype = card.supertype;
        
        if (!setCardsBySupertype[supertype]) {
          setCardsBySupertype[supertype] = [];
        }
        
        setCardsBySupertype[supertype].push(card);
        
        // Update supertype index
        if (!supertypeIndex[supertype]) {
          supertypeIndex[supertype] = { sets: {}, count: 0 };
        }
        supertypeIndex[supertype].count++;
        if (!supertypeIndex[supertype].sets[set.id]) {
          supertypeIndex[supertype].sets[set.id] = 0;
        }
        supertypeIndex[supertype].sets[set.id]++;
        
        // Update type index (for Pokémon cards)
        if (supertype === 'Pokémon' && card.types) {
          for (const type of card.types) {
            if (!typeIndex[type]) {
              typeIndex[type] = { sets: {}, count: 0 };
            }
            typeIndex[type].count++;
            if (!typeIndex[type].sets[set.id]) {
              typeIndex[type].sets[set.id] = 0;
            }
            typeIndex[type].sets[set.id]++;
          }
        }
        
        // Update rarity index
        if (card.rarity) {
          if (!rarityIndex[card.rarity]) {
            rarityIndex[card.rarity] = { sets: {}, count: 0 };
          }
          rarityIndex[card.rarity].count++;
          if (!rarityIndex[card.rarity].sets[set.id]) {
            rarityIndex[card.rarity].sets[set.id] = 0;
          }
          rarityIndex[card.rarity].sets[set.id]++;
        }
      }
      
      // Save cards by supertype
      for (const [supertype, cards] of Object.entries(setCardsBySupertype)) {
        await fs.writeFile(
          path.join(setDir, `${supertype.toLowerCase()}.json`),
          JSON.stringify(cards, null, 2)
        );
      }
      
      // Update set index
      setIndex[set.id] = {
        name: set.name,
        series: set.series,
        releaseDate: set.releaseDate,
        cardCount: setCards.length,
        path: `sets/${set.id}/`,
        supertypes: Object.keys(setCardsBySupertype)
      };
      
      // Increment completed sets counter
      completedSets++;
      
      // Add a delay between set processing to avoid rate limiting
      if (completedSets < setsToProcess.length) {
        console.log('Pausing before next set to avoid rate limiting...');
        await delay(1000);
      }
    } catch (error) {
      console.error(`Error processing set ${set.id}:`, error);
    }
  }
  
  // Create energy type reference data
  const energyDir = path.join(OUTPUT_DIR, 'reference');
  await fs.ensureDir(energyDir);
  
  const energyData = TCG_ENERGY_TYPES.map(type => ({
    name: type,
    symbol: `${type.toLowerCase()}.png`,
    color: getEnergyColor(type)
  }));
  
  await fs.writeFile(
    path.join(energyDir, 'energy-types.json'),
    JSON.stringify(energyData, null, 2)
  );
  
  // Save indexes
  await fs.writeFile(
    path.join(OUTPUT_DIR, SET_INDEX_FILE),
    JSON.stringify(setIndex, null, 2)
  );
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, SUPERTYPE_INDEX_FILE),
    JSON.stringify(supertypeIndex, null, 2)
  );
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, TYPE_INDEX_FILE),
    JSON.stringify(typeIndex, null, 2)
  );
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, RARITY_INDEX_FILE),
    JSON.stringify(rarityIndex, null, 2)
  );
  
  // Create main index file
  const indexData = {
    description: "TCG Card Database Index (SWSH & SV sets only)",
    lastUpdated: new Date().toISOString(),
    totalSets: Object.keys(setIndex).length,
    series: ["Sword & Shield", "Scarlet & Violet"],
    indexes: {
      sets: SET_INDEX_FILE,
      supertypes: SUPERTYPE_INDEX_FILE,
      types: TYPE_INDEX_FILE,
      rarities: RARITY_INDEX_FILE
    }
  };
  
  await fs.writeFile(
    path.join(OUTPUT_DIR, INDEX_FILE),
    JSON.stringify(indexData, null, 2)
  );
  
  console.log(`TCG data build complete. Processed ${completedSets} sets.`);
}

// Helper function to get energy type color
function getEnergyColor(type) {
  const colors = {
    'Colorless': '#A8A878',
    'Darkness': '#705848',
    'Dragon': '#7038F8',
    'Fairy': '#EE99AC',
    'Fighting': '#C03028',
    'Fire': '#F08030',
    'Grass': '#78C850',
    'Lightning': '#F8D030',
    'Metal': '#B8B8D0',
    'Psychic': '#F85888',
    'Water': '#6890F0'
  };
  
  return colors[type] || '#68A090';
}

// Run the build script
buildTcgData().catch(error => {
  console.error('Build script failed:', error);
  process.exit(1);
});