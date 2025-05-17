/**
 * EnhancedCardSearchPanel.js
 *
 * @version 2.0.0
 * @description React component for searching Pokémon TCG cards with advanced filtering.
 *
 * Changelog:
 * v2.0.0 (2025-05-16):
 * - Applied user-provided fixes and enhancements:
 * 1. Fixed Set Checkboxes Display: Added text input to filter available sets and updated display logic.
 * 2. Prevented Auto-Loading: Cards are now only loaded on explicit search actions (button click or form submit).
 * - Removed automatic search on component mount or non-explicit triggers.
 * - Updated handleSearch to combine local and API results, handle duplicates, and manage pagination state.
 * 3. Enhanced PrereleaseCardFilter: handleSearch now passes more parameters to PrereleaseCardFilter,
 * assuming PrereleaseCardFilter.js has been updated as per user's snippet #3.
 * 4. Added Default View for Latest Set: Optional button to load cards from the latest set.
 * 5. Fixed Filter Buttons with Badge Counts: More accurate and comprehensive badge count for active filters.
 * - Added `filteredSearchResults` state for client-side pagination.
 * - Refined `handleSearch` logic for clarity and robustness.
 * - Improved `useEffect` hooks for data loading and pagination.
 * - Enhanced "no results" UI with conditional messaging and "Show Latest Set" button.
 * - Updated `clearFilters` to reset all relevant search and result states.
 * - Added more detailed comments and JSDoc-style headers.
 *
 * Optimizations & Notes:
 * - API Pagination: If the TCG API supports pagination, consider fetching paginated results directly from the API
 * in `handleSearch` instead of fetching all results and paginating client-side. This would be more efficient
 * for very large result sets.
 * - State Management: For larger applications, consider using a dedicated state management library (like Redux, Zustand, or Context API more extensively)
 * for `filterOptions`, `searchResults`, etc., especially if these states are shared across multiple components.
 * - Debouncing: For the search input (`searchTerm`), debouncing `handleSearch` can prevent excessive API calls while the user is typing.
 * - Error Handling: More granular error messages could be displayed to the user based on API error responses.
 * - Code Splitting: For very large components or utilities, consider code splitting to improve initial load time.
 * - Sorting Sets: Ensure `availableFilters.sets` is sorted by release date (newest first) if `loadLatestSet` relies on `availableFilters.sets[0]`.
 * This sorting should ideally happen in `initializeFilters` or be guaranteed by the API.
 * - PrereleaseCardFilter.js: This file should be updated separately as per the user's snippet #3 to enable
 * the extended local filtering capabilities (by sets, rarities, subtypes).
 */

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
import styles from './css/CardSearchPanel.module.css'; // Ensure this path is correct
import PrereleaseCardFilter from "../../utils/PrereleaseCardFilter"; // Ensure this path is correct
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
import { useDoubleClick } from "../../context/DoubleClickContext"; // Ensure this path is correct
// import CardJSONValidator from "../../utils/CardJsonValidator"; // Not used in the provided snippets, uncomment if needed
import CardContainer from "../CardContainer"; // Ensure this path is correct
// If CustomCardCreator isn't available or has import issues, comment it out temporarily
// import CustomCardCreator from "../modals/CustomCardCreator";
import EnhancedTCGController from "../../utils/TCGapi/EnhancedTCGController"; // Ensure this path is correct

// const validator = new CardJSONValidator(); // Uncomment if CardJSONValidator is used

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
    return colors[type] || '#68A090'; // Default color
};

