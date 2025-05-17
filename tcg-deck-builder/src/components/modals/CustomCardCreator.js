// src/components/modals/CustomCardCreator.js
// Simplified version that uses direct image URLs instead of uploads

import React, { useState, useContext, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave, faLink, faImage, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { AppThemeContext } from '../../context/AppThemeContext';
import EnhancedTCGController from '../../utils/TCGapi/EnhancedTCGController';

function CustomCardCreator({ show, handleClose, onCardCreated }) {
    const { theme } = useContext(AppThemeContext);
    const modalThemeClass = theme === 'dark' ? 'bg-dark text-white' : '';
    
    const [cardData, setCardData] = useState({
        name: '',
        supertype: 'Pokémon',
        subtypes: [],
        types: [],
        hp: '',
        rules: [],
        abilities: [],
        attacks: [],
        weaknesses: [],
        resistances: [],
        retreatCost: [],
        rarity: 'Custom',
        artist: 'Custom',
        imageUrl: ''
    });
    
    const [currentRule, setCurrentRule] = useState('');
    const [currentAttack, setCurrentAttack] = useState({
        name: '',
        cost: [],
        convertedEnergyCost: 0,
        damage: '',
        text: ''
    });
    const [currentAbility, setCurrentAbility] = useState({
        name: '',
        text: '',
        type: 'Ability'
    });
    const [currentWeakness, setCurrentWeakness] = useState({
        type: '',
        value: '×2'
    });
    const [currentResistance, setCurrentResistance] = useState({
        type: '',
        value: '-30'
    });
    
    const [imagePreview, setImagePreview] = useState(null);
    const [imageError, setImageError] = useState(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    
    const energyTypes = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];
    
    // Reset state when modal is shown
    useEffect(() => {
        if (show) {
            resetForm();
        }
    }, [show]);
    
    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setCardData({
            ...cardData,
            [name]: value
        });
        
        // If this is an image URL change, update the preview
        if (name === 'imageUrl' && value) {
            setImagePreview(value);
            setImageError(null);
        }
    };
    
    // Handle image URL validation
    const validateImageUrl = () => {
        const url = cardData.imageUrl;
        if (!url) {
            setImageError('Please enter an image URL');
            return false;
        }
        
        // Basic URL validation
        try {
            new URL(url);
            // Clear any previous errors
            setImageError(null);
            return true;
        } catch (e) {
            setImageError('Please enter a valid URL (e.g., https://example.com/image.jpg)');
            return false;
        }
    };
    
    // Add a rule
    const handleAddRule = () => {
        if (currentRule.trim()) {
            setCardData({
                ...cardData,
                rules: [...cardData.rules, currentRule]
            });
            setCurrentRule('');
        }
    };
    
    // Remove a rule
    const handleRemoveRule = (index) => {
        const updatedRules = [...cardData.rules];
        updatedRules.splice(index, 1);
        setCardData({
            ...cardData,
            rules: updatedRules
        });
    };
    
    // Add an attack
    const handleAddAttack = () => {
        if (currentAttack.name.trim() && (currentAttack.damage || currentAttack.text)) {
            setCardData({
                ...cardData,
                attacks: [...cardData.attacks, currentAttack]
            });
            setCurrentAttack({
                name: '',
                cost: [],
                convertedEnergyCost: 0,
                damage: '',
                text: ''
            });
        }
    };
    
    // Update attack energy cost
    const handleAttackCostChange = (type, increment) => {
        let newCost = [...currentAttack.cost];
        
        if (increment) {
            newCost.push(type);
        } else {
            const index = newCost.lastIndexOf(type);
            if (index !== -1) {
                newCost.splice(index, 1);
            }
        }
        
        setCurrentAttack({
            ...currentAttack,
            cost: newCost,
            convertedEnergyCost: newCost.length
        });
    };
    
    // Remove an attack
    const handleRemoveAttack = (index) => {
        const updatedAttacks = [...cardData.attacks];
        updatedAttacks.splice(index, 1);
        setCardData({
            ...cardData,
            attacks: updatedAttacks
        });
    };
    
    // Add an ability
    const handleAddAbility = () => {
        if (currentAbility.name.trim() && currentAbility.text.trim()) {
            setCardData({
                ...cardData,
                abilities: [...cardData.abilities, currentAbility]
            });
            setCurrentAbility({
                name: '',
                text: '',
                type: 'Ability'
            });
        }
    };
    
    // Remove an ability
    const handleRemoveAbility = (index) => {
        const updatedAbilities = [...cardData.abilities];
        updatedAbilities.splice(index, 1);
        setCardData({
            ...cardData,
            abilities: updatedAbilities
        });
    };
    
    // Add a weakness
    const handleAddWeakness = () => {
        if (currentWeakness.type) {
            setCardData({
                ...cardData,
                weaknesses: [...cardData.weaknesses, currentWeakness]
            });
            setCurrentWeakness({
                type: '',
                value: '×2'
            });
        }
    };
    
    // Remove a weakness
    const handleRemoveWeakness = (index) => {
        const updatedWeaknesses = [...cardData.weaknesses];
        updatedWeaknesses.splice(index, 1);
        setCardData({
            ...cardData,
            weaknesses: updatedWeaknesses
        });
    };
    
    // Add a resistance
    const handleAddResistance = () => {
        if (currentResistance.type) {
            setCardData({
                ...cardData,
                resistances: [...cardData.resistances, currentResistance]
            });
            setCurrentResistance({
                type: '',
                value: '-30'
            });
        }
    };
    
    // Remove a resistance
    const handleRemoveResistance = (index) => {
        const updatedResistances = [...cardData.resistances];
        updatedResistances.splice(index, 1);
        setCardData({
            ...cardData,
            resistances: updatedResistances
        });
    };
    
    // Update retreat cost
    const handleRetreatCostChange = (increment) => {
        let newCost = [...cardData.retreatCost];
        
        if (increment && newCost.length < 5) {
            newCost.push('Colorless');
        } else if (!increment && newCost.length > 0) {
            newCost.pop();
        }
        
        setCardData({
            ...cardData,
            retreatCost: newCost
        });
    };
    
    // Handle type selection
    const handleTypeSelection = (type) => {
        let newTypes = [...cardData.types];
        
        if (newTypes.includes(type)) {
            newTypes = newTypes.filter(t => t !== type);
        } else if (newTypes.length < 2) { // Limit to 2 types
            newTypes.push(type);
        }
        
        setCardData({
            ...cardData,
            types: newTypes
        });
    };
    
    // Handle subtype selection
    const handleSubtypeSelection = (subtype) => {
        let newSubtypes = [...cardData.subtypes];
        
        if (newSubtypes.includes(subtype)) {
            newSubtypes = newSubtypes.filter(t => t !== subtype);
        } else {
            newSubtypes.push(subtype);
        }
        
        setCardData({
            ...cardData,
            subtypes: newSubtypes
        });
    };
    
    // Submit form
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage(null);
        
        // Validate required fields
        if (!cardData.name) {
            setErrorMessage('Card name is required');
            return;
        }
        
        // Validate image URL
        if (!validateImageUrl()) {
            return;
        }
        
        setIsSubmitting(true);
        
        // Create custom card
        try {
            if (typeof EnhancedTCGController.addCustomCard !== 'function') {
                throw new Error('addCustomCard method is not available on EnhancedTCGController');
            }
            
            const newCard = await EnhancedTCGController.addCustomCard(cardData);
            
            // Callback with the new card
            if (onCardCreated) {
                onCardCreated(newCard);
            }
            
            // Reset form and close modal
            resetForm();
            handleClose();
        } catch (error) {
            console.error("Error creating custom card:", error);
            setErrorMessage(`Error creating custom card: ${error.message}`);
            
            if (error.message && error.message.includes('quota')) {
                setErrorMessage("Storage limit reached. Please delete some existing custom cards to make room for new ones.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Reset form fields
    const resetForm = () => {
        setCardData({
            name: '',
            supertype: 'Pokémon',
            subtypes: [],
            types: [],
            hp: '',
            rules: [],
            abilities: [],
            attacks: [],
            weaknesses: [],
            resistances: [],
            retreatCost: [],
            rarity: 'Custom',
            artist: 'Custom',
            imageUrl: ''
        });
        setImagePreview(null);
        setImageError(null);
        setErrorMessage(null);
        
        setCurrentRule('');
        setCurrentAttack({
            name: '',
            cost: [],
            convertedEnergyCost: 0,
            damage: '',
            text: ''
        });
        setCurrentAbility({
            name: '',
            text: '',
            type: 'Ability'
        });
        setCurrentWeakness({
            type: '',
            value: '×2'
        });
        setCurrentResistance({
            type: '',
            value: '-30'
        });
    };
    
    // Handle modal close
    const handleModalClose = () => {
        resetForm();
        handleClose();
    };
    
    // Get Pokemon subtypes based on card data
    const getPokemonSubtypes = () => {
        return [
            'Basic', 'Stage 1', 'Stage 2', 'VMAX', 'VSTAR', 'V', 'ex',
            'GX', 'EX', 'Mega', 'LEGEND', 'BREAK', 'Baby', 'Tag Team'
        ];
    };
    
    // Get Trainer subtypes based on card data
    const getTrainerSubtypes = () => {
        return [
            'Item', 'Tool', 'Supporter', 'Stadium', 'Ace Spec',
            'BREAK', 'Goldenrod Game Corner', 'Pokémon Tool',
            'Technical Machine', 'Pokémon Tool F', 'Special'
        ];
    };
    
    // Get subtypes based on supertype
    const getValidSubtypes = () => {
        switch (cardData.supertype) {
            case 'Pokémon':
                return getPokemonSubtypes();
            case 'Trainer':
                return getTrainerSubtypes();
            default:
                return [];
        }
    };
    
    // Render energy symbols for attack cost
    const renderEnergyCost = (cost) => {
        return (
            <div className="d-flex flex-wrap">
                {cost.map((energy, index) => (
                    <div 
                        key={`${energy}-${index}`} 
                        className="me-1 mb-1 px-2 py-1 rounded" 
                        style={{ 
                            backgroundColor: getEnergyColor(energy),
                            color: ['Colorless', 'Lightning'].includes(energy) ? 'black' : 'white',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {energy}
                    </div>
                ))}
            </div>
        );
    };
    
    // Get color for energy type
    const getEnergyColor = (type) => {
        const colors = {
            'Colorless': '#A8A878',
            'Darkness': '#705848',
            'Dragon': '#7038F8',
            'Fairy': '#EE99AC',
            'Fighting': '#C03028',
            'Fire': '#F08030',
            'Grass': '#78C850',
            'Lightning': '#F8D030',
            'Metal': '#B8B8D0',
            'Psychic': '#F85888',
            'Water': '#6890F0'
        };
        
        return colors[type] || '#68A090';
    };
    
    return (
        <Modal 
            show={show} 
            onHide={handleModalClose} 
            contentClassName={modalThemeClass} 
            size="lg"
            backdrop="static"
        >
            <Modal.Header closeButton>
                <Modal.Title>Create Custom Card</Modal.Title>
            </Modal.Header>
            
            {errorMessage && (
                <Alert variant="danger" className="m-3">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                    {errorMessage}
                </Alert>
            )}
            
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Tabs defaultActiveKey="basic" className="mb-3">
                        {/* Basic Information Tab */}
                        <Tab eventKey="basic" title="Basic Info">
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Card Name</Form.Label>
                                        <Form.Control 
                                            type="text" 
                                            name="name" 
                                            value={cardData.name} 
                                            onChange={handleChange}
                                            placeholder="Enter card name"
                                            required
                                        />
                                    </Form.Group>
                                    
                                    <Form.Group className="mb-3">
                                        <Form.Label>Card Type</Form.Label>
                                        <Form.Select 
                                            name="supertype" 
                                            value={cardData.supertype} 
                                            onChange={handleChange}
                                        >
                                            <option value="Pokémon">Pokémon</option>
                                            <option value="Trainer">Trainer</option>
                                            <option value="Energy">Energy</option>
                                        </Form.Select>
                                    </Form.Group>
                                    
                                    {cardData.supertype === 'Pokémon' && (
                                        <>
                                            <Form.Group className="mb-3">
                                                <Form.Label>HP</Form.Label>
                                                <Form.Control 
                                                    type="number" 
                                                    name="hp" 
                                                    value={cardData.hp} 
                                                    onChange={handleChange}
                                                    placeholder="Enter HP"
                                                    min="0"
                                                    max="340"
                                                />
                                            </Form.Group>
                                            
                                            <Form.Group className="mb-3">
                                                <Form.Label>Pokémon Types</Form.Label>
                                                <div className="d-flex flex-wrap gap-2 mt-2">
                                                    {energyTypes.map((type) => (
                                                        <Button 
                                                            key={type}
                                                            variant={cardData.types.includes(type) ? "primary" : "outline-secondary"}
                                                            size="sm"
                                                            onClick={() => handleTypeSelection(type)}
                                                            style={{
                                                                backgroundColor: cardData.types.includes(type) ? getEnergyColor(type) : '',
                                                                borderColor: getEnergyColor(type),
                                                                color: cardData.types.includes(type) && 
                                                                       ['Colorless', 'Lightning'].includes(type) ? 'black' : '',
                                                            }}
                                                        >
                                                            {type}
                                                        </Button>
                                                    ))}
                                                </div>
                                                <small className="text-muted">Select up to 2 types</small>
                                            </Form.Group>
                                            
                                            <Form.Group className="mb-3">
                                                <Form.Label>Retreat Cost: {cardData.retreatCost.length}</Form.Label>
                                                <div className="d-flex align-items-center">
                                                    <Button 
                                                        variant="outline-secondary" 
                                                        size="sm"
                                                        onClick={() => handleRetreatCostChange(false)}
                                                        disabled={cardData.retreatCost.length === 0}
                                                    >
                                                        -
                                                    </Button>
                                                    <div className="mx-2">
                                                        {renderEnergyCost(cardData.retreatCost)}
                                                    </div>
                                                    <Button 
                                                        variant="outline-secondary" 
                                                        size="sm"
                                                        onClick={() => handleRetreatCostChange(true)}
                                                        disabled={cardData.retreatCost.length === 5}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </Form.Group>
                                        </>
                                    )}
                                </Col>
                                
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Card Image URL</Form.Label>
                                        <div className="mb-2">
                                            <Form.Control
                                                type="url"
                                                name="imageUrl"
                                                value={cardData.imageUrl}
                                                onChange={handleChange}
                                                placeholder="https://example.com/card-image.jpg"
                                                onBlur={validateImageUrl}
                                                isInvalid={!!imageError}
                                            />
                                            <Form.Text className="text-muted">
                                                Enter a direct URL to your card image (JPG, PNG, etc.)
                                            </Form.Text>
                                            {imageError && (
                                                <Form.Control.Feedback type="invalid">
                                                    {imageError}
                                                </Form.Control.Feedback>
                                            )}
                                        </div>
                                        
                                        <div className="d-flex flex-column align-items-center p-3 border rounded">
                                            {imagePreview ? (
                                                <div className="mb-2 position-relative">
                                                    <img 
                                                        src={imagePreview} 
                                                        alt="Card preview" 
                                                        style={{ maxWidth: '100%', maxHeight: '300px' }} 
                                                        onError={() => {
                                                            setImageError('Failed to load image. Please check the URL.');
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div 
                                                    className="d-flex flex-column align-items-center justify-content-center bg-light text-muted rounded" 
                                                    style={{ width: '100%', height: '200px' }}
                                                >
                                                    <FontAwesomeIcon icon={faImage} size="3x" className="mb-2" />
                                                    <p>No image URL provided</p>
                                                </div>
                                            )}
                                            
                                            <small className="text-muted mt-2">
                                                This image URL will be used when exporting your deck.<br />
                                                Use a direct, permanent image URL for compatibility with deck importers.
                                            </small>
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                            
                            <Row>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Subtypes</Form.Label>
                                        <div className="d-flex flex-wrap gap-2 mt-2">
                                            {getValidSubtypes().map((subtype) => (
                                                <Button 
                                                    key={subtype}
                                                    variant={cardData.subtypes.includes(subtype) ? "primary" : "outline-secondary"}
                                                    size="sm"
                                                    onClick={() => handleSubtypeSelection(subtype)}
                                                >
                                                    {subtype}
                                                </Button>
                                            ))}
                                        </div>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Tab>
                        
                        {/* Rules Tab */}
                        <Tab eventKey="rules" title="Rules & Text">
                            <Form.Group className="mb-3">
                                <Form.Label>Card Rules/Text</Form.Label>
                                <div className="d-flex mb-2">
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        value={currentRule}
                                        onChange={(e) => setCurrentRule(e.target.value)}
                                        placeholder="Enter card rule or text"
                                    />
                                    <Button 
                                        variant="primary" 
                                        className="ms-2" 
                                        onClick={handleAddRule} 
                                        disabled={!currentRule.trim()}
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                    </Button>
                                </div>
                                
                                {cardData.rules.length > 0 && (
                                    <div className="border rounded p-2 mt-2">
                                        <h6>Current Rules:</h6>
                                        <ul className="list-group">
                                            {cardData.rules.map((rule, index) => (
                                                <li 
                                                    key={index} 
                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                >
                                                    {rule}
                                                    <Button 
                                                        variant="danger" 
                                                        size="sm" 
                                                        onClick={() => handleRemoveRule(index)}
                                                    >
                                                        &times;
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Form.Group>
                        </Tab>
                        
                        {/* Abilities Tab (for Pokémon) */}
                        {cardData.supertype === 'Pokémon' && (
                            <Tab eventKey="abilities" title="Abilities">
                                <Form.Group className="mb-3">
                                    <Form.Label>Abilities</Form.Label>
                                    <Row>
                                        <Col md={4}>
                                            <Form.Control
                                                type="text"
                                                value={currentAbility.name}
                                                onChange={(e) => setCurrentAbility({
                                                    ...currentAbility,
                                                    name: e.target.value
                                                })}
                                                placeholder="Ability name"
                                                className="mb-2"
                                            />
                                            
                                            <Form.Select
                                                value={currentAbility.type}
                                                onChange={(e) => setCurrentAbility({
                                                    ...currentAbility,
                                                    type: e.target.value
                                                })}
                                                className="mb-2"
                                            >
                                                <option value="Ability">Ability</option>
                                                <option value="Pokémon Power">Pokémon Power</option>
                                                <option value="Poké-Power">Poké-Power</option>
                                                <option value="Poké-Body">Poké-Body</option>
                                                <option value="Ancient Trait">Ancient Trait</option>
                                            </Form.Select>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={currentAbility.text}
                                                onChange={(e) => setCurrentAbility({
                                                    ...currentAbility,
                                                    text: e.target.value
                                                })}
                                                placeholder="Ability effect"
                                                className="mb-2"
                                            />
                                        </Col>
                                        <Col md={2} className="d-flex align-items-end">
                                            <Button 
                                                variant="primary" 
                                                className="mb-2 w-100" 
                                                onClick={handleAddAbility} 
                                                disabled={!currentAbility.name.trim() || !currentAbility.text.trim()}
                                            >
                                                <FontAwesomeIcon icon={faPlus} /> Add
                                            </Button>
                                        </Col>
                                    </Row>
                                    
                                    {cardData.abilities.length > 0 && (
                                        <div className="border rounded p-2 mt-3">
                                            <h6>Card Abilities:</h6>
                                            <ul className="list-group">
                                                {cardData.abilities.map((ability, index) => (
                                                    <li 
                                                        key={index} 
                                                        className="list-group-item d-flex justify-content-between align-items-start"
                                                    >
                                                        <div className="ms-2 me-auto">
                                                            <div className="fw-bold">{ability.name} ({ability.type})</div>
                                                            {ability.text}
                                                        </div>
                                                        <Button 
                                                            variant="danger" 
                                                            size="sm" 
                                                            onClick={() => handleRemoveAbility(index)}
                                                        >
                                                            &times;
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Form.Group>
                            </Tab>
                        )}
                        
                        {/* Attacks Tab (for Pokémon) */}
                        {cardData.supertype === 'Pokémon' && (
                            <Tab eventKey="attacks" title="Attacks">
                                <Form.Group className="mb-3">
                                    <Form.Label>Attacks</Form.Label>
                                    <Row>
                                        <Col md={3}>
                                            <Form.Control
                                                type="text"
                                                value={currentAttack.name}
                                                onChange={(e) => setCurrentAttack({
                                                    ...currentAttack,
                                                    name: e.target.value
                                                })}
                                                placeholder="Attack name"
                                                className="mb-2"
                                            />
                                            
                                            <Form.Label>Energy Cost</Form.Label>
                                            <div className="d-flex flex-wrap gap-1 mb-2">
                                                {energyTypes.map((type) => (
                                                    <div key={type} className="d-flex">
                                                        <Button 
                                                            variant="outline-secondary" 
                                                            size="sm"
                                                            className="px-1 py-0"
                                                            onClick={() => handleAttackCostChange(type, false)}
                                                            disabled={!currentAttack.cost.includes(type)}
                                                        >
                                                            -
                                                        </Button>
                                                        <div 
                                                            className="px-2 py-1 mx-1 rounded"
                                                            style={{ 
                                                                backgroundColor: getEnergyColor(type),
                                                                color: ['Colorless', 'Lightning'].includes(type) ? 'black' : 'white',
                                                                fontSize: '0.7rem',
                                                                width: '70px',
                                                                textAlign: 'center'
                                                            }}
                                                        >
                                                            {type}: {currentAttack.cost.filter(t => t === type).length}
                                                        </div>
                                                        <Button 
                                                            variant="outline-secondary" 
                                                            size="sm"
                                                            className="px-1 py-0"
                                                            onClick={() => handleAttackCostChange(type, true)}
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <Form.Control
                                                type="text"
                                                value={currentAttack.damage}
                                                onChange={(e) => setCurrentAttack({
                                                    ...currentAttack,
                                                    damage: e.target.value
                                                })}
                                                placeholder="Damage (e.g. 50, 50+, 50×)"
                                                className="mb-2"
                                            />
                                        </Col>
                                        <Col md={7}>
                                            <Form.Control
                                                as="textarea"
                                                rows={5}
                                                value={currentAttack.text}
                                                onChange={(e) => setCurrentAttack({
                                                    ...currentAttack,
                                                    text: e.target.value
                                                })}
                                                placeholder="Attack effect (optional)"
                                                className="mb-2"
                                            />
                                        </Col>
                                        <Col md={2} className="d-flex align-items-end">
                                            <Button 
                                                variant="primary" 
                                                className="mb-2 w-100" 
                                                onClick={handleAddAttack} 
                                                disabled={!currentAttack.name.trim() || (!currentAttack.damage && !currentAttack.text)}
                                            >
                                                <FontAwesomeIcon icon={faPlus} /> Add
                                            </Button>
                                        </Col>
                                    </Row>
                                    
                                    {cardData.attacks.length > 0 && (
                                        <div className="border rounded p-2 mt-3">
                                            <h6>Card Attacks:</h6>
                                            <ul className="list-group">
                                                {cardData.attacks.map((attack, index) => (
                                                    <li 
                                                        key={index} 
                                                        className="list-group-item d-flex justify-content-between align-items-start"
                                                    >
                                                        <div className="ms-2 me-auto w-100">
                                                            <div className="d-flex justify-content-between w-100">
                                                                <div className="fw-bold d-flex align-items-center">
                                                                    {renderEnergyCost(attack.cost)} 
                                                                    <span className="ms-2">{attack.name}</span>
                                                                </div>
                                                                <div>{attack.damage}</div>
                                                            </div>
                                                            {attack.text && <div className="mt-1">{attack.text}</div>}
                                                        </div>
                                                        <Button 
                                                            variant="danger" 
                                                            size="sm" 
                                                            onClick={() => handleRemoveAttack(index)}
                                                            className="ms-2"
                                                        >
                                                            &times;
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Form.Group>
                            </Tab>
                        )}
                        
                        {/* Weaknesses & Resistances Tab (for Pokémon) */}
                        {cardData.supertype === 'Pokémon' && (
                            <Tab eventKey="weakness" title="Weakness/Resistance">
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Weaknesses</Form.Label>
                                            <Row>
                                                <Col md={5}>
                                                    <Form.Select
                                                        value={currentWeakness.type}
                                                        onChange={(e) => setCurrentWeakness({
                                                            ...currentWeakness,
                                                            type: e.target.value
                                                        })}
                                                        className="mb-2"
                                                    >
                                                        <option value="">Select type</option>
                                                        {energyTypes.map((type) => (
                                                            <option key={type} value={type}>{type}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Col>
                                                <Col md={5}>
                                                    <Form.Select
                                                        value={currentWeakness.value}
                                                        onChange={(e) => setCurrentWeakness({
                                                            ...currentWeakness,
                                                            value: e.target.value
                                                        })}
                                                        className="mb-2"
                                                    >
                                                        <option value="×2">×2</option>
                                                        <option value="×3">×3</option>
                                                        <option value="+20">+20</option>
                                                        <option value="+30">+30</option>
                                                        <option value="+40">+40</option>
                                                        <option value="+50">+50</option>
                                                    </Form.Select>
                                                </Col>
                                                <Col md={2}>
                                                    <Button 
                                                        variant="primary" 
                                                        className="mb-2 w-100" 
                                                        onClick={handleAddWeakness} 
                                                        disabled={!currentWeakness.type}
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} />
                                                    </Button>
                                                </Col>
                                            </Row>
                                            
                                            {cardData.weaknesses.length > 0 && (
                                                <div className="border rounded p-2 mt-2">
                                                    <h6>Card Weaknesses:</h6>
                                                    <ul className="list-group">
                                                        {cardData.weaknesses.map((weakness, index) => (
                                                            <li 
                                                                key={index} 
                                                                className="list-group-item d-flex justify-content-between align-items-center"
                                                            >
                                                                <div 
                                                                    className="badge" 
                                                                    style={{ 
                                                                        backgroundColor: getEnergyColor(weakness.type),
                                                                        color: ['Colorless', 'Lightning'].includes(weakness.type) ? 'black' : 'white',
                                                                        padding: '0.5rem'
                                                                    }}
                                                                >
                                                                    {weakness.type}
                                                                </div>
                                                                <span className="ms-2 fw-bold">{weakness.value}</span>
                                                                <Button 
                                                                    variant="danger" 
                                                                    size="sm" 
                                                                    onClick={() => handleRemoveWeakness(index)}
                                                                >
                                                                    &times;
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </Form.Group>
                                    </Col>
                                    
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Resistances</Form.Label>
                                            <Row>
                                                <Col md={5}>
                                                    <Form.Select
                                                        value={currentResistance.type}
                                                        onChange={(e) => setCurrentResistance({
                                                            ...currentResistance,
                                                            type: e.target.value
                                                        })}
                                                        className="mb-2"
                                                    >
                                                        <option value="">Select type</option>
                                                        {energyTypes.map((type) => (
                                                            <option key={type} value={type}>{type}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Col>
                                                <Col md={5}>
                                                    <Form.Select
                                                        value={currentResistance.value}
                                                        onChange={(e) => setCurrentResistance({
                                                            ...currentResistance,
                                                            value: e.target.value
                                                        })}
                                                        className="mb-2"
                                                    >
                                                        <option value="-20">-20</option>
                                                        <option value="-30">-30</option>
                                                        <option value="-40">-40</option>
                                                        <option value="-50">-50</option>
                                                    </Form.Select>
                                                </Col>
                                                <Col md={2}>
                                                    <Button 
                                                        variant="primary" 
                                                        className="mb-2 w-100" 
                                                        onClick={handleAddResistance} 
                                                        disabled={!currentResistance.type}
                                                    >
                                                        <FontAwesomeIcon icon={faPlus} />
                                                    </Button>
                                                </Col>
                                            </Row>
                                            
                                            {cardData.resistances.length > 0 && (
                                                <div className="border rounded p-2 mt-2">
                                                    <h6>Card Resistances:</h6>
                                                    <ul className="list-group">
                                                        {cardData.resistances.map((resistance, index) => (
                                                            <li 
                                                                key={index} 
                                                                className="list-group-item d-flex justify-content-between align-items-center"
                                                            >
                                                                <div 
                                                                    className="badge" 
                                                                    style={{ 
                                                                        backgroundColor: getEnergyColor(resistance.type),
                                                                        color: ['Colorless', 'Lightning'].includes(resistance.type) ? 'black' : 'white',
                                                                        padding: '0.5rem'
                                                                    }}
                                                                >
                                                                    {resistance.type}
                                                                </div>
                                                                <span className="ms-2 fw-bold">{resistance.value}</span>
                                                                <Button 
                                                                    variant="danger" 
                                                                    size="sm" 
                                                                    onClick={() => handleRemoveResistance(index)}
                                                                >
                                                                    &times;
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Tab>
                        )}
                    </Tabs>
                </Modal.Body>
                
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={isSubmitting || !cardData.name || !cardData.imageUrl}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Creating...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} className="me-2" />
                                Create Card
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default CustomCardCreator;