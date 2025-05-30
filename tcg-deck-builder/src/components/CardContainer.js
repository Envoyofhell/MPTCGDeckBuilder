// src/components/CardContainer.js - Updated version with enhanced features
import React, { useEffect, useState, forwardRef } from "react";
import styles from './css/CardViewerContainer.module.css';
import newStyles from './layout/css/CardSearchPanel.module.css'; // Import new styles
import PkmnCard from "./PkmnCard";
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Badge from 'react-bootstrap/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { faTrash, faEdit, faExpand } from '@fortawesome/free-solid-svg-icons';
import CardJSONValidator from "../utils/CardJsonValidator";

// Use forwardRef to accept a ref from parent component
const CardContainer = forwardRef(({ 
    cards, 
    handleDoubleClick, 
    containerType, 
    addCardToDecklist, 
    removeCardFromDecklist,
    handleToggleFavorite,
    favoriteCards = [],
    handleDeleteCard,
    handleEditCard,
    isCustomContainer = false,
    onCardHover,
    onCardPreview
}, ref) => {
    // State for cards to display
    const [cardsToShow, setCardsToShow] = useState([]);
    const [hoveredCard, setHoveredCard] = useState(null);
    const validator = new CardJSONValidator();

    // Define the priority for each supertype
    const supertypePriority = {
        "Pokémon": 1,
        "Pokemon": 1,
        "Trainer": 2,
        "Energy": 3
    };

    // Sorting function that compares the supertype of each card
    const sortCardsBySupertype = (a, b) => {
        // Get the priority of each supertype. If not found, default to a large number to sort them at the end.
        const priorityA = supertypePriority[a.supertype] || 999;
        const priorityB = supertypePriority[b.supertype] || 999;

        if (priorityA < priorityB) return -1; // a comes first
        if (priorityA > priorityB) return 1;  // b comes first
        return 0; // a and b are of the same supertype, so keep their current order
    };

    useEffect(() => {
        console.log("Cards received:", cards, "Type:", containerType);
        
        if (containerType === "Search") {
            // Logic for search container - make sure to handle arrays
            setCardsToShow(Array.isArray(cards) ? cards : []);
        } else if (containerType === "Deck") {
            // Logic for deck container
            let cardArray = [];
            for (let card in cards) {
                let innerArray = Object.values(cards[card].cards).map(cardInfo => ({
                    ...cardInfo.data,
                    count: cardInfo.count
                }));
                cardArray.push(...innerArray.filter(item => item !== null)); // Filtering out null values
            }
            
            // Sort the cardArray by supertype
            cardArray.sort(sortCardsBySupertype);
            
            // Now cardArray is sorted by supertype in the order of Pokémon, Trainer, and Energy
            setCardsToShow(cardArray);
        } else if (containerType === "Custom" || containerType === "Favorites") {
            // For custom cards or favorites, handle them directly
            setCardsToShow(Array.isArray(cards) ? cards : []);
        }
    }, [cards, containerType]);

    // Default double-click handler - enhanced to also add to deck
    const defaultOnDoubleClick = (card) => {
        console.log("Double-clicked card, but no handler provided:", card);
        // Attempt to add to deck anyway if this is a Search container
        if (containerType === "Search" && addCardToDecklist) {
            addCardToDecklist(card);
        }
    };
    
    // Double-click handler wrapper - now works with direct deck adding
    const doubleClickHandler = card => {
        console.log("Double-clicked card:", card);
        if (handleDoubleClick) {
          handleDoubleClick(card);
        } else {
          defaultOnDoubleClick(card);
        }
    };

    // Function to check if a card is a favorite
    const isFavorite = (cardId) => {
        return favoriteCards.some(card => card.id === cardId);
    };

    // Handle card hover for preview
    const handleCardHover = (card) => {
        setHoveredCard(card);
        if (onCardHover) {
            onCardHover(card);
        }
    };

    // Get container message based on type when empty
    const getEmptyMessage = () => {
        switch(containerType) {
            case "Custom":
                return "No custom cards created yet. Create a custom card to see it here.";
            case "Favorites":
                return "No favorite cards added yet. Click the star icon on cards to add them to favorites.";
            case "Deck":
                return "Your deck is empty. Drag cards here to build your deck.";
            case "Search":
                return "No cards found. Try a different search term or filters.";
            default:
                return "No cards to display.";
        }
    };

    return (
        <div className={styles.container} ref={ref}>
            <div className={styles.cardContainer}>
                {cardsToShow && cardsToShow.length > 0 ? (
                    cardsToShow.map((thisCard) => (
                        <div 
                            key={thisCard.id || Math.random().toString(36)} 
                            className={`${styles.cardItem} card-item`} 
                            onDoubleClick={() => doubleClickHandler(thisCard)}
                            onMouseEnter={() => handleCardHover(thisCard)}
                            onMouseLeave={() => handleCardHover(null)}
                            draggable="true"
                            onDragStart={(e) => {
                                try {
                                    // Make sure all cards are draggable regardless of container
                                    // Set a drag image to make the drag preview visible
                                    if (thisCard.images?.small || thisCard.image) {
                                        const img = new Image();
                                        img.src = thisCard.images?.small || thisCard.image;
                                        img.width = 100; // smaller size for the drag image
                                        document.body.appendChild(img);
                                        e.dataTransfer.setDragImage(img, 50, 70);
                                        setTimeout(() => document.body.removeChild(img), 0);
                                    }
                                    
                                    // For setting the actual data, use a try-catch to handle any serialization errors
                                    e.dataTransfer.setData("text/plain", thisCard.name); // Fallback
                                    e.dataTransfer.setData("application/json", JSON.stringify({ 
                                        card: thisCard, 
                                        origContainer: containerType 
                                    }));
                                    e.dataTransfer.effectAllowed = "copy";
                                } catch (error) {
                                    console.error("Error setting drag data:", error);
                                    // Fallback to just the card name
                                    e.dataTransfer.setData("text/plain", thisCard.name || "Card");
                                }
                            }}
                        >
                            {/* Add/Remove buttons for deck container */}
                            {containerType === "Deck" && (
                                <div className={styles.cardButtons}>
                                    <div 
                                        className={styles.minus} 
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            removeCardFromDecklist(thisCard);
                                        }}
                                    >
                                        -
                                    </div>
                                    <div 
                                        className={styles.plus} 
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            addCardToDecklist(thisCard);
                                        }}
                                    >
                                        +
                                    </div>
                                </div> 
                            )}

                            {/* Favorite button for search container - moved to left */}
                            {(containerType === "Search" || containerType === "Favorites") && handleToggleFavorite && !isCustomContainer && (
                                <div 
                                    className={newStyles.favoriteContainer} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFavorite(thisCard);
                                    }}
                                >
                                    <div className={newStyles.favoriteButton}>
                                        <FontAwesomeIcon 
                                            icon={isFavorite(thisCard.id) ? faStarSolid : faStarRegular} 
                                            color={isFavorite(thisCard.id) ? "gold" : "gray"}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Preview button for all containers */}
                            {onCardPreview && (
                                <div 
                                    className={newStyles.cardPreviewHover}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCardPreview(thisCard);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faExpand} />
                                </div>
                            )}

                            {/* Custom card action buttons */}
                            {isCustomContainer && (
                                <div className={styles.customCardButtons}>
                                    {handleEditCard && (
                                        <OverlayTrigger
                                            placement="top"
                                            overlay={<Tooltip>Edit Card</Tooltip>}
                                        >
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm"
                                                className={styles.editButton} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditCard(thisCard);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                            </Button>
                                        </OverlayTrigger>
                                    )}
                                    
                                    {handleDeleteCard && (
                                        <OverlayTrigger
                                            placement="top"
                                            overlay={<Tooltip>Delete Card</Tooltip>}
                                        >
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm"
                                                className={styles.deleteButton} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteCard(thisCard.id);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </Button>
                                        </OverlayTrigger>
                                    )}
                                </div>
                            )}

                            {/* Card component */}
                            <PkmnCard 
                                cardObj={thisCard}
                                container={containerType} 
                            />
                            
                            {/* Card count for deck container */}
                            {containerType === "Deck" && (
                                <div className={styles.cardCount}>x{thisCard.count}</div>
                            )}
                            
                            {/* Custom card label */}
                            {thisCard.isCustom && (
                                <div className={styles.customBadge}>Custom</div>
                            )}
                            
                            {/* Card name tooltip for search results */}
                            {(containerType === "Search" || containerType === "Favorites" || containerType === "Custom") && (
                                <div className={newStyles.cardNameTooltip}>
                                    {thisCard.name}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center w-100 p-5">
                        <p className="text-muted">{getEmptyMessage()}</p>
                    </div>
                )}
            </div>
        </div>
    );
});

// Add displayName for forwardRef component
CardContainer.displayName = 'CardContainer';

export default CardContainer;