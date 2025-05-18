// src/utils/TCGsim/TCGSimController.js
// Image URL formatting refinement and ensuring consistent data handling.

import CardJSONValidator from "../CardJsonValidator"; // Assuming this path is correct

const validator = new CardJSONValidator();

// Default placeholder images for different card types (using .png high res versions)
const DEFAULT_IMAGES = {
    'Pokémon': 'https://images.pokemontcg.io/sv5/4/high.png', // Example: Charizard ex
    'Trainer': 'https://images.pokemontcg.io/sv1/196/high.png', // Example: Professor's Research
    'Energy': 'https://images.pokemontcg.io/sve/8/high.png', // Example: Basic Lightning Energy
    'Unknown': 'https://via.placeholder.com/250x350.png?text=No+Image'
};

/**
 * Get appropriate image URL for display and export.
 * Prioritizes API structure, then direct image URLs, then local asset paths.
 * @param {object} cardObj - Card object
 * @returns {string} Export-friendly and display-friendly URL
 */
function formatImageUrl(cardObj) {
    if (!cardObj) {
        console.warn("formatImageUrl: cardObj is null/undefined. Using default placeholder.");
        return DEFAULT_IMAGES['Unknown'];
    }

    let candidateUrl = null;
    // console.log("Formatting image for:", cardObj.name, cardObj); // General log

    // 1. Official API card data structure (most reliable)
    // Card from API (or local build mimicking API) should have card.id and card.images.large
    if (validator.isDatabaseCard(cardObj) && cardObj.images && typeof cardObj.images.large === 'string' && cardObj.images.large.startsWith('https://')) {
        // console.log(`formatImageUrl: Using API image - ${cardObj.images.large}`);
        return cardObj.images.large; 
    }

    // 2. Custom cards or other cards with a direct 'image' or 'imageUrl' property
    // These should be full, valid HTTPS URLs.
    if (cardObj.image && typeof cardObj.image === 'string' && cardObj.image.startsWith('https://') && !cardObj.image.startsWith('data:')) {
        candidateUrl = cardObj.image;
    } else if (cardObj.imageUrl && typeof cardObj.imageUrl === 'string' && cardObj.imageUrl.startsWith('https://') && !cardObj.imageUrl.startsWith('data:')) {
        candidateUrl = cardObj.imageUrl;
    }

    if (candidateUrl) {
        // console.log(`formatImageUrl: Using direct https URL - ${candidateUrl}`);
        return candidateUrl;
    }

    // 3. Handling for local/prerelease assets if 'image' field contains a relative path
    // This assumes your prerelease JSONs (or custom cards pointing to local assets) store image paths like "/assets/cards/set/image.png"
    if (cardObj.image && typeof cardObj.image === 'string' && cardObj.image.includes('/assets/')) {
        const GITHUB_PAGES_BASE_URL = "https://tishinator.github.io/PTCGDeckBuilder"; // Or your actual base URL
        if (cardObj.image.startsWith('/assets/')) {
            candidateUrl = GITHUB_PAGES_BASE_URL + cardObj.image;
            // console.log(`formatImageUrl: Constructed local asset URL - ${candidateUrl}`);
            return candidateUrl;
        } else if (cardObj.image.startsWith(GITHUB_PAGES_BASE_URL)) {
            // console.log(`formatImageUrl: Using already full local asset URL - ${cardObj.image}`);
            return cardObj.image;
        }
    }
    
    // 4. Fallback if no valid URL is found
    const supertype = cardObj.supertype || 'Unknown';
    console.warn(`formatImageUrl: No valid image URL found for "${cardObj.name || 'Unknown Card'}" (Supertype: ${supertype}). Original image field: ${cardObj.image}, imageUrl: ${cardObj.imageUrl}. Using default.`);
    return DEFAULT_IMAGES[supertype] || DEFAULT_IMAGES['Unknown'];
}

function formatCardType(cardObj) {
    return (cardObj && cardObj.supertype) ? cardObj.supertype : 'Unknown';
}

