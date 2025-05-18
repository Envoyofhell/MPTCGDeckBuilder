// src/components/modals/CustomCardImportExport.js

import React, { useState, useRef } from 'react';
import { Modal, Button, Form, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faFileImport,
    faFileExport,
    faDownload,
    faUpload,
    faExclamationTriangle,
    faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import { customCardManager } from '../../utils/TCGapi/CustomCardManager';

/**
 * Modal for importing and exporting custom cards
 */
function CustomCardImportExport({ 
    show, 
    onHide, 
    onImportComplete,
    theme = 'light' 
}) {
    const [activeTab, setActiveTab] = useState('import');
    const [fileContent, setFileContent] = useState('');
    const [status, setStatus] = useState(null); // 'success', 'error', 'loading'
    const [statusMessage, setStatusMessage] = useState('');
    const [includeFullMetadata, setIncludeFullMetadata] = useState(true);
    const fileInputRef = useRef(null);
    
    // Reset state when modal is shown/hidden
    const handleEnter = () => {
        setActiveTab('import');
        setFileContent('');
        setStatus(null);
        setStatusMessage('');
    };
    
    // Handle file selection
    const handleFileSelect = () => {
        fileInputRef.current.click();
    };
    
    // Handle file change
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            setFileContent(e.target.result);
        };
        reader.onerror = () => {
            setStatus('error');
            setStatusMessage('Failed to read file');
        };
        reader.readAsText(file);
    };
    
    // Handle content change in textarea
    const handleContentChange = (e) => {
        setFileContent(e.target.value);
    };
    
    // Handle import
    const handleImport = () => {
        if (!fileContent.trim()) {
            setStatus('error');
            setStatusMessage('Please enter JSON data or upload a file');
            return;
        }
        
        setStatus('loading');
        setStatusMessage('Importing custom cards...');
        
        try {
            // Add a slight delay to show loading state
            setTimeout(() => {
                const result = customCardManager.importCustomCardsFromFile(fileContent);
                
                if (result.success) {
                    setStatus('success');
                    setStatusMessage(`Successfully imported ${result.importedCount} custom cards. Total: ${result.totalCount}`);
                    
                    // Notify parent component if callback provided
                    if (onImportComplete) {
                        onImportComplete();
                    }
                    
                    // Auto-close after success with delay
                    setTimeout(() => {
                        onHide();
                    }, 2000);
                } else {
                    setStatus('error');
                    setStatusMessage(`Import failed: ${result.error}`);
                }
            }, 500);
        } catch (error) {
            setStatus('error');
            setStatusMessage(`Import failed: ${error.message}`);
        }
    };
    
    // Handle export
    const handleExport = () => {
        try {
            setStatus('loading');
            setStatusMessage('Exporting custom cards...');
            
            // Add a slight delay to show loading state
            setTimeout(() => {
                const jsonData = customCardManager.exportCustomCardsToFile(null, includeFullMetadata);
                
                // Create file for download
                const blob = new Blob([jsonData], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `custom-cards${includeFullMetadata ? '-full' : ''}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                setStatus('success');
                setStatusMessage('Custom cards exported successfully');
                
                // Reset success message after delay
                setTimeout(() => {
                    setStatus(null);
                    setStatusMessage('');
                }, 2000);
            }, 300);
        } catch (error) {
            setStatus('error');
            setStatusMessage(`Export failed: ${error.message}`);
        }
    };
    
    return (
        <Modal
            show={show}
            onHide={onHide}
            onEnter={handleEnter}
            size="lg"
            contentClassName={theme === 'dark' ? 'bg-dark text-white' : ''}
        >
            <Modal.Header closeButton>
                <Modal.Title>Custom Card Import/Export</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Tabs
                    activeKey={activeTab}
                    onSelect={(key) => setActiveTab(key)}
                    className="mb-3"
                >
                    <Tab 
                        eventKey="import" 
                        title={
                            <span>
                                <FontAwesomeIcon icon={faFileImport} className="me-2" />
                                Import Cards
                            </span>
                        }
                    >
                        <p className="text-muted mb-3">
                            Import custom cards from a JSON file. This will add the cards to your existing custom cards.
                        </p>
                        
                        <div className="mb-3">
                            <input
                                type="file"
                                accept=".json"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <Button 
                                variant="outline-primary" 
                                onClick={handleFileSelect}
                                className="w-100"
                            >
                                <FontAwesomeIcon icon={faUpload} className="me-2" />
                                Select JSON File
                            </Button>
                        </div>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Or paste JSON data:</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={10}
                                value={fileContent}
                                onChange={handleContentChange}
                                placeholder="Paste exported JSON data here..."
                                className={theme === 'dark' ? 'bg-dark text-white' : ''}
                            />
                        </Form.Group>
                        
                        <div className="d-grid gap-2">
                            <Button 
                                variant="primary" 
                                onClick={handleImport}
                                disabled={!fileContent.trim() || status === 'loading'}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Spinner size="sm" animation="border" className="me-2" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faFileImport} className="me-2" />
                                        Import Cards
                                    </>
                                )}
                            </Button>
                        </div>
                    </Tab>
                    
                    <Tab 
                        eventKey="export" 
                        title={
                            <span>
                                <FontAwesomeIcon icon={faFileExport} className="me-2" />
                                Export Cards
                            </span>
                        }
                    >
                        <p className="text-muted mb-3">
                            Export your custom cards to a JSON file that can be shared or imported later.
                        </p>
                        
                        <Form.Group className="mb-4">
                            <Form.Check
                                type="checkbox"
                                id="include-full-metadata"
                                label="Include full metadata (abilities, attacks, rules, etc.)"
                                checked={includeFullMetadata}
                                onChange={(e) => setIncludeFullMetadata(e.target.checked)}
                                className="mb-2"
                            />
                            <Form.Text className="text-muted">
                                {includeFullMetadata 
                                    ? 'Full metadata includes all card details such as abilities, attacks, rules, and other properties.'
                                    : 'Basic export includes only essential information like name, type, and image URL.'}
                            </Form.Text>
                        </Form.Group>
                        
                        <div className="d-grid gap-2">
                            <Button 
                                variant="primary" 
                                onClick={handleExport}
                                disabled={status === 'loading'}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Spinner size="sm" animation="border" className="me-2" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faDownload} className="me-2" />
                                        Export Cards
                                    </>
                                )}
                            </Button>
                        </div>
                    </Tab>
                </Tabs>
                
                {status === 'success' && (
                    <Alert variant="success" className="mt-3">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        {statusMessage}
                    </Alert>
                )}
                
                {status === 'error' && (
                    <Alert variant="danger" className="mt-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        {statusMessage}
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

CustomCardImportExport.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    onImportComplete: PropTypes.func,
    theme: PropTypes.string
};

export default CustomCardImportExport;