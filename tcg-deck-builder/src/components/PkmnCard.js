// src/components/PkmnCard.js - Improved card display

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import Card from 'react-bootstrap/Card';
import Placeholder from 'react-bootstrap/Placeholder';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import styles from './css/PkmnCard.module.css';
import CardJSONValidator from '../utils/CardJsonValidator';

/**
 * Enhanced Pokémon Card component with improved error handling and display
 */
function PkmnCard({ 
  cardObj, 
  container, 
  onDragStart, 
  onClick,
  customClass = '' 
}) {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const validator = new CardJSONValidator();

  /**
   * Get the appropriate image URL based on card type
   */
  function getCardImage() {
    try {
      // Check for null or undefined card object
      if (!cardObj) {
        console.error("Card object is null or undefined");
        return '';
      }
      
      // For database cards (from API)
      if (validator.isDatabaseCard(cardObj)) {
        return cardObj.images?.large || '';
      }
      
      // For custom cards with imageUrl property
      if (cardObj.imageUrl) {
        return cardObj.imageUrl;
      }
      
      // For formatted deck or custom cards
      if (cardObj.image) {
        // Handle relative paths for assets
        if (typeof cardObj.image === 'string' && cardObj.image.includes("assets") && !cardObj.image.includes("tishinator")) {
          return "/PTCGDeckBuilder/" + cardObj.image;
        }
        return cardObj.image;
      }
      
      // Fallback - this shouldn't happen with valid card data
      console.warn("Card missing image data:", cardObj);
      return '';
    } catch (error) {
      console.error("Error getting card image:", error, cardObj);
      return '';
    }
  }

  /**
   * Handle drag start event (for drag & drop functionality)
   */
  const handleDragStart = (e) => {
    if (container !== 'Search') {
      e.preventDefault();
      return;
    }
    
    try {
      e.dataTransfer.setData("application/json", JSON.stringify({ 
        card: cardObj, 
        origContainer: container 
      }));
    } catch (error) {
      console.error("Error setting drag data:", error);
    }
  };

  /**
   * Handle card click with ctrl key support for modal
   */
  const handleCardClick = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setShowModal(!showModal);
    }
  };

  /**
   * Handle image load success
   */
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);
  }, []);

  /**
   * Handle image load error
   */
  const handleImageError = useCallback(() => {
    console.error("Image load error for:", cardObj.name, "image path:", getCardImage());
    setIsLoading(false);
    setImageError(true);
  }, [cardObj]);

  /**
   * Get card type display text
   */
  function getCardTypeText() {
    if (!cardObj) return '';
    
    let type = cardObj.supertype || '';
    
    if (cardObj.subtypes && cardObj.subtypes.length > 0) {
      type += ` - ${cardObj.subtypes.join('/')}`;
    } else if (cardObj.types && cardObj.types.length > 0) {
      type += ` - ${cardObj.types.join('/')}`;
    }
    
    return type;
  }

  /**
   * Get background color for card type
   */
  function getCardTypeColor() {
    if (!cardObj || !cardObj.supertype) return '#f8f9fa';
    
    const typeColors = {
      'Pokémon': '#f95858',
      'Pokemon': '#f95858',
      'Trainer': '#5bc0de',
      'Energy': '#5cb85c'
    };
    
    return typeColors[cardObj.supertype] || '#f8f9fa';
  }

  // Get the image URL
  const imageUrl = getCardImage();

  return (
    <>
      <Card 
        className={`${styles.cardStyle} ${customClass}`} 
        draggable={container === "Search" ? true : false}
        onDragStart={handleDragStart}
        onClick={handleCardClick}
        style={!isLoading && imageError ? { backgroundColor: getCardTypeColor(), opacity: 0.8 } : {}}
      >
        {/* Loading placeholder */}
        {isLoading && (
          <Placeholder as={Card.Body} animation="glow" className={styles.placeholder}>
            <Placeholder xs={12} style={{ height: '100%' }} />
          </Placeholder>
        )}
        
        {/* Card image */}
        {imageUrl && (
          <Card.Img
            src={imageUrl}
            alt={cardObj?.name || 'Pokémon Card'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={isLoading ? { display: 'none' } : {}}
          />
        )}
        
        {/* Fallback for missing images - Enhanced with card name display */}
        {!isLoading && imageError && (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 p-2 text-center">
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
              {cardObj?.name || 'Unknown Card'}
            </div>
            {cardObj?.supertype && (
              <Badge 
                bg={cardObj.supertype === 'Trainer' ? 'info' : 
                    cardObj.supertype === 'Energy' ? 'success' : 'danger'}
                className="mt-1"
              >
                {getCardTypeText()}
              </Badge>
            )}
            {/* Add HP display for Pokémon cards */}
            {cardObj?.supertype === 'Pokémon' && cardObj?.hp && (
              <Badge bg="dark" className="mt-1">
                HP {cardObj.hp}
              </Badge>
            )}
          </div>
        )}
        
        {/* Custom card badge now displays the card name */}
        {cardObj?.isCustom && (
          <div className={styles.customNameBadge}>
            {cardObj?.name || 'Custom Card'}
          </div>
        )}
      </Card>

      {/* Modal for the enlarged image */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        centered
        dialogClassName={styles.modalBackdrop}
        contentClassName={styles.modalContent}
      >
        <Modal.Body className={styles.modalBody}>
          {!imageError && imageUrl ? (
            <img 
              src={imageUrl} 
              alt={cardObj?.name || 'Enlarged card'} 
              className={styles.enlargedImg}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center bg-light p-4 rounded" 
                 style={{ minHeight: '300px', minWidth: '200px' }}>
              <h4>{cardObj?.name || 'Unknown Card'}</h4>
              {cardObj?.supertype && (
                <Badge 
                  bg={cardObj.supertype === 'Trainer' ? 'info' : 
                      cardObj.supertype === 'Energy' ? 'success' : 'danger'}
                  className="mt-2 mb-3"
                  style={{ fontSize: '1rem' }}
                >
                  {getCardTypeText()}
                </Badge>
              )}
              {cardObj?.rules && cardObj.rules.length > 0 && (
                <div className="text-center mt-2">
                  {cardObj.rules.map((rule, index) => (
                    <p key={index} className="my-1">{rule}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button 
            variant="light" 
            className="position-absolute top-0 end-0 m-2 rounded-circle" 
            style={{ width: '30px', height: '30px', padding: 0 }}
            onClick={() => setShowModal(false)}
          >
            ×
          </Button>
        </Modal.Body>
      </Modal>
    </>
  );
}

// PropTypes for better validation
PkmnCard.propTypes = {
  cardObj: PropTypes.object.isRequired,
  container: PropTypes.string.isRequired,
  onDragStart: PropTypes.func,
  onClick: PropTypes.func,
  customClass: PropTypes.string
};

export default PkmnCard;