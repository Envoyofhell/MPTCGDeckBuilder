// src/utils/TCGapi/EnhancedTCGController.js
// Implements local-first data fetching strategy, falling back to live API.

// Cache manager for API requests
const API_CACHE = {
    cardCache: {},       // By card ID/name (primarily for API results)
    setCache: null,        // All sets (can be from local or API)
    searchResultsCache: {}, // By search query (can cache local or API results)
    customCardsCache: [],  // User-created cards
    localSetDataCache: {}, // Cache for loaded local set JSONs to reduce re-fetches
};

// Configuration
const TCGAPI_BASE_URL = "https://api.pokemontcg.io/v2";
const LOCAL_DATA_BASE_URL = "/data/tcg"; // Assuming your build output is in public/data/tcg
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;
const MAX_CUSTOM_CARDS = 50;
const API_KEY = process.env.REACT_APP_POKEMON_TCG_API_KEY || 'a65acbfc-55e5-4d2c-9278-253872a1bc5a';

async function fetchWithTimeout(url, options = {}, resourceName = 'resource', retries = MAX_RETRIES, isLocal = false) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            // For local files, a 404 is a common "not found" scenario.
            if (isLocal && response.status === 404) {
                console.warn(`Local resource not found: ${url}`);
                return null; // Indicate not found for local files specifically
            }
            let errorMsg = `(${response.status}) ${response.statusText}`;
            try {
                const errorData = await response.text();
                // ... (rest of error handling as before) ...
                 if (response.status === 404 && errorData.toLowerCase().includes("not found")) { // API might return HTML for 404
                    errorMsg = `${resourceName} not found (404)`;
                } else {
                    try {
                        const jsonData = JSON.parse(errorData);
                        errorMsg = `(${response.status}): ${jsonData?.error?.message || errorData}`;
                    } catch (jsonError) {
                        errorMsg = `(${response.status}): ${errorData || response.statusText}`;
                    }
                }
            } catch (e) { /* Ignore parsing errors */ }
            throw new Error(`Fetch Error for ${resourceName}: ${errorMsg}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (isLocal) { // Don't retry local file fetches aggressively
            console.error(`Failed to fetch local resource ${url}:`, error.message);
            return null; // Indicate failure for local files
        }
        // ... (rest of retry logic for API calls as before) ...
        if (error.name === "AbortError") {
            console.error(`Request timed out for ${url}`);
            throw new Error(`Request for ${resourceName} timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
        }
        if (retries > 0 && (!error.response || error.response.status >= 500)) {
            console.log(`Retrying fetch for ${resourceName} (${retries} attempts left)`);
            const delay = (MAX_RETRIES - retries + 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithTimeout(url, options, resourceName, retries - 1, isLocal);
        }
        console.error(`Request failed for ${url}:`, error);
        throw error; // Re-throw if all retries fail or not a retriable error
    }
}

function getApiHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['X-Api-Key'] = API_KEY;
    else console.warn('TCG API Key not set.');
    return headers;
}

function generateCacheKey(params) {
    return JSON.stringify(params);
}

class EnhancedTCGController {
    static initialize() { /* ... same as before ... */ }
    static cleanupStorage() { /* ... same as before ... */ }
    static isApiKeyConfigured() { /* ... same as before ... */ }
    static loadCustomCards() { /* ... same as before ... */ }
    static saveCustomCards() { /* ... same as before ... */ }
    static getCustomCards() { /* ... same as before ... */ }
    static async addCustomCard(cardData) { /* ... same as before ... */ }
    static async updateCustomCard(id, cardData) { /* ... same as before ... */ }
    static deleteCustomCard(id) { /* ... same as before ... */ }
    static clearCache(cacheType = 'all') { /* ... same as before ... */ }

