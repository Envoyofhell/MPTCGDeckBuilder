import React, { useState, useEffect, useContext } from "react";
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button'; 
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Badge from 'react-bootstrap/Badge';
import Accordion from 'react-bootstrap/Accordion';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import styles from './css/CardSearchPanel.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMagnifyingGlass, 
    faFilter, 
    faSync, 
    faPlus, 
    faHistory, 
    faStar, 
    faFileImport
} from '@fortawesome/free-solid-svg-icons';
import { useDoubleClick } from "../../context/DoubleClickContext";
import CardJSONValidator from "../../utils/CardJsonValidator";
// Make sure these imports are correct - use the exact same import pattern as in other files
import CardContainer from "../CardContainer";
// If CustomCardCreator isn't available or has import issues, comment it out temporarily
// import CustomCardCreator from "../modals/CustomCardCreator";
import EnhancedTCGController from "../../utils/TCGapi/EnhancedTCGController";

const validator = new CardJSONValidator();

// Helper function to get energy type color (MOVED UP BEFORE IT'S USED)
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

function EnhancedCardSearchPanel() {
    // State for search
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState('contains'); // 'contains', 'startsWith', 'exact'
    const [isLoading, setIsLoading] = useState(false);
    const [tabKey, setTabKey] = useState('search');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [resultsPerPage, setResultsPerPage] = useState(24);
    const [activeKey, setActiveKey] = useState('0'); // For accordion
    const [searchHistory, setSearchHistory] = useState([]);
    const [favoriteCards, setFavoriteCards] = useState([]);
    const [customCards, setCustomCards] = useState([]);
    
    // State for filters
    const [filterOptions, setFilterOptions] = useState({
        types: [],
        subtypes: [],
        supertypes: [],
        rarities: [],
        sets: [],
        legalities: {
            standard: '',
            expanded: '',
            unlimited: ''
        }
    });
    
    // State for available filter options
    const [availableFilters, setAvailableFilters] = useState({
        types: [],
        subtypes: [],
        supertypes: ['Pokémon', 'Trainer', 'Energy'],
        rarities: [],
        sets: []
    });
    
    // State for custom card modal
    const [showCustomCardModal, setShowCustomCardModal] = useState(false);
    
    // Context
    const { handleDoubleClickData } = useDoubleClick();
    
    // Energy types
    const energyTypes = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];
    
    // Load sets and initialize filters
    useEffect(() => {
        initializeFilters();
        loadFavorites();
        loadCustomCards();
        loadSearchHistory();
    }, []);
    
    // Function to initialize filters
    const initializeFilters = async () => {
        try {
            // Fetch sets
            const sets = await EnhancedTCGController.getAllSets();
            
            // Update available filters
            setAvailableFilters(prev => ({
                ...prev,
                types: energyTypes,
                sets: sets?.map(set => ({ id: set.id, name: set.name, series: set.series })) || []
            }));
        } catch (error) {
            console.error('Error initializing filters:', error);
        }
    };
    
    // Load favorites from localStorage
    const loadFavorites = () => {
        try {
            const storedFavorites = localStorage.getItem('tcg-deck-builder-favorites');
            if (storedFavorites) {
                setFavoriteCards(JSON.parse(storedFavorites));
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };
    
    // Save favorites to localStorage
    const saveFavorites = (favorites) => {
        try {
            localStorage.setItem('tcg-deck-builder-favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    };
    
    // Load custom cards
    const loadCustomCards = () => {
        // Load custom cards from EnhancedTCGController
        try {
            EnhancedTCGController.loadCustomCards();
            setCustomCards(EnhancedTCGController.getCustomCards());
        } catch (error) {
            console.error('Error loading custom cards:', error);
        }
    };
    
    // Load search history from localStorage
    const loadSearchHistory = () => {
        try {
            const storedHistory = localStorage.getItem('tcg-deck-builder-search-history');
            if (storedHistory) {
                setSearchHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error('Error loading search history:', error);
        }
    };
    
    // Save search history to localStorage
    const saveSearchHistory = (history) => {
        try {
            localStorage.setItem('tcg-deck-builder-search-history', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    };
    
    // Add a search to history
    const addToSearchHistory = (term, filters) => {
        const searchEntry = {
            term,
            filters: { ...filters },
            timestamp: Date.now()
        };
        
        // Add to beginning of array and limit to 20 entries
        const updatedHistory = [searchEntry, ...searchHistory.slice(0, 19)];
        setSearchHistory(updatedHistory);
        saveSearchHistory(updatedHistory);
    };
    
    // Handle search form submission
    const handleSearch = async (event) => {
        if (event) event.preventDefault();
        
        setIsLoading(true);
        setSearchResults([]);
        
        try {
            // Build search parameters
            const params = { ...filterOptions };
            
            // Handle name search based on mode
            if (searchTerm) {
                if (searchMode === 'exact') {
                    params.name = searchTerm;
                } else if (searchMode === 'startsWith') {
                    params.name = `${searchTerm}*`;
                } else {
                    params.name = `*${searchTerm}*`;
                }
            }
            
            // Perform search
            const results = await EnhancedTCGController.advancedSearch(params, currentPage, resultsPerPage);
            
            setSearchResults(results?.data || []);
            
            // Update pagination info
            if (results?.pagination) {
                setTotalResults(results.pagination.totalCount || 0);
                setTotalPages(Math.ceil((results.pagination.totalCount || 0) / resultsPerPage));
            }
            
            // Add to search history
            if (searchTerm.trim() || Object.values(filterOptions).some(v => v.length > 0)) {
                addToSearchHistory(searchTerm, filterOptions);
            }
        } catch (error) {
            console.error('Error performing search:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle input change
    const handleInputChange = (event) => {
        setSearchTerm(event.target.value);
    };
    
    // Handle search mode change
    const handleSearchModeChange = (mode) => {
        setSearchMode(mode);
    };
    
    // Handle filter change
    const handleFilterChange = (filterType, value, checked) => {
        setFilterOptions(prev => {
            const updatedFilters = { ...prev };
            
            if (filterType === 'legalities') {
                // Handle legalities (standard, expanded, unlimited)
                const [format, legality] = value.split(':');
                updatedFilters.legalities = { 
                    ...updatedFilters.legalities,
                    [format]: checked ? legality : ''
                };
            } else {
                // Handle array filters (types, subtypes, etc.)
                if (checked) {
                    if (!updatedFilters[filterType].includes(value)) {
                        updatedFilters[filterType] = [...updatedFilters[filterType], value];
                    }
                } else {
                    updatedFilters[filterType] = updatedFilters[filterType].filter(item => item !== value);
                }
            }
            
            return updatedFilters;
        });
    };
    
    // Clear all filters
    const clearFilters = () => {
        setFilterOptions({
            types: [],
            subtypes: [],
            supertypes: [],
            rarities: [],
            sets: [],
            legalities: {
                standard: '',
                expanded: '',
                unlimited: ''
            }
        });
        setSearchTerm('');
    };
    
    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    // Use effect to trigger search when page changes
    useEffect(() => {
        if (tabKey === 'search') {
            handleSearch();
        }
    }, [currentPage, resultsPerPage]);
    
    // Handle tab change
    const handleTabChange = (key) => {
        setTabKey(key);
        
        // Reset to first page when changing tabs
        setCurrentPage(1);
        
        // For custom cards tab, refresh the list
        if (key === 'custom') {
            loadCustomCards();
        }
        
        // For favorites tab, refresh the list
        if (key === 'favorites') {
            loadFavorites();
        }
    };
    
    // Handle card favorite toggle
    const handleToggleFavorite = (card) => {
        const isFavorite = favoriteCards.some(fav => fav.id === card.id);
        
        if (isFavorite) {
            // Remove from favorites
            const updatedFavorites = favoriteCards.filter(fav => fav.id !== card.id);
            setFavoriteCards(updatedFavorites);
            saveFavorites(updatedFavorites);
        } else {
            // Add to favorites
            const updatedFavorites = [...favoriteCards, card];
            setFavoriteCards(updatedFavorites);
            saveFavorites(updatedFavorites);
        }
    };
    
    // Check if a card is in favorites
    const isCardFavorite = (cardId) => {
        return favoriteCards.some(fav => fav.id === cardId);
    };
    
    // Handle custom card creation
    const handleCustomCardCreated = (card) => {
        setCustomCards(EnhancedTCGController.getCustomCards());
    };
    
    // Delete custom card
    const handleDeleteCustomCard = (id) => {
        const confirmed = window.confirm('Are you sure you want to delete this custom card?');
        if (confirmed) {
            EnhancedTCGController.deleteCustomCard(id);
            setCustomCards(EnhancedTCGController.getCustomCards());
        }
    };
    
    // Apply search from history
    const applyHistorySearch = (historyItem) => {
        setSearchTerm(historyItem.term || '');
        setFilterOptions(historyItem.filters || {
            types: [],
            subtypes: [],
            supertypes: [],
            rarities: [],
            sets: [],
            legalities: {
                standard: '',
                expanded: '',
                unlimited: ''
            }
        });
        setTabKey('search');
        setCurrentPage(1);
        
        // Trigger search after state updates
        setTimeout(() => {
            handleSearch();
        }, 100);
    };
    
    // Format date for display
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // Pagination controls - Define this as a proper component 
    const PaginationControls = function PaginationControls() {
        return (
            <div className="d-flex justify-content-between align-items-center my-3">
                <div>
                    {totalResults > 0 && (
                        <span>
                            Showing {((currentPage - 1) * resultsPerPage) + 1}-
                            {Math.min(currentPage * resultsPerPage, totalResults)} of {totalResults} results
                        </span>
                    )}
                </div>
                <div className="d-flex">
                    <Button 
                        variant="outline-secondary" 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoading}
                        className="me-2"
                    >
                        Previous
                    </Button>
                    <Form.Select 
                        value={currentPage}
                        onChange={(e) => handlePageChange(Number(e.target.value))}
                        disabled={isLoading}
                        style={{ width: '80px' }}
                        className="me-2"
                    >
                        {Array.from({ length: totalPages }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {i + 1}
                            </option>
                        ))}
                    </Form.Select>
                    <Button 
                        variant="outline-secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoading}
                        className="me-2"
                    >
                        Next
                    </Button>
                    <Form.Select
                        value={resultsPerPage}
                        onChange={(e) => {
                            setResultsPerPage(Number(e.target.value));
                            setCurrentPage(1); // Reset to first page when changing results per page
                        }}
                        disabled={isLoading}
                        style={{ width: '80px' }}
                    >
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={48}>48</option>
                        <option value={96}>96</option>
                    </Form.Select>
                </div>
            </div>
        );
    };
    
    // Search Bar
    const SearchBar = (
        <Form onSubmit={handleSearch}>
            <Row className={styles.formRow}>
                <Col xs={12} md={8}>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            placeholder="Search cards by name"
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={handleInputChange}
                        />
                        <InputGroup.Text>
                            <Form.Select 
                                value={searchMode} 
                                onChange={(e) => handleSearchModeChange(e.target.value)}
                                style={{ border: 'none', marginLeft: '-10px' }}
                            >
                                <option value="contains">Contains</option>
                                <option value="startsWith">Starts With</option>
                                <option value="exact">Exact Match</option>
                            </Form.Select>
                        </InputGroup.Text>
                        <Button type="submit" className={styles.searchButton}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="me-1"/> Search
                        </Button>
                    </InputGroup>
                </Col>
                <Col xs={12} md={4} className="d-flex justify-content-end">
                    <Button 
                        variant="outline-secondary" 
                        className="me-2"
                        onClick={() => setActiveKey(activeKey === '0' ? '' : '0')}
                    >
                        <FontAwesomeIcon icon={faFilter} className="me-1"/> Filters
                        {Object.values(filterOptions).some(v => Array.isArray(v) ? v.length > 0 : v) && (
                            <Badge bg="primary" className="ms-2">
                                {[
                                    ...filterOptions.types, 
                                    ...filterOptions.subtypes, 
                                    ...filterOptions.supertypes,
                                    ...filterOptions.rarities,
                                    ...filterOptions.sets,
                                    ...Object.values(filterOptions.legalities).filter(v => v)
                                ].length}
                            </Badge>
                        )}
                    </Button>
                    <Button variant="outline-danger" onClick={clearFilters}>
                        <FontAwesomeIcon icon={faSync} className="me-1"/> Clear
                    </Button>
                </Col>
            </Row>
            
            <Accordion activeKey={activeKey} className="mb-3">
                <Accordion.Item eventKey="0">
                    <Accordion.Body>
                        <Row>
                            {/* Card Types Filter */}
                            <Col xs={12} md={4} className="mb-3">
                                <h6>Card Types</h6>
                                <div className="d-flex flex-wrap">
                                    {availableFilters.supertypes.map(supertype => (
                                        <Form.Check
                                            key={supertype}
                                            type="checkbox"
                                            id={`supertype-${supertype}`}
                                            label={supertype}
                                            className="me-3"
                                            checked={filterOptions.supertypes.includes(supertype)}
                                            onChange={(e) => handleFilterChange('supertypes', supertype, e.target.checked)}
                                        />
                                    ))}
                                </div>
                            </Col>
                            
                            {/* Energy Types Filter */}
                            <Col xs={12} md={8} className="mb-3">
                                <h6>Energy Types</h6>
                                <div className="d-flex flex-wrap">
                                    {energyTypes.map(type => (
                                        <div key={type} className="me-2 mb-2">
                                            <Button
                                                variant={filterOptions.types.includes(type) ? "primary" : "outline-secondary"}
                                                size="sm"
                                                onClick={() => handleFilterChange('types', type, !filterOptions.types.includes(type))}
                                                style={{
                                                    backgroundColor: filterOptions.types.includes(type) ? getEnergyColor(type) : '',
                                                    borderColor: getEnergyColor(type),
                                                    color: filterOptions.types.includes(type) && ['Colorless', 'Lightning'].includes(type) ? 'black' : '',
                                                }}
                                            >
                                                {type}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                            
                            {/* Subtypes Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <h6>Card Subtypes</h6>
                                <Row>
                                    <Col xs={6}>
                                        <h6 className="fs-7 text-muted">Pokémon</h6>
                                        <div className="d-flex flex-wrap">
                                            {['Basic', 'Stage 1', 'Stage 2', 'V', 'VMAX', 'VSTAR', 'ex', 'GX'].map(subtype => (
                                                <Form.Check
                                                    key={subtype}
                                                    type="checkbox"
                                                    id={`subtype-${subtype}`}
                                                    label={subtype}
                                                    className="me-3"
                                                    checked={filterOptions.subtypes.includes(subtype)}
                                                    onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)}
                                                />
                                            ))}
                                        </div>
                                    </Col>
                                    <Col xs={6}>
                                        <h6 className="fs-7 text-muted">Trainer</h6>
                                        <div className="d-flex flex-wrap">
                                            {['Item', 'Tool', 'Supporter', 'Stadium'].map(subtype => (
                                                <Form.Check
                                                    key={subtype}
                                                    type="checkbox"
                                                    id={`subtype-${subtype}`}
                                                    label={subtype}
                                                    className="me-3"
                                                    checked={filterOptions.subtypes.includes(subtype)}
                                                    onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)}
                                                />
                                            ))}
                                        </div>
                                    </Col>
                                </Row>
                            </Col>
                            
                            {/* Rarities Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <h6>Rarities</h6>
                                <div className="d-flex flex-wrap">
                                    {['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Ultra', 'Rare Holo EX', 'Rare Rainbow'].map(rarity => (
                                        <Form.Check
                                            key={rarity}
                                            type="checkbox"
                                            id={`rarity-${rarity}`}
                                            label={rarity}
                                            className="me-3"
                                            checked={filterOptions.rarities.includes(rarity)}
                                            onChange={(e) => handleFilterChange('rarities', rarity, e.target.checked)}
                                        />
                                    ))}
                                </div>
                            </Col>
                            
                            {/* Legalities Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <h6>Format Legality</h6>
                                <div className="d-flex flex-wrap">
                                    {['standard:Legal', 'expanded:Legal', 'unlimited:Legal'].map(legality => {
                                        const [format, value] = legality.split(':');
                                        return (
                                            <Form.Check
                                                key={legality}
                                                type="checkbox"
                                                id={`legality-${legality}`}
                                                label={`${format.charAt(0).toUpperCase() + format.slice(1)}`}
                                                className="me-3"
                                                checked={filterOptions.legalities[format] === value}
                                                onChange={(e) => handleFilterChange('legalities', legality, e.target.checked)}
                                            />
                                        );
                                    })}
                                </div>
                            </Col>
                            
                            {/* Sets Filter */}
                            <Col xs={12} className="mb-3">
                                <h6>Sets</h6>
                                <Row className="mb-2">
                                    <Col>
                                        <Form.Control 
                                            type="text" 
                                            placeholder="Filter sets..." 
                                            onChange={(e) => {
                                                // This would filter the displayed sets, but we'll keep it simple here
                                            }}
                                        />
                                    </Col>
                                </Row>
                                <div className="d-flex flex-wrap" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                    {availableFilters.sets.slice(0, 20).map(set => (
                                        <Form.Check
                                            key={set.id}
                                            type="checkbox"
                                            id={`set-${set.id}`}
                                            label={`${set.name} (${set.series})`}
                                            className="me-3 mb-2"
                                            checked={filterOptions.sets.includes(set.id)}
                                            onChange={(e) => handleFilterChange('sets', set.id, e.target.checked)}
                                        />
                                    ))}
                                </div>
                                {availableFilters.sets.length > 20 && (
                                    <small className="text-muted">
                                        Showing 20 of {availableFilters.sets.length} sets. Use the filter above to find specific sets.
                                    </small>
                                )}
                            </Col>
                        </Row>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </Form>
    );
    
    return (
        <div className={styles.searchPanel}>
            <Card>
                <Card.Header>
                    <Tabs
                        activeKey={tabKey}
                        onSelect={handleTabChange}
                        className="mb-3"
                    >
                        <Tab eventKey="search" title={<><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</>} />
                        <Tab eventKey="favorites" title={<><FontAwesomeIcon icon={faStar} /> Favorites</>} />
                        <Tab eventKey="custom" title={<><FontAwesomeIcon icon={faFileImport} /> Custom Cards</>} />
                        <Tab eventKey="history" title={<><FontAwesomeIcon icon={faHistory} /> History</>} />
                    </Tabs>
                </Card.Header>
                
                {tabKey === 'search' && (
                    <>
                        <Card.Header>{SearchBar}</Card.Header>
                        <Card.Body>
                            {isLoading ? (
                                <div className="d-flex justify-content-center my-5">
                                    <Spinner animation="border" size="xl" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </Spinner>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <>
                                    <PaginationControls />
                                    <CardContainer 
                                        cards={searchResults} 
                                        handleDoubleClick={handleDoubleClickData} 
                                        containerType={"Search"}
                                        handleToggleFavorite={handleToggleFavorite}
                                        favoriteCards={favoriteCards}
                                    />
                                    <PaginationControls />
                                </>
                            ) : (
                                <div className="text-center my-5">
                                    <p>No cards found matching your search criteria.</p>
                                    <Button variant="outline-secondary" onClick={clearFilters}>
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </>
                )}
                
                {tabKey === 'favorites' && (
                    <Card.Body>
                        {favoriteCards.length > 0 ? (
                            <CardContainer 
                                cards={favoriteCards} 
                                handleDoubleClick={handleDoubleClickData} 
                                containerType={"Search"}
                                handleToggleFavorite={handleToggleFavorite}
                                favoriteCards={favoriteCards}
                            />
                        ) : (
                            <div className="text-center my-5">
                                <p>You haven't favorited any cards yet.</p>
                                <p>Click the star icon on a card to add it to your favorites.</p>
                            </div>
                        )}
                    </Card.Body>
                )}
                
                {tabKey === 'custom' && (
                    <Card.Body>
                        <div className="d-flex justify-content-end mb-3">
                            <Button 
                                variant="primary" 
                                onClick={() => setShowCustomCardModal(true)}
                            >
                                <FontAwesomeIcon icon={faPlus} className="me-2" />
                                Create Custom Card
                            </Button>
                        </div>
                        
                        {customCards.length > 0 ? (
                            <CardContainer 
                                cards={customCards} 
                                handleDoubleClick={handleDoubleClickData} 
                                containerType={"Search"}
                                handleDeleteCard={handleDeleteCustomCard}
                                isCustomContainer={true}
                            />
                        ) : (
                            <div className="text-center my-5">
                                <p>You haven't created any custom cards yet.</p>
                                <p>Click the "Create Custom Card" button to get started.</p>
                            </div>
                        )}
                        
                        {/* Comment out the custom card creator temporarily
                        <CustomCardCreator 
                            show={showCustomCardModal} 
                            handleClose={() => setShowCustomCardModal(false)} 
                            onCardCreated={handleCustomCardCreated}
                        /> */}
                    </Card.Body>
                )}
                
                {tabKey === 'history' && (
                    <Card.Body>
                        {searchHistory.length > 0 ? (
                            <div className="list-group">
                                {searchHistory.map((historyItem, index) => (
                                    <div 
                                        key={index} 
                                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                        onClick={() => applyHistorySearch(historyItem)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div>
                                            <div className="d-flex align-items-center">
                                                <FontAwesomeIcon icon={faMagnifyingGlass} className="me-2 text-secondary" />
                                                <strong>{historyItem.term || '(No search term)'}</strong>
                                            </div>
                                            <div className="small text-muted">
                                                {formatDate(historyItem.timestamp)}
                                                
                                                {/* Display active filters */}
                                                {(historyItem.filters?.types?.length > 0 || 
                                                 historyItem.filters?.subtypes?.length > 0 ||
                                                 historyItem.filters?.supertypes?.length > 0 ||
                                                 historyItem.filters?.sets?.length > 0) && (
                                                    <div className="mt-1">
                                                        <span>Filters: </span>
                                                        {historyItem.filters?.types?.map(type => (
                                                            <Badge key={type} bg="secondary" className="me-1">{type}</Badge>
                                                        ))}
                                                        {historyItem.filters?.subtypes?.map(subtype => (
                                                            <Badge key={subtype} bg="info" className="me-1">{subtype}</Badge>
                                                        ))}
                                                        {historyItem.filters?.supertypes?.map(supertype => (
                                                            <Badge key={supertype} bg="primary" className="me-1">{supertype}</Badge>
                                                        ))}
                                                        {historyItem.filters?.sets?.length > 0 && (
                                                            <Badge bg="warning" text="dark" className="me-1">
                                                                {historyItem.filters.sets.length} set(s)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            variant="outline-primary" 
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                applyHistorySearch(historyItem);
                                            }}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center my-5">
                                <p>No search history yet.</p>
                                <p>Your recent searches will appear here.</p>
                            </div>
                        )}
                    </Card.Body>
                )}
            </Card>
        </div>
    );
}

export default EnhancedCardSearchPanel;