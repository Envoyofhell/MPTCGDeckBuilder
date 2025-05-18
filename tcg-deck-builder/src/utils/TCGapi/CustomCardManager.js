// src/utils/TCGapi/CustomCardManager.js - Properly cased file

/**
 * CustomCardManager
 * Manages creation, storage, and manipulation of custom cards with improved search
 * @version 1.1.0
 */
export class CustomCardManager {
    constructor() {
        this.STORAGE_KEY = 'tcg-deck-builder-custom-cards';
        this.MAX_CUSTOM_CARDS = 50;
        this.customCards = [];
        this.isInitialized = false;
        
        // Default placeholder images for different card types
        this.DEFAULT_IMAGES = {
            'Pokémon': 'https://images.pokemontcg.io/sv5/4/high.png', // Example: Charizard
            'Trainer': 'https://images.pokemontcg.io/sv1/196/high.png', // Example: Professor's Research
            'Energy': 'https://images.pokemontcg.io/sve/8/high.png', // Example: Basic Lightning Energy
            'Unknown': 'https://via.placeholder.com/250x350.png?text=No+Image'
        };
    }
    
    /**
     * Initialize manager by loading custom cards from storage
     */
    initialize() {
        if (!this.isInitialized) {
            this.loadCustomCards();
            this.isInitialized = true;
        }
        return this.customCards;
    }
    
