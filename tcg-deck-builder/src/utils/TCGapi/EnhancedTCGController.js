// src/utils/TCGapi/EnhancedTCGController.js
// Modified version for direct image URL support

/**
 * Enhanced TCG API Controller with simplified image handling
 * @version 1.4.0
 */

// Cache manager for API requests
const API_CACHE = {
    cardCache: {},          // By card ID/name
    setCache: null,         // All sets
    searchResultsCache: {}, // By search query
    customCardsCache: [],   // User-created cards
};

// Configuration
const TCGAPI_BASE_URL = "https://api.pokemontcg.io/v2";
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const MAX_CUSTOM_CARDS = 50;  // Limit number of custom cards to prevent storage issues

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
            console.error(`Request timed out for ${url}`);
            throw new Error(`Request for ${resourceName} timed out after ${REQUEST_TIMEOUT / 1000} seconds`);
        }
        
        if (retries > 0 && (!error.response || error.response.status >= 500)) {
            console.log(`Retrying fetch for ${resourceName} (${retries} attempts left)`);
            const delay = (MAX_RETRIES - retries + 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithTimeout(url, options, resourceName, retries - 1);
        }
        
        console.error(`Request failed for ${url}:`, error);
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
     * Initializes the controller, e.g., by loading custom cards.
     */
    static initialize() {
        console.log("EnhancedTCGController initializing...");
        this.loadCustomCards();
        this.cleanupStorage();
        console.log("EnhancedTCGController initialized.");
        return Promise.resolve();
    }
    
    /**
     * Clean up storage to free space
     */
    static cleanupStorage() {
        try {
            // Clear old search caches to free up space
            API_CACHE.searchResultsCache = {};
            
            // If custom cards exceed maximum limit, trim the oldest ones
            if (API_CACHE.customCardsCache.length > MAX_CUSTOM_CARDS) {
                console.log(`Custom cards exceed limit (${API_CACHE.customCardsCache.length}/${MAX_CUSTOM_CARDS}), trimming oldest`);
                API_CACHE.customCardsCache = API_CACHE.customCardsCache.slice(-MAX_CUSTOM_CARDS);
                this.saveCustomCards();
            }
        } catch (error) {
            console.error("Error cleaning up storage:", error);
        }
    }

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
        const cacheKey = generateCacheKey(params);
        
        if (useCache && API_CACHE.searchResultsCache[cacheKey]) {
            console.log(`Using cached results for query: ${cacheKey}`);
            return API_CACHE.searchResultsCache[cacheKey];
        }
        
        const queryParts = [];
        
        if (params.name) {
            queryParts.push(`name:${params.name}`);
        }
        if (params.types && params.types.length > 0) {
            const typeQueries = params.types.map(type => `types:"${type}"`);
            queryParts.push(`(${typeQueries.join(" OR ")})`);
        }
        if (params.subtypes && params.subtypes.length > 0) {
            const subtypeQueries = params.subtypes.map(subtype => `subtypes:"${subtype}"`);
            queryParts.push(`(${subtypeQueries.join(" OR ")})`);
        }
        if (params.supertypes && params.supertypes.length > 0) {
            const supertypeQueries = params.supertypes.map(supertype => `supertype:"${supertype}"`);
            queryParts.push(`(${supertypeQueries.join(" OR ")})`);
        }
        if (params.rarities && params.rarities.length > 0) {
            const rarityQueries = params.rarities.map(rarity => `rarity:"${rarity}"`);
            queryParts.push(`(${rarityQueries.join(" OR ")})`);
        }
        if (params.sets && params.sets.length > 0) {
            const setQueries = params.sets.map(set => `set.id:"${set}"`);
            queryParts.push(`(${setQueries.join(" OR ")})`);
        }
        if (params.legalities) {
            Object.entries(params.legalities).forEach(([format, status]) => {
                if (status) {
                    queryParts.push(`legalities.${format}:"${status}"`);
                }
            });
        }
        
        const query = queryParts.join(' ');
        if (!query) {
            return [];
        }
        
        const url = `${TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&orderBy=-set.releaseDate,number&pageSize=150`;
        console.log(`Searching TCG cards with query: ${query}`);
        
        try {
            const data = await fetchWithTimeout(
                url,
                { headers: getHeaders() },
                `TCG cards with query: ${query}`
            );
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
            console.log("Loading custom cards from local storage");
            const stored = localStorage.getItem('tcg-deck-builder-custom-cards');
            if (stored) {
                API_CACHE.customCardsCache = JSON.parse(stored);
                console.log(`Loaded ${API_CACHE.customCardsCache.length} custom cards`);
            } else {
                console.log("No custom cards found in local storage");
                API_CACHE.customCardsCache = [];
            }
        } catch (error) {
            console.error('Failed to load custom cards from local storage:', error);
            API_CACHE.customCardsCache = [];
        }
    }

    /**
     * Save custom cards to local storage with chunking to avoid quota issues
     */
    static saveCustomCards() {
        try {
            const cardsJson = JSON.stringify(API_CACHE.customCardsCache);
            
            // For very large datasets, implement chunking
            if (cardsJson.length > 2000000) { // ~2MB
                console.log(`Custom cards data is very large (${(cardsJson.length/1024/1024).toFixed(2)}MB), using chunked storage`);
                
                // Clear all existing chunks
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('tcg-deck-builder-custom-cards-chunk-')) {
                        localStorage.removeItem(key);
                    }
                }
                
                // Create chunks of ~500KB
                const chunkSize = 500000; // ~500KB chunks
                const chunks = Math.ceil(cardsJson.length / chunkSize);
                
                // Store metadata
                localStorage.setItem('tcg-deck-builder-custom-cards-meta', JSON.stringify({
                    chunks: chunks,
                    totalSize: cardsJson.length,
                    timestamp: Date.now()
                }));
                
                // Store chunks
                for (let i = 0; i < chunks; i++) {
                    const start = i * chunkSize;
                    const end = Math.min(start + chunkSize, cardsJson.length);
                    const chunk = cardsJson.substring(start, end);
                    localStorage.setItem(`tcg-deck-builder-custom-cards-chunk-${i}`, chunk);
                }
                
                console.log(`Saved ${API_CACHE.customCardsCache.length} custom cards in ${chunks} chunks`);
            } else {
                // For smaller datasets, use the standard approach
                localStorage.setItem('tcg-deck-builder-custom-cards', cardsJson);
                console.log(`Saved ${API_CACHE.customCardsCache.length} custom cards to local storage`);
            }
        } catch (error) {
            console.error('Failed to save custom cards to local storage:', error);
            throw error;
        }
    }

    /**
     * Get all custom cards
     * @returns {Array} Custom cards
     */
    static getCustomCards() {
        if (!API_CACHE.customCardsCache) {
            this.loadCustomCards();
        }
        return [...API_CACHE.customCardsCache];
    }

    /**
     * Add a custom card with direct image URL
     * @param {object} cardData - Card data to add
     * @returns {Promise<object>} Created card
     */
    static async addCustomCard(cardData) {
        try {
            console.log("Adding custom card with data:", cardData);
            
            const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Use the direct image URL provided by the user
            const imageUrl = cardData.imageUrl;
            
            // Create card with direct URL reference
            const card = {
                id: id,
                name: cardData.name,
                supertype: cardData.supertype || 'Pokémon',
                subtypes: cardData.subtypes || [],
                hp: cardData.hp || '',
                types: cardData.types || [],
                rules: cardData.rules || [],
                abilities: cardData.abilities || [],
                attacks: cardData.attacks || [],
                weaknesses: cardData.weaknesses || [],
                resistances: cardData.resistances || [],
                retreatCost: cardData.retreatCost || [],
                convertedRetreatCost: cardData.retreatCost ? cardData.retreatCost.length : 0,
                rarity: 'Custom',
                artist: cardData.artist || 'Custom Artist',
                nationalPokedexNumbers: [],
                legalities: {
                    unlimited: 'Legal',
                    standard: 'Legal',
                    expanded: 'Legal'
                },
                isCustom: true,
                // Store the image URL directly - this will be used for display and export
                image: imageUrl,
                imageUrl: imageUrl, // Keep for backward compatibility
                // Include in images object for API compatibility
                images: {
                    small: imageUrl,
                    large: imageUrl
                },
                number: "C" + Math.floor(Math.random() * 1000),
                set: {
                    id: "custom",
                    name: "Custom Cards",
                    series: "Custom",
                    printedTotal: 0,
                    total: 0,
                    legalities: {
                        unlimited: "Legal",
                        standard: "Legal",
                        expanded: "Legal"
                    },
                    releaseDate: new Date().toISOString().split('T')[0],
                    updatedAt: new Date().toISOString()
                }
            };
            
            if (!API_CACHE.customCardsCache) {
                API_CACHE.customCardsCache = [];
            }
            
            // Check if we need to clean up to make room
            if (API_CACHE.customCardsCache.length >= MAX_CUSTOM_CARDS) {
                // Remove the oldest card
                API_CACHE.customCardsCache.shift();
                console.log("Removed oldest custom card to stay within limit");
            }
            
            API_CACHE.customCardsCache.push(card);
            
            try {
                this.saveCustomCards();
            } catch (storageError) {
                console.error("Error saving custom cards:", storageError);
                // If storage fails, still return the card but with a warning
                console.warn("Card created but not saved to persistent storage");
            }
            
            console.log("Created custom card:", card);
            return card;
        } catch (error) {
            console.error("Error creating custom card:", error);
            throw new Error(`Failed to create custom card: ${error.message}`);
        }
    }
    
    /**
     * Update an existing custom card
     * @param {string} id - ID of the card to update
     * @param {object} cardData - New card data
     * @returns {Promise<object|null>} Updated card or null if not found
     */
    static async updateCustomCard(id, cardData) {
        try {
            console.log(`Updating custom card with ID: ${id}`);
            
            if (!API_CACHE.customCardsCache) {
                API_CACHE.customCardsCache = [];
                console.warn("Custom cards cache not initialized during update attempt.");
                return null; 
            }
            
            const cardIndex = API_CACHE.customCardsCache.findIndex(card => card.id === id);
            if (cardIndex === -1) {
                console.warn(`Card with ID ${id} not found in custom cards cache for update`);
                return null;
            }
            
            const existingCard = API_CACHE.customCardsCache[cardIndex];
            
            // Use the updated image URL or keep the existing one
            const imageUrl = cardData.imageUrl || existingCard.image;
            
            const updatedCard = {
                ...existingCard,
                ...cardData,
                id: existingCard.id, 
                image: imageUrl,
                imageUrl: imageUrl, // Keep for backward compatibility
                images: {
                    small: imageUrl,
                    large: imageUrl
                },
                isCustom: true, 
                set: {
                    ...(existingCard.set || {}), 
                    updatedAt: new Date().toISOString()
                }
            };
            
            API_CACHE.customCardsCache[cardIndex] = updatedCard;
            
            try {
                this.saveCustomCards();
            } catch (storageError) {
                console.error("Error saving updated custom card:", storageError);
                console.warn("Card updated but not saved to persistent storage");
            }
            
            console.log("Updated custom card:", updatedCard);
            return updatedCard;
        } catch (error) {
            console.error("Error updating custom card:", error);
            return null; 
        }
    }

    /**
     * Delete a custom card by ID
     * @param {string} id - Card ID to delete
     * @returns {boolean} Success flag
     */
    static deleteCustomCard(id) {
        try {
            console.log("Deleting custom card with ID:", id);
            
            if (!API_CACHE.customCardsCache) {
                API_CACHE.customCardsCache = [];
                console.warn("Custom cards cache not initialized during delete attempt.");
                return false;
            }
            
            const initialLength = API_CACHE.customCardsCache.length;
            API_CACHE.customCardsCache = API_CACHE.customCardsCache.filter(card => card.id !== id);
            
            const success = API_CACHE.customCardsCache.length < initialLength;
            if (success) {
                console.log(`Successfully deleted custom card with ID: ${id}`);
                try {
                    this.saveCustomCards();
                } catch (storageError) {
                    console.error("Error saving after custom card deletion:", storageError);
                    console.warn("Card deleted from memory but storage not updated");
                }
            } else {
                console.warn(`Card with ID ${id} not found in custom cards cache for deletion`);
            }
            return success;
        } catch (error) {
            console.error("Error deleting custom card:", error);
            return false;
        }
    }
    
    /**
     * Clear API cache
     * @param {string} cacheType - Type of cache to clear ('all', 'cards', 'sets', 'search', 'custom')
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
            case 'custom':
                API_CACHE.customCardsCache = [];
                // Remove all chunks too
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key === 'tcg-deck-builder-custom-cards' || 
                                key === 'tcg-deck-builder-custom-cards-meta' || 
                                key.startsWith('tcg-deck-builder-custom-cards-chunk-'))) {
                        localStorage.removeItem(key);
                    }
                }
                console.log("Custom cards cache cleared from memory and storage.");
                break;
            case 'all':
            default:
                API_CACHE.cardCache = {};
                API_CACHE.setCache = null;
                API_CACHE.searchResultsCache = {};
                break;
        }
    }
}

export default EnhancedTCGController;