class TCGSim {
    static export(decklist, filename) {
        // console.log("Exporting decklist to CSV:", filename);
        const simHeader = "QTY,Name,Type,URL";
        let rows = [];

        for (let cardName in decklist) {
            if (decklist.hasOwnProperty(cardName) && decklist[cardName] && decklist[cardName].cards) {
                for (let cardVariation of decklist[cardName].cards) {
                    if (cardVariation && cardVariation.data) {
                        const currentCardData = cardVariation.data;
                        const quantity = cardVariation.count;
                        const name = cardName;
                        const type = formatCardType(currentCardData);
                        const url = formatImageUrl(currentCardData); 

                        if (name && type && url && quantity > 0) {
                            const escapeCSV = (field) => {
                                if (field === null || typeof field === 'undefined') return '';
                                const stringField = String(field);
                                if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                                    return `"${stringField.replace(/"/g, '""')}"`;
                                }
                                return stringField;
                            };
                            rows.push(`${quantity},${escapeCSV(name)},${escapeCSV(type)},${escapeCSV(url)}`);
                        } else {
                            // console.warn(`Skipping card in export due to missing data: QTY=${quantity}, Name=${name}, Type=${type}, URL=${url}`);
                        }
                    }
                }
            }
        }
        const csvContent = `${simHeader}\n${rows.join('\n')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        // console.log("Decklist exported successfully.");
    }

    static importDeck(csvData) {
        // console.log("Importing deck from CSV...");
        const cardTypeMaxCount = { "energy": 60, "trainer": 4, "pokémon": 4, "pokemon": 4 };
        const lines = csvData.trim().split('\n');
        if (lines.length <= 1) { console.warn("CSV: Empty or header only."); return {}; }

        const actualHeaders = lines[0].trim().toUpperCase().split(',').map(h => h.trim());
        const qtyIndex = actualHeaders.indexOf("QTY");
        const nameIndex = actualHeaders.indexOf("NAME");
        const typeIndex = actualHeaders.indexOf("TYPE");
        const urlIndex = actualHeaders.indexOf("URL");

        if ([qtyIndex, nameIndex, typeIndex, urlIndex].some(index => index === -1)) {
            alert("CSV header missing QTY, Name, Type, or URL. Import aborted.");
            console.error("CSV header missing required columns.");
            return {};
        }

        const newDecklist = {};
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = []; 
            let currentField = ''; let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') { if (inQuotes && j + 1 < line.length && line[j + 1] === '"') { currentField += '"'; j++; } else { inQuotes = !inQuotes; }}
                else if (char === ',' && !inQuotes) { parts.push(currentField); currentField = ''; }
                else { currentField += char; }
            }
            parts.push(currentField);

            if (parts.length < Math.max(qtyIndex, nameIndex, typeIndex, urlIndex) + 1) { console.warn(`CSV: Skipping malformed row: "${line}"`); continue; }

            const countStr = parts[qtyIndex]?.trim();
            const name = parts[nameIndex]?.trim();
            const supertype = parts[typeIndex]?.trim();
            const image = parts[urlIndex]?.trim();
            const count = parseInt(countStr, 10);

            if (isNaN(count) || count <= 0 || !name || !supertype || !image) { console.warn(`CSV: Skipping row with invalid data: ${line}`); continue; }

            const cardDataForDeck = { name, supertype, image, isCustom: !(image.includes('api.pokemontcg.io') || image.includes('assets.tcgdex.net')), images: { small: image, large: image } };
            if (!newDecklist[name]) newDecklist[name] = { cards: [], totalCount: 0 };
            
            const cardSupertypeLower = supertype.toLowerCase();
            const maxCountForThisType = cardTypeMaxCount[cardSupertypeLower] || 4;

            const canAddTotalForName = maxCountForThisType - newDecklist[name].totalCount;
            if (canAddTotalForName <= 0) {
                 // console.log(`Max count for ${name} already reached.`);
                 continue;
            }

            let existingVariation = newDecklist[name].cards.find(entry => entry.data.image === image);
            if (existingVariation) {
                const canAddMoreOfThisVariant = maxCountForThisType - existingVariation.count;
                const addAmount = Math.min(count, canAddMoreOfThisVariant, canAddTotalForName);
                if (addAmount > 0) {
                    existingVariation.count += addAmount;
                    newDecklist[name].totalCount += addAmount;
                }
            } else {
                const addAmount = Math.min(count, canAddTotalForName);
                 if (addAmount > 0) {
                    newDecklist[name].cards.push({ data: cardDataForDeck, count: addAmount });
                    newDecklist[name].totalCount += addAmount;
                }
            }
        }
        // console.log("Deck imported from CSV:", newDecklist);
        return newDecklist;
    }
}

export default TCGSim;
