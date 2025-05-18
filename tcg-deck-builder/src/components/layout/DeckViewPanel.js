// src/components/layout/DeckViewPanel.js
import { useEffect, useState, useContext } from 'react';
import styles from './css/DeckViewPanel.module.css';
import CardContainer from '../CardContainer';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
// import DropdownButton from 'react-bootstrap/DropdownButton'; // Not used in the latest version of the component
// import Dropdown from 'react-bootstrap/Dropdown'; // Not used in the latest version of the component
import Spinner from 'react-bootstrap/Spinner';
import { Form, Row, Col, Stack, Badge } from 'react-bootstrap'; // Added Badge here
import TCGSim from '../../utils/TCGsim/TCGSimController';
import CardJSONValidator from '../../utils/CardJsonValidator';
import ImportModal from '../modals/ImportModal';
import TCGLiveController from '../../utils/TCGLive/TCGLiveController';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faDownload, faTrash, faImage, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useDoubleClick } from '../../context/DoubleClickContext';
import FileNameModal from '../modals/FileNameModal';
import DeckImageModal from '../modals/DeckImageModal';
import { AppThemeContext } from '../../context/AppThemeContext';

function DeckViewPanel() {
    const [decklist, setDecklist] = useState({});
    const [filteredDecklist, setFilteredDecklist] = useState({});
    const [showAll, setShowAll] = useState(true); // New state for "Show All" toggle
    const [filterByPokemon, setFilterByPokemon] = useState(true);
    const [filterByTrainer, setFilterByTrainer] = useState(true);
    const [filterByEnergy, setFilterByEnergy] = useState(true);
    const [pokemonCount, setPokemonCount] = useState(0);
    const [trainerCount, setTrainerCount] = useState(0);
    const [energyCount, setEnergyCount] = useState(0);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFileNameModalOpen, setIsFileNameModalOpen] = useState(false);
    const { doubleClickedData, doubleClickTrigger } = useDoubleClick();
    const [isDeckImageModalOpen, setDeckImageModalOpen] = useState(false);
    const { theme } = useContext(AppThemeContext);

    const validator = new CardJSONValidator();

    const handleOpenModal = () => setShowImportModal(true);
    const handleCloseModal = () => setShowImportModal(false);
    const handleFileNameOpenModal = () => setIsFileNameModalOpen(true);
    const handleFileNameCloseModal = () => setIsFileNameModalOpen(false);
    const handleFileNameSubmit = (fileName) => doExport(fileName);
    const handleDeckImageOpenModal = () => setDeckImageModalOpen(true);
    const handleDeckImageCloseModal = () => setDeckImageModalOpen(false);

    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));
            if (data && data.card) {
                const cardContainer = data.origContainer;
                const card = data.card;
                if (cardContainer === "Deck") {
                    removeCardFromDecklist(card);
                } else if (cardContainer === "Search" || cardContainer === "Favorites" || cardContainer === "Custom") {
                    addCardToDecklist(card);
                }
            } else {
                console.warn("Dropped data is not in the expected format:", data);
            }
        } catch (error) {
            console.error("Error processing dropped data:", error);
        }
    };
    
    const handleDoubleClickToRemove = (card) => {
        removeCardFromDecklist(card);
    };


    const cardTypeMaxCount = { "energy": 60, "trainer": 4, "pokémon": 4, "pokemon": 4 };

    const addCardToDecklist = (card) => {
        setDecklist(prev => {
            const newDeck = { ...prev };
            if (!newDeck[card.name]) newDeck[card.name] = { cards: [], totalCount: 0 };
            
            const cardSupertypeLower = card.supertype?.toLowerCase();
            const maxCount = cardTypeMaxCount[cardSupertypeLower] || 4;

            if (newDeck[card.name].totalCount < maxCount) {
                let found = false;
                for (let entry of newDeck[card.name].cards) {
                    if (validator.areCardsEqual(entry.data, card)) {
                        entry.count += 1; found = true; break;
                    }
                }
                if (!found) newDeck[card.name].cards.push({ data: card, count: 1 });
                newDeck[card.name].totalCount += 1;
                
                // Update counts based on supertype
                if (cardSupertypeLower === "pokémon" || cardSupertypeLower === "pokemon") setPokemonCount(c => c + 1);
                else if (cardSupertypeLower === "trainer") setTrainerCount(c => c + 1);
                else if (cardSupertypeLower === "energy") setEnergyCount(c => c + 1);
            } else {
                console.log(`Maximum of ${maxCount} cards reached for ${card.name}`);
                return prev; 
            }
            return newDeck;
        });
    };
    
    const removeCardFromDecklist = (card) => {
        setDecklist(prev => {
            const newDeck = { ...prev };
            if (!newDeck[card.name]) return prev;
    
            let cardVariantRemoved = false;
            for (let i = 0; i < newDeck[card.name].cards.length; i++) {
                let variant = newDeck[card.name].cards[i];
                if (validator.areCardsEqual(variant.data, card)) {
                    variant.count -= 1;
                    cardVariantRemoved = true;
                    if (variant.count <= 0) newDeck[card.name].cards.splice(i, 1);
                    break;
                }
            }
    
            if (cardVariantRemoved) {
                newDeck[card.name].totalCount -= 1;
                const cardSupertypeLower = card.supertype?.toLowerCase();
                if (cardSupertypeLower === "pokémon" || cardSupertypeLower === "pokemon") setPokemonCount(c => c - 1);
                else if (cardSupertypeLower === "trainer") setTrainerCount(c => c - 1);
                else if (cardSupertypeLower === "energy") setEnergyCount(c => c - 1);
    
                if (newDeck[card.name].totalCount <= 0 || newDeck[card.name].cards.length === 0) { // Also check if cards array is empty
                    delete newDeck[card.name];
                }
            } else {
                return prev; 
            }
            return newDeck;
        });
    };

    useEffect(() => {
        // Assuming doubleClickedData now includes a 'source' property
        if (doubleClickedData && doubleClickedData.source === 'searchPanel') { 
            addCardToDecklist(doubleClickedData.card);
        }
    }, [doubleClickedData, doubleClickTrigger]);

    useEffect(() => {
        setFilteredDecklist(() => {
            if (!decklist || Object.keys(decklist).length === 0) return {};
            if (showAll) return decklist; 

            const filtered = {};
            for (const cardName in decklist) {
                const cardGroup = decklist[cardName];
                const filteredCardsInGroup = cardGroup.cards.filter(cv => {
                    const st = cv.data.supertype?.toLowerCase();
                    return (filterByPokemon && (st === 'pokémon' || st === 'pokemon')) ||
                           (filterByTrainer && st === 'trainer') ||
                           (filterByEnergy && st === 'energy');
                });
                if (filteredCardsInGroup.length > 0) {
                    filtered[cardName] = { ...cardGroup, cards: filteredCardsInGroup };
                }
            }
            return filtered;
        });
    }, [filterByPokemon, filterByTrainer, filterByEnergy, decklist, showAll]);
    

    async function doImport(fileContent) {
        setIsLoading(true);
        doClear(); 
        handleCloseModal();
        const isCSV = fileContent.trim().startsWith("QTY,Name,Type,URL");
        let newDeck;
        try {
            if (isCSV) {
                newDeck = TCGSim.importDeck(fileContent);
            } else {
                newDeck = await TCGLiveController.importDeck(fileContent);
            }
            setDecklist(newDeck || {}); 
            getCounts(newDeck || {});
        } catch (error) {
            console.error("Import error:", error);
            alert("Failed to import deck. Please check the file format and content.");
        }
        setIsLoading(false);
    }

    function doExport(fileName) { TCGSim.export(decklist, fileName); }
    function doClear() { setDecklist({}); setPokemonCount(0); setTrainerCount(0); setEnergyCount(0); }

    function getCounts(currentDeck) {
        let pkmn = 0, trnr = 0, engy = 0;
        for (const cardName in currentDeck) {
            currentDeck[cardName].cards.forEach(cv => {
                const count = Number(cv.count) || 0;
                const st = cv.data.supertype?.toLowerCase();
                if (st === 'pokémon' || st === 'pokemon') pkmn += count;
                else if (st === 'trainer') trnr += count;
                else if (st === 'energy') engy += count;
            });
        }
        setPokemonCount(pkmn); setTrainerCount(trnr); setEnergyCount(engy);
    }

    const handleFilterToggle = (filterSetter, currentValue) => {
        filterSetter(!currentValue);
        if (showAll && !currentValue) { 
            setShowAll(false); 
        }
    };
    
    const handleShowAllToggle = () => {
        const newShowAllState = !showAll;
        setShowAll(newShowAllState);
        if (newShowAllState) { 
            setFilterByPokemon(true);
            setFilterByTrainer(true);
            setFilterByEnergy(true);
        }
    };


    return (
        <div className={`${styles.viewPanel} deck-view-panel-container`}>
            <Card className={styles.fullHeightCard}>
                <Card.Header className={`${styles.stickyCardHeader} ${styles.deckPanelHeader}`}>
                    <Row className="align-items-center">
                        <Col xs={12} md={5} className="text-md-start mb-2 mb-md-0">
                            <h5 className={styles.deckTitle}>
                                Deck ({pokemonCount + trainerCount + energyCount})
                            </h5>
                        </Col>
                        <Col xs={12} md={7}>
                            <Stack direction="horizontal" gap={2} className="justify-content-md-end flex-wrap">
                                <ButtonGroup size="sm" className={styles.deckActionsGroup}>
                                    <Button variant="success" onClick={handleOpenModal} title="Import Deck">
                                        <FontAwesomeIcon icon={faFileImport} className="me-1 me-sm-2" />
                                        <span className="d-none d-sm-inline">Import</span>
                                    </Button>
                                    <Button variant="primary" onClick={handleFileNameOpenModal} disabled={Object.keys(decklist).length === 0} title="Export Deck">
                                        <FontAwesomeIcon icon={faDownload} className="me-1 me-sm-2" />
                                        <span className="d-none d-sm-inline">Export</span>
                                    </Button>
                                     <Button variant="info" onClick={handleDeckImageOpenModal} disabled={Object.keys(decklist).length === 0} title="Open as Image">
                                        <FontAwesomeIcon icon={faImage} className="me-1 me-sm-2" />
                                        <span className="d-none d-sm-inline">Image</span>
                                    </Button>
                                    <Button variant="danger" onClick={doClear} disabled={Object.keys(decklist).length === 0} title="Clear Deck">
                                        <FontAwesomeIcon icon={faTrash} className="me-1 me-sm-2" />
                                        <span className="d-none d-sm-inline">Clear</span>
                                    </Button>
                                </ButtonGroup>
                            </Stack>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Header className={`${styles.stickyCardHeaderSub} ${styles.filterHeader}`}>
                     <Row className="align-items-center">
                        <Col xs={12}>
                            <Form className="d-flex flex-wrap justify-content-center justify-content-md-start align-items-center">
                                <Form.Check
                                    type="switch"
                                    id="show-all-switch"
                                    label={showAll ? <><FontAwesomeIcon icon={faEye} /> Show All</> : <><FontAwesomeIcon icon={faEyeSlash} /> Filtered</>}
                                    checked={showAll}
                                    onChange={handleShowAllToggle}
                                    className={`me-3 mb-2 mb-md-0 ${styles.filterSwitch}`}
                                    title={showAll ? "Showing all cards" : "Showing filtered cards"}
                                />
                                <ButtonGroup size="sm" className={styles.filterGroup}>
                                    <Button 
                                        variant={filterByPokemon ? (theme === 'dark' ? 'primary' : 'info') : 'outline-secondary'} 
                                        onClick={() => handleFilterToggle(setFilterByPokemon, filterByPokemon)} 
                                        disabled={showAll}
                                        className={styles.filterButton}
                                        title="Toggle Pokémon Filter"
                                    >
                                        Pokémon <Badge pill bg="light" text="dark" className="ms-1">{pokemonCount}</Badge>
                                    </Button>
                                    <Button 
                                        variant={filterByTrainer ? (theme === 'dark' ? 'primary' : 'info') : 'outline-secondary'} 
                                        onClick={() => handleFilterToggle(setFilterByTrainer, filterByTrainer)} 
                                        disabled={showAll}
                                        className={styles.filterButton}
                                        title="Toggle Trainer Filter"
                                    >
                                        Trainer <Badge pill bg="light" text="dark" className="ms-1">{trainerCount}</Badge>
                                    </Button>
                                    <Button 
                                        variant={filterByEnergy ? (theme === 'dark' ? 'primary' : 'info') : 'outline-secondary'} 
                                        onClick={() => handleFilterToggle(setFilterByEnergy, filterByEnergy)} 
                                        disabled={showAll}
                                        className={styles.filterButton}
                                        title="Toggle Energy Filter"
                                    >
                                        Energy <Badge pill bg="light" text="dark" className="ms-1">{energyCount}</Badge>
                                    </Button>
                                </ButtonGroup>
                            </Form>
                        </Col>
                    </Row>
                </Card.Header>

                <Card.Body className={styles.cardBodyScrollable}>
                    {isLoading ? (
                        <div className="d-flex justify-content-center align-items-center" style={{minHeight: '200px'}}><Spinner animation="border" /></div>
                    ) : Object.keys(filteredDecklist).length > 0 ? (
                        <CardContainer
                            cards={filteredDecklist}
                            handleDoubleClick={handleDoubleClickToRemove} 
                            containerType={"Deck"}
                            addCardToDecklist={addCardToDecklist} // Pass down for potential + button on card
                            removeCardFromDecklist={removeCardFromDecklist} // Pass down for potential - button on card
                        />
                    ) : (
                        <div className="text-center my-5 p-3">
                            <p className="lead">{Object.keys(decklist).length === 0 ? "Your deck is empty. Drag cards here or import a deck." : "No cards match the current filter."}</p>
                        </div>
                    )}
                </Card.Body>
            </Card>
            <ImportModal 
                show={showImportModal} 
                handleClose={handleCloseModal} 
                importFunction={doImport}
            />
            <FileNameModal
                show={isFileNameModalOpen}
                onHide={handleFileNameCloseModal}
                onSubmit={handleFileNameSubmit}
            />
            <DeckImageModal
                show={isDeckImageModalOpen}
                handleClose={handleDeckImageCloseModal}
                decklist={decklist}
            />
        </div>
    );
}

export default DeckViewPanel;
