// src/utils/TCGsim/TCGSimController.js
// Simplified version that focuses on clean exports

import CardJSONValidator from "../CardJsonValidator";

const validator = new CardJSONValidator();

// Default placeholder images for different card types
const DEFAULT_IMAGES = {
    'Pokémon': 'https://assets.tcgdex.net/en/base/base1/4', // Charizard placeholder
    'Trainer': 'https://assets.tcgdex.net/en/base/base1/71', // Professor Oak placeholder
    'Energy': 'https://assets.tcgdex.net/en/base/base1/97'   // Lightning Energy placeholder
};

/**
 * Get appropriate image URL for export
 * @param {object} cardObj - Card object
 * @returns {string} Export-friendly URL
 */
function formatImageUrl(cardObj) {
    let formattedURL;
    
    // For database cards from the API
    if (validator.isDatabaseCard(cardObj)) {
        formattedURL = cardObj.images.large;
    }
    // For custom cards with direct URLs 
    else if (validator.isFormattedDeckCard(cardObj)) {
        if (cardObj.image && !cardObj.image.startsWith('data:')) {
            formattedURL = cardObj.image;
        } else if (cardObj.imageUrl && !cardObj.imageUrl.startsWith('data:')) {
            formattedURL = cardObj.imageUrl;
        } else if (cardObj.image && cardObj.image.includes("assets")) {
            formattedURL = "https://tishinator.github.io/PTCGDeckBuilder" + cardObj.image;
        } else {
            // Use default placeholder based on card type
            formattedURL = DEFAULT_IMAGES[cardObj.supertype] || DEFAULT_IMAGES['Pokémon'];
        }
    }
    
    // Final fallback
    if (!formattedURL) {
        formattedURL = DEFAULT_IMAGES[cardObj.supertype] || DEFAULT_IMAGES['Pokémon'];
    }
    
    return formattedURL;
}

/**
 * Get card type for export
 * @param {object} cardObj - Card object 
 * @returns {string} Card type
 */
function formatCardType(cardObj) {
    return cardObj.supertype;
}

class TCGSim {
    /**
     * Export decklist to CSV file
     * @param {object} decklist - Decklist object
     * @param {string} filename - Filename for export (without extension)
     */
    static export(decklist, filename) {
        console.log("Exporting decklist to CSV:", filename);
        
        const simHeader = "QTY,Name,Type,URL";
        let rows = [];
        
        for (let card in decklist) {
            for (let cardVariations in decklist[card].cards) {
                let currentCard = decklist[card].cards[cardVariations];
                let quantity = currentCard.count;
                let name = card;
                let type = formatCardType(currentCard.data);
                let url = formatImageUrl(currentCard.data);
                
                if (name !== '' && type !== '' && url !== '') {
                    rows.push(`${quantity},${name},${type},${url}`);
                }
            }
        }
        
        const csvContent = `${simHeader}\n${rows.join('\n')}`;

        const blob = new Blob([csvContent], {type: 'text/csv'});
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    }

    /**
     * Import decklist from CSV
     * @param {string} csvData - CSV data string
     * @returns {object} Decklist object
     */
    static importDeck(csvData) {
        console.log("Importing deck from CSV...");

        const rows = csvData.split('\n');
        const data = rows.map(row => row.split(','));
        let newDecklist = [];
        let seenCardUrl = [];
        
        for (let [index, row] of data.entries()) {
            // Skip header row
            if (index === 0) {
                continue;
            }
            
            // Skip blank rows
            if (row.length < 4) {
                continue;
            }
            
            // Create card object with clean data
            let card = {
                count: row[0],
                name: row[1],
                supertype: row[2],
                image: row[3]
            };

            // Add card to decklist
            if (!newDecklist[card.name]) {
                newDecklist[card.name] = { cards: [], totalCount: Number(0) };
            }
            
            if (newDecklist[card.name].totalCount < 4) {
                let cardFound = false;
                for (let cardEntry of newDecklist[card.name].cards) {
                    if (seenCardUrl.includes(card.image)) {
                        cardEntry.count += 1;
                        cardFound = true;
                        break;
                    }
                }
                
                if (!cardFound) {
                    newDecklist[card.name].cards.push({ 
                        data: card, 
                        count: Number(card.count) 
                    });
                    seenCardUrl.push(card.image);
                }

                newDecklist[card.name].totalCount += Number(card.count);
            } else {
                console.log(`Maximum of 4 cards reached for ${card.name}`);
            }
        }
        
        return newDecklist;
    }
}

export default TCGSim;