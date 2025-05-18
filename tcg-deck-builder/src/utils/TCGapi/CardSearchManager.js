// src/utils/TCGapi/CardSearchManager.js

/**
 * CardSearchManager
 * Handles card search operations with caching and advanced filtering
 * @version 1.0.0
 */
export class CardSearchManager {
    constructor() {
        this.API_CACHE = {
            searchResultsCache: {},
            setsCache: null,
            subtypesCache: null,
            raritiesCache: null,
            artistsCache: null
        };
        
        // Configuration
        this.TCGAPI_BASE_URL = "https://api.pokemontcg.io/v2";
        this.REQUEST_TIMEOUT = 15000; // 15 seconds
        this.MAX_RETRIES = 3;
        this.CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // API key from environment or default
        this.API_KEY = process.env.REACT_APP_POKEMON_TCG_API_KEY || 'a65acbfc-55e5-4d2c-9278-253872a1bc5a';
        
        // Energy types preloaded
        this.ENERGY_TYPES = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];
    }
    
    /**
     * Generate fetch options with headers
     * @returns {Object} Fetch options
     */
    getFetchOptions() {
        return {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': this.API_KEY
            }
        };
    }
    
    /**
     * Generate cache key from parameters
     * @param {Object} params - Query parameters
     * @param {Number} page - Page number
     * @param {Number} pageSize - Results per page
     * @returns {String} Cache key
     */
    generateCacheKey(params, page = 1, pageSize = 24) {
        return `${JSON.stringify(params)}_page${page}_size${pageSize}`;
    }
    
    /**
     * Fetch with timeout and retry logic
     * @param {String} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {String} resourceName - Resource name for logging
     * @param {Number} retries - Number of retries left
     * @returns {Promise<Object>} Response data
     */
    async fetchWithTimeout(url, options = {}, resourceName = 'resource', retries = this.MAX_RETRIES) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);
        
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
                throw new Error(`Request for ${resourceName} timed out after ${this.REQUEST_TIMEOUT / 1000} seconds`);
            }
            
            if (retries > 0 && (!error.response || error.response.status >= 500)) {
                console.log(`Retrying fetch for ${resourceName} (${retries} attempts left)`);
                const delay = (this.MAX_RETRIES - retries + 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithTimeout(url, options, resourceName, retries - 1);
            }
            
            console.error(`Request failed for ${url}:`, error);
            throw error;
        }
    }
    
    /**
     * Build query string from parameters
     * @param {Object} params - Search parameters
     * @returns {String} Query string
     */
    buildQueryString(params) {
        const queryParts = [];
        
        // Handle name search based on mode
        if (params.name) {
            queryParts.push(`name:${params.name}`);
        }
        
        // Handle array parameters
        const arrayParams = {
            types: 'types',
            subtypes: 'subtypes',
            supertypes: 'supertype',
            rarities: 'rarity',
            sets: 'set.id',
            artist: 'artist',
            nationalPokedexNumbers: 'nationalPokedexNumbers',
            regulationMark: 'regulationMark'
        };
        
        Object.entries(arrayParams).forEach(([paramKey, queryKey]) => {
            if (params[paramKey] && Array.isArray(params[paramKey]) && params[paramKey].length > 0) {
                const values = params[paramKey];
                
                // For multiple values, use OR operator
                if (values.length > 1) {
                    const subQueries = values.map(value => `${queryKey}:"${value}"`);
                    queryParts.push(`(${subQueries.join(" OR ")})`);
                } else {
                    queryParts.push(`${queryKey}:"${values[0]}"`);
                }
            }
        });
        
        // Handle HP range
        if (params.hp) {
            queryParts.push(`hp:${params.hp}`);
        }
        
        // Handle retreat cost range
        if (params.retreatCost) {
            queryParts.push(`convertedRetreatCost:${params.retreatCost}`);
        }
        
        // Handle attack cost
        if (params.attackCost) {
            // This depends on how the API is designed to handle attack cost queries
            queryParts.push(`attacks.cost:"${params.attackCost}"`);
        }
        
        // Handle flavor text
        if (params.flavorText) {
            queryParts.push(`flavorText:${params.flavorText}`);
        }
        
        // Handle ability flag
        if (params.hasAbility) {
            queryParts.push(`abilities.name:*`);
        }
        
        // Handle legalities
        if (params.legalities) {
            Object.entries(params.legalities).forEach(([format, status]) => {
                if (status) {
                    queryParts.push(`legalities.${format}:"${status}"`);
                }
            });
        }
        
        return queryParts.join(' ');
    }
    
    /**
     * Perform advanced search with pagination
     * @param {Object} params - Search parameters
     * @param {Number} page - Page number (starting from 1)
     * @param {Number} pageSize - Results per page
     * @returns {Promise<Object>} Search results with pagination
     */
    async advancedSearch(params = {}, page = 1, pageSize = 24) {
        // Validate inputs
        page = Math.max(1, parseInt(page) || 1);
        pageSize = Math.min(Math.max(1, parseInt(pageSize) || 24), 250); // Ensure pageSize is between 1 and 250
        
        // Cache key includes pagination info
        const cacheKey = this.generateCacheKey(params, page, pageSize);
        
        // Check cache first
        if (this.API_CACHE.searchResultsCache[cacheKey]) {
            const cachedResult = this.API_CACHE.searchResultsCache[cacheKey];
            
            // Check if the cache is still valid
            if (Date.now() - cachedResult.timestamp < this.CACHE_EXPIRY) {
                console.log(`Using cached results for advanced search: ${cacheKey}`);
                return cachedResult.data;
            }
            
            // If cache is expired, delete it
            delete this.API_CACHE.searchResultsCache[cacheKey];
        }
        
        // Build query string
        const query = this.buildQueryString(params);
        
        // Construct URL with query, pagination, and sorting
        const url = query
            ? `${this.TCGAPI_BASE_URL}/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate,number`
            : `${this.TCGAPI_BASE_URL}/cards?page=${page}&pageSize=${pageSize}&orderBy=-set.releaseDate,number`;
        
        console.log(`Performing advanced search: ${url}`);
        
        try {
            // Make the API request
            const data = await this.fetchWithTimeout(
                url,
                this.getFetchOptions(),
                `Advanced card search (page ${page})`
            );
            
            // Structure results with pagination
            const results = {
                data: data?.data || [],
                pagination: {
                    page: data.page || page,
                    pageSize: data.pageSize || pageSize,
                    count: data?.data?.length || 0,
                    totalCount: data.totalCount || (data?.data?.length || 0),
                    totalPages: data.totalCount ? Math.ceil(data.totalCount / pageSize) : 1
                }
            };
            
            // Cache the results with timestamp
            this.API_CACHE.searchResultsCache[cacheKey] = {
                data: results,
                timestamp: Date.now()
            };
            
            return results;
        } catch (error) {
            console.error(`Error in advanced search: ${error.message}`);
            
            // Return empty results on error
            return {
                data: [],
                pagination: {
                    page: page,
                    pageSize: pageSize,
                    count: 0,
                    totalCount: 0,
                    totalPages: 0
                }
            };
        }
    }
    
    /**
     * Get all available sets
     * @param {Boolean} useCache - Whether to use cache
     * @returns {Promise<Array>} List of sets
     */
    async getAllSets(useCache = true) {
        // Check cache first
        if (useCache && this.API_CACHE.setsCache && 
            (Date.now() - this.API_CACHE.setsCache.timestamp < this.CACHE_EXPIRY)) {
            console.log(`Using cached sets`);
            return this.API_CACHE.setsCache.data;
        }
        
        const url = `${this.TCGAPI_BASE_URL}/sets?orderBy=-releaseDate`;
        console.log(`Fetching TCG sets: ${url}`);
        
        try {
            const data = await this.fetchWithTimeout(
                url,
                this.getFetchOptions(),
                `TCG sets`
            );
            
            // Cache the results with timestamp
            this.API_CACHE.setsCache = {
                data: data?.data || [],
                timestamp: Date.now()
            };
            
            return data?.data || [];
        } catch (error) {
            console.error(`Error fetching TCG sets: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Get all available subtypes
     * @param {Boolean} useCache - Whether to use cache
     * @returns {Promise<Array>} List of subtypes
     */
    async getAllSubtypes(useCache = true) {
        // Check cache first
        if (useCache && this.API_CACHE.subtypesCache && 
            (Date.now() - this.API_CACHE.subtypesCache.timestamp < this.CACHE_EXPIRY)) {
            return this.API_CACHE.subtypesCache.data;
        }
        
        try {
            const url = `${this.TCGAPI_BASE_URL}/subtypes`;
            console.log(`Fetching all subtypes: ${url}`);
            
            const data = await this.fetchWithTimeout(
                url,
                this.getFetchOptions(),
                'TCG subtypes'
            );
            
            const subtypes = data?.data || [];
            
            // Cache the results with timestamp
            this.API_CACHE.subtypesCache = {
                data: subtypes,
                timestamp: Date.now()
            };
            
            return subtypes;
        } catch (error) {
            console.error(`Error fetching subtypes: ${error.message}`);
            
            // Fallback to hardcoded common subtypes
            return [
                'Basic', 'Stage 1', 'Stage 2', 'V', 'VMAX', 'VSTAR', 'ex',
                'GX', 'EX', 'Mega', 'BREAK', 'Baby', 'Tag Team',
                'Item', 'Tool', 'Supporter', 'Stadium', 'Ace Spec'
            ];
        }
    }
    
    /**
     * Get all available rarities
     * @param {Boolean} useCache - Whether to use cache
     * @returns {Promise<Array>} List of rarities
     */
    async getAllRarities(useCache = true) {
        // Check cache first
        if (useCache && this.API_CACHE.raritiesCache && 
            (Date.now() - this.API_CACHE.raritiesCache.timestamp < this.CACHE_EXPIRY)) {
            return this.API_CACHE.raritiesCache.data;
        }
        
        try {
            const url = `${this.TCGAPI_BASE_URL}/rarities`;
            console.log(`Fetching all rarities: ${url}`);
            
            const data = await this.fetchWithTimeout(
                url,
                this.getFetchOptions(),
                'TCG rarities'
            );
            
            const rarities = data?.data || [];
            
            // Cache the results with timestamp
            this.API_CACHE.raritiesCache = {
                data: rarities,
                timestamp: Date.now()
            };
            
            return rarities;
        } catch (error) {
            console.error(`Error fetching rarities: ${error.message}`);
            
            // Fallback to hardcoded common rarities
            return [
                'Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Ultra', 
                'Rare Holo EX', 'Rare Rainbow', 'Rare Secret', 'Promo'
            ];
        }
    }
    
    /**
     * Get all available cards for name suggestions
     * @param {Number} limit - Maximum number of cards to fetch
     * @returns {Promise<Array>} List of card names
     */
    async getCardNameSuggestions(limit = 500) {
        try {
            // Use a representative sample by getting the most recent cards
            const url = `${this.TCGAPI_BASE_URL}/cards?page=1&pageSize=${limit}&orderBy=-set.releaseDate`;
            
            const data = await this.fetchWithTimeout(
                url,
                this.getFetchOptions(),
                'Card name suggestions'
            );
            
            if (!data?.data) {
                return [];
            }
            
            // Extract unique card names
            const cardNames = [...new Set(data.data.map(card => card.name))].sort();
            return cardNames;
        } catch (error) {
            console.error(`Error fetching card name suggestions: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Extract artist names from a sample of cards
     * @param {Number} sampleSize - Number of cards to sample
     * @returns {Promise<Array>} List of artist names
     */
    async getArtistList(sampleSize = 100) {
        // Check cache first
        if (this.API_CACHE.artistsCache && 
            (Date.now() - this.API_CACHE.artistsCache.timestamp < this.CACHE_EXPIRY)) {
            return this.API_CACHE.artistsCache.data;
        }
        
        try {
            // Get a sample of cards
            const url = `${this.TCGAPI_BASE_URL}/cards?pageSize=${sampleSize}&orderBy=-set.releaseDate`;
            
            const data = await this.fetchWithTimeout(
                url,
                this.getFetchOptions(),
                'Artist sample'
            );
            
            if (!data?.data) {
                return [];
            }
            
            // Extract unique artist names
            const artists = [...new Set(data.data.map(card => card.artist).filter(Boolean))].sort();
            
            // Cache the results with timestamp
            this.API_CACHE.artistsCache = {
                data: artists,
                timestamp: Date.now()
            };
            
            return artists;
        } catch (error) {
            console.error(`Error fetching artist list: ${error.message}`);
            return [];
        }
    }
    
    /**
     * Clear search cache
     */
    clearSearchCache() {
        this.API_CACHE.searchResultsCache = {};
        console.log("Search cache cleared");
    }
    
    /**
     * Clear all caches
     */
    clearAllCaches() {
        this.API_CACHE = {
            searchResultsCache: {},
            setsCache: null,
            subtypesCache: null,
            raritiesCache: null,
            artistsCache: null
        };
        console.log("All caches cleared");
    }
}

// Singleton instance
export const cardSearchManager = new CardSearchManager();