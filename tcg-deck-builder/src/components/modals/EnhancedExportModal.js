import React, { useState, useContext } from 'react';
import { Modal, Button, Form, Tabs, Tab, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faDownload, 
    faFileCode, 
    faFileCsv, 
    faFileAlt, 
    faFileExport, 
    faCopy, 
    faCheck 
} from '@fortawesome/free-solid-svg-icons';
import { AppThemeContext } from '../../context/AppThemeContext';
import MultiFormatDeckController from '../../utils/Export/MultiFormatDeckController';

function EnhancedExportModal({ show, onHide, decklist }) {
    const { theme } = useContext(AppThemeContext);
    const modalThemeClass = theme === 'dark' ? 'bg-dark text-white' : '';
    
    const [fileName, setFileName] = useState('my_deck');
    const [formatTab, setFormatTab] = useState('csv');
    const [previewContent, setPreviewContent] = useState('');
    const [copied, setCopied] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [validationError, setValidationError] = useState(null);
    
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

export default EnhancedExportModal;