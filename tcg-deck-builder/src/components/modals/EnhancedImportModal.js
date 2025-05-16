import React, { useState, useRef, useContext } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Tab, Tabs } from 'react-bootstrap';
import { AppThemeContext } from '../../context/AppThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFileArrowUp, 
    faFileImport, 
    faFileCode, 
    faFileCsv, 
    faFileAlt, 
    faFileExport, 
    faSearch, 
    faCheckCircle, 
    faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';
import MultiFormatDeckController from '../../utils/Export/MultiFormatDeckController';

function EnhancedImportModal({ show, handleClose, importFunction }) {
    const { theme } = useContext(AppThemeContext);
    const modalThemeClass = theme === 'dark' ? 'bg-dark text-white' : '';
    
    const [fileContent, setFileContent] = useState('');
    const [importStatus, setImportStatus] = useState(null); // null, 'loading', 'success', 'error'
    const [statusMessage, setStatusMessage] = useState('');
    const [deckSummary, setDeckSummary] = useState(null);
    const [formatTab, setFormatTab] = useState('auto');
    const [selectedFile, setSelectedFile] = useState(null);
    
    const fileInputRef = useRef(null);
    
    // Handle file change (when user selects a file)
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                setFileContent(text);
                
                // Try to detect format based on content
                detectFormat(text);
            };
            reader.readAsText(file);
        }
    };
    
    // Handle browse button click
    const handleButtonClick = () => {
        fileInputRef.current.click();
    };
    
    // Handle text content change (when user pastes or types)
    const handleContentChange = (e) => {
        const text = e.target.value;
        setFileContent(text);
        
        // Only auto-detect format if there's significant content
        if (text.trim().length > 10) {
            detectFormat(text);
        }
    };
    
    // Detect format from content
    const detectFormat = (content) => {
        const trimmedContent = content.trim();
        
        // Reset status
        setImportStatus(null);
        setStatusMessage('');
        setDeckSummary(null);
        
        // Detect format
        if (trimmedContent.startsWith('<?xml') || trimmedContent.startsWith('<deck')) {
            setFormatTab('xml');
        } else if (trimmedContent.startsWith('QTY,Name,Type,URL')) {
            setFormatTab('csv');
        } else if (trimmedContent.startsWith('{')) {
            setFormatTab('json');
        } else if (trimmedContent.includes('Pokémon:') || trimmedContent.includes('Trainer:') || trimmedContent.includes('Energy:')) {
            setFormatTab('text');
        } else {
            // Default to auto if format can't be determined
            setFormatTab('auto');
        }
    };
    
    // Handle format tab change
    const handleTabChange = (key) => {
        setFormatTab(key);
    };
    
    // Validate import content
    const validateImport = () => {
        if (!fileContent.trim()) {
            setImportStatus('error');
            setStatusMessage('Please provide deck content to import.');
            return false;
        }
        
        return true;
    };
    
    // Handle import button click
    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!validateImport()) {
            return;
        }
        
        setImportStatus('loading');
        setStatusMessage('Importing deck...');
        
        try {
            let importedDeck;
            
            // Use the appropriate import method based on selected format
            if (formatTab === 'auto') {
                importedDeck = await MultiFormatDeckController.importDeck(fileContent);
            } else if (formatTab === 'csv') {
                importedDeck = MultiFormatDeckController.importFromCSV(fileContent);
            } else if (formatTab === 'xml') {
                importedDeck = await MultiFormatDeckController.importFromXML(fileContent);
            } else if (formatTab === 'text') {
                importedDeck = await MultiFormatDeckController.importFromText(fileContent);
            } else if (formatTab === 'json') {
                importedDeck = MultiFormatDeckController.importFromJSON(fileContent);
            }
            
            // Generate import summary
            const summary = generateDeckSummary(importedDeck);
            setDeckSummary(summary);
            
            setImportStatus('success');
            setStatusMessage(`Successfully imported ${summary.totalCards} cards.`);
            
            // Pass the imported deck to the parent component
            importFunction(importedDeck);
            
            // Close modal after successful import (with slight delay for user to see success message)
            setTimeout(() => {
                handleClose();
                resetState();
            }, 1500);
        } catch (error) {
            console.error('Import error:', error);
            setImportStatus('error');
            setStatusMessage(`Error importing deck: ${error.message}`);
        }
    };
    
    // Generate deck summary
    const generateDeckSummary = (decklist) => {
        const summary = {
            totalCards: 0,
            uniqueCards: 0,
            pokemonCount: 0,
            trainerCount: 0,
            energyCount: 0
        };
        
        try {
            // Count cards by type
            for (const cardName in decklist) {
                summary.uniqueCards++;
                
                for (const cardVariant of decklist[cardName].cards) {
                    const count = cardVariant.count || 0;
                    summary.totalCards += count;
                    
                    // Count by supertype
                    const supertype = cardVariant.data.supertype?.toLowerCase() || '';
                    if (supertype === 'pokémon' || supertype === 'pokemon') {
                        summary.pokemonCount += count;
                    } else if (supertype === 'trainer') {
                        summary.trainerCount += count;
                    } else if (supertype === 'energy') {
                        summary.energyCount += count;
                    }
                }
            }
        } catch (error) {
            console.error('Error generating deck summary:', error);
        }
        
        return summary;
    };
    
    // Reset state when modal is closed
    const resetState = () => {
        setFileContent('');
        setImportStatus(null);
        setStatusMessage('');
        setDeckSummary(null);
        setFormatTab('auto');
        setSelectedFile(null);
    };
    
    // Handle modal close
    const handleModalClose = () => {
        resetState();
        handleClose();
    };
    
    // Render format guide
    const renderFormatGuide = () => {
        switch (formatTab) {
            case 'auto':
                return (
                    <div className="mb-3">
                        <h6>Auto-detect Format</h6>
                        <p className="text-muted">
                            The importer will automatically detect the format of your deck list.
                            Supported formats: CSV, XML, Text (PTCG Live), and JSON.
                        </p>
                    </div>
                );
            case 'csv':
                return (
                    <div className="mb-3">
                        <h6>CSV Format</h6>
                        <p className="text-muted">
                            CSV format is used by TCG Simulator and should have the following header:
                        </p>
                        <code>QTY,Name,Type,URL</code>
                        <p className="text-muted mt-2">Example:</p>
                        <pre className="bg-light p-2 rounded">
                            QTY,Name,Type,URL<br />
                            4,Pikachu,Pokémon,https://example.com/pikachu.jpg<br />
                            2,Professor's Research,Trainer,https://example.com/research.jpg
                        </pre>
                    </div>
                );
            case 'xml':
                return (
                    <div className="mb-3">
                        <h6>XML Format</h6>
                        <p className="text-muted">
                            XML format is used by TCG Simulator and similar engines.
                        </p>
                        <p className="text-muted mt-2">Example:</p>
                        <pre className="bg-light p-2 rounded">
                            &lt;deck version="1.0"&gt;<br />
                            &nbsp;&nbsp;&lt;meta&gt;<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&lt;game&gt;pokemon_tcg&lt;/game&gt;<br />
                            &nbsp;&nbsp;&lt;/meta&gt;<br />
                            &nbsp;&nbsp;&lt;superzone name="Deck"&gt;<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&lt;card&gt;&lt;name&gt;Pikachu&lt;/name&gt;&lt;set&gt;SVI&lt;/set&gt;&lt;/card&gt;<br />
                            &nbsp;&nbsp;&lt;/superzone&gt;<br />
                            &lt;/deck&gt;
                        </pre>
                    </div>
                );
            case 'text':
                return (
                    <div className="mb-3">
                        <h6>Text Format (PTCG Live)</h6>
                        <p className="text-muted">
                            Text format is used by PTCG Live and PTCGO, organized by card type.
                        </p>
                        <p className="text-muted mt-2">Example:</p>
                        <pre className="bg-light p-2 rounded">
                            Pokémon: 20<br />
                            4 Pikachu SVI 63<br />
                            2 Raichu SVI 64<br />
                            <br />
                            Trainer: 28<br />
                            4 Professor's Research SVI 189<br />
                            <br />
                            Energy: 12<br />
                            12 Lightning Energy SVI 257<br />
                            <br />
                            Total Cards: 60
                        </pre>
                    </div>
                );
            case 'json':
                return (
                    <div className="mb-3">
                        <h6>JSON Format</h6>
                        <p className="text-muted">
                            JSON format provides detailed deck information for JavaScript applications.
                        </p>
                        <p className="text-muted mt-2">Example:</p>
                        <pre className="bg-light p-2 rounded">
                            {`{
  "meta": {
    "format": "tcg-deck-builder",
    "version": "1.0"
  },
  "cards": [
    {
      "name": "Pikachu",
      "quantity": 4,
      "supertype": "Pokémon"
    }
  ]
}`}
                        </pre>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <Modal size='xl' show={show} onHide={handleModalClose} contentClassName={modalThemeClass}>
            <Modal.Header closeButton className={modalThemeClass}>
                <Modal.Title>Import Decklist</Modal.Title>
            </Modal.Header>
            
            <Form onSubmit={handleSubmit}>
                <Modal.Body className={modalThemeClass}>
                    <Row className="mb-3">
                        <Col>
                            <div className="d-flex align-items-center mb-3">
                                <input
                                    type="file"
                                    accept=".csv, .txt, .xml, .json"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                />
                                <Button className="me-3" variant="primary" onClick={handleButtonClick}>
                                    <FontAwesomeIcon icon={faFileArrowUp} className="me-2" /> Upload File
                                </Button>
                                
                                {selectedFile && (
                                    <div className="text-muted">
                                        Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                    </div>
                                )}
                            </div>
                            
                            <Tabs 
                                activeKey={formatTab} 
                                onSelect={handleTabChange}
                                className="mb-3"
                            >
                                <Tab 
                                    eventKey="auto" 
                                    title={
                                        <span>
                                            <FontAwesomeIcon icon={faSearch} className="me-2" />
                                            Auto-detect
                                        </span>
                                    }
                                />
                                
                                <Tab 
                                    eventKey="csv" 
                                    title={
                                        <span>
                                            <FontAwesomeIcon icon={faFileCsv} className="me-2" />
                                            CSV
                                        </span>
                                    }
                                />
                                
                                <Tab 
                                    eventKey="xml" 
                                    title={
                                        <span>
                                            <FontAwesomeIcon icon={faFileCode} className="me-2" />
                                            XML
                                        </span>
                                    }
                                />
                                
                                <Tab 
                                    eventKey="text" 
                                    title={
                                        <span>
                                            <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                                            Text
                                        </span>
                                    }
                                />
                                
                                <Tab 
                                    eventKey="json" 
                                    title={
                                        <span>
                                            <FontAwesomeIcon icon={faFileExport} className="me-2" />
                                            JSON
                                        </span>
                                    }
                                />
                            </Tabs>
                            
                            {renderFormatGuide()}
                            
                            <Form.Group>
                                <Form.Label>Paste your decklist here:</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    value={fileContent} 
                                    onChange={handleContentChange}
                                    rows={15} 
                                    className="font-monospace mt-3"
                                    style={theme === 'dark' ? { backgroundColor: '#343a40', color: 'white' } : {}}
                                    disabled={importStatus === 'loading'}
                                />
                            </Form.Group>
                            
                            {importStatus === 'loading' && (
                                <div className="text-center my-3">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2">{statusMessage}</p>
                                </div>
                            )}
                            
                            {importStatus === 'success' && (
                                <Alert variant="success" className="mt-3">
                                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                    {statusMessage}
                                    
                                    {deckSummary && (
                                        <div className="mt-2">
                                            <p className="mb-1">Deck Summary:</p>
                                            <ul className="mb-0">
                                                <li>Total Cards: {deckSummary.totalCards}</li>
                                                <li>Unique Cards: {deckSummary.uniqueCards}</li>
                                                <li>Pokémon: {deckSummary.pokemonCount}</li>
                                                <li>Trainer: {deckSummary.trainerCount}</li>
                                                <li>Energy: {deckSummary.energyCount}</li>
                                            </ul>
                                        </div>
                                    )}
                                </Alert>
                            )}
                            
                            {importStatus === 'error' && (
                                <Alert variant="danger" className="mt-3">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                    {statusMessage}
                                </Alert>
                            )}
                        </Col>
                    </Row>
                </Modal.Body>
                
                <Modal.Footer className={modalThemeClass}>
                    <Button 
                        variant="success" 
                        type="submit"
                        disabled={!fileContent.trim() || importStatus === 'loading'}
                    >
                        <FontAwesomeIcon icon={faFileImport} className="me-2" />
                        Import
                    </Button>
                    <Button variant="secondary" onClick={handleModalClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default EnhancedImportModal;