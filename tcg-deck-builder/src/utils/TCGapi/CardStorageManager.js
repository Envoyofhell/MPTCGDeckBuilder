// src/utils/TCGapi/CardStorageManager.js

/**
 * CardStorageManager
 * Handles card data storage and retrieval with compression to optimize localStorage usage
 * @version 1.0.0
 */
export class CardStorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            FAVORITES: 'tcg-deck-builder-favorites',
            CUSTOM_CARDS: 'tcg-deck-builder-custom-cards',
            SEARCH_HISTORY: 'tcg-deck-builder-search-history',
            CARD_SUGGESTIONS: 'tcg-deck-builder-card-suggestions',
            WORK_IN_PROGRESS: 'tcg-deck-builder-wip'
        };
        
        // Maximum number of items to store
        this.LIMITS = {
            FAVORITES: 100,
            CUSTOM_CARDS: 50,
            SEARCH_HISTORY: 30,
            CARD_SUGGESTIONS: 1000
        };
    }
    
    /**
     * Saves data to localStorage with compression
     * @param {string} key - Storage key
     * @param {Array|Object} data - Data to save
     * @param {boolean} compress - Whether to compress the data
     * @returns {boolean} Success status
     */
    saveData(key, data, compress = true) {
        try {
            let dataToStore;
            
            if (compress) {
                // Create a metadata wrapper with compression flag
                dataToStore = {
                    _isCompressed: true,
                    data: this.compressData(data),
                    timestamp: Date.now()
                };
            } else {
                dataToStore = data;
            }
            
            localStorage.setItem(key, JSON.stringify(dataToStore));
            return true;
        } catch (error) {
            console.error(`Error saving data to ${key}:`, error);
            
            // If compression failed, try without compression
            if (compress) {
                try {
                    localStorage.setItem(key, JSON.stringify(data));
                    return true;
                } catch (fallbackError) {
                    console.error(`Fallback save also failed:`, fallbackError);
                }
            }
            
            return false;
        }
    }
    
    /**
     * Loads data from localStorage with decompression
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if nothing found
     * @returns {*} The loaded data or default value
     */
    loadData(key, defaultValue = null) {
        try {
            const storedData = localStorage.getItem(key);
            
            if (!storedData) {
                return defaultValue;
            }
            
            // Parse the stored data
            const parsed = JSON.parse(storedData);
            
            // Check if it's in the compressed format
            if (parsed && parsed._isCompressed === true) {
                return this.decompressData(parsed.data);
            }
            
            // Otherwise, return as is
            return parsed;
        } catch (error) {
            console.error(`Error loading data from ${key}:`, error);
            return defaultValue;
        }
    }
    
    /**
     * Compresses card data to save space
     * Uses shortened property names and removes unnecessary properties
     * @param {Array|Object} data - Card data to compress
     * @returns {Array|Object} Compressed data
     */
    compressData(data) {
        if (Array.isArray(data)) {
            return data.map(this.compressCardObject);
        } else if (data && typeof data === 'object') {
            return this.compressCardObject(data);
        }
        
        return data;
    }
    
    /**
     * Compresses a single card object
     * @param {Object} card - Card object
     * @returns {Object} Compressed card object
     */
    compressCardObject(card) {
        if (!card || typeof card !== 'object') {
            return card;
        }
        
        // Basic compression: keep only essential fields and use abbreviated keys
        const compressed = {
            i: card.id, // id
            n: card.name, // name
            s: card.supertype, // supertype
            t: card.types || [], // types
            im: card.image || (card.images?.large || card.images?.small), // image
            st: card.subtypes || [], // subtypes
        };
        
        // Only include HP if it exists
        if (card.hp) {
            compressed.h = card.hp;
        }
        
        // Only include rarity if it exists
        if (card.rarity) {
            compressed.r = card.rarity;
        }
        
        // Only include number if it exists
        if (card.number) {
            compressed.no = card.number;
        }
        
        // Include set info in compressed format if available
        if (card.set) {
            compressed.se = {
                i: card.set.id,
                n: card.set.name
            };
        }
        
        // If it's a custom card, mark it as such
        if (card.isCustom) {
            compressed.c = true;
        }
        
        return compressed;
    }
    
    /**
     * Decompresses card data
     * @param {Array|Object} compressedData - Compressed card data
     * @returns {Array|Object} Decompressed data
     */
    decompressData(compressedData) {
        if (Array.isArray(compressedData)) {
            return compressedData.map(this.decompressCardObject);
        } else if (compressedData && typeof compressedData === 'object') {
            return this.decompressCardObject(compressedData);
        }
        
        return compressedData;
    }
    
    /**
     * Decompresses a single card object
     * @param {Object} c - Compressed card object
     * @returns {Object} Decompressed card object
     */
    decompressCardObject(c) {
        if (!c || typeof c !== 'object') {
            return c;
        }
        
        // Convert abbreviated fields back to full format
        const decompressed = {
            id: c.i,
            name: c.n,
            supertype: c.s,
            types: c.t || [],
            subtypes: c.st || [],
            // Ensure images object exists for compatibility
            images: {
                large: c.im,
                small: c.im
            },
            image: c.im
        };
        
        // Restore HP if it exists
        if (c.h) {
            decompressed.hp = c.h;
        }
        
        // Restore rarity if it exists
        if (c.r) {
            decompressed.rarity = c.r;
        }
        
        // Restore number if it exists
        if (c.no) {
            decompressed.number = c.no;
        }
        
        // Restore set info if available
        if (c.se) {
            decompressed.set = {
                id: c.se.i,
                name: c.se.n
            };
        }
        
        // Restore custom flag if it exists
        if (c.c) {
            decompressed.isCustom = true;
        }
        
        return decompressed;
    }
    
    /**
     * Saves favorite cards
     * @param {Array} favorites - Favorite cards
     * @returns {boolean} Success status
     */
    saveFavorites(favorites) {
        // If we're over the limit, trim the oldest favorites
        if (favorites.length > this.LIMITS.FAVORITES) {
            favorites = favorites.slice(-this.LIMITS.FAVORITES);
        }
        
        return this.saveData(this.STORAGE_KEYS.FAVORITES, favorites);
    }
    
    /**
     * Loads favorite cards
     * @returns {Array} Favorite cards
     */
    loadFavorites() {
        return this.loadData(this.STORAGE_KEYS.FAVORITES, []);
    }
    
    /**
     * Saves custom cards
     * @param {Array} customCards - Custom cards
     * @returns {boolean} Success status
     */
    saveCustomCards(customCards) {
        // If we're over the limit, trim the oldest custom cards
        if (customCards.length > this.LIMITS.CUSTOM_CARDS) {
            customCards = customCards.slice(-this.LIMITS.CUSTOM_CARDS);
        }
        
        return this.saveData(this.STORAGE_KEYS.CUSTOM_CARDS, customCards);
    }
    
    /**
     * Loads custom cards
     * @returns {Array} Custom cards
     */
    loadCustomCards() {
        return this.loadData(this.STORAGE_KEYS.CUSTOM_CARDS, []);
    }
    
    /**
     * Saves search history
     * @param {Array} history - Search history
     * @returns {boolean} Success status
     */
    saveSearchHistory(history) {
        // If we're over the limit, trim the oldest history items
        if (history.length > this.LIMITS.SEARCH_HISTORY) {
            history = history.slice(-this.LIMITS.SEARCH_HISTORY);
        }
        
        return this.saveData(this.STORAGE_KEYS.SEARCH_HISTORY, history, false); // Don't compress search history
    }
    
    /**
     * Loads search history
     * @returns {Array} Search history
     */
    loadSearchHistory() {
        return this.loadData(this.STORAGE_KEYS.SEARCH_HISTORY, []);
    }
    
    /**
     * Saves card suggestions
     * @param {Array} suggestions - Card name suggestions
     * @returns {boolean} Success status
     */
    saveCardSuggestions(suggestions) {
        // Card suggestions can be stored without compression as they're just strings
        return this.saveData(this.STORAGE_KEYS.CARD_SUGGESTIONS, suggestions, false);
    }
    
    /**
     * Loads card suggestions
     * @returns {Array} Card name suggestions
     */
    loadCardSuggestions() {
        return this.loadData(this.STORAGE_KEYS.CARD_SUGGESTIONS, []);
    }
    
    /**
     * Saves work in progress deck
     * @param {Object} deck - WIP deck
     * @returns {boolean} Success status
     */
    saveWorkInProgress(deck) {
        return this.saveData(this.STORAGE_KEYS.WORK_IN_PROGRESS, deck);
    }
    
    /**
     * Loads work in progress deck
     * @returns {Object} WIP deck
     */
    loadWorkInProgress() {
        return this.loadData(this.STORAGE_KEYS.WORK_IN_PROGRESS, {});
    }
    
    /**
     * Clears all stored data
     * @returns {boolean} Success status
     */
    clearAllData() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (error) {
            console.error('Error clearing all data:', error);
            return false;
        }
    }
    
    /**
     * Exports all stored data as a JSON blob for backup
     * @returns {string} JSON string of all data
     */
    exportAllData() {
        try {
            const exportData = {};
            
            Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
                const data = localStorage.getItem(key);
                if (data) {
                    exportData[name] = JSON.parse(data);
                }
            });
            
            return JSON.stringify(exportData);
        } catch (error) {
            console.error('Error exporting data:', error);
            return null;
        }
    }
    
    /**
     * Imports data from a JSON backup
     * @param {string} jsonData - JSON string of backup data
     * @returns {boolean} Success status
     */
    importDataFromBackup(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            Object.entries(this.STORAGE_KEYS).forEach(([name, key]) => {
                if (importData[name]) {
                    localStorage.setItem(key, JSON.stringify(importData[name]));
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Singleton instance
export const cardStorageManager = new CardStorageManager();