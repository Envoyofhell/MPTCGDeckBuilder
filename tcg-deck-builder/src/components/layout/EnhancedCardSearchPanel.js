// src/components/layout/EnhancedCardSearchPanel.js

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
import Alert from 'react-bootstrap/Alert';
import styles from './css/CardSearchPanel.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass,
    faFilter,
    faSync,
    faPlus,
    faHistory,
    faStar,
    faFileImport,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { useDoubleClick } from "../../context/DoubleClickContext";
import CardContainer from "../CardContainer";
import PrereleaseCardFilter from "../../utils/PrereleaseCardFilter";
import EnhancedTCGController from "../../utils/TCGapi/EnhancedTCGController";
import CustomCardCreator from "../modals/CustomCardCreator";

// Helper function to get energy type color
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
    // --- STATE VARIABLES ---

    // Search and Results State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState('contains');
    const [searchResults, setSearchResults] = useState([]);
    const [filteredSearchResults, setFilteredSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tabKey, setTabKey] = useState('search');
    const [searchError, setSearchError] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [resultsPerPage, setResultsPerPage] = useState(24);

    // Filters State
    const [activeKey, setActiveKey] = useState('');
    const [filterOptions, setFilterOptions] = useState({
        types: [],
        subtypes: [],
        supertypes: [],
        rarities: [],
        sets: [],
        legalities: { standard: '', expanded: '', unlimited: '' }
    });
    
    const [availableFilters, setAvailableFilters] = useState({
        types: [],
        subtypes: [],
        supertypes: ['Pokémon', 'Trainer', 'Energy'],
        rarities: [],
        sets: []
    });
    const [setFilterText, setSetFilterText] = useState('');
    const [filtersInitialized, setFiltersInitialized] = useState(false);

    // Other UI/Data States
    const [searchHistory, setSearchHistory] = useState([]);
    const [favoriteCards, setFavoriteCards] = useState([]);
    const [customCards, setCustomCards] = useState([]);
    const [showCustomCardModal, setShowCustomCardModal] = useState(false);

    // Context
    const { handleDoubleClickData } = useDoubleClick();

    // Static Data
    const energyTypes = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];
    const pokemonSubtypes = ['Basic', 'Stage 1', 'Stage 2', 'V', 'VMAX', 'VSTAR', 'ex', 'GX', 'BREAK', 'LEGEND', 'Restored', 'MEGA'];
    const trainerSubtypes = ['Item', 'Tool', 'Supporter', 'Stadium', 'Technical Machine'];
    const commonRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Holo V', 'Rare Holo VMAX', 'Rare Holo VSTAR', 'Amazing Rare', 'Rare ACE', 'Rare BREAK', 'Rare Prism Star', 'Rare Prime', 'Rare Rainbow', 'Rare Secret', 'Rare Shining', 'Rare Shiny', 'Rare Shiny GX', 'Rare Ultra', 'Promo'];

    // --- EFFECTS ---

    // Initialize filters, load favorites, custom cards, and search history on component mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await initializeFilters();
                loadFavorites();
                loadCustomCards();
                loadSearchHistory();
            } catch (error) {
                console.error("Error loading initial data:", error);
                setSearchError("Failed to initialize app data. Please try refreshing the page.");
            }
        };
        
        loadInitialData();
    }, []);

    // Handle client-side pagination
    useEffect(() => {
        if (tabKey === 'search' && searchResults.length > 0) {
            const start = (currentPage - 1) * resultsPerPage;
            const end = start + resultsPerPage;
            setFilteredSearchResults(searchResults.slice(start, end));
        }
    }, [currentPage, resultsPerPage, searchResults, tabKey]);

    // --- DATA INITIALIZATION AND LOCALSTORAGE ---

    const initializeFilters = async () => {
        if (filtersInitialized) return; // Prevent multiple initializations
        
        setIsLoading(true);
        setSearchError(null);
        
        try {
            // Initialize with hard-coded values first for quick UI responsiveness
            setAvailableFilters(prev => ({
                ...prev,
                types: energyTypes,
                rarities: commonRarities
            }));
            
            // Fetch sets data
            const setsData = await EnhancedTCGController.getAllSets();
            if (setsData && setsData.length > 0) {
                // Sort sets by release date (newest first)
                const sortedSets = setsData.sort((a, b) => 
                    new Date(b.releaseDate) - new Date(a.releaseDate)
                );
                
                setAvailableFilters(prev => ({
                    ...prev,
                    sets: sortedSets.map(set => ({ 
                        id: set.id, 
                        name: set.name, 
                        series: set.series, 
                        releaseDate: set.releaseDate 
                    }))
                }));
            } else {
                console.warn("No sets data returned from API");
            }
            
            setFiltersInitialized(true);
        } catch (error) {
            console.error('Error initializing filters:', error);
            setSearchError("Failed to load card sets. Search functionality may be limited.");
        } finally {
            setIsLoading(false);
        }
    };

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

    const saveFavorites = (favorites) => {
        try {
            localStorage.setItem('tcg-deck-builder-favorites', JSON.stringify(favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    };

    const loadCustomCards = () => {
        try {
            EnhancedTCGController.loadCustomCards();
            setCustomCards(EnhancedTCGController.getCustomCards());
        } catch (error) {
            console.error('Error loading custom cards:', error);
        }
    };

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

    const saveSearchHistory = (history) => {
        try {
            localStorage.setItem('tcg-deck-builder-search-history', JSON.stringify(history));
        } catch (error) {
            console.error('Error saving search history:', error);
        }
    };

    const addToSearchHistory = (term, filters) => {
        const searchEntry = {
            term,
            filters: { ...filters }, // Deep copy filters
            timestamp: Date.now()
        };
        const updatedHistory = [searchEntry, ...searchHistory.slice(0, 19)]; // Limit to 20 entries
        setSearchHistory(updatedHistory);
        saveSearchHistory(updatedHistory);
    };

    // --- SEARCH LOGIC ---

    /**
     * Handles the card search operation.
     * Combines local pre-release card filter results with API search results.
     */
    const handleSearch = async (event) => {
        if (event) event.preventDefault();
        
        setSearchError(null);
        
        // Get the current search parameters
        const currentSearchTerm = searchTerm.trim();
        const hasActiveFilters = 
            filterOptions.types.length > 0 ||
            filterOptions.subtypes.length > 0 ||
            filterOptions.supertypes.length > 0 ||
            filterOptions.sets.length > 0 ||
            filterOptions.rarities.length > 0 ||
            Object.values(filterOptions.legalities).some(value => value);
            
        // If no search parameters, clear results and show message
        if (!currentSearchTerm && !hasActiveFilters) {
            setSearchResults([]);
            setFilteredSearchResults([]);
            setTotalResults(0);
            setTotalPages(1);
            setCurrentPage(1);
            return;
        }
        
        // Start the search process
        setIsLoading(true);
        setSearchResults([]);
        setFilteredSearchResults([]);
        
        try {
            // STEP 1: Prepare search parameters for local search
            let localResults = [];
            
            // Only perform local search if we have a term or filters
            if (currentSearchTerm || hasActiveFilters) {
                const localSearchParams = {
                    name: currentSearchTerm,
                    types: filterOptions.types,
                    supertypes: filterOptions.supertypes,
                    subtypes: filterOptions.subtypes,
                    // Note: sets and rarities aren't handled by PrereleaseCardFilter.js in the current implementation
                    // but we're including them for completeness
                };
                
                // Get results from local data
                try {
                    localResults = PrereleaseCardFilter.filter(localSearchParams) || [];
                    console.log(`Found ${localResults.length} local results`);
                } catch (error) {
                    console.error("Error in local search:", error);
                    localResults = [];
                }
            }
            
            // STEP 2: Prepare search parameters for API search
            let apiResults = [];
            
            if (currentSearchTerm || hasActiveFilters) {
                // Create search parameters for the API
                const apiParams = {};
                
                // Handle search term based on search mode
                if (currentSearchTerm) {
                    if (searchMode === 'exact') {
                        apiParams.name = currentSearchTerm; // Exact match
                    } else if (searchMode === 'startsWith') {
                        apiParams.name = `${currentSearchTerm}*`; // Starts with
                    } else { // contains
                        apiParams.name = `*${currentSearchTerm}*`; // Contains
                    }
                }
                
                // Add filters to API parameters
                if (filterOptions.types.length > 0) {
                    apiParams.types = filterOptions.types;
                }
                
                if (filterOptions.subtypes.length > 0) {
                    apiParams.subtypes = filterOptions.subtypes;
                }
                
                if (filterOptions.supertypes.length > 0) {
                    apiParams.supertypes = filterOptions.supertypes;
                }
                
                if (filterOptions.rarities.length > 0) {
                    apiParams.rarities = filterOptions.rarities;
                }
                
                if (filterOptions.sets.length > 0) {
                    apiParams.sets = filterOptions.sets;
                }
                
                // Add legalities if any are selected
                const legalities = {};
                Object.entries(filterOptions.legalities).forEach(([format, value]) => {
                    if (value) {
                        legalities[format] = value;
                    }
                });
                
                if (Object.keys(legalities).length > 0) {
                    apiParams.legalities = legalities;
                }
                
                // Execute API search
                try {
                    const results = await EnhancedTCGController.query(apiParams);
                    apiResults = results || [];
                    console.log(`Found ${apiResults.length} API results`);
                } catch (error) {
                    console.error("Error in API search:", error);
                    apiResults = [];
                    // Don't set an error here as we might still have local results
                }
            }
            
            // STEP 3: Combine results and handle duplicates
            const combinedResults = [...localResults];
            const localCardIds = new Set(localResults.map(card => card.id));
            
            // Add API results that don't exist in local results
            apiResults.forEach(apiCard => {
                if (!apiCard.id || !localCardIds.has(apiCard.id)) {
                    combinedResults.push(apiCard);
                }
            });
            
            // STEP 4: Update states with results
            setSearchResults(combinedResults);
            setTotalResults(combinedResults.length);
            setTotalPages(Math.max(1, Math.ceil(combinedResults.length / resultsPerPage)));
            setCurrentPage(1);
            
            // Add to search history if we have a meaningful search
            if (currentSearchTerm || hasActiveFilters) {
                addToSearchHistory(currentSearchTerm, filterOptions);
            }
            
            // Show a message if no results found
            if (combinedResults.length === 0) {
                setSearchError("No cards found matching your search criteria.");
            }
            
        } catch (error) {
            console.error('Error performing search:', error);
            setSearchError(`Search failed: ${error.message || "Unknown error"}`);
            setSearchResults([]);
            setFilteredSearchResults([]);
            setTotalResults(0);
            setTotalPages(1);
        } finally {
            setIsLoading(false);
        }
    };

    // --- EVENT HANDLERS ---

    const handleInputChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchModeChange = (mode) => {
        setSearchMode(mode);
    };

    const handleFilterChange = (filterType, value, checked) => {
        setFilterOptions(prev => {
            const updatedFilters = { ...prev };
            
            if (filterType === 'legalities') {
                // Handle legalities (format:legality)
                const [format, legality] = value.split(':');
                updatedFilters.legalities = {
                    ...updatedFilters.legalities,
                    [format]: checked ? legality : ''
                };
            } else {
                // Handle array filters (types, subtypes, etc.)
                if (checked) {
                    // Add the value if not already present
                    if (!updatedFilters[filterType].includes(value)) {
                        updatedFilters[filterType] = [...updatedFilters[filterType], value];
                    }
                } else {
                    // Remove the value
                    updatedFilters[filterType] = updatedFilters[filterType].filter(item => item !== value);
                }
            }
            
            return updatedFilters;
        });
    };

    const clearFilters = () => {
        setFilterOptions({
            types: [],
            subtypes: [],
            supertypes: [],
            rarities: [],
            sets: [],
            legalities: { standard: '', expanded: '', unlimited: '' }
        });
        setSearchTerm('');
        setSetFilterText('');
        setSearchError(null);

        // Clear search results
        setSearchResults([]);
        setFilteredSearchResults([]);
        setTotalResults(0);
        setTotalPages(1);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            // Scroll to top of results
            window.scrollTo(0, 0);
        }
    };

    const handleTabChange = (key) => {
        setTabKey(key);
        setCurrentPage(1);
        setSearchError(null);
        
        // Load data for the selected tab
        if (key === 'custom') {
            loadCustomCards();
        } else if (key === 'favorites') {
            loadFavorites();
        }
    };

    const handleToggleFavorite = (card) => {
        const isFavorite = favoriteCards.some(fav => fav.id === card.id);
        let updatedFavorites;
        
        if (isFavorite) {
            // Remove from favorites
            updatedFavorites = favoriteCards.filter(fav => fav.id !== card.id);
        } else {
            // Add to favorites
            updatedFavorites = [...favoriteCards, card];
        }
        
        setFavoriteCards(updatedFavorites);
        saveFavorites(updatedFavorites);
    };

    const isCardFavorite = (cardId) => {
        return favoriteCards.some(fav => fav.id === cardId);
    };

    const handleCustomCardCreated = () => {
        loadCustomCards();
        setShowCustomCardModal(false);
    };

    const handleDeleteCustomCard = (id) => {
        const confirmed = window.confirm('Are you sure you want to delete this custom card?');
        if (confirmed) {
            EnhancedTCGController.deleteCustomCard(id);
            loadCustomCards();
        }
    };

    const applyHistorySearch = (historyItem) => {
        setSearchTerm(historyItem.term || '');
        setFilterOptions(historyItem.filters || {
            types: [],
            subtypes: [],
            supertypes: [],
            rarities: [],
            sets: [],
            legalities: { standard: '', expanded: '', unlimited: '' }
        });
        setTabKey('search');
        setCurrentPage(1);
        
        // Trigger search after state is updated
        setTimeout(() => {
            handleSearch();
        }, 0);
    };

    const loadLatestSet = () => {
        if (availableFilters.sets && availableFilters.sets.length > 0) {
            // Get the latest set (assumes sets are sorted by release date)
            const latestSet = availableFilters.sets[0];
            
            // Set up the filter for just this set
            setFilterOptions({
                types: [],
                subtypes: [],
                supertypes: [],
                rarities: [],
                sets: [latestSet.id],
                legalities: { standard: '', expanded: '', unlimited: '' }
            });
            
            setSearchTerm('');
            setSearchError(null);
            
            // Trigger search
            setTimeout(() => {
                handleSearch();
            }, 0);
        } else {
            setSearchError("Cannot load latest set: No sets available.");
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    // --- RENDER HELPER COMPONENTS ---

    const PaginationControls = () => (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center my-3">
            <div className="mb-2 mb-md-0">
                {totalResults > 0 && (
                    <span>
                        Showing {((currentPage - 1) * resultsPerPage) + 1}-
                        {Math.min(currentPage * resultsPerPage, totalResults)} of {totalResults} results
                    </span>
                )}
            </div>
            <div className="d-flex align-items-center">
                <Button
                    variant="outline-secondary"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="me-2"
                    size="sm"
                    aria-label="Previous page"
                >
                    Previous
                </Button>
                <Form.Select
                    value={currentPage}
                    onChange={(e) => handlePageChange(Number(e.target.value))}
                    disabled={isLoading || totalPages <= 1}
                    style={{ width: '80px' }}
                    className="me-2"
                    size="sm"
                    aria-label="Page number"
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
                    size="sm"
                    aria-label="Next page"
                >
                    Next
                </Button>
                <Form.Select
                    value={resultsPerPage}
                    onChange={(e) => {
                        setResultsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                    disabled={isLoading}
                    style={{ width: '80px' }}
                    size="sm"
                    aria-label="Results per page"
                >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                    <option value={96}>96</option>
                </Form.Select>
            </div>
        </div>
    );

    const SearchBarComponent = (
        <Form onSubmit={handleSearch}>
            <Row className={`${styles.formRow} mb-3`}>
                <Col xs={12} md={8} className="mb-2 mb-md-0">
                    <InputGroup>
                        <Form.Control
                            type="text"
                            placeholder="Search cards by name (e.g., Charizard)"
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={handleInputChange}
                            id="card-search-input"
                            name="card-search"
                            aria-label="Search card name"
                        />
                        <InputGroup.Text>
                            <Form.Select
                                value={searchMode}
                                onChange={(e) => handleSearchModeChange(e.target.value)}
                                style={{ border: 'none' }}
                                id="search-mode-select"
                                name="search-mode"
                                aria-label="Search mode"
                            >
                                <option value="contains">Contains</option>
                                <option value="startsWith">Starts With</option>
                                <option value="exact">Exact Match</option>
                            </Form.Select>
                        </InputGroup.Text>
                        <Button 
                            type="submit" 
                            className={styles.searchButton} 
                            disabled={isLoading}
                            aria-label="Search cards"
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="me-1" /> Search
                        </Button>
                    </InputGroup>
                </Col>
                <Col xs={12} md={4} className="d-flex justify-content-md-end">
                    <Button
                        variant="outline-secondary"
                        className="me-2"
                        onClick={() => setActiveKey(activeKey === '0' ? '' : '0')}
                        aria-expanded={activeKey === '0'}
                        aria-controls="filter-accordion-body"
                        aria-label="Toggle filters"
                    >
                        <FontAwesomeIcon icon={faFilter} className="me-1" /> Filters
                        {(filterOptions.types.length > 0 ||
                            filterOptions.subtypes.length > 0 ||
                            filterOptions.supertypes.length > 0 ||
                            filterOptions.rarities.length > 0 ||
                            filterOptions.sets.length > 0 ||
                            Object.values(filterOptions.legalities).some(v => v)) && (
                            <Badge bg="primary" pill className="ms-2">
                                {filterOptions.types.length +
                                    filterOptions.subtypes.length +
                                    filterOptions.supertypes.length +
                                    filterOptions.rarities.length +
                                    filterOptions.sets.length +
                                    Object.values(filterOptions.legalities).filter(v => v).length}
                            </Badge>
                        )}
                    </Button>
                    <Button 
                        variant="outline-danger" 
                        onClick={clearFilters} 
                        disabled={isLoading}
                        aria-label="Clear filters"
                    >
                        <FontAwesomeIcon icon={faSync} className="me-1" /> Clear
                    </Button>
                </Col>
            </Row>

            <Accordion activeKey={activeKey} className="mb-3" id="filter-accordion">
                <Accordion.Item eventKey="0">
                    <Accordion.Body id="filter-accordion-body">
                        <Row>
                            {/* Card Types (Supertype) Filter */}
                            <Col xs={12} md={4} className="mb-3">
                                <Form.Label id="card-types-label">Card Category</Form.Label>
                                <div className="d-flex flex-column flex-sm-row flex-wrap" 
                                     role="group" 
                                     aria-labelledby="card-types-label">
                                    {availableFilters.supertypes.map(supertype => (
                                        <Form.Check
                                            key={supertype}
                                            type="checkbox"
                                            id={`supertype-${supertype}`}
                                            label={supertype}
                                            className="me-3"
                                            checked={filterOptions.supertypes.includes(supertype)}
                                            onChange={(e) => handleFilterChange('supertypes', supertype, e.target.checked)}
                                            aria-label={`Filter by ${supertype}`}
                                        />
                                    ))}
                                </div>
                            </Col>

                            {/* Energy Types Filter */}
                            <Col xs={12} md={8} className="mb-3">
                                <Form.Label id="energy-types-label">Energy Types</Form.Label>
                                <div className="d-flex flex-wrap"
                                     role="group"
                                     aria-labelledby="energy-types-label">
                                    {energyTypes.map(type => (
                                        <div key={type} className="me-2 mb-2">
                                            <Button
                                                variant={filterOptions.types.includes(type) ? "primary" : "outline-secondary"}
                                                size="sm"
                                                onClick={() => handleFilterChange('types', type, !filterOptions.types.includes(type))}
                                                style={{
                                                    backgroundColor: filterOptions.types.includes(type) ? getEnergyColor(type) : '',
                                                    borderColor: getEnergyColor(type),
                                                    color: filterOptions.types.includes(type) ? (['Colorless', 'Lightning', 'Fairy'].includes(type) ? 'black' : 'white') : '',
                                                }}
                                                aria-pressed={filterOptions.types.includes(type)}
                                                aria-label={`Filter by ${type} type`}
                                            >
                                                {type}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            {/* Subtypes Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <Form.Label id="card-subtypes-label">Card Subtypes</Form.Label>
                                <Row>
                                    <Col xs={12} sm={6} className="mb-2 mb-sm-0">
                                        <h6 className="fs-7 text-muted" id="pokemon-subtypes-label">Pokémon</h6>
                                        <div className="d-flex flex-column"
                                             role="group"
                                             aria-labelledby="pokemon-subtypes-label"
                                             style={{maxHeight: '150px', overflowY: 'auto'}}>
                                            {pokemonSubtypes.map(subtype => (
                                                <Form.Check
                                                    key={subtype}
                                                    type="checkbox"
                                                    id={`subtype-pokemon-${subtype}`}
                                                    label={subtype}
                                                    className="me-3"
                                                    checked={filterOptions.subtypes.includes(subtype)}
                                                    onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)}
                                                    aria-label={`Filter by ${subtype} subtype`}
                                                />
                                            ))}
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <h6 className="fs-7 text-muted" id="trainer-subtypes-label">Trainer</h6>
                                         <div className="d-flex flex-column"
                                              role="group"
                                              aria-labelledby="trainer-subtypes-label"
                                              style={{maxHeight: '150px', overflowY: 'auto'}}>
                                            {trainerSubtypes.map(subtype => (
                                                <Form.Check
                                                    key={subtype}
                                                    type="checkbox"
                                                    id={`subtype-trainer-${subtype}`}
                                                    label={subtype}
                                                    className="me-3"
                                                    checked={filterOptions.subtypes.includes(subtype)}
                                                    onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)}
                                                    aria-label={`Filter by ${subtype} subtype`}
                                                />
                                            ))}
                                        </div>
                                    </Col>
                                </Row>
                            </Col>

                            {/* Rarities Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <Form.Label id="rarities-label">Rarities</Form.Label>
                                <div className="d-flex flex-column"
                                     role="group"
                                     aria-labelledby="rarities-label"
                                     style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {commonRarities.map(rarity => (
                                        <Form.Check
                                            key={rarity}
                                            type="checkbox"
                                            id={`rarity-${rarity.replace(/\s+/g, '-')}`}
                                            label={rarity}
                                            className="me-3"
                                            checked={filterOptions.rarities.includes(rarity)}
                                            onChange={(e) => handleFilterChange('rarities', rarity, e.target.checked)}
                                            aria-label={`Filter by ${rarity} rarity`}
                                        />
                                    ))}
                                </div>
                            </Col>
                        </Row>
                        <Row>
                             {/* Legalities Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <Form.Label id="formats-label">Format Legality</Form.Label>
                                <div className="d-flex flex-column flex-sm-row flex-wrap"
                                     role="group"
                                     aria-labelledby="formats-label">
                                    {[{format: 'standard', label: 'Standard'}, 
                                       {format: 'expanded', label: 'Expanded'}, 
                                       {format: 'unlimited', label: 'Unlimited'}].map(item => (
                                        <Form.Check
                                            key={item.format}
                                            type="checkbox"
                                            id={`legality-${item.format}`}
                                            label={item.label}
                                            className="me-3"
                                            checked={filterOptions.legalities[item.format] === 'Legal'}
                                            onChange={(e) => handleFilterChange('legalities', `${item.format}:Legal`, e.target.checked)}
                                            aria-label={`Filter by ${item.label} format legality`}
                                        />
                                    ))}
                                </div>
                            </Col>

                            {/* Sets Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <Form.Label htmlFor="sets-filter" id="sets-label">Sets</Form.Label>
                                <Row className="mb-2">
                                    <Col>
                                        <Form.Control
                                            type="text"
                                            placeholder="Filter sets by name..."
                                            value={setFilterText}
                                            onChange={(e) => setSetFilterText(e.target.value)}
                                            id="sets-filter"
                                            aria-label="Filter sets"
                                        />
                                    </Col>
                                </Row>
                                <div className="d-flex flex-column"
                                     role="group"
                                     aria-labelledby="sets-label"
                                     style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '0.25rem', padding: '0.5rem' }}>
                                    {availableFilters.sets
                                        .filter(set => set.name.toLowerCase().includes(setFilterText.toLowerCase()))
                                        .map(set => (
                                            <div key={set.id} className="mb-1">
                                                <Form.Check
                                                    type="checkbox"
                                                    id={`set-${set.id}`}
                                                    label={`${set.name} (${set.series})`}
                                                    checked={filterOptions.sets.includes(set.id)}
                                                    onChange={(e) => handleFilterChange('sets', set.id, e.target.checked)}
                                                    aria-label={`Filter by ${set.name} set`}
                                                />
                                            </div>
                                        ))}
                                </div>
                                {availableFilters.sets.length > 0 && (
                                    <small className="text-muted mt-1 d-block">
                                        Showing {availableFilters.sets.filter(set => 
                                            set.name.toLowerCase().includes(setFilterText.toLowerCase())
                                        ).length} of {availableFilters.sets.length} sets
                                    </small>
                                )}
                            </Col>
                        </Row>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </Form>
    );

    // --- MAIN RENDER ---
    return (
        <div className={styles.searchPanel}>
            <Card>
                <Card.Header>
                    <Tabs 
                        activeKey={tabKey} 
                        onSelect={handleTabChange} 
                        id="search-panel-tabs" 
                        className="mb-0"
                    >
                        <Tab 
                            eventKey="search" 
                            title={<><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</>}
                        />
                        <Tab 
                            eventKey="favorites" 
                            title={<><FontAwesomeIcon icon={faStar} /> Favorites ({favoriteCards.length})</>}
                        />
                        <Tab 
                            eventKey="custom" 
                            title={<><FontAwesomeIcon icon={faFileImport} /> Custom Cards ({customCards.length})</>}
                        />
                        <Tab 
                            eventKey="history" 
                            title={<><FontAwesomeIcon icon={faHistory} /> History ({searchHistory.length})</>}
                        />
                    </Tabs>
                </Card.Header>

                {tabKey === 'search' && (
                    <>
                        <Card.Header>{SearchBarComponent}</Card.Header>
                        <Card.Body>
                            {searchError && (
                                <Alert variant="warning" className="d-flex align-items-center">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                    {searchError}
                                </Alert>
                            )}
                            
                            {isLoading ? (
                                <div className="d-flex justify-content-center align-items-center my-5" style={{minHeight: '200px'}}>
                                    <Spinner animation="border" role="status">
                                        <span className="visually-hidden">Loading cards...</span>
                                    </Spinner>
                                </div>
                            ) : filteredSearchResults.length > 0 ? (
                                <>
                                    <PaginationControls />
                                    <CardContainer
                                        cards={filteredSearchResults}
                                        handleDoubleClick={handleDoubleClickData}
                                        containerType={"Search"}
                                        handleToggleFavorite={handleToggleFavorite}
                                        isCardFavorite={isCardFavorite}
                                    />
                                    <PaginationControls />
                                </>
                            ) : (
                                <div className="text-center my-5" style={{minHeight: '200px'}}>
                                    <p className="lead">
                                        {(searchTerm.trim() || Object.values(filterOptions).some(
                                            f => (Array.isArray(f) ? f.length > 0 : f) || 
                                            (typeof f === 'object' && Object.values(f).some(v => v))
                                        )) 
                                            ? "No cards found matching your search criteria."
                                            : "Enter a search term or select filters to find cards."
                                        }
                                    </p>
                                    <Button
                                        variant="outline-primary"
                                        onClick={loadLatestSet}
                                        className="me-2 mb-2"
                                        disabled={!filtersInitialized || availableFilters.sets.length === 0}
                                    >
                                        Show Latest Set
                                    </Button>
                                    {(searchTerm.trim() || Object.values(filterOptions).some(
                                        f => (Array.isArray(f) ? f.length > 0 : f) || 
                                        (typeof f === 'object' && Object.values(f).some(v => v))
                                    )) && (
                                        <Button 
                                            variant="outline-secondary" 
                                            onClick={clearFilters} 
                                            className="mb-2"
                                        >
                                            Clear Search & Filters
                                        </Button>
                                    )}
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
                                containerType={"Favorites"}
                                handleToggleFavorite={handleToggleFavorite}
                                isCardFavorite={isCardFavorite}
                            />
                        ) : (
                            <div className="text-center my-5">
                                <p className="lead">You haven't favorited any cards yet.</p>
                                <p>Click the <FontAwesomeIcon icon={faStar} /> icon on a card to add it to your favorites.</p>
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
                                containerType={"Custom"}
                                handleDeleteCard={handleDeleteCustomCard}
                                isCustomContainer={true}
                                isCardFavorite={isCardFavorite}
                                handleToggleFavorite={handleToggleFavorite}
                            />
                        ) : (
                            <div className="text-center my-5">
                                <p className="lead">You haven't created any custom cards yet.</p>
                                <p>Click the "Create Custom Card" button to get started.</p>
                            </div>
                        )}
                        {/* CustomCardCreator component would go here */}
                    </Card.Body>
                )}

                {tabKey === 'history' && (
                    <Card.Body>
                        {searchHistory.length > 0 ? (
                            <div className="list-group">
                                {searchHistory.map((historyItem, index) => (
                                    <div
                                        key={`${historyItem.timestamp}-${index}`}
                                        className="list-group-item list-group-item-action d-flex flex-column flex-sm-row justify-content-between align-items-sm-center"
                                        onClick={() => applyHistorySearch(historyItem)}
                                        style={{ cursor: 'pointer' }}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Apply search: ${historyItem.term || '(No search term)'}`}
                                        onKeyPress={(e) => e.key === 'Enter' && applyHistorySearch(historyItem)}
                                    >
                                        <div className="mb-2 mb-sm-0">
                                            <div className="d-flex align-items-center">
                                                <FontAwesomeIcon icon={faMagnifyingGlass} className="me-2 text-secondary" />
                                                <strong>{historyItem.term || '(No search term)'}</strong>
                                            </div>
                                            <div className="small text-muted mt-1">
                                                {formatDate(historyItem.timestamp)}
                                                {(historyItem.filters?.types?.length > 0 ||
                                                    historyItem.filters?.subtypes?.length > 0 ||
                                                    historyItem.filters?.supertypes?.length > 0 ||
                                                    historyItem.filters?.rarities?.length > 0 ||
                                                    historyItem.filters?.sets?.length > 0 ||
                                                    Object.values(historyItem.filters?.legalities || {}).some(v => v)) && (
                                                    <div className="mt-1 d-flex flex-wrap">
                                                        <span className="me-1">Filters:</span>
                                                        {historyItem.filters?.supertypes?.map(f => 
                                                            <Badge key={`hist-sup-${f}`} bg="primary" text="light" className="me-1 mb-1">{f}</Badge>
                                                        )}
                                                        {historyItem.filters?.types?.map(f => 
                                                            <Badge 
                                                                key={`hist-type-${f}`} 
                                                                style={{
                                                                    backgroundColor: getEnergyColor(f), 
                                                                    color: ['Colorless', 'Lightning', 'Fairy'].includes(f) ? 'black' : 'white'
                                                                }} 
                                                                className="me-1 mb-1"
                                                            >
                                                                {f}
                                                            </Badge>
                                                        )}
                                                        {historyItem.filters?.subtypes?.map(f => 
                                                            <Badge key={`hist-sub-${f}`} bg="info" text="dark" className="me-1 mb-1">{f}</Badge>
                                                        )}
                                                        {historyItem.filters?.rarities?.map(f => 
                                                            <Badge key={`hist-rar-${f}`} bg="success" text="light" className="me-1 mb-1">{f}</Badge>
                                                        )}
                                                        {historyItem.filters?.sets?.length > 0 && 
                                                            <Badge bg="warning" text="dark" className="me-1 mb-1">
                                                                {historyItem.filters.sets.length} set(s)
                                                            </Badge>
                                                        }
                                                        {Object.entries(historyItem.filters?.legalities || {})
                                                            .filter(([, v]) => v)
                                                            .map(([k]) => 
                                                                <Badge key={`hist-leg-${k}`} bg="dark" text="light" className="me-1 mb-1">
                                                                    {k}
                                                                </Badge>
                                                            )
                                                        }
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
                                            aria-label={`Apply search for ${historyItem.term || '(No search term)'}`}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center my-5">
                                <p className="lead">No search history yet.</p>
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