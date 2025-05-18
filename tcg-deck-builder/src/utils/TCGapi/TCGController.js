// src/utils/TCGapi/EnhancedTCGController.js
// Focus: Correctly formatting array parameters for live API queries.

import { API_CACHE, TCGAPI_BASE_URL, REQUEST_TIMEOUT, MAX_RETRIES, API_KEY } from './apiConfig'; // Hypothetical config file

// Ensure fetchWithTimeout, getHeaders, generateCacheKey are defined or imported
// For brevity, assuming they exist as in your provided EnhancedTCGController.js

async function fetchWithTimeout(url, options = {}, resourceName = 'resource', retries = MAX_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            let errorMsg = `(${response.status}) ${response.statusText}`;
            try {
                const errorData = await response.text();
                if (response.status === 404 && errorData.toLowerCase() === "not found") {
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
            throw new Error(`API Error fetching ${resourceName}: ${errorMsg}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
            console.error(`Request timed out for ${url}`);
            throw new Error(`Request for ${resourceName} timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
        }
        if (retries > 0 && (!error.response || error.response.status >= 500)) {
            console.log(`Retrying fetch for ${resourceName} (${retries} attempts left)`);
            const delay = (MAX_RETRIES - retries + 1) * 1000; // Basic exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithTimeout(url, options, resourceName, retries - 1);
        }
        console.error(`Request failed for ${url}:`, error);
        throw error;
    }
}

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (API_KEY) {
        headers['X-Api-Key'] = API_KEY;
    } else {
        console.warn('TCG API Key not set.');
    }
    return headers;
}

function generateCacheKey(params) {
    return JSON.stringify(params);
}


class EnhancedTCGController {
    static initialize() {
        console.log("EnhancedTCGController initializing...");
        this.loadCustomCards();
        this.cleanupStorage();
        console.log("EnhancedTCGController initialized.");
        return Promise.resolve();
    }
    
    static cleanupStorage() {
        try {
            API_CACHE.searchResultsCache = {};
            if (API_CACHE.customCardsCache.length > MAX_CUSTOM_CARDS) {
                API_CACHE.customCardsCache = API_CACHE.customCardsCache.slice(-MAX_CUSTOM_CARDS);
                this.saveCustomCards();
            }
        } catch (error) {
            console.error("Error cleaning up storage:", error);
        }
    }

    static isApiKeyConfigured() {
        return !!API_KEY && API_KEY.length > 0;
    }
    
    static async query(params, useCache = true) {
        const cacheKey = generateCacheKey(params);
        if (useCache && API_CACHE.searchResultsCache[cacheKey]) {
            // console.log(`Using cached results for query: ${cacheKey}`);
            return API_CACHE.searchResultsCache[cacheKey];
        }

        const queryParts = [];
        for (const key in params) {
            if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null && String(params[key]).trim() !== '') {
                const value = params[key];
                if (Array.isArray(value) && value.length > 0) {
                    // Format for array parameters like types, subtypes, set.id
                    // Example: (types:"Fire" OR types:"Water")
                    // Example: (set.id:"sv1" OR set.id:"sv2")
                    const arrayQueries = value.map(item => `${key}:"${item}"`); // Ensure items are quoted if they might contain spaces
                    if (arrayQueries.length > 0) {
                        queryParts.push(`(${arrayQueries.join(" OR ")})`);
                    }
                } else if (typeof value === 'object' && key === 'legalities') {
                    Object.entries(value).forEach(([format, status]) => {
                        if (status) { 
                            queryParts.push(`legalities.${format}:"${status}"`);
                        }
                    });
                } else if (typeof value === 'string') {
                    // For string parameters like name. Wildcards/quotes should be pre-applied in calling function.
                    queryParts.push(`${key}:${value}`);
                }
                // Add handling for other data types if necessary
            }
        }
        
        const query = queryParts.join(' ');
        if (!query) {
            // console.log("EnhancedTCGController: Empty query generated, returning empty results.");
            return [];
        }
        
        // Default pageSize to 150, can be overridden by params
        const pageSize = params.pageSize || 150; 
        const url = `${TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=${pageSize}`;
        // console.log(`EnhancedTCGController: Searching TCG cards with query: ${query} URL: ${url}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG cards with query: ${query}`
            );
            const results = data?.data || [];
            if (useCache) {
                API_CACHE.searchResultsCache[cacheKey] = results;
            }
            return results;
        } catch (error) {
            console.error(`EnhancedTCGController: Error fetching TCG cards: ${error.message}`);
            return []; 
        }
    }

    static async getAllSets(useCache = true) {
        if (useCache && API_CACHE.setCache) {
            // console.log("Using cached sets");
            return API_CACHE.setCache;
        }
        const url = `${TCGAPI_BASE_URL}/sets?orderBy=-releaseDate`;
        // console.log(`Fetching TCG sets: ${url}`);
        try {
            const data = await fetchWithTimeout(url, { headers: getHeaders() }, `TCG sets`);
            API_CACHE.setCache = data?.data || [];
            return API_CACHE.setCache;
        } catch (error) {
            console.error(`Error fetching TCG sets: ${error.message}`);
            return [];
        }
    }

    static loadCustomCards() { /* ... same as your provided version ... */ }
    static saveCustomCards() { /* ... same as your provided version ... */ }
    static getCustomCards() { /* ... same as your provided version ... */ }
    static async addCustomCard(cardData) { /* ... same as your provided version ... */ }
    static async updateCustomCard(id, cardData) { /* ... same as your provided version ... */ }
    static deleteCustomCard(id) { /* ... same as your provided version ... */ }
    static clearCache(cacheType = 'all') { /* ... same as your provided version ... */ }
}

// Define API_CACHE, TCGAPI_BASE_URL, etc. if not in a separate apiConfig.js
// For this example, I'm assuming they are defined elsewhere or should be added here.
// If they are not in apiConfig.js, you would define them here:
// const API_CACHE = { cardCache: {}, setCache: null, searchResultsCache: {}, customCardsCache: [] };
// const TCGAPI_BASE_URL = "https://api.pokemontcg.io/v2";
// const REQUEST_TIMEOUT = 15000;
// const MAX_RETRIES = 3;
// const MAX_CUSTOM_CARDS = 50;
// const API_KEY = process.env.REACT_APP_POKEMON_TCG_API_KEY || 'YOUR_DEFAULT_KEY_HERE';


export default EnhancedTCGController;