    /**
     * Load custom cards from localStorage
     */
    loadCustomCards() {
        try {
            console.log("Loading custom cards from local storage");
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                // Try to parse the stored data
                const parsed = JSON.parse(stored);
                
                // Check if it's using the compressed format
                if (parsed && parsed._isCompressed) {
                    this.customCards = this.decompressCardData(parsed.data);
                } else {
                    // Use the data as is
                    this.customCards = parsed;
                }
                
                console.log(`Loaded ${this.customCards.length} custom cards`);
            } else {
                console.log("No custom cards found in local storage");
                this.customCards = [];
            }
        } catch (error) {
            console.error('Failed to load custom cards from local storage:', error);
            this.customCards = [];
        }
    }
    
    /**
     * Save custom cards to localStorage
     */
    saveCustomCards() {
        try {
            // If we have too many custom cards, trim the oldest ones
            if (this.customCards.length > this.MAX_CUSTOM_CARDS) {
                console.log(`Custom cards exceed limit (${this.customCards.length}/${this.MAX_CUSTOM_CARDS}), trimming oldest`);
                this.customCards = this.customCards.slice(-this.MAX_CUSTOM_CARDS);
            }
            
            // Compress the data
            const compressed = {
                _isCompressed: true,
                data: this.compressCardData(this.customCards),
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(compressed));
            console.log(`Saved ${this.customCards.length} custom cards to local storage`);
        } catch (error) {
            console.error('Failed to save custom cards to local storage:', error);
            
            // Try again without compression
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customCards));
                console.log(`Saved ${this.customCards.length} custom cards without compression`);
            } catch (fallbackError) {
                console.error('Fallback save also failed:', fallbackError);
                throw error;
            }
        }
    }
    
    /**
     * Compress card data to save space
     * @param {Array} cards - Card data to compress
     * @returns {Array} Compressed card data
     */
    compressCardData(cards) {
        return cards.map(card => ({
            i: card.id, // id
            n: card.name, // name
            s: card.supertype, // supertype
            t: card.types || [], // types
            st: card.subtypes || [], // subtypes
            h: card.hp || '', // hp
            im: card.image || card.imageUrl || '', // image
            a: card.abilities?.map(ability => ({
                n: ability.name,
                t: ability.type,
                x: ability.text
            })) || [], // abilities
            at: card.attacks?.map(attack => ({
                n: attack.name,
                c: attack.cost || [],
                d: attack.damage || '',
                x: attack.text || ''
            })) || [], // attacks
            w: card.weaknesses?.map(weakness => ({
                t: weakness.type,
                v: weakness.value
            })) || [], // weaknesses
            r: card.resistances?.map(resistance => ({
                t: resistance.type,
                v: resistance.value
            })) || [], // resistances
            rt: card.retreatCost?.length || 0, // retreat cost
            c: true // custom flag
        }));
    }
    
    /**
     * Decompress card data
     * @param {Array} compressedData - Compressed card data
     * @returns {Array} Decompressed card data
     */
    decompressCardData(compressedData) {
        return compressedData.map(c => {
            const card = {
                id: c.i,
                name: c.n,
                supertype: c.s,
                types: c.t || [],
                subtypes: c.st || [],
                hp: c.h || '',
                image: c.im,
                imageUrl: c.im,
                isCustom: true,
                images: {
                    small: c.im,
                    large: c.im
                },
                legalities: {
                    unlimited: 'Legal',
                    standard: 'Legal',
                    expanded: 'Legal'
                },
                number: c.i.substring(c.i.lastIndexOf('-') + 1),
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
            
            // Restore abilities if they exist
            if (c.a && c.a.length > 0) {
                card.abilities = c.a.map(ability => ({
                    name: ability.n,
                    type: ability.t,
                    text: ability.x
                }));
            }
            
            // Restore attacks if they exist
            if (c.at && c.at.length > 0) {
                card.attacks = c.at.map(attack => ({
                    name: attack.n,
                    cost: attack.c || [],
                    convertedEnergyCost: attack.c?.length || 0,
                    damage: attack.d || '',
                    text: attack.x || ''
                }));
            }
            
            // Restore weaknesses if they exist
            if (c.w && c.w.length > 0) {
                card.weaknesses = c.w.map(weakness => ({
                    type: weakness.t,
                    value: weakness.v
                }));
            }
            
            // Restore resistances if they exist
            if (c.r && c.r.length > 0) {
                card.resistances = c.r.map(resistance => ({
                    type: resistance.t,
                    value: resistance.v
                }));
            }
            
            // Restore retreat cost if it exists
            if (c.rt && c.rt > 0) {
                card.retreatCost = Array(c.rt).fill('Colorless');
                card.convertedRetreatCost = c.rt;
            }
            
            return card;
        });
    }
    
    /**
     * Get all custom cards
     * @returns {Array} Custom cards
     */
    getAllCustomCards() {
        if (!this.isInitialized) {
            this.initialize();
        }
        return [...this.customCards];
    }
    
    /**
     * Search custom cards by name or attributes
     * @param {string} query - Search term
     * @returns {Array} Filtered custom cards
     */
    searchCustomCards(query) {
        if (!query || query.trim() === '') {
            return this.getAllCustomCards();
        }
        
        // Normalize query for case-insensitive search
        const normalizedQuery = query.toLowerCase().trim();
        
        return this.customCards.filter(card => {
            // Search in card name
            if (card.name && card.name.toLowerCase().includes(normalizedQuery)) {
                return true;
            }
            
            // Search in subtypes
            if (card.subtypes && card.subtypes.some(subtype => 
                subtype.toLowerCase().includes(normalizedQuery))) {
                return true;
            }
            
            // Search in types (for Pokémon cards)
            if (card.types && card.types.some(type => 
                type.toLowerCase().includes(normalizedQuery))) {
                return true;
            }
            
            // Search in abilities
            if (card.abilities && card.abilities.some(ability => 
                ability.name.toLowerCase().includes(normalizedQuery) || 
                ability.text.toLowerCase().includes(normalizedQuery))) {
                return true;
            }
            
            // Search in attacks
            if (card.attacks && card.attacks.some(attack => 
                attack.name.toLowerCase().includes(normalizedQuery) || 
                (attack.text && attack.text.toLowerCase().includes(normalizedQuery)))) {
                return true;
            }
            
            // Search in rules text
            if (card.rules && card.rules.some(rule => 
                rule.toLowerCase().includes(normalizedQuery))) {
                return true;
            }
            
            return false;
        });
    }
    
    /**
     * Get a custom card by ID
     * @param {String} id - Card ID
     * @returns {Object|null} Custom card or null if not found
     */
    getCustomCard(id) {
        if (!this.isInitialized) {
            this.initialize();
        }
        return this.customCards.find(card => card.id === id) || null;
    }
    
    /**
     * Create a new custom card
     * @param {Object} cardData - Card data
     * @returns {Object} Created card
     */
    createCustomCard(cardData) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        try {
            console.log("Creating custom card with data:", cardData);
            
            // Generate a unique ID
            const id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            
            // Use the direct image URL provided by the user
            const imageUrl = cardData.imageUrl || this.DEFAULT_IMAGES[cardData.supertype || 'Unknown'];
            
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
            
            // Check if we need to clean up to make room
            if (this.customCards.length >= this.MAX_CUSTOM_CARDS) {
                // Remove the oldest card
                this.customCards.shift();
                console.log("Removed oldest custom card to stay within limit");
            }
            
            // Add the new card
            this.customCards.push(card);
            
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
     * @param {String} id - Card ID
     * @param {Object} cardData - New card data
     * @returns {Object|null} Updated card or null if not found
     */
    updateCustomCard(id, cardData) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        try {
            console.log(`Updating custom card with ID: ${id}`);
            
            // Find the card to update
            const cardIndex = this.customCards.findIndex(card => card.id === id);
            if (cardIndex === -1) {
                console.warn(`Card with ID ${id} not found in custom cards`);
                return null;
            }
            
            const existingCard = this.customCards[cardIndex];
            
            // Use the updated image URL or keep the existing one
            const imageUrl = cardData.imageUrl || existingCard.image;
            
            // Create updated card
            const updatedCard = {
                ...existingCard,
                ...cardData,
                id: existingCard.id, // Preserve the original ID
                image: imageUrl,
                imageUrl: imageUrl, // Keep for backward compatibility
                images: {
                    small: imageUrl,
                    large: imageUrl
                },
                isCustom: true, // Always mark as custom
                set: {
                    ...(existingCard.set || {}), // Preserve set data
                    updatedAt: new Date().toISOString()
                }
            };
            
            // Update the card in the array
            this.customCards[cardIndex] = updatedCard;
            
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
     * Delete a custom card
     * @param {String} id - Card ID
     * @returns {Boolean} Success status
     */
    deleteCustomCard(id) {
        if (!this.isInitialized) {
            this.initialize();
        }
        
        try {
            console.log("Deleting custom card with ID:", id);
            
            // Find and remove the card
            const initialLength = this.customCards.length;
            this.customCards = this.customCards.filter(card => card.id !== id);
            
            const success = this.customCards.length < initialLength;
            if (success) {
                console.log(`Successfully deleted custom card with ID: ${id}`);
                try {
                    this.saveCustomCards();
                } catch (storageError) {
                    console.error("Error saving after custom card deletion:", storageError);
                    console.warn("Card deleted from memory but storage not updated");
                }
            } else {
                console.warn(`Card with ID ${id} not found in custom cards`);
            }
            
            return success;
        } catch (error) {
            console.error("Error deleting custom card:", error);
            return false;
        }
    }
    
    /**
     * Export custom cards to a dedicated format 
     * @param {Array} cards - Cards to export (or all if not specified)
     * @param {Boolean} includeFullMetadata - Whether to include all metadata
     * @returns {String} JSON string with custom cards data
     */
    exportCustomCardsToFile(cards = null, includeFullMetadata = true) {
        try {
            const cardsToExport = cards || this.getAllCustomCards();
            
            if (includeFullMetadata) {
                // Export complete card data
                return JSON.stringify(cardsToExport, null, 2);
            } else {
                // Export simplified card data
                const simplifiedCards = cardsToExport.map(card => ({
                    name: card.name,
                    supertype: card.supertype,
                    subtypes: card.subtypes || [],
                    hp: card.hp || '',
                    types: card.types || [],
                    image: card.image || card.imageUrl,
                    // Include only essential fields for compatibility
                }));
                return JSON.stringify(simplifiedCards, null, 2);
            }
        } catch (error) {
            console.error('Error exporting custom cards:', error);
            throw new Error(`Failed to export custom cards: ${error.message}`);
        }
    }
    
    /**
     * Import custom cards from file
     * @param {String} jsonData - JSON string with card data
     * @returns {Object} Result with success status and count of imported cards
     */
    importCustomCardsFromFile(jsonData) {
        try {
            // Parse the JSON data
            const importedCards = JSON.parse(jsonData);
            
            // Validate it's an array
            if (!Array.isArray(importedCards)) {
                throw new Error('Invalid format: expected an array of cards');
            }
            
            // Validate each card has the minimum required fields
            const validCards = importedCards.filter(card => 
                card && 
                card.name && 
                card.supertype && 
                (card.image || card.imageUrl));
            
            if (validCards.length === 0) {
                throw new Error('No valid cards found in import data');
            }
            
            // Process each card and generate proper custom card format
            const processedCards = validCards.map(card => {
                // Generate a unique ID if not present
                const id = card.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                
                // Use the image URL provided or default
                const imageUrl = card.image || card.imageUrl || this.DEFAULT_IMAGES[card.supertype || 'Unknown'];
                
                // Create a properly formatted custom card
                return {
                    id: id,
                    name: card.name,
                    supertype: card.supertype,
                    subtypes: card.subtypes || [],
                    hp: card.hp || '',
                    types: card.types || [],
                    rules: card.rules || [],
                    abilities: card.abilities || [],
                    attacks: card.attacks || [],
                    weaknesses: card.weaknesses || [],
                    resistances: card.resistances || [],
                    retreatCost: card.retreatCost || [],
                    convertedRetreatCost: card.retreatCost ? card.retreatCost.length : 0,
                    rarity: card.rarity || 'Custom',
                    artist: card.artist || 'Custom Artist',
                    isCustom: true,
                    image: imageUrl,
                    imageUrl: imageUrl,
                    images: {
                        small: imageUrl,
                        large: imageUrl
                    },
                    number: card.number || `C${Math.floor(Math.random() * 1000)}`,
                    set: card.set || {
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
            });
            
            // Check if we need to merge or replace
            const willExceedLimit = this.customCards.length + processedCards.length > this.MAX_CUSTOM_CARDS;
            
            if (willExceedLimit) {
                // If adding would exceed limit, keep most recent cards
                const totalToKeep = this.MAX_CUSTOM_CARDS;
                const existingToKeep = Math.max(0, totalToKeep - processedCards.length);
                
                // Keep newest existing cards plus all imported ones up to the limit
                this.customCards = [
                    ...this.customCards.slice(-existingToKeep),
                    ...processedCards.slice(0, totalToKeep - existingToKeep)
                ];
            } else {
                // Just add the new cards
                this.customCards = [...this.customCards, ...processedCards];
            }
            
            // Save to storage
            this.saveCustomCards();
            
            return {
                success: true,
                importedCount: processedCards.length,
                totalCount: this.customCards.length
            };
        } catch (error) {
            console.error('Error importing custom cards:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Clear all custom cards
     * @returns {Boolean} Success status
     */
    clearAllCustomCards() {
        try {
            this.customCards = [];
            localStorage.removeItem(this.STORAGE_KEY);
            console.log("All custom cards cleared");
            return true;
        } catch (error) {
            console.error("Error clearing custom cards:", error);
            return false;
        }
    }
    
    /**
     * Validate a custom card
     * @param {Object} cardData - Card data to validate
     * @returns {Object} Validation result with isValid and errors
     */
    validateCustomCard(cardData) {
        const errors = [];
        
        // Check required fields
        if (!cardData.name) {
            errors.push("Card name is required");
        }
        
        if (!cardData.supertype) {
            errors.push("Card type is required");
        }
        
        if (!cardData.imageUrl) {
            errors.push("Card image URL is required");
        } else {
            // Validate URL format
            try {
                new URL(cardData.imageUrl);
            } catch (e) {
                errors.push("Invalid image URL format");
            }
        }
        
        // Validate HP for Pokémon cards
        if (cardData.supertype === 'Pokémon' && cardData.hp) {
            const hp = parseInt(cardData.hp);
            if (isNaN(hp) || hp < 0 || hp > 340) {
                errors.push("HP must be a number between 0 and 340");
            }
        }
        
        // Validate attacks for Pokémon cards
        if (cardData.supertype === 'Pokémon' && cardData.attacks) {
            for (const attack of cardData.attacks) {
                if (!attack.name) {
                    errors.push("Attack name is required");
                }
                
                if (!attack.damage && !attack.text) {
                    errors.push("Attack must have either damage or effect text");
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Singleton instance
export const customCardManager = new CustomCardManager();