// src/utils/TCGapi/EnhancedTCGController.js

/**
 * Enhanced TCG API Controller with improved caching, error handling, and retry logic
 * @version 1.0.0
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

// Your API key should be stored in environment variables
// For local development, you might use .env files and process.env
// For production, use appropriate secure methods for your deployment platform
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
        let queryParts = [];
        for (const [key, value] of Object.entries(params)) {
            // Skip empty values
            if (!value) continue;
            
            // Handle special case for name with exact match
            if (key === 'name' && typeof value === 'string') {
                if (value.includes('*')) {
                    // Wildcard search
                    queryParts.push(`name:${value}`);
                } else {
                    // Exact match with quotes
                    queryParts.push(`name:"${value}"`);
                }
            } 
            // Handle array values (like types)
            else if (Array.isArray(value)) {
                value.forEach(val => {
                    queryParts.push(`${key}:"${val}"`);
                });
            }
            // Handle regular key-value pairs
            else {
                queryParts.push(`${key}:"${value}"`);
            }
        }
        
        const query = queryParts.join(' ');
        const url = `${TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=150`;
        console.log(`Fetching TCG cards: ${url}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG cards for ${query}`
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
     * Search cards by name with flexible matching options
     * @param {string} name - Card name to search for
     * @param {object} options - Additional search options
     * @returns {Promise<Array>} Card data
     */
    static async searchByName(name, options = {}) {
        if (!name) return [];
        
        // Build search parameters
        const params = { ...options };
        
        // Handle name search mode
        if (options.exactMatch) {
            params.name = name;
        } else if (options.startsWith) {
            params.name = `${name}*`;
        } else {
            params.name = `*${name}*`;
        }
        
        return this.query(params);
    }
    
    /**
     * Fetch a specific card by its ID
     * @param {string} id - Card ID
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<object|null>} Card data or null
     */
    static async getCardById(id, useCache = true) {
        if (!id) return null;
        
        // Check cache first if enabled
        if (useCache && API_CACHE.cardCache[id]) {
            console.log(`Using cached card: ${id}`);
            return API_CACHE.cardCache[id];
        }
        
        const url = `${TCGAPI_BASE_URL}/cards/${id}`;
        console.log(`Fetching TCG card: ${url}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG card ${id}`
            );
            
            // Store in cache
            if (data?.data) {
                API_CACHE.cardCache[id] = data.data;
                return data.data;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching TCG card ${id}: ${error.message}`);
            return null;
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
     * Advanced search with multiple filters and pagination
     * @param {object} filters - Search filters
     * @param {number} page - Page number
     * @param {number} pageSize - Results per page
     * @returns {Promise<object>} Search results with pagination info
     */
    static async advancedSearch(filters = {}, page = 1, pageSize = 20) {
        // Extract specific filters
        const { name, types, rarity, set, subtypes, supertype, legalities, cardmarket, tcgplayer } = filters;
        
        // Build query parameters
        const params = {};
        if (name) params.name = name.includes('*') ? name : `*${name}*`;
        if (types) params.types = types;
        if (rarity) params.rarity = rarity;
        if (set) params['set.id'] = set;
        if (subtypes) params.subtypes = subtypes;
        if (supertype) params.supertype = supertype;
        
        // Handle legalities (format:legality)
        if (legalities) {
            Object.entries(legalities).forEach(([format, legality]) => {
                params[`legalities.${format}`] = legality;
            });
        }
        
        // Handle pricing filters
        if (cardmarket && cardmarket.prices) {
            Object.entries(cardmarket.prices).forEach(([key, value]) => {
                if (value.min) params[`cardmarket.prices.${key}.gte`] = value.min;
                if (value.max) params[`cardmarket.prices.${key}.lte`] = value.max;
            });
        }
        
        if (tcgplayer && tcgplayer.prices) {
            Object.entries(tcgplayer.prices).forEach(([key, value]) => {
                if (value.min) params[`tcgplayer.prices.${key}.gte`] = value.min;
                if (value.max) params[`tcgplayer.prices.${key}.lte`] = value.max;
            });
        }
        
        // Build query string
        let queryParts = [];
        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                value.forEach(val => {
                    queryParts.push(`${key}:"${val}"`);
                });
            } else {
                queryParts.push(`${key}:"${value}"`);
            }
        }
        
        const query = queryParts.join(' ');
        const url = `${TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate`;
        console.log(`Advanced search: ${url}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG advanced search`
            );
            
            return {
                data: data?.data || [],
                pagination: data?.pagination || { count: 0, totalCount: 0, page, pageSize }
            };
        } catch (error) {
            console.error(`Error in advanced search: ${error.message}`);
            return { data: [], pagination: { count: 0, totalCount: 0, page, pageSize } };
        }
    }
    
    /**
     * Add a custom card to the deck builder
     * @param {object} cardData - Custom card data
     * @returns {object} The created card with ID
     */
    static addCustomCard(cardData) {
        if (!cardData.name || !cardData.supertype) {
            throw new Error('Custom card must have a name and supertype');
        }
        
        // Generate a unique ID for the custom card
        const customId = `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const customCard = {
            id: customId,
            name: cardData.name,
            supertype: cardData.supertype,
            subtypes: cardData.subtypes || [],
            types: cardData.types || [],
            hp: cardData.hp || '',
            rules: cardData.rules || [],
            abilities: cardData.abilities || [],
            attacks: cardData.attacks || [],
            weaknesses: cardData.weaknesses || [],
            resistances: cardData.resistances || [],
            retreatCost: cardData.retreatCost || [],
            convertedRetreatCost: cardData.retreatCost?.length || 0,
            set: {
                id: 'custom',
                name: 'Custom Cards',
                series: 'Custom',
                printedTotal: 0,
                total: 0,
                releaseDate: new Date().toISOString().split('T')[0]
            },
            number: `C${API_CACHE.customCardsCache.length + 1}`,
            artist: cardData.artist || 'Custom',
            rarity: cardData.rarity || 'Custom',
            flavorText: cardData.flavorText || '',
            nationalPokedexNumbers: cardData.nationalPokedexNumbers || [],
            legalities: cardData.legalities || {},
            images: {
                small: cardData.imageUrl || '',
                large: cardData.imageUrl || ''
            },
            tcgplayer: cardData.tcgplayer || {},
            cardmarket: cardData.cardmarket || {},
            isCustom: true
        };
        
        // Add to custom cards cache
        API_CACHE.customCardsCache.push(customCard);
        
        // Store in local storage for persistence
        this.saveCustomCards();
        
        return customCard;
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
     * Update a custom card
     * @param {string} id - Card ID to update
     * @param {object} updates - Fields to update
     * @returns {object|null} Updated card or null if not found
     */
    static updateCustomCard(id, updates) {
        const index = API_CACHE.customCardsCache.findIndex(card => card.id === id);
        if (index === -1) return null;
        
        // Update the card
        API_CACHE.customCardsCache[index] = {
            ...API_CACHE.customCardsCache[index],
            ...updates,
            // Ensure these fields can't be changed
            id,
            isCustom: true
        };
        
        this.saveCustomCards();
        return API_CACHE.customCardsCache[index];
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
    static initialize() {
        console.log('Initializing Enhanced TCG API Controller...');
        
        // Load custom cards from local storage
        this.loadCustomCards();
        
        // Pre-fetch sets for faster UI
        if (this.isApiKeyConfigured()) {
            this.getAllSets().catch(err => {
                console.warn('Failed to pre-fetch TCG sets:', err);
            });
        }
        
        console.log('Enhanced TCG API Controller initialized.');
        return true;
    }
}

export default EnhancedTCGController;