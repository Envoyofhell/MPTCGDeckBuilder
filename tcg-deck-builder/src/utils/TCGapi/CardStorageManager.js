// src/utils/TCGapi/CardStorageManager.js

/**
 * CardStorageManager
 * Handles card data storage and retrieval with optional simple compression.
 * @version 1.1.0 - Added limits and refined compression/decompression.
 */
export class CardStorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            FAVORITES: 'tcg-deck-builder-favorites',
            CUSTOM_CARDS: 'tcg-deck-builder-custom-cards',
            SEARCH_HISTORY: 'tcg-deck-builder-search-history',
            CARD_SUGGESTIONS: 'tcg-deck-builder-card-suggestions',
            // WORK_IN_PROGRESS: 'tcg-deck-builder-wip' // Example for future use
        };

        this.LIMITS = {
            FAVORITES: 200, // Increased limit
            CUSTOM_CARDS: 100, // Increased limit
            SEARCH_HISTORY: 30,
            CARD_SUGGESTIONS: 1000 // For card name autocomplete
        };
        console.log("CardStorageManager initialized with keys:", this.STORAGE_KEYS, "and limits:", this.LIMITS);
    }

    /**
     * Saves data to localStorage.
     * @param {string} key - Storage key.
     * @param {Array|Object} data - Data to save.
     * @param {boolean} useCompression - Whether to compress card objects.
     * @returns {boolean} Success status.
     */
    saveData(key, data, useCompression = true) {
        try {
            let dataToStore = data;
            if (useCompression && Array.isArray(data)) {
                // Apply compression only if it's an array of card-like objects
                dataToStore = {
                    _isCompressed: true,
                    data: data.map(item => (item && typeof item === 'object' && item.id && item.name) ? this._compressCardObject(item) : item),
                    timestamp: Date.now()
                };
            } else if (useCompression && data && typeof data === 'object' && data.id && data.name) {
                 dataToStore = { // For single object if needed, though less common for lists
                    _isCompressed: true,
                    data: this._compressCardObject(data),
                    timestamp: Date.now()
                };
            }


            localStorage.setItem(key, JSON.stringify(dataToStore));
            // console.log(`Saved data to ${key}. Compressed: ${useCompression}. Size: ${JSON.stringify(dataToStore).length}`);
            return true;
        } catch (error) {
            console.error(`Error saving data to ${key}:`, error);
            // Fallback to saving without compression metadata if initial save failed
            try {
                localStorage.setItem(key, JSON.stringify(data));
                // console.warn(`Fallback: Saved data to ${key} without compression wrapper.`);
                return true;
            } catch (fallbackError) {
                console.error(`Fallback save to ${key} also failed:`, fallbackError);
                return false;
            }
        }
    }

    /**
     * Loads data from localStorage.
     * @param {string} key - Storage key.
     * @param {*} defaultValue - Default value if nothing found.
     * @returns {*} The loaded data or default value.
     */
    loadData(key, defaultValue = null) {
        try {
            const storedData = localStorage.getItem(key);
            if (!storedData) {
                return defaultValue;
            }

            const parsed = JSON.parse(storedData);

            if (parsed && parsed._isCompressed === true && Array.isArray(parsed.data)) {
                // console.log(`Loading compressed data from ${key}.`);
                return parsed.data.map(item => this._decompressCardObject(item));
            } else if (parsed && parsed._isCompressed === true && parsed.data) { // Single compressed object
                return this._decompressCardObject(parsed.data);
            }
            // console.log(`Loading uncompressed or non-wrapper data from ${key}.`);
            return parsed; // Return as is if not in the expected compressed wrapper or not an array
        } catch (error) {
            console.error(`Error loading data from ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Compresses a single card object. (Internal helper)
     * @param {Object} card - Card object.
     * @returns {Object} Compressed card object.
     */
    _compressCardObject(card) {
        if (!card || typeof card !== 'object') return card;
        const compressed = {
            i: card.id,
            n: card.name,
            // Keep images structure if present, otherwise use 'image'
            im: card.images ? (card.images.small || card.images.large) : card.image, 
        };
        if (card.supertype) compressed.s = card.supertype;
        if (card.types && card.types.length > 0) compressed.t = card.types;
        if (card.subtypes && card.subtypes.length > 0) compressed.st = card.subtypes;
        if (card.hp) compressed.h = card.hp;
        if (card.rarity) compressed.r = card.rarity;
        if (card.set?.id) compressed.si = card.set.id; // Set ID
        if (card.isCustom) compressed.c = true;
        return compressed;
    }

    /**
     * Decompresses a single card object. (Internal helper)
     * @param {Object} c - Compressed card object.
     * @returns {Object} Decompressed card object.
     */
    _decompressCardObject(c) {
        if (!c || typeof c !== 'object') return c;
        const decompressed = {
            id: c.i,
            name: c.n,
            images: { small: c.im, large: c.im }, // Reconstruct images object
            image: c.im, // For backward compatibility if CardContainer uses .image
        };
        if (c.s) decompressed.supertype = c.s;
        if (c.t) decompressed.types = c.t;
        if (c.st) decompressed.subtypes = c.st;
        if (c.h) decompressed.hp = c.h;
        if (c.r) decompressed.rarity = c.r;
        if (c.si) decompressed.set = { id: c.si }; // Only ID is stored, name/series would need lookup if required
        if (c.c) decompressed.isCustom = true;
        return decompressed;
    }

    // --- Specific Load/Save Methods ---

    saveFavorites(favorites) {
        const limitedFavorites = favorites.length > this.LIMITS.FAVORITES
            ? favorites.slice(0, this.LIMITS.FAVORITES) // Keep newest if adding to front
            : favorites;
        return this.saveData(this.STORAGE_KEYS.FAVORITES, limitedFavorites, true);
    }
    loadFavorites() { return this.loadData(this.STORAGE_KEYS.FAVORITES, []); }

    saveCustomCards(customCards) {
        const limitedCustomCards = customCards.length > this.LIMITS.CUSTOM_CARDS
            ? customCards.slice(0, this.LIMITS.CUSTOM_CARDS)
            : customCards;
        return this.saveData(this.STORAGE_KEYS.CUSTOM_CARDS, limitedCustomCards, true);
    }
    loadCustomCards() { return this.loadData(this.STORAGE_KEYS.CUSTOM_CARDS, []); }

    saveSearchHistory(history) {
        const limitedHistory = history.length > this.LIMITS.SEARCH_HISTORY
            ? history.slice(0, this.LIMITS.SEARCH_HISTORY)
            : history;
        return this.saveData(this.STORAGE_KEYS.SEARCH_HISTORY, limitedHistory, false); // No compression for history
    }
    loadSearchHistory() { return this.loadData(this.STORAGE_KEYS.SEARCH_HISTORY, []); }

    saveCardSuggestions(suggestions) {
         const limitedSuggestions = suggestions.length > this.LIMITS.CARD_SUGGESTIONS
            ? suggestions.slice(0, this.LIMITS.CARD_SUGGESTIONS)
            : suggestions;
        return this.saveData(this.STORAGE_KEYS.CARD_SUGGESTIONS, limitedSuggestions, false);
    }
    loadCardSuggestions() { return this.loadData(this.STORAGE_KEYS.CARD_SUGGESTIONS, []); }
}