function EnhancedCardSearchPanel() {
    // --- STATE VARIABLES ---

    // Search and Results State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchMode, setSearchMode] = useState('contains'); // 'contains', 'startsWith', 'exact'
    const [searchResults, setSearchResults] = useState([]); // All results from the current search
    const [filteredSearchResults, setFilteredSearchResults] = useState([]); // Paginated subset of searchResults
    const [isLoading, setIsLoading] = useState(false);
    const [tabKey, setTabKey] = useState('search');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [resultsPerPage, setResultsPerPage] = useState(24);

    // Filters State
    const [activeKey, setActiveKey] = useState(''); // Accordion state for filters ('0' to show, '' to hide)
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
        subtypes: [], // Consider populating this from API if dynamic
        supertypes: ['Pokémon', 'Trainer', 'Energy'], // Static for now
        rarities: [], // Consider populating this from API
        sets: []
    });
    const [setFilterText, setSetFilterText] = useState(''); // For filtering the list of sets in the UI

    // Other UI/Data States
    const [searchHistory, setSearchHistory] = useState([]);
    const [favoriteCards, setFavoriteCards] = useState([]);
    const [customCards, setCustomCards] = useState([]);
    const [showCustomCardModal, setShowCustomCardModal] = useState(false);

    // Context
    const { handleDoubleClickData } = useDoubleClick();

    // Static Data
    const energyTypes = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];
    const pokemonSubtypes = ['Basic', 'Stage 1', 'Stage 2', 'V', 'VMAX', 'VSTAR', 'ex', 'GX', 'BREAK', 'LEGEND', 'Restored', 'MEGA']; // Expanded list
    const trainerSubtypes = ['Item', 'Tool', 'Supporter', 'Stadium', 'Technical Machine']; // Expanded list
    const commonRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Holo V', 'Rare Holo VMAX', 'Rare Holo VSTAR', 'Amazing Rare', 'Rare ACE', 'Rare BREAK', 'Rare Prism Star', 'Rare Prime', 'Rare Rainbow', 'Rare Secret', 'Rare Shining', 'Rare Shiny', 'Rare Shiny GX', 'Rare Ultra', 'Promo']; // Expanded list


    // --- EFFECTS ---

    /**
     * Initializes filters, loads favorites, custom cards, and search history on component mount.
     * No automatic search is performed here.
     */
    useEffect(() => {
        initializeFilters();
        loadFavorites();
        loadCustomCards();
        loadSearchHistory();
        // NO AUTOMATIC SEARCH ON MOUNT
    }, []);

    /**
     * Handles client-side pagination. Updates `filteredSearchResults` when
     * `currentPage`, `resultsPerPage`, or `searchResults` change.
     */
    useEffect(() => {
        if (tabKey === 'search') { // Only paginate for the search tab
            const start = (currentPage - 1) * resultsPerPage;
            const end = start + resultsPerPage;
            setFilteredSearchResults(searchResults.slice(start, end));
        }
    }, [currentPage, resultsPerPage, searchResults, tabKey]);


    // --- DATA INITIALIZATION AND LOCALSTORAGE ---

    /**
     * Fetches available filter options (sets, types, rarities) from the API.
     * TODO: Consider fetching subtypes and rarities from API if they are dynamic.
     */
    const initializeFilters = async () => {
        setIsLoading(true);
        try {
            const setsData = await EnhancedTCGController.getAllSets();
            // Sort sets by release date (newest first) if API doesn't guarantee order
            // This is important for the "Show Latest Set" feature if it relies on sets[0]
            const sortedSets = setsData?.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)) || [];

            // TODO: Fetch types and rarities from API if dynamic
            // const typesData = await EnhancedTCGController.getTypes();
            // const raritiesData = await EnhancedTCGController.getRarities();

            setAvailableFilters(prev => ({
                ...prev,
                types: energyTypes, // Using static energyTypes for now
                // subtypes: Dynamically fetched subtypes or static lists
                // rarities: raritiesData || commonRarities, // Use fetched or fallback
                rarities: commonRarities, // Using static commonRarities for now
                sets: sortedSets.map(set => ({ id: set.id, name: set.name, series: set.series, releaseDate: set.releaseDate })) || []
            }));
        } catch (error) {
            console.error('Error initializing filters:', error);
            // Optionally set an error state to inform the user
        } finally {
            setIsLoading(false);
        }
    };

    const loadFavorites = () => {
        try {
            const storedFavorites = localStorage.getItem('tcg-deck-builder-favorites');
            if (storedFavorites) setFavoriteCards(JSON.parse(storedFavorites));
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
            EnhancedTCGController.loadCustomCards(); // Assumes this loads into the controller
            setCustomCards(EnhancedTCGController.getCustomCards());
        } catch (error) {
            console.error('Error loading custom cards:', error);
        }
    };

    const loadSearchHistory = () => {
        try {
            const storedHistory = localStorage.getItem('tcg-deck-builder-search-history');
            if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
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
     * @param {React.SyntheticEvent | null} event - The form submission event, or null if called programmatically.
     */
    const handleSearch = async (event) => {
        if (event) event.preventDefault();

        const currentSearchTerm = searchTerm.trim();
        const hasActiveFilters =
            filterOptions.types.length > 0 ||
            filterOptions.subtypes.length > 0 ||
            filterOptions.supertypes.length > 0 ||
            filterOptions.sets.length > 0 ||
            filterOptions.rarities.length > 0 ||
            Object.values(filterOptions.legalities).some(value => value);

        if (!currentSearchTerm && !hasActiveFilters) {
            setSearchResults([]);
            setFilteredSearchResults([]);
            setTotalResults(0);
            setTotalPages(1);
            setCurrentPage(1);
            // Optionally, set a state to show "Please enter a search term or select filters"
            return;
        }

        setIsLoading(true);
        setSearchResults([]); // Clear previous results
        setFilteredSearchResults([]); // Clear paginated results

        try {
            // 1. Get local pre-release cards matching the search criteria
            // PrereleaseCardFilter.js should be updated as per user's snippet #3
            // to handle these additional filter parameters.
            const localFilterParams = {
                name: currentSearchTerm,
                types: filterOptions.types,
                supertypes: filterOptions.supertypes,
                subtypes: filterOptions.subtypes,
                sets: filterOptions.sets,
                rarities: filterOptions.rarities
                // Note: Legalities are typically API-side filters.
            };
            const localResults = currentSearchTerm || hasActiveFilters ? PrereleaseCardFilter.filter(localFilterParams) : [];

            // 2. Try API search with selected filters
            let apiResults = [];
            if (currentSearchTerm || hasActiveFilters) { // Only call API if there's something to search for
                const apiParams = { ...filterOptions }; // Includes types, subtypes, supertypes, sets, rarities, legalities

                if (currentSearchTerm) {
                    if (searchMode === 'exact') {
                        apiParams.name = `"${currentSearchTerm}"`; // APIs often use quotes for exact phrase
                    } else if (searchMode === 'startsWith') {
                        apiParams.name = `${currentSearchTerm}*`;
                    } else { // 'contains'
                        apiParams.name = `*${currentSearchTerm}*`; // Or just currentSearchTerm if API handles partial match by default
                    }
                }
                // TODO: Add pagination params to apiParams if API supports it (e.g., apiParams.page, apiParams.pageSize)

                try {
                    const searchResult = await EnhancedTCGController.query(apiParams);
                    apiResults = searchResult || [];
                } catch (error) {
                    console.error("API search failed:", error);
                    // Optionally set an error state to inform the user about API failure
                }
            }

            // 3. Combine results (remove duplicates by card id or name + set.id for robustness)
            const combinedResults = [...localResults];
            const localCardIdentifiers = new Set(
                localResults.map(card => card.id || `${card.name?.toLowerCase()}-${card.set?.id?.toLowerCase()}`)
            );

            apiResults.forEach(apiCard => {
                const apiCardIdentifier = apiCard.id || `${apiCard.name?.toLowerCase()}-${apiCard.set?.id?.toLowerCase()}`;
                if (!localCardIdentifiers.has(apiCardIdentifier)) {
                    combinedResults.push(apiCard);
                }
            });

            setSearchResults(combinedResults);
            setTotalResults(combinedResults.length);
            setTotalPages(Math.ceil(combinedResults.length / resultsPerPage) || 1);
            setCurrentPage(1); // Reset to page 1 for new search results

            // Add to search history
            if (currentSearchTerm || hasActiveFilters) {
                addToSearchHistory(currentSearchTerm, filterOptions);
            }

        } catch (error) {
            console.error('Error performing search:', error);
            setSearchResults([]);
            setFilteredSearchResults([]);
            setTotalResults(0);
            setTotalPages(1);
            // Optionally set an error state to inform the user
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
                const [format, legalityValue] = value.split(':'); // e.g., "standard:Legal"
                updatedFilters.legalities = {
                    ...updatedFilters.legalities,
                    [format]: checked ? legalityValue : ''
                };
            } else { // Array-based filters (types, subtypes, etc.)
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

    const clearFilters = () => {
        setFilterOptions({
            types: [], subtypes: [], supertypes: [], rarities: [], sets: [],
            legalities: { standard: '', expanded: '', unlimited: '' }
        });
        setSearchTerm('');
        setSetFilterText(''); // Clear set filter text input

        // Clear search results and reset pagination
        setSearchResults([]);
        setFilteredSearchResults([]);
        setTotalResults(0);
        setTotalPages(1);
        setCurrentPage(1);
        setActiveKey(''); // Close accordion
        // Note: handleSearch() is not called here; the UI will reflect no search term/filters.
        // If you want to explicitly show the "Enter search term..." message, you might call handleSearch()
        // which will then return early due to no term/filters.
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            window.scrollTo(0, 0); // Scroll to top on page change
        }
    };

    const handleTabChange = (key) => {
        setTabKey(key);
        setCurrentPage(1); // Reset to first page when changing tabs
        setTotalResults(0); // Reset results when changing tabs (except if search results should persist)
        setSearchResults([]);
        setFilteredSearchResults([]);


        if (key === 'custom') loadCustomCards();
        if (key === 'favorites') loadFavorites();
        if (key === 'search') {
            // If you want to clear search term and filters when switching to search tab:
            // setSearchTerm('');
            // clearFilters(); // Or a more selective reset
            // For now, keeps existing search term and filters
        }
    };

    const handleToggleFavorite = (card) => {
        const isFavorite = favoriteCards.some(fav => fav.id === card.id);
        let updatedFavorites;
        if (isFavorite) {
            updatedFavorites = favoriteCards.filter(fav => fav.id !== card.id);
        } else {
            updatedFavorites = [...favoriteCards, card];
        }
        setFavoriteCards(updatedFavorites);
        saveFavorites(updatedFavorites);
    };

    const isCardFavorite = (cardId) => favoriteCards.some(fav => fav.id === cardId);

    const handleCustomCardCreated = (/* card */) => {
        // Assuming card creation updates the list via EnhancedTCGController
        loadCustomCards(); // Reload custom cards
        setShowCustomCardModal(false);
    };

    const handleDeleteCustomCard = (id) => {
        // Consider using a more user-friendly confirmation modal instead of window.confirm
        if (window.confirm('Are you sure you want to delete this custom card?')) {
            EnhancedTCGController.deleteCustomCard(id);
            loadCustomCards(); // Refresh the list
        }
    };

    const applyHistorySearch = (historyItem) => {
        setSearchTerm(historyItem.term || '');
        setFilterOptions(historyItem.filters || {
            types: [], subtypes: [], supertypes: [], rarities: [], sets: [],
            legalities: { standard: '', expanded: '', unlimited: '' }
        });
        setTabKey('search');
        setCurrentPage(1); // Reset to page 1

        // Trigger search after state updates. Use setTimeout to allow state to propagate.
        setTimeout(() => {
            handleSearch(null); // Pass null for event
        }, 0);
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    /**
     * Loads cards from the latest set.
     * Assumes availableFilters.sets is sorted with the newest set first.
     * This version clears other filters and the search term.
     */
    const loadLatestSet = () => {
        if (availableFilters.sets && availableFilters.sets.length > 0) {
            // Assuming sets are already sorted by release date (newest first) in initializeFilters
            const latestSetId = availableFilters.sets[0].id;

            const newFilterOptions = {
                types: [],
                subtypes: [],
                supertypes: [],
                rarities: [],
                sets: [latestSetId], // Select only this set
                legalities: { standard: '', expanded: '', unlimited: '' } // Reset legalities
            };
            
            setFilterOptions(newFilterOptions);
            setSearchTerm(''); // Clear any existing search term

            // Trigger search after state updates.
            // Using setTimeout to help ensure state is updated before handleSearch reads it.
            setTimeout(() => {
                handleSearch(null); // Pass null for event
            }, 0);
        } else {
            console.warn("No sets available to determine the latest set.");
            // Optionally, inform the user (e.g., via a toast notification)
        }
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
                >
                    Next
                </Button>
                <Form.Select
                    value={resultsPerPage}
                    onChange={(e) => {
                        setResultsPerPage(Number(e.target.value));
                        setCurrentPage(1); // Reset to first page
                    }}
                    disabled={isLoading}
                    style={{ width: '80px' }}
                    size="sm"
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
            <Row className={`${styles.formRow} mb-3`}> {/* Added mb-3 for spacing */}
                <Col xs={12} md={8} className="mb-2 mb-md-0">
                    <InputGroup>
                        <Form.Control
                            type="text"
                            placeholder="Search cards by name (e.g., Charizard)"
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={handleInputChange}
                            aria-label="Search card name"
                        />
                        <InputGroup.Text className={styles.noLeftPadding}> {/* Custom style to remove padding if needed */}
                            <Form.Select
                                value={searchMode}
                                onChange={(e) => handleSearchModeChange(e.target.value)}
                                style={{ border: 'none', marginLeft: '-1px' }} // Adjusted for better visual integration
                                aria-label="Search mode"
                            >
                                <option value="contains">Contains</option>
                                <option value="startsWith">Starts With</option>
                                <option value="exact">Exact Match</option>
                            </Form.Select>
                        </InputGroup.Text>
                        <Button type="submit" className={styles.searchButton} disabled={isLoading}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="me-1" /> Search
                        </Button>
                    </InputGroup>
                </Col>
                <Col xs={12} md={4} className="d-flex justify-content-md-end">
                     {/* Updated Filter Button with Badge Counts (Change 5) */}
                    <Button
                        variant="outline-secondary"
                        className="me-2"
                        onClick={() => setActiveKey(activeKey === '0' ? '' : '0')}
                        aria-expanded={activeKey === '0'}
                        aria-controls="filter-accordion-body"
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
                    <Button variant="outline-danger" onClick={clearFilters} disabled={isLoading}>
                        <FontAwesomeIcon icon={faSync} className="me-1" /> Clear
                    </Button>
                </Col>
            </Row>

            <Accordion activeKey={activeKey} className="mb-3" id="filter-accordion">
                <Accordion.Item eventKey="0">
                    <Accordion.Body id="filter-accordion-body"> {/* Added id for aria-controls */}
                        <Row>
                            {/* Card Types (Supertype) Filter */}
                            <Col xs={12} md={4} className="mb-3">
                                <h6>Card Category</h6>
                                <div className="d-flex flex-column flex-sm-row flex-wrap">
                                    {availableFilters.supertypes.map(supertype => (
                                        <Form.Check
                                            key={supertype} type="checkbox" id={`supertype-${supertype}`}
                                            label={supertype} className="me-3"
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
                                    {availableFilters.types.map(type => ( // Assuming availableFilters.types is populated (e.g. with energyTypes)
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
                                <h6>Card Subtypes</h6>
                                <Row>
                                    <Col xs={12} sm={6} className="mb-2 mb-sm-0">
                                        <h6 className="fs-7 text-muted">Pokémon</h6>
                                        <div className="d-flex flex-column" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                            {pokemonSubtypes.map(subtype => (
                                                <Form.Check key={subtype} type="checkbox" id={`subtype-pokemon-${subtype}`}
                                                    label={subtype} className="me-3"
                                                    checked={filterOptions.subtypes.includes(subtype)}
                                                    onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)} />
                                            ))}
                                        </div>
                                    </Col>
                                    <Col xs={12} sm={6}>
                                        <h6 className="fs-7 text-muted">Trainer</h6>
                                         <div className="d-flex flex-column" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                            {trainerSubtypes.map(subtype => (
                                                <Form.Check key={subtype} type="checkbox" id={`subtype-trainer-${subtype}`}
                                                    label={subtype} className="me-3"
                                                    checked={filterOptions.subtypes.includes(subtype)}
                                                    onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)} />
                                            ))}
                                        </div>
                                    </Col>
                                </Row>
                            </Col>

                            {/* Rarities Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <h6>Rarities</h6>
                                <div className="d-flex flex-column" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {availableFilters.rarities.map(rarity => ( // Assuming availableFilters.rarities is populated
                                        <Form.Check key={rarity} type="checkbox" id={`rarity-${rarity.replace(/\s+/g, '-')}`} // Sanitize ID
                                            label={rarity} className="me-3"
                                            checked={filterOptions.rarities.includes(rarity)}
                                            onChange={(e) => handleFilterChange('rarities', rarity, e.target.checked)} />
                                    ))}
                                </div>
                            </Col>
                        </Row>
                        <Row>
                             {/* Legalities Filter */}
                            <Col xs={12} md={6} className="mb-3">
                                <h6>Format Legality</h6>
                                <div className="d-flex flex-column flex-sm-row flex-wrap">
                                    {[{format: 'standard', label: 'Standard'}, {format: 'expanded', label: 'Expanded'}, {format: 'unlimited', label: 'Unlimited'}].map(item => (
                                        <Form.Check key={item.format} type="checkbox" id={`legality-${item.format}`}
                                            label={item.label} className="me-3"
                                            checked={filterOptions.legalities[item.format] === 'Legal'}
                                            onChange={(e) => handleFilterChange('legalities', `${item.format}:Legal`, e.target.checked)} />
                                    ))}
                                </div>
                            </Col>

                            {/* Sets Filter (Change 1) */}
                            <Col xs={12} md={6} className="mb-3">
                                <h6>Sets</h6>
                                <Row className="mb-2">
                                    <Col>
                                        <Form.Control
                                            type="text"
                                            placeholder="Filter sets by name..."
                                            value={setFilterText}
                                            onChange={(e) => setSetFilterText(e.target.value)}
                                            aria-label="Filter sets"
                                        />
                                    </Col>
                                </Row>
                                <div className="d-flex flex-column" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '0.25rem', padding: '0.5rem' }}>
                                    {availableFilters.sets
                                        .filter(set => set.name.toLowerCase().includes(setFilterText.toLowerCase()))
                                        .map(set => (
                                            <div key={set.id} className="mb-1"> {/* Adjusted for better spacing in column */}
                                                <Form.Check
                                                    type="checkbox"
                                                    id={`set-${set.id}`}
                                                    label={`${set.name} (${set.series})`}
                                                    checked={filterOptions.sets.includes(set.id)}
                                                    onChange={(e) => handleFilterChange('sets', set.id, e.target.checked)}
                                                />
                                            </div>
                                        ))}
                                </div>
                                {availableFilters.sets.length > 0 && (
                                    <small className="text-muted mt-1 d-block">
                                        Showing {availableFilters.sets.filter(set => set.name.toLowerCase().includes(setFilterText.toLowerCase())).length} of {availableFilters.sets.length} sets
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
                <Card.Header className={styles.stickyHeader}> {/* Optional: for sticky tabs/header */}
                    <Tabs activeKey={tabKey} onSelect={handleTabChange} id="search-panel-tabs" className="mb-0"> {/* mb-0 if header has padding */}
                        <Tab eventKey="search" title={<><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</>} />
                        <Tab eventKey="favorites" title={<><FontAwesomeIcon icon={faStar} /> Favorites ({favoriteCards.length})</>} />
                        <Tab eventKey="custom" title={<><FontAwesomeIcon icon={faFileImport} /> Custom Cards ({customCards.length})</>} />
                        <Tab eventKey="history" title={<><FontAwesomeIcon icon={faHistory} /> History ({searchHistory.length})</>} />
                    </Tabs>
                </Card.Header>

                {tabKey === 'search' && (
                    <>
                        <Card.Header>{SearchBarComponent}</Card.Header>
                        <Card.Body>
                            {isLoading ? (
                                <div className="d-flex justify-content-center align-items-center my-5" style={{minHeight: '200px'}}>
                                    <Spinner animation="border" size="xl" role="status">
                                        <span className="visually-hidden">Loading cards...</span>
                                    </Spinner>
                                </div>
                            ) : totalResults > 0 ? (
                                <>
                                    <PaginationControls />
                                    <CardContainer
                                        cards={filteredSearchResults} // Display paginated results
                                        handleDoubleClick={handleDoubleClickData}
                                        containerType={"Search"} // Or a more specific type if needed
                                        handleToggleFavorite={handleToggleFavorite}
                                        isCardFavorite={isCardFavorite} // Pass this down
                                        // favoriteCards={favoriteCards} // Redundant if isCardFavorite is used effectively
                                    />
                                    <PaginationControls />
                                </>
                            ) : (
                                // Empty state for search tab (Change 4)
                                <div className="text-center my-5" style={{minHeight: '200px'}}>
                                    <p className="lead">
                                        { (searchTerm.trim() || Object.values(filterOptions).some(f => (Array.isArray(f) ? f.length > 0 : f) || (typeof f === 'object' && Object.values(f).some(v => v))))
                                            ? "No cards found matching your search criteria."
                                            : "Enter a search term or select filters to find cards."
                                        }
                                    </p>
                                    <Button
                                        variant="outline-primary"
                                        onClick={loadLatestSet}
                                        className="me-2 mb-2"
                                    >
                                        Show Latest Set
                                    </Button>
                                    {(searchTerm.trim() || Object.values(filterOptions).some(f => (Array.isArray(f) ? f.length > 0 : f) || (typeof f === 'object' && Object.values(f).some(v => v)))) && (
                                        <Button variant="outline-secondary" onClick={clearFilters} className="mb-2">
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
                                handleDeleteCard={handleDeleteCustomCard} // Pass delete handler
                                isCustomContainer={true} // Differentiate for custom card specific actions/display
                                isCardFavorite={isCardFavorite} // If custom cards can be favorited
                                handleToggleFavorite={handleToggleFavorite}
                            />
                        ) : (
                            <div className="text-center my-5">
                                <p className="lead">You haven't created any custom cards yet.</p>
                                <p>Click the "Create Custom Card" button to get started.</p>
                            </div>
                        )}
                        {/* <CustomCardCreator 
                            show={showCustomCardModal} 
                            handleClose={() => setShowCustomCardModal(false)} 
                            onCardCreated={handleCustomCardCreated}
                            // validator={validator} // Pass validator if needed by CustomCardCreator
                        /> 
                        */}
                    </Card.Body>
                )}

                {tabKey === 'history' && (
                    <Card.Body>
                        {searchHistory.length > 0 ? (
                            <div className="list-group">
                                {searchHistory.map((historyItem, index) => (
                                    <div
                                        key={`${historyItem.timestamp}-${index}`} // More unique key
                                        className="list-group-item list-group-item-action d-flex flex-column flex-sm-row justify-content-between align-items-sm-center"
                                        onClick={() => applyHistorySearch(historyItem)}
                                        style={{ cursor: 'pointer' }}
                                        tabIndex={0} // Make it focusable
                                        onKeyPress={(e) => e.key === 'Enter' && applyHistorySearch(historyItem)} // Keyboard accessibility
                                    >
                                        <div className="mb-2 mb-sm-0">
                                            <div className="d-flex align-items-center">
                                                <FontAwesomeIcon icon={faMagnifyingGlass} className="me-2 text-secondary" />
                                                <strong>{historyItem.term || '(No search term)'}</strong>
                                            </div>
                                            <div className="small text-muted mt-1">
                                                {formatDate(historyItem.timestamp)}
                                                {/* Display active filters concisely */}
                                                {(historyItem.filters?.types?.length > 0 ||
                                                    historyItem.filters?.subtypes?.length > 0 ||
                                                    historyItem.filters?.supertypes?.length > 0 ||
                                                    historyItem.filters?.rarities?.length > 0 ||
                                                    historyItem.filters?.sets?.length > 0 ||
                                                    Object.values(historyItem.filters?.legalities || {}).some(v => v)) && (
                                                    <div className="mt-1 d-flex flex-wrap">
                                                        <span className="me-1">Filters:</span>
                                                        {historyItem.filters?.supertypes?.map(f => <Badge key={`hist-sup-${f}`} bg="primary" text="light" className="me-1 mb-1">{f}</Badge>)}
                                                        {historyItem.filters?.types?.map(f => <Badge key={`hist-type-${f}`} style={{backgroundColor: getEnergyColor(f), color: ['Colorless', 'Lightning', 'Fairy'].includes(f) ? 'black' : 'white'}} className="me-1 mb-1">{f}</Badge>)}
                                                        {historyItem.filters?.subtypes?.map(f => <Badge key={`hist-sub-${f}`} bg="info" text="dark" className="me-1 mb-1">{f}</Badge>)}
                                                        {historyItem.filters?.rarities?.map(f => <Badge key={`hist-rar-${f}`} bg="success" text="light" className="me-1 mb-1">{f}</Badge>)}
                                                        {historyItem.filters?.sets?.length > 0 && <Badge bg="warning" text="dark" className="me-1 mb-1">{historyItem.filters.sets.length} set(s)</Badge>}
                                                        {Object.entries(historyItem.filters?.legalities || {}).filter(([, v]) => v).map(([k]) => <Badge key={`hist-leg-${k}`} bg="dark" text="light" className="me-1 mb-1">{k}</Badge>)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent list item click from firing again
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

