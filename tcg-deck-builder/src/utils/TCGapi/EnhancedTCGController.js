// src/utils/TCGapi/EnhancedTCGController.js
// Modified to fix search functionality issues

/**
 * Enhanced TCG API Controller with improved caching, error handling, and retry logic
 * @version 1.1.0
 */

// Cache manager for API requests
const API_CACHE = {
    cardCache: {},           // By card ID/name
    setCache: null,          // All sets
    searchResultsCache: {},  // By search query
    customCardsCache: [],    // User-created cards
};

// Configuration
const TCGAPI_BASE_URL = "https://api.pokemontcg.io/v2";
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;

// API key is stored in environment variables
const API_KEY = process.env.REACT_APP_POKEMON_TCG_API_KEY || 'a65acbfc-55e5-4d2c-9278-253872a1bc5a';

/**
 * Generic fetch wrapper with timeout, retries and error handling
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {string} resourceName - Name of resource for error messages
 * @param {number} retries - Number of retries left
 * @returns {Promise<object|null>} - Response data or null
 */
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
            } catch (e) {
                /* Ignore parsing errors */
            }
            throw new Error(`API Error fetching ${resourceName}: ${errorMsg}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === "AbortError") {
            console.error(`Fetch timed out for ${url}`);
            throw new Error(`Request for ${resourceName} timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
        }
        
        // If we have retries left and it's not a client error (4xx)
        if (retries > 0 && (!error.response || error.response.status >= 500)) {
            console.log(`Retrying fetch for ${resourceName} (${retries} attempts left)`);
            // Exponential backoff
            const delay = (MAX_RETRIES - retries + 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithTimeout(url, options, resourceName, retries - 1);
        }
        
        console.error(`Fetch failed for ${url}:`, error);
        throw error;
    }
}

/**
 * Generate headers for TCG API requests
 * @returns {object} Headers object
 */
function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
        headers['X-Api-Key'] = API_KEY;
    } else {
        console.warn('TCG API Key not set. Some features may be limited or unavailable.');
    }
    
    return headers;
}

/**
 * Form cache key from parameters
 * @param {object} params - Query parameters
 * @returns {string} Cache key
 */
function generateCacheKey(params) {
    return JSON.stringify(params);
}

/**
 * Enhanced controller for TCG API with caching and error handling
 */
class EnhancedTCGController {
    /**
     * Check if API key is configured
     * @returns {boolean} True if API key is set
     */
    static isApiKeyConfigured() {
        return !!API_KEY && API_KEY.length > 0;
    }
    