    static async getAllSets(useCache = true) {
        if (useCache && API_CACHE.setCache) {
            // console.log("Using cached sets (either local or API)");
            return API_CACHE.setCache;
        }

        // 1. Try to load from local set-index.json
        const localSetIndexUrl = `${LOCAL_DATA_BASE_URL}/set-index.json`;
        try {
            // console.log(`Attempting to fetch local set index: ${localSetIndexUrl}`);
            const localSetIndexData = await fetchWithTimeout(localSetIndexUrl, {}, "Local Set Index", 0, true);
            if (localSetIndexData && typeof localSetIndexData === 'object' && Object.keys(localSetIndexData).length > 0) {
                // Convert object to array of sets, matching API structure if necessary
                const setsArray = Object.values(localSetIndexData).map(set => ({
                    id: set.id || Object.keys(localSetIndexData).find(key => localSetIndexData[key] === set), // Fallback for ID if not in value
                    name: set.name,
                    series: set.series,
                    releaseDate: set.releaseDate,
                    // Add other relevant fields your app expects from API's /sets endpoint
                    printedTotal: set.printedTotal,
                    total: set.total,
                    images: set.images || { symbol: `${LOCAL_DATA_BASE_URL}/${set.path}symbol.png`, logo: `${LOCAL_DATA_BASE_URL}/${set.path}logo.png` } // Construct image paths if not present
                })).sort((a,b) => new Date(b.releaseDate) - new Date(a.releaseDate));
                
                console.log(`Successfully loaded ${setsArray.length} sets from local set-index.json`);
                API_CACHE.setCache = setsArray;
                return setsArray;
            } else {
                console.warn("Local set-index.json not found or empty. Falling back to API.");
            }
        } catch (error) {
            console.warn(`Failed to load or parse local set-index.json: ${error.message}. Falling back to API.`);
        }

        // 2. Fallback to live API
        console.log("Fetching all sets from live API...");
        const apiUrl = `${TCGAPI_BASE_URL}/sets?orderBy=-releaseDate`;
        try {
            const data = await fetchWithTimeout(apiUrl, { headers: getApiHeaders() }, `TCG sets`);
            API_CACHE.setCache = data?.data || [];
            return API_CACHE.setCache;
        } catch (error) {
            console.error(`Error fetching TCG sets from API: ${error.message}`);
            return [];
        }
    }

    static async query(params, useCache = true) {
        const cacheKey = generateCacheKey(params);
        if (useCache && API_CACHE.searchResultsCache[cacheKey]) {
            return API_CACHE.searchResultsCache[cacheKey];
        }

        let allFetchedCards = [];
        let attemptedLocalFetch = false;

        // Strategy: If specific set IDs are provided, try local first for those sets.
        if (params['set.id'] && Array.isArray(params['set.id']) && params['set.id'].length > 0) {
            attemptedLocalFetch = true;
            console.log("Attempting to fetch cards locally for sets:", params['set.id']);
            const setIDsToFetch = params['set.id'];
            let localDataFoundForAllSets = true;

            for (const setId of setIDsToFetch) {
                // Determine supertypes to fetch for this set
                const supertypesToFetch = (params.supertypes && params.supertypes.length > 0) 
                    ? params.supertypes 
                    : ['Pokémon', 'Trainer', 'Energy']; // Default to all if not specified

                for (const supertype of supertypesToFetch) {
                    const localCardDataUrl = `${LOCAL_DATA_BASE_URL}/sets/${setId}/${supertype.toLowerCase()}.json`;
                    // console.log(`Fetching local data: ${localCardDataUrl}`);
                    
                    let cardsFromSetSupertype = API_CACHE.localSetDataCache[localCardDataUrl];
                    if (!cardsFromSetSupertype) {
                        const fetchedData = await fetchWithTimeout(localCardDataUrl, {}, `Local ${supertype} cards for set ${setId}`, 0, true);
                        if (fetchedData && Array.isArray(fetchedData)) {
                            cardsFromSetSupertype = fetchedData;
                            API_CACHE.localSetDataCache[localCardDataUrl] = cardsFromSetSupertype; // Cache it
                        } else {
                            console.warn(`Local data for ${supertype} in set ${setId} not found or invalid. Will fallback to API for this query.`);
                            localDataFoundForAllSets = false;
                            break; // Break from supertype loop for this set
                        }
                    }
                    if (cardsFromSetSupertype) {
                        allFetchedCards.push(...cardsFromSetSupertype);
                    }
                }
                if (!localDataFoundForAllSets) break; // Break from setID loop if any set part failed
            }

            if (localDataFoundForAllSets && allFetchedCards.length > 0) {
                console.log(`Locally fetched ${allFetchedCards.length} cards before client-side filtering.`);
                // Perform client-side filtering
                const filteredResults = this.filterLocalData(allFetchedCards, params);
                console.log(`Returning ${filteredResults.length} cards after client-side filtering of local data.`);
                if (useCache) API_CACHE.searchResultsCache[cacheKey] = filteredResults;
                return filteredResults;
            } else {
                console.log("Could not satisfy query entirely from local data, or some local files missing. Falling back to live API.");
                allFetchedCards = []; // Reset if local fetch was incomplete
            }
        }

        // Fallback to live API if no set.id specified, or local fetch failed/incomplete
        console.log("Querying live API with params:", params);
        const queryParts = [];
        for (const key in params) {
            if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
                const value = params[key];
                if (Array.isArray(value) && value.length === 0) continue;
                if (typeof value === 'string' && value.trim() === '') continue;

                if (Array.isArray(value) && value.length > 0) {
                    const arrayQueries = value.map(item => {
                        const itemStr = String(item);
                        // Quote only if it has spaces and isn't already quoted or a wildcard query
                        if (itemStr.includes(' ') && !itemStr.startsWith('"') && !itemStr.endsWith('"') && !itemStr.includes('*')) {
                            return `${key}:"${itemStr}"`;
                        }
                        return `${key}:${itemStr}`;
                    });
                    if (arrayQueries.length > 0) queryParts.push(`(${arrayQueries.join(" OR ")})`);
                } else if (typeof value === 'object' && key === 'legalities') {
                    Object.entries(value).forEach(([format, status]) => {
                        if (status) queryParts.push(`legalities.${format}:"${status}"`);
                    });
                } else if (typeof value === 'string') {
                    queryParts.push(`${key}:${value}`);
                }
            }
        }
        
        const query = queryParts.join(' ');
        if (!query && !attemptedLocalFetch) { // If no query and didn't try local (e.g. empty initial search)
             console.log("Empty query for API, returning empty results.");
             return [];
        }
        
        const pageSize = params.pageSize || 150;
        const url = `${TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=${pageSize}`;
        // console.log(`API URL: ${url}`);
        
        try {
            const data = await fetchWithTimeout(url, { headers: getApiHeaders() }, `TCG cards with query: ${query}`);
            const results = data?.data || [];
            if (useCache) API_CACHE.searchResultsCache[cacheKey] = results;
            return results;
        } catch (error) {
            console.error(`Error fetching TCG cards from API: ${error.message}`);
            return [];
        }
    }

    static filterLocalData(cards, params) {
        let filtered = [...cards];

        // Name filter (assumes params.name might have wildcards like "*term*")
        if (params.name) {
            let searchTerm = params.name.toLowerCase();
            let mode = 'contains'; // Default
            if (searchTerm.startsWith('"') && searchTerm.endsWith('"')) {
                mode = 'exact';
                searchTerm = searchTerm.substring(1, searchTerm.length - 1);
            } else if (searchTerm.endsWith('*') && !searchTerm.startsWith('*')) {
                mode = 'startsWith';
                searchTerm = searchTerm.slice(0, -1);
            } else if (searchTerm.startsWith('*') && searchTerm.endsWith('*') && searchTerm.length > 2) {
                mode = 'contains';
                searchTerm = searchTerm.substring(1, searchTerm.length - 1);
            } else if (searchTerm.startsWith('*')) { // Should not happen if UI enforces *term* or term*
                mode = 'endsWith'; 
                searchTerm = searchTerm.slice(1);
            }


            filtered = filtered.filter(card => {
                const cardNameLower = card.name.toLowerCase();
                if (mode === 'exact') return cardNameLower === searchTerm;
                if (mode === 'startsWith') return cardNameLower.startsWith(searchTerm);
                // if (mode === 'endsWith') return cardNameLower.endsWith(searchTerm); // Not typical for card names
                return cardNameLower.includes(searchTerm); // Default to contains
            });
        }

        // Supertype filter
        if (params.supertypes && params.supertypes.length > 0) {
            filtered = filtered.filter(card => params.supertypes.includes(card.supertype));
        }

        // Types filter (OR logic)
        if (params.types && params.types.length > 0) {
            filtered = filtered.filter(card => card.types && card.types.some(t => params.types.includes(t)));
        }

        // Subtypes filter (OR logic)
        if (params.subtypes && params.subtypes.length > 0) {
            filtered = filtered.filter(card => card.subtypes && card.subtypes.some(st => params.subtypes.includes(st)));
        }

        // Rarities filter (OR logic)
        if (params.rarities && params.rarities.length > 0) {
            filtered = filtered.filter(card => card.rarity && params.rarities.includes(card.rarity));
        }
        
        // Legalities filter (AND logic for each format specified)
        if (params.legalities) {
            Object.entries(params.legalities).forEach(([format, status]) => {
                if (status) { // Only filter if a status (e.g., "Legal") is specified for the format
                    filtered = filtered.filter(card => card.legalities && card.legalities[format] === status);
                }
            });
        }
        
        // Note: Set filtering was handled by selecting which files to load.
        // If multiple sets were loaded locally, and then a set filter is applied again here,
        // it would further refine. But typically, set filter is used to pick the files.

        return filtered;
    }
}

export default EnhancedTCGController;
