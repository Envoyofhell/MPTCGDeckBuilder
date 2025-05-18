// src/components/CardPreviewModal.js - New dedicated component

import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';

/**
 * Dedicated Card Preview Modal component
 * Extracted to improve reliability and prevent state issues
 */
function CardPreviewModal({ 
    show, 
    onHide, 
    card, 
    theme = 'light',
    onAddToDeck
}) {
    if (!card) {
        return null; // Don't render if no card is provided
    }

    // Helper function to get card type display text
    const getCardTypeText = () => {
        let type = card.supertype || '';
        
        if (card.subtypes && card.subtypes.length > 0) {
            type += ` - ${card.subtypes.join('/')}`;
        } else if (card.types && card.types.length > 0) {
            type += ` - ${card.types.join('/')}`;
        }
        
        return type;
    };

    // Get image URL with error handling
    const getCardImage = () => {
        if (!card) return '';
        
        if (card.images?.large) {
            return card.images.large;
        } else if (card.image) {
            return card.image;
        } else if (card.imageUrl) {
            return card.imageUrl;
        }
        
        return '';
    };

    const imageUrl = getCardImage();

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="lg"
            contentClassName={theme === 'dark' ? 'bg-dark text-white' : ''}
        >
            <Modal.Header closeButton>
                <Modal.Title>{card.name || 'Card Preview'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                <div className="d-flex flex-column align-items-center">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={card.name} 
                            style={{ maxWidth: '100%', maxHeight: '70vh' }} 
                            onError={(e) => {
                                // On error, hide the image and show a fallback message
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                            }}
                        />
                    ) : null}
                    
                    {/* Fallback content shown when image fails or is missing */}
                    <div 
                        className="mt-3 p-4 border rounded" 
                        style={{
                            display: imageUrl ? 'none' : 'block',
                            backgroundColor: theme === 'dark' ? '#2c3034' : '#f8f9fa',
                            minHeight: '300px',
                            width: '100%',
                            maxWidth: '350px'
                        }}
                    >
                        <h4>{card.name}</h4>
                        
                        {card.supertype && (
                            <Badge 
                                bg={card.supertype === 'Trainer' ? 'info' : 
                                    card.supertype === 'Energy' ? 'success' : 'danger'}
                                className="mt-2"
                                style={{ fontSize: '1rem' }}
                            >
                                {getCardTypeText()}
                            </Badge>
                        )}
                        
                        {card.hp && (
                            <div className="mt-2">
                                <Badge bg="secondary">HP {card.hp}</Badge>
                            </div>
                        )}
                        
                        {/* Show card types if available */}
                        {card.types && card.types.length > 0 && (
                            <div className="mt-3">
                                <h6>Types:</h6>
                                <div className="d-flex justify-content-center gap-2">
                                    {card.types.map((type, index) => (
                                        <Badge key={index} bg="primary">{type}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Show abilities if available */}
                        {card.abilities && card.abilities.length > 0 && (
                            <div className="mt-3">
                                <h6>Abilities:</h6>
                                {card.abilities.map((ability, index) => (
                                    <div key={index} className="mb-2">
                                        <strong>{ability.name}</strong>
                                        <p className="small">{ability.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Show attacks if available */}
                        {card.attacks && card.attacks.length > 0 && (
                            <div className="mt-3">
                                <h6>Attacks:</h6>
                                {card.attacks.map((attack, index) => (
                                    <div key={index} className="mb-2">
                                        <div className="d-flex justify-content-between">
                                            <strong>{attack.name}</strong>
                                            {attack.damage && <span>{attack.damage}</span>}
                                        </div>
                                        {attack.text && <p className="small">{attack.text}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Show rules text if available */}
                        {card.rules && card.rules.length > 0 && (
                            <div className="mt-3">
                                <h6>Rules:</h6>
                                {card.rules.map((rule, index) => (
                                    <p key={index} className="small">{rule}</p>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Card details section */}
                    <div className="mt-3 text-start w-100">
                        <h5>{card.name}</h5>
                        {card.supertype && <p>{card.supertype} - {card.subtypes?.join(', ')}</p>}
                        
                        {/* Show set if available */}
                        {card.set && (
                            <p>
                                <strong>Set:</strong> {card.set.name} 
                                {card.number && <> (#{card.number})</>}
                            </p>
                        )}
                        
                        {/* Show rarity if available */}
                        {card.rarity && (
                            <p><strong>Rarity:</strong> {card.rarity}</p>
                        )}
                        
                        {/* Show artist if available */}
                        {card.artist && (
                            <p><strong>Artist:</strong> {card.artist}</p>
                        )}
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
                {onAddToDeck && (
                    <Button 
                        variant="primary" 
                        onClick={() => {
                            onAddToDeck(card);
                            onHide();
                        }}
                    >
                        Add to Deck
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}

CardPreviewModal.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    card: PropTypes.object,
    theme: PropTypes.string,
    onAddToDeck: PropTypes.func
};

export default CardPreviewModal;