    /**
     * General query method with flexible parameters and caching
     * @param {object} params - Query parameters 
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<Array>} Card data
     */
    static async query(params, useCache = true) {
        // Form cache key from params
        const cacheKey = generateCacheKey(params);
        
        // Check cache first if enabled
        if (useCache && API_CACHE.searchResultsCache[cacheKey]) {
            console.log(`Using cached results for query: ${cacheKey}`);
            return API_CACHE.searchResultsCache[cacheKey];
        }
        
        // Build query string from parameters
        const queryParts = [];
        
        // Handle name parameter specially based on format
        if (params.name) {
            // Name is already formatted with wildcards if needed (e.g., "*charizard*")
            queryParts.push(`name:${params.name}`);
        }
        
        // Handle types array
        if (params.types && params.types.length > 0) {
            // Join multiple types with OR
            const typeQueries = params.types.map(type => `types:"${type}"`);
            queryParts.push(`(${typeQueries.join(" OR ")})`);
        }
        
        // Handle subtypes array
        if (params.subtypes && params.subtypes.length > 0) {
            // Join multiple subtypes with OR
            const subtypeQueries = params.subtypes.map(subtype => `subtypes:"${subtype}"`);
            queryParts.push(`(${subtypeQueries.join(" OR ")})`);
        }
        
        // Handle supertypes array
        if (params.supertypes && params.supertypes.length > 0) {
            // Join multiple supertypes with OR
            const supertypeQueries = params.supertypes.map(supertype => `supertype:"${supertype}"`);
            queryParts.push(`(${supertypeQueries.join(" OR ")})`);
        }
        
        // Handle rarities array
        if (params.rarities && params.rarities.length > 0) {
            // Join multiple rarities with OR
            const rarityQueries = params.rarities.map(rarity => `rarity:"${rarity}"`);
            queryParts.push(`(${rarityQueries.join(" OR ")})`);
        }
        
        // Handle sets array
        if (params.sets && params.sets.length > 0) {
            // Join multiple sets with OR
            const setQueries = params.sets.map(set => `set.id:"${set}"`);
            queryParts.push(`(${setQueries.join(" OR ")})`);
        }
        
        // Handle legalities
        if (params.legalities) {
            // For each format
            Object.entries(params.legalities).forEach(([format, status]) => {
                if (status) { // Only add if there's a value
                    queryParts.push(`legalities.${format}:"${status}"`);
                }
            });
        }
        
        // Build the query
        const query = queryParts.join(' ');
        
        // If no query parameters, return empty array
        if (!query) {
            return [];
        }
        
        // Build URL with encoded query
        const url = `${TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=150`;
        console.log(`Fetching TCG cards with query: ${query}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG cards with query: ${query}`
            );
            
            // Store in cache
            API_CACHE.searchResultsCache[cacheKey] = data?.data || [];
            return data?.data || [];
        } catch (error) {
            console.error(`Error fetching TCG cards: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Fetch all available sets
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<Array>} Sets data
     */
    static async getAllSets(useCache = true) {
        // Check cache first if enabled
        if (useCache && API_CACHE.setCache) {
            console.log(`Using cached sets`);
            return API_CACHE.setCache;
        }
        
        const url = `${TCGAPI_BASE_URL}/sets?orderBy=-releaseDate`;
        console.log(`Fetching TCG sets: ${url}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG sets`
            );
            
            // Store in cache
            API_CACHE.setCache = data?.data || [];
            return API_CACHE.setCache;
        } catch (error) {
            console.error(`Error fetching TCG sets: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Load custom cards from local storage
     */
    static loadCustomCards() {
        try {
            const stored = localStorage.getItem('tcg-deck-builder-custom-cards');
            if (stored) {
                API_CACHE.customCardsCache = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load custom cards from local storage:', error);
        }
    }
    
    /**
     * Get all custom cards
     * @returns {Array} Custom cards
     */
    static getCustomCards() {
        return [...API_CACHE.customCardsCache];
    }
    
    /**
     * Delete a custom card by ID
     * @param {string} id - Card ID to delete
     * @returns {boolean} Success flag
     */
    static deleteCustomCard(id) {
        const initialLength = API_CACHE.customCardsCache.length;
        API_CACHE.customCardsCache = API_CACHE.customCardsCache.filter(card => card.id !== id);
        
        const success = API_CACHE.customCardsCache.length < initialLength;
        if (success) {
            this.saveCustomCards();
        }
        
        return success;
    }
    
    /**
     * Save custom cards to local storage
     */
    static saveCustomCards() {
        try {
            localStorage.setItem('tcg-deck-builder-custom-cards', JSON.stringify(API_CACHE.customCardsCache));
        } catch (error) {
            console.error('Failed to save custom cards to local storage:', error);
        }
    }
    
    /**
     * Clear API cache
     * @param {string} cacheType - Type of cache to clear ('all', 'cards', 'sets', 'search')
     */
    static clearCache(cacheType = 'all') {
        console.log(`Clearing API cache: ${cacheType}`);
        
        switch (cacheType) {
            case 'cards':
                API_CACHE.cardCache = {};
                break;
            case 'sets':
                API_CACHE.setCache = null;
                break;
            case 'search':
                API_CACHE.searchResultsCache = {};
                break;
            case 'all':
            default:
                API_CACHE.cardCache = {};
                API_CACHE.setCache = null;
                API_CACHE.searchResultsCache = {};
                break;
        }
    }
    
    /**
     * Initialize the controller
     */
    static async initialize() {
        console.log('Initializing Enhanced TCG API Controller...');
        
        // Load custom cards from local storage
        this.loadCustomCards();
        
        // Pre-fetch sets for faster UI
        if (this.isApiKeyConfigured()) {
            try {
                const sets = await this.getAllSets();
                console.log(`Loaded ${sets.length} sets`);
            } catch (err) {
                console.warn('Failed to pre-fetch TCG sets:', err);
            }
        }
        
        console.log('Enhanced TCG API Controller initialized.');
        return true;
    }
}

export default EnhancedTCGController;