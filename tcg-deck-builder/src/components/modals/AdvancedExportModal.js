// src/components/modals/AdvancedExportModal.js

import React, { useState, useEffect, useContext } from 'react';
import { Modal, Button, Form, Alert, Row, Col, Tabs, Tab } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDownload, 
    faFileCode, 
    faFileCsv, 
    faFileAlt, 
    faFileExport, 
    faCopy, 
    faCheck,
    faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { AppThemeContext } from '../../context/AppThemeContext';
import MultiFormatDeckController from '../../utils/Export/MultiFormatDeckController';
import CardJSONValidator from '../../utils/CardJsonValidator';

function AdvancedExportModal({ show, onHide, decklist }) {
    const { theme } = useContext(AppThemeContext);
    const modalThemeClass = theme === 'dark' ? 'bg-dark text-white' : '';
    
    const [fileName, setFileName] = useState('my_deck');
    const [formatTab, setFormatTab] = useState('csv');
    const [previewContent, setPreviewContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [validationError, setValidationError] = useState(null);
    const [exportMode, setExportMode] = useState('standard'); // 'standard' or 'advanced'
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [advancedOptions, setAdvancedOptions] = useState({
        includeFullMetadata: true,
        includePokemonCards: true,
        includeTrainerCards: true,
        includeEnergyCards: true,
        exportCardImages: true,
        includeAbilities: true,
        includeAttacks: true,
        includeRules: true,
        includeWeaknesses: true,
        includeResistances: true,
        includeRetreatCost: true
    });

    const validator = new CardJSONValidator();
    
    // Handle file name change
    const handleFileNameChange = (e) => {
        const input = e.target.value;
        
        // Validate and format the filename
        const formattedName = formatFileName(input);
        setFileName(formattedName);
        
        // Validate length and characters
        if (formattedName !== input) {
            setValidationError('Invalid characters removed from filename');
        } else if (formattedName.length === 0) {
            setValidationError('Filename cannot be empty');
        } else {
            setValidationError(null);
        }
    };
    
    // Format file name to remove invalid characters
    const formatFileName = (input) => {
        const invalidChars = /[\/:*?"<>|]/g; // Regex for invalid file name characters
        const trimmedInput = input.trim(); // Trim whitespace
        const noInvalidChars = trimmedInput.replace(invalidChars, ''); // Remove invalid characters
        
        return noInvalidChars;
    };
    
    // Generate preview based on selected format
    const generatePreview = () => {
        if (!decklist || Object.keys(decklist).length === 0) {
            setPreviewContent('No cards in deck');
            return;
        }
        
        try {
            let content = '';
            
            // Use the appropriate export method based on format and mode
            if (exportMode === 'advanced') {
                switch (formatTab) {
                    case 'csv':
                        content = MultiFormatDeckController.exportToCSVAdvanced(decklist, null, true, advancedOptions);
                        break;
                    case 'xml':
                        content = MultiFormatDeckController.exportToXMLAdvanced(decklist, null, true, advancedOptions);
                        break;
                    case 'text':
                        content = MultiFormatDeckController.exportToTextAdvanced(decklist, null, true, advancedOptions);
                        break;
                    case 'json':
                        content = MultiFormatDeckController.exportToJSONAdvanced(decklist, null, true, advancedOptions);
                        break;
                    default:
                        content = 'Select a format to preview';
                }
            } else {
                // Standard export (existing methods)
                switch (formatTab) {
                    case 'csv':
                        content = MultiFormatDeckController.exportToCSV(decklist, null, true);
                        break;
                    case 'xml':
                        content = MultiFormatDeckController.exportToXML(decklist, null, true);
                        break;
                    case 'text':
                        content = MultiFormatDeckController.exportToText(decklist, null, true);
                        break;
                    case 'json':
                        content = MultiFormatDeckController.exportToJSON(decklist, null, true);
                        break;
                    default:
                        content = 'Select a format to preview';
                }
            }
            
            setPreviewContent(content);
        } catch (error) {
            console.error('Error generating preview:', error);
            setPreviewContent(`Error generating preview: ${error.message}`);
        }
    };
    
    // Handle tab change
    const handleTabChange = (key) => {
        setFormatTab(key);
        setCopied(false);
        setCopySuccess(false);
    };
    
    // Handle modal opening
    const handleEnter = () => {
        // Set defaults
        setFileName('my_deck');
        setFormatTab('csv');
        setCopied(false);
        setCopySuccess(false);
        setValidationError(null);
        setExportMode('standard');
        setShowAdvancedOptions(false);
        
        // Generate initial preview
        setTimeout(generatePreview, 100);
    };
    
    // Export in the selected format
    const handleExport = () => {
        if (!fileName) {
            setValidationError('Please enter a valid filename');
            return;
        }
        
        try {
            if (exportMode === 'advanced') {
                // Use advanced export methods
                switch (formatTab) {
                    case 'csv':
                        MultiFormatDeckController.exportToCSVAdvanced(decklist, fileName, false, advancedOptions);
                        break;
                    case 'xml':
                        MultiFormatDeckController.exportToXMLAdvanced(decklist, fileName, false, advancedOptions);
                        break;
                    case 'text':
                        MultiFormatDeckController.exportToTextAdvanced(decklist, fileName, false, advancedOptions);
                        break;
                    case 'json':
                        MultiFormatDeckController.exportToJSONAdvanced(decklist, fileName, false, advancedOptions);
                        break;
                    default:
                        console.error('Unknown export format:', formatTab);
                }
            } else {
                // Use standard export methods
                switch (formatTab) {
                    case 'csv':
                        MultiFormatDeckController.exportToCSV(decklist, fileName);
                        break;
                    case 'xml':
                        MultiFormatDeckController.exportToXML(decklist, fileName);
                        break;
                    case 'text':
                        MultiFormatDeckController.exportToText(decklist, fileName);
                        break;
                    case 'json':
                        MultiFormatDeckController.exportToJSON(decklist, fileName);
                        break;
                    default:
                        console.error('Unknown export format:', formatTab);
                }
            }
        } catch (error) {
            console.error('Error exporting deck:', error);
            alert(`Export failed: ${error.message}`);
        }
    };
    
    // Copy preview to clipboard
    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(previewContent)
            .then(() => {
                setCopied(true);
                setCopySuccess(true);
                
                // Reset success indicator after 3 seconds
                setTimeout(() => setCopySuccess(false), 3000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
                setCopied(false);
                alert('Failed to copy to clipboard');
            });
    };
    
    // Handle export mode change
    const handleExportModeChange = (e) => {
        setExportMode(e.target.value);
        if (e.target.value === 'advanced') {
            setShowAdvancedOptions(true);
        }
    };
    
    // Handle advanced option change
    const handleAdvancedOptionChange = (option, value) => {
        setAdvancedOptions(prev => ({
            ...prev,
            [option]: value
        }));
    };
    
    // Update preview when options change
    useEffect(() => {
        if (show) {
            generatePreview();
        }
    }, [formatTab, exportMode, advancedOptions, show]);
    
    // Count how many custom cards are in the deck
    const getCustomCardCount = () => {
        let count = 0;
        for (const cardName in decklist) {
            for (const cardVariant of decklist[cardName].cards) {
                if (cardVariant.data.isCustom) {
                    count += cardVariant.count;
                }
            }
        }
        return count;
    };
    
    // Render format description
    const renderFormatDescription = () => {
        switch (formatTab) {
            case 'csv':
                return 'CSV format is compatible with TCG Simulator and other applications that support comma-separated values.';
            case 'xml':
                return 'XML format is compatible with TCG Simulator and similar engines that use XML-based deck definitions.';
            case 'text':
                return 'Text format is compatible with Pokémon TCG Live and PTCGO. It organizes cards by type (Pokémon, Trainer, Energy).';
            case 'json':
                return 'JSON format provides the most detailed deck information for use with JavaScript applications and APIs.';
            default:
                return '';
        }
    };
    
    return (
        <Modal 
            show={show} 
            onHide={onHide} 
            contentClassName={modalThemeClass}
            size="lg"
            onEnter={handleEnter}
        >
            <Modal.Header closeButton>
                <Modal.Title>Export Deck</Modal.Title>
            </Modal.Header>
            
            <Modal.Body>
                <Form>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>File Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={fileName} 
                                    onChange={handleFileNameChange}
                                    isInvalid={!!validationError}
                                />
                                {validationError && (
                                    <Form.Control.Feedback type="invalid">
                                        {validationError}
                                    </Form.Control.Feedback>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Export Mode</Form.Label>
                                <Form.Select
                                    value={exportMode}
                                    onChange={handleExportModeChange}
                                >
                                    <option value="standard">Standard Export</option>
                                    <option value="advanced">Advanced Export (Full Metadata)</option>
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Advanced export includes additional card details like abilities, attacks, and rules.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    {exportMode === 'advanced' && (
                        <div className="mb-3">
                            <Button
                                variant="outline-info"
                                className="w-100 mb-2"
                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            >
                                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                                {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
                            </Button>
                            
                            {showAdvancedOptions && (
                                <div className="border rounded p-3 mb-3">
                                    <h6>Advanced Export Options</h6>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Check
                                                type="checkbox"
                                                id="includeFullMetadata"
                                                label="Include Full Metadata"
                                                checked={advancedOptions.includeFullMetadata}
                                                onChange={(e) => handleAdvancedOptionChange('includeFullMetadata', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="includePokemonCards"
                                                label="Include Pokémon Cards"
                                                checked={advancedOptions.includePokemonCards}
                                                onChange={(e) => handleAdvancedOptionChange('includePokemonCards', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="includeTrainerCards"
                                                label="Include Trainer Cards"
                                                checked={advancedOptions.includeTrainerCards}
                                                onChange={(e) => handleAdvancedOptionChange('includeTrainerCards', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="includeEnergyCards"
                                                label="Include Energy Cards"
                                                checked={advancedOptions.includeEnergyCards}
                                                onChange={(e) => handleAdvancedOptionChange('includeEnergyCards', e.target.checked)}
                                                className="mb-2"
                                            />
                                        </Col>
                                        <Col md={6}>
                                            <Form.Check
                                                type="checkbox"
                                                id="exportCardImages"
                                                label="Export Card Images"
                                                checked={advancedOptions.exportCardImages}
                                                onChange={(e) => handleAdvancedOptionChange('exportCardImages', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="includeAbilities"
                                                label="Include Abilities"
                                                checked={advancedOptions.includeAbilities}
                                                onChange={(e) => handleAdvancedOptionChange('includeAbilities', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="includeAttacks"
                                                label="Include Attacks"
                                                checked={advancedOptions.includeAttacks}
                                                onChange={(e) => handleAdvancedOptionChange('includeAttacks', e.target.checked)}
                                                className="mb-2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                id="includeRules"
                                                label="Include Rules Text"
                                                checked={advancedOptions.includeRules}
                                                onChange={(e) => handleAdvancedOptionChange('includeRules', e.target.checked)}
                                                className="mb-2"
                                            />
                                        </Col>
                                    </Row>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <Tabs 
                        activeKey={formatTab} 
                        onSelect={handleTabChange}
                        className="mb-3"
                    >
                        <Tab 
                            eventKey="csv" 
                            title={
                                <span>
                                    <FontAwesomeIcon icon={faFileCsv} className="me-2" />
                                    CSV
                                </span>
                            }
                        >
                            <p className="text-muted">{renderFormatDescription()}</p>
                        </Tab>
                        
                        <Tab 
                            eventKey="xml" 
                            title={
                                <span>
                                    <FontAwesomeIcon icon={faFileCode} className="me-2" />
                                    XML
                                </span>
                            }
                        >
                            <p className="text-muted">{renderFormatDescription()}</p>
                        </Tab>
                        
                        <Tab 
                            eventKey="text" 
                            title={
                                <span>
                                    <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                                    Text
                                </span>
                            }
                        >
                            <p className="text-muted">{renderFormatDescription()}</p>
                        </Tab>
                        
                        <Tab 
                            eventKey="json" 
                            title={
                                <span>
                                    <FontAwesomeIcon icon={faFileExport} className="me-2" />
                                    JSON
                                </span>
                            }
                        >
                            <p className="text-muted">{renderFormatDescription()}</p>
                        </Tab>
                    </Tabs>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Preview</Form.Label>
                        <div className="position-relative">
                            <Form.Control 
                                as="textarea" 
                                rows={10} 
                                value={previewContent} 
                                readOnly
                                className="font-monospace"
                            />
                            <Button 
                                variant="outline-secondary"
                                className="position-absolute top-0 end-0 m-2"
                                onClick={handleCopyToClipboard}
                                title="Copy to clipboard"
                            >
                                <FontAwesomeIcon 
                                    icon={copied && copySuccess ? faCheck : faCopy} 
                                    color={copied && copySuccess ? "green" : undefined}
                                />
                            </Button>
                        </div>
                        <Form.Text className="text-muted">
                            This is a preview of how your deck will be exported.
                        </Form.Text>
                    </Form.Group>
                </Form>
                
                {Object.keys(decklist).length === 0 && (
                    <Alert variant="warning">
                        <FontAwesomeIcon icon={faFileExport} className="me-2" />
                        Your deck is empty. Add some cards before exporting.
                    </Alert>
                )}
                
                {getCustomCardCount() > 0 && exportMode === 'standard' && (
                    <Alert variant="info">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        Your deck contains {getCustomCardCount()} custom card{getCustomCardCount() !== 1 ? 's' : ''}. 
                        Consider using Advanced Export to include all custom card metadata.
                    </Alert>
                )}
            </Modal.Body>
            
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleExport}
                    disabled={Object.keys(decklist).length === 0 || !fileName}
                >
                    <FontAwesomeIcon icon={faDownload} className="me-2" />
                    Export
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default AdvancedExportModal;