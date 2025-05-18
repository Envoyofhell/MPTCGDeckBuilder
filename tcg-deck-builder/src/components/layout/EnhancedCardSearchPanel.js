// src/components/layout/EnhancedCardSearchPanel.js - Complete fixed version

import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import Card from 'react-bootstrap/Card';
import CardContainer from "../CardContainer";
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
import Modal from 'react-bootstrap/Modal';
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
    faFlask,
    faSliders,
    faGears,
    faBoxArchive, 
    faChevronDown,
    faExpand,
    faCompressAlt
} from '@fortawesome/free-solid-svg-icons';
import { useDoubleClick } from "../../context/DoubleClickContext";
import CardJSONValidator from "../../utils/CardJsonValidator";
import { CardStorageManager } from "../../utils/TCGapi/CardStorageManager";
import { CardSearchManager } from "../../utils/TCGapi/CardSearchManager";
// Ensure correct casing for CustomCardManager import
import { customCardManager } from "../../utils/TCGapi/CustomCardManager";
import CustomCardCreator from "../modals/CustomCardCreator";
import { AppThemeContext } from "../../context/AppThemeContext";
import PkmnCard from "../PkmnCard";
import CustomCardImportExport from '../modals/CustomCardImportExport';
import CardPreviewModal from '../CardPreviewModal';

// For backward compatibility until the new modules are fully implemented
import EnhancedTCGController from "../../utils/TCGapi/EnhancedTCGController";

const validator = new CardJSONValidator();

function EnhancedCardSearchPanel() {
    const { theme } = useContext(AppThemeContext);
    
    // Context
    const { handleDoubleClickData } = useDoubleClick();
    
    // References
    const searchPanelRef = useRef(null);
    const searchResultsRef = useRef(null);
    const headerRef = useRef(null);
    const cardContainerRef = useRef(null);
    
    // Energy types
    const energyTypes = ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'];

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

    // State for search
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchMode, setSearchMode] = useState('contains'); // 'contains', 'startsWith', 'exact'
    const [isLoading, setIsLoading] = useState(false);
    const [tabKey, setTabKey] = useState('search');
    const [searchTabKey, setSearchTabKey] = useState('basic'); // 'basic' or 'advanced'
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [resultsPerPage, setResultsPerPage] = useState(24);
    const [activeKey, setActiveKey] = useState(''); // For accordion
    const [searchHistory, setSearchHistory] = useState([]);
    const [favoriteCards, setFavoriteCards] = useState([]);
    const [customCards, setCustomCards] = useState([]);
    const [loadingSets, setLoadingSets] = useState(false);
    const [setsExpanded, setSetsExpanded] = useState(false); 
    const [advancedFiltersExpanded, setAdvancedFiltersExpanded] = useState(false);
    const [filterSearchTerm, setFilterSearchTerm] = useState('');
    const [previewCard, setPreviewCard] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showCustomCardImportExport, setShowCustomCardImportExport] = useState(false);
    const [customCardSearchTerm, setCustomCardSearchTerm] = useState('');
    const [showCustomCardModal, setShowCustomCardModal] = useState(false); // Added this missing state
    
    // Basic filter state
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
    
    // Advanced filter state
    const [advancedFilterOptions, setAdvancedFilterOptions] = useState({
        hpRange: [0, 340],
        attackDamageRange: [0, 400],
        attackCost: [],
        retreatCost: [0, 5],
        artists: [],
        pokedexNumbers: [],
        series: [],
        regulationMarks: [],
        flavorText: '',
        hasAbility: false
    });
    
    // State for available filter options
    const [availableFilters, setAvailableFilters] = useState({
        types: energyTypes,
        subtypes: [],
        supertypes: ['Pokémon', 'Trainer', 'Energy'],
        rarities: [],
        sets: [],
        artists: [],
        series: [],
        regulationMarks: ['D', 'E', 'F', 'G', 'I']
    });

    // Handle sets section expansion
    useEffect(() => {
        if (setsExpanded && availableFilters.sets.length === 0) {
            loadSets();
        }
    }, [setsExpanded, availableFilters.sets.length]);
    
    // Handle advanced filters expansion
    useEffect(() => {
        if (advancedFiltersExpanded && availableFilters.artists.length === 0) {
            loadAdvancedFilterData();
        }
    }, [advancedFiltersExpanded, availableFilters.artists.length]);
    
    // Handle double click on card - now modified to directly add to deck
    const handleCardDoubleClick = useCallback((card) => {
        // Make sure we pass the card with the proper source field to indicate it's from search panel
        if (card) {
            // Pass the card to the DoubleClickContext for other components to use
            handleDoubleClickData({ 
                card, 
                source: 'searchPanel'
            });
        }
    }, [handleDoubleClickData]);
    
    // Load sets and initialize filters
    useEffect(() => {
        initializeFilters();
        loadFavorites();
        loadCustomCards();
        loadSearchHistory();
        loadCardSuggestions();
    }, []);
    
    // Function to initialize filters
    const initializeFilters = async () => {
        try {
            // First, set the basic filter types that we already know
            setAvailableFilters(prev => ({
                ...prev,
                types: energyTypes
            }));
            
            // Fetch rarities - these are typically lightweight
            const rarities = await EnhancedTCGController.getAllRarities();
            setAvailableFilters(prev => ({
                ...prev,
                rarities: rarities || []
            }));
            
            // Fetch subtypes - also lightweight
            const subtypes = await EnhancedTCGController.getAllSubtypes();
            setAvailableFilters(prev => ({
                ...prev,
                subtypes: subtypes || []
            }));
        } catch (error) {
            console.error('Error initializing filters:', error);
        }
    };
    
    // Function to load sets (on demand)
    const loadSets = async () => {
        if (availableFilters.sets.length > 0 || loadingSets) {
            return; // Already loaded or loading
        }
        
        try {
            setLoadingSets(true);
            // Fetch sets
            const sets = await EnhancedTCGController.getAllSets();
            
            // Extract unique series from sets
            const uniqueSeries = [...new Set(sets.map(set => set.series))].filter(Boolean);
            
            // Update available filters
            setAvailableFilters(prev => ({
                ...prev,
                sets: sets.map(set => ({ id: set.id, name: set.name, series: set.series })),
                series: uniqueSeries
            }));
        } catch (error) {
            console.error('Error loading sets:', error);
        } finally {
            setLoadingSets(false);
        }
    };
    
    // Function to load advanced filter data
    const loadAdvancedFilterData = async () => {
        if (availableFilters.artists.length > 0) {
            return; // Already loaded
        }
        
        try {
            // We can use a sample query to get some cards and extract artists
            // Load this only when advanced filters are expanded
            const sampleCards = await EnhancedTCGController.query({ supertypes: ["Pokémon"], pageSize: 100 });
            const uniqueArtists = [...new Set(sampleCards.map(card => card.artist).filter(Boolean))].sort();
            
            setAvailableFilters(prev => ({
                ...prev,
                artists: uniqueArtists || []
            }));
        } catch (error) {
            console.warn('Could not load artist data:', error);
        }
    };
    
    // Function to load card suggestions for autocomplete
    const loadCardSuggestions = async () => {
        try {
            // Load from localStorage first for immediate suggestions
            const cachedSuggestions = localStorage.getItem('tcg-deck-builder-card-suggestions');
            if (cachedSuggestions) {
                setSearchSuggestions(JSON.parse(cachedSuggestions));
            }
            
            // Then attempt to refresh from API in the background
            const sampleCards = await EnhancedTCGController.query({ pageSize: 500 }); // Get a decent sample size
            const cardNames = [...new Set(sampleCards.map(card => card.name))].sort();
            
            // Only update if we have meaningful data
            if (cardNames.length > 20) {
                setSearchSuggestions(cardNames);
                
                // Save to localStorage
                try {
                    localStorage.setItem('tcg-deck-builder-card-suggestions', JSON.stringify(cardNames));
                } catch (error) {
                    console.warn('Error saving card suggestions to localStorage:', error);
                }
            }
        } catch (error) {
            console.warn('Could not load card name suggestions:', error);
        }
    };
    
    // Load favorites from localStorage with decompression
    const loadFavorites = () => {
        try {
            const storedFavorites = localStorage.getItem('tcg-deck-builder-favorites');
            if (storedFavorites) {
                // Check if it's in the compressed format
                try {
                    // First try parsing as JSON
                    const parsed = JSON.parse(storedFavorites);
                    
                    // If it's an array with an '_isCompressed' flag, decompress it
                    if (parsed._isCompressed) {
                        setFavoriteCards(decompressCardData(parsed.data));
                    } else {
                        // Otherwise, it's the old format
                        setFavoriteCards(parsed);
                    }
                } catch (e) {
                    console.warn('Error parsing favorites, using raw data:', e);
                    setFavoriteCards(JSON.parse(storedFavorites));
                }
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    };
    
    // Save favorites to localStorage with compression
    const saveFavorites = (favorites) => {
        try {
            // Compress the data
            const compressed = {
                _isCompressed: true,
                data: compressCardData(favorites),
                timestamp: Date.now()
            };
            
            localStorage.setItem('tcg-deck-builder-favorites', JSON.stringify(compressed));
        } catch (error) {
            console.error('Error saving favorites:', error);
            
            // Fallback to traditional method
            try {
                localStorage.setItem('tcg-deck-builder-favorites', JSON.stringify(favorites));
            } catch (fallbackError) {
                console.error('Fallback saving also failed:', fallbackError);
            }
        }
    };
    
    // Compress card data to save space
    const compressCardData = (cards) => {
        // Simple compression: keep only essential fields and use abbreviated keys
        return cards.map(card => ({
            i: card.id, // id
            n: card.name, // name
            s: card.supertype, // supertype
            t: card.types || [], // types
            im: card.image || (card.images?.large || card.images?.small), // image
            st: card.subtypes || [], // subtypes
            // Add just enough fields to display correctly but minimize storage
        }));
    };
    
    // Decompress card data
    const decompressCardData = (compressedData) => {
        return compressedData.map(c => ({
            id: c.i,
            name: c.n,
            supertype: c.s,
            types: c.t || [],
            subtypes: c.st || [],
            // Ensure images object exists for compatibility
            images: {
                large: c.im,
                small: c.im
            },
            image: c.im
        }));
    };
    
    // Load custom cards
    const loadCustomCards = () => {
        // Load custom cards from EnhancedTCGController
        EnhancedTCGController.loadCustomCards();
        setCustomCards(EnhancedTCGController.getCustomCards());
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
    const addToSearchHistory = (term, filters, advancedFilters) => {
        const searchEntry = {
            term,
            filters: { ...filters },
            advancedFilters: { ...advancedFilters },
            timestamp: Date.now(),
            isAdvanced: searchTabKey === 'advanced'
        };
        
        // Add to beginning of array and limit to 20 entries
        const updatedHistory = [searchEntry, ...searchHistory.slice(0, 19)];
        setSearchHistory(updatedHistory);
        saveSearchHistory(updatedHistory);
    };
    
    // Handle search form submission - now collapsed filter panel
    const handleSearch = async (event) => {
        if (event) event.preventDefault();
        
        // Close the filter panel to focus on results
        setActiveKey('');
        
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
            
            // Add advanced filters if on advanced tab
            if (searchTabKey === 'advanced') {
                // Add HP range filter
                if (advancedFilterOptions.hpRange[0] > 0 || advancedFilterOptions.hpRange[1] < 340) {
                    params.hp = `[${advancedFilterOptions.hpRange[0]} TO ${advancedFilterOptions.hpRange[1]}]`;
                }
                
                // Add artist filter
                if (advancedFilterOptions.artists.length > 0) {
                    params.artist = advancedFilterOptions.artists;
                }
                
                // Add series filter
                if (advancedFilterOptions.series.length > 0) {
                    params.series = advancedFilterOptions.series;
                }
                
                // Add regulation mark filter
                if (advancedFilterOptions.regulationMarks.length > 0) {
                    params.regulationMark = advancedFilterOptions.regulationMarks;
                }
                
                // Add ability filter
                if (advancedFilterOptions.hasAbility) {
                    params.hasAbility = true;
                }
                
                // Add flavor text filter
                if (advancedFilterOptions.flavorText) {
                    params.flavorText = `*${advancedFilterOptions.flavorText}*`;
                }
                
                // Add national pokedex filter (if specified)
                if (advancedFilterOptions.pokedexNumbers.length > 0) {
                    params.nationalPokedexNumbers = advancedFilterOptions.pokedexNumbers;
                }
                
                // Advanced attack cost filter
                if (advancedFilterOptions.attackCost.length > 0) {
                    params.attackCost = advancedFilterOptions.attackCost;
                }
                
                // Advanced retreat cost filter
                if (advancedFilterOptions.retreatCost[0] > 0 || advancedFilterOptions.retreatCost[1] < 5) {
                    params.retreatCost = `${advancedFilterOptions.retreatCost[0]}-${advancedFilterOptions.retreatCost[1]}`;
                }
            }
            
            // Perform search
            const results = await EnhancedTCGController.advancedSearch(params, currentPage, resultsPerPage);
            
            setSearchResults(results.data || []);
            
            // Update pagination info
            if (results.pagination) {
                setTotalResults(results.pagination.totalCount || 0);
                setTotalPages(Math.ceil((results.pagination.totalCount || 0) / resultsPerPage));
            }
            
            // Add to search history
            if (searchTerm.trim() || 
                Object.values(filterOptions).some(v => Array.isArray(v) ? v.length > 0 : v) ||
                (searchTabKey === 'advanced' && Object.values(advancedFilterOptions).some(v => 
                    (Array.isArray(v) && v.length > 0) || 
                    (Array.isArray(v) && v.length === 2 && (v[0] > 0 || v[1] < 340)) || 
                    (typeof v === 'boolean' && v) ||
                    (typeof v === 'string' && v.trim() !== '')
                ))
            ) {
                addToSearchHistory(searchTerm, filterOptions, advancedFilterOptions);
            }
            
            // Scroll to results
            if (searchResultsRef.current) {
                searchResultsRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error performing search:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle input change with autocomplete suggestions
    const handleInputChange = (event) => {
        const value = event.target.value;
        setSearchTerm(value);
        
        // Show suggestions if we have a value and suggestions are available
        if (value && searchSuggestions.length > 0) {
            const filteredSuggestions = searchSuggestions
                .filter(suggestion => 
                    suggestion.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5); // Limit to 5 suggestions
            
            setSearchSuggestions(filteredSuggestions);
            setShowSuggestions(filteredSuggestions.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };
    
    // Handle suggestion selection
    const handleSuggestionClick = (suggestion) => {
        setSearchTerm(suggestion);
        setShowSuggestions(false);
        
        // Optional: trigger search immediately
        setTimeout(() => {
            handleSearch();
        }, 100);
    };
    
    // Handle search mode change
    const handleSearchModeChange = (mode) => {
        setSearchMode(mode);
    };
    
    // Handle basic filter change
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
    
    // Handle advanced filter change
    const handleAdvancedFilterChange = (filterType, value) => {
        setAdvancedFilterOptions(prev => ({
            ...prev,
            [filterType]: value
        }));
    };
    
    // Handle array advanced filter change (add/remove items)
    const handleAdvancedArrayFilter = (filterType, value, checked) => {
        setAdvancedFilterOptions(prev => {
            const updatedFilters = { ...prev };
            
            if (checked) {
                if (!updatedFilters[filterType].includes(value)) {
                    updatedFilters[filterType] = [...updatedFilters[filterType], value];
                }
            } else {
                updatedFilters[filterType] = updatedFilters[filterType].filter(item => item !== value);
            }
            
            return updatedFilters;
        });
    };
    
    // Clear all filters
    const clearFilters = () => {
        // Clear basic filters
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
        
        // Clear advanced filters
        setAdvancedFilterOptions({
            hpRange: [0, 340],
            attackDamageRange: [0, 400],
            attackCost: [],
            retreatCost: [0, 5],
            artists: [],
            pokedexNumbers: [],
            series: [],
            regulationMarks: [],
            flavorText: '',
            hasAbility: false
        });
        
        // Clear search term
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
    
    // Handle search tab change (basic/advanced)
    const handleSearchTabChange = (key) => {
        setSearchTabKey(key);
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
        
        // Set basic filters
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
        
        // Set advanced filters if available
        if (historyItem.advancedFilters) {
            setAdvancedFilterOptions(historyItem.advancedFilters);
        }
        
        // Set the appropriate tabs
        setTabKey('search');
        setSearchTabKey(historyItem.isAdvanced ? 'advanced' : 'basic');
        setCurrentPage(1);
        
        // Trigger search after state updates
        setTimeout(() => {
            handleSearch();
        }, 100);
    };
    
    // Handle card hover for preview
    const handleCardHover = (card) => {
        setPreviewCard(card);
    };
    
    // Handle opening the preview modal
    const handleOpenPreviewModal = (card) => {
        setPreviewCard(card);
        setShowPreviewModal(true);
    };
    
    // Format date for display
    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Handle custom card search - Fixed
    const handleCustomCardSearch = (term) => {
        setCustomCardSearchTerm(term);
        if (term.trim() === '') {
            setCustomCards(customCardManager.getAllCustomCards());
        } else {
            setCustomCards(customCardManager.searchCustomCards(term));
        }
    };

    // Add function for custom card import/export
    const handleCustomCardImportExport = () => {
        setShowCustomCardImportExport(true);
    };

    // Add function for custom card import completion
    const handleCustomCardImportComplete = () => {
        loadCustomCards(); // Refresh the custom cards list
    };

    // Basic Search Tab Content
    const BasicSearchTab = (
        <Form onSubmit={handleSearch} className={styles.fixedSearchForm}>
            <Row className={styles.formRow}>
                <Col xs={12} md={8}>
                    <div className={styles.searchInputContainer}>
                        <InputGroup>
                            <Form.Control
                                type="text"
                                placeholder="Search cards by name"
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={handleInputChange}
                                autoComplete="off"
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
                        
                        {/* Autocomplete dropdown */}
                        {showSuggestions && (
                            <div className={styles.autocompleteDropdown}>
                                {searchSuggestions.map((suggestion, index) => (
                                    <div 
                                        key={index} 
                                        className={styles.autocompleteItem}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Col>
                <Col xs={12} md={4} className="d-flex justify-content-end mt-2 mt-md-0">
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
                    <Accordion.Body className={styles.accordionBodyEnhanced}>
                        <Row>
                            {/* Card Types Filter */}
                            <Col xs={12} md={4} className="mb-3">
                                <h6 className={styles.filterHeaderGlow}>Card Types</h6>
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
                                <h6 className={styles.filterHeaderGlow}>Energy Types</h6>
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
                            
                            {/* Sets Expansion Button */}
                            <Col xs={12} className="mb-3">
                                <Button 
                                    variant={setsExpanded ? 'primary' : 'outline-secondary'} 
                                    className="w-100 d-flex justify-content-between align-items-center mb-2"
                                    onClick={() => setSetsExpanded(!setsExpanded)}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faBoxArchive} className="me-2" />
                                        Sets ({filterOptions.sets.length} selected)
                                    </span>
                                    <FontAwesomeIcon icon={faChevronDown} 
                                        style={{ transform: setsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} 
                                    />
                                </Button>
                                
                                {setsExpanded && (
                                    <>
                                        <Row className="mb-2">
                                            <Col>
                                                <Form.Control 
                                                    type="text" 
                                                    placeholder="Filter sets..." 
                                                    value={filterSearchTerm}
                                                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                                                />
                                            </Col>
                                        </Row>
                                        {loadingSets ? (
                                            <div className="text-center py-3">
                                                <Spinner animation="border" size="sm" /> Loading sets...
                                            </div>
                                        ) : (
                                            <div className="d-flex flex-wrap" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {availableFilters.sets
                                                    .filter(set => filterSearchTerm === '' || 
                                                        set.name.toLowerCase().includes(filterSearchTerm.toLowerCase()) ||
                                                        set.series.toLowerCase().includes(filterSearchTerm.toLowerCase()))
                                                    .map(set => (
                                                        <Form.Check
                                                            key={set.id}
                                                            type="checkbox"
                                                            id={`set-${set.id}`}
                                                            label={`${set.name} (${set.series})`}
                                                            className="me-3 mb-2"
                                                            checked={filterOptions.sets.includes(set.id)}
                                                            onChange={(e) => handleFilterChange('sets', set.id, e.target.checked)}
                                                        />
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </>
                                )}
                            </Col>
                            
                            {/* Advanced Filters Expansion Button */}
                            <Col xs={12}>
                                <Button 
                                    variant={advancedFiltersExpanded ? 'info' : 'outline-info'} 
                                    className="w-100 d-flex justify-content-between align-items-center"
                                    onClick={() => setAdvancedFiltersExpanded(!advancedFiltersExpanded)}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faGears} className="me-2" />
                                        Advanced Filters
                                    </span>
                                    <FontAwesomeIcon icon={faChevronDown} 
                                        style={{ transform: advancedFiltersExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} 
                                    />
                                </Button>
                                
                                {advancedFiltersExpanded && (
                                    <div className="mt-3 border rounded p-3">
                                        <Row>
                                            {/* HP Range */}
                                            <Col xs={12} md={6} className="mb-3">
                                                <Form.Label className={styles.filterHeaderGlow}>HP Range: {advancedFilterOptions.hpRange[0]} - {advancedFilterOptions.hpRange[1]}</Form.Label>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-2">0</span>
                                                    <Form.Range
                                                        className="mx-2"
                                                        min={0}
                                                        max={340}
                                                        step={10}
                                                        value={advancedFilterOptions.hpRange[0]}
                                                        onChange={(e) => handleAdvancedFilterChange('hpRange', [parseInt(e.target.value), advancedFilterOptions.hpRange[1]])}
                                                    />
                                                    <Form.Range
                                                        className="mx-2"
                                                        min={0}
                                                        max={340}
                                                        step={10}
                                                        value={advancedFilterOptions.hpRange[1]}
                                                        onChange={(e) => handleAdvancedFilterChange('hpRange', [advancedFilterOptions.hpRange[0], parseInt(e.target.value)])}
                                                    />
                                                    <span className="ms-2">340</span>
                                                </div>
                                            </Col>
                                            
                                            {/* Has Ability Checkbox */}
                                            <Col xs={12} md={6} className="mb-3">
                                                <Form.Check
                                                    type="checkbox"
                                                    id="has-ability"
                                                    label="Has Ability"
                                                    checked={advancedFilterOptions.hasAbility}
                                                    onChange={(e) => handleAdvancedFilterChange('hasAbility', e.target.checked)}
                                                    className={styles.enhancedCheckbox}
                                                />
                                            </Col>
                                            
                                            {/* Artist Filter */}
                                            <Col xs={12} md={6} className="mb-3">
                                                <Form.Label className={styles.filterHeaderGlow}>Artist</Form.Label>
                                                <Form.Select 
                                                    onChange={(e) => {
                                                        if (e.target.value && !advancedFilterOptions.artists.includes(e.target.value)) {
                                                            handleAdvancedFilterChange('artists', [...advancedFilterOptions.artists, e.target.value]);
                                                        }
                                                    }}
                                                    value=""
                                                >
                                                    <option value="">Select an artist...</option>
                                                    {availableFilters.artists.map(artist => (
                                                        <option key={artist} value={artist}>{artist}</option>
                                                    ))}
                                                </Form.Select>
                                                
                                                {/* Selected artists */}
                                                <div className="d-flex flex-wrap mt-2">
                                                    {advancedFilterOptions.artists.map(artist => (
                                                        <Badge 
                                                            key={artist} 
                                                            bg="info" 
                                                            className="me-1 mb-1" 
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => handleAdvancedFilterChange('artists', advancedFilterOptions.artists.filter(a => a !== artist))}
                                                        >
                                                            {artist} ×
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </Col>
                                            
                                            {/* Format Legality - MOVED TO BOTTOM */}
                                            <Col xs={12} className="mb-3 mt-4">
                                                <h6 className={styles.filterHeaderGlow}>Format Legality</h6>
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
                                            
                                            {/* Card Subtypes - MOVED TO BOTTOM */}
                                            <Col xs={12} className="mb-3">
                                                <h6 className={styles.filterHeaderGlow}>Card Subtypes</h6>
                                                <div className="d-flex flex-wrap" >
                                                    {availableFilters.subtypes.slice(0, 20).map(subtype => (
                                                        <Form.Check
                                                            key={subtype}
                                                            type="checkbox"
                                                            id={`subtype-${subtype}`}
                                                            label={subtype}
                                                            className="me-3 mb-2"
                                                            checked={filterOptions.subtypes.includes(subtype)}
                                                            onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)}
                                                        />
                                                    ))}
                                                </div>
                                            </Col>
                                            
                                            {/* Rarities Filter - MOVED TO BOTTOM */}
                                            <Col xs={12} className="mb-3">
                                                <h6 className={styles.filterHeaderGlow}>Rarities</h6>
                                                <div className="d-flex flex-wrap">
                                                    {availableFilters.rarities.map(rarity => (
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
                                        </Row>
                                    </div>
                                )}
                            </Col>
                        </Row>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </Form>
    );

    // Advanced Search Tab Content
    const AdvancedSearchTab = (
        <Form onSubmit={handleSearch} className={styles.fixedSearchForm}>
            <Row className={styles.formRow}>
                <Col xs={12} md={8}>
                    <div className={styles.searchInputContainer}>
                        <InputGroup>
                            <Form.Control
                                type="text"
                                placeholder="Search cards by name"
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={handleInputChange}
                                autoComplete="off"
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
                                <FontAwesomeIcon icon={faFlask} className="me-1"/> Advanced Search
                            </Button>
                        </InputGroup>
                        
                        {/* Autocomplete dropdown */}
                        {showSuggestions && (
                            <div className={styles.autocompleteDropdown}>
                                {searchSuggestions.map((suggestion, index) => (
                                    <div 
                                        key={index} 
                                        className={styles.autocompleteItem}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Col>
                <Col xs={12} md={4} className="d-flex justify-content-end mt-2 mt-md-0">
                    <Button variant="outline-danger" onClick={clearFilters}>
                        <FontAwesomeIcon icon={faSync} className="me-1"/> Clear All Filters
                    </Button>
                </Col>
            </Row>
            
            {/* Advanced Filter Panels */}
            <div className="mt-3">
                <Accordion defaultActiveKey="0" alwaysOpen className={styles.advancedAccordion}>
                    {/* Pokemon Stats Panel */}
                    <Accordion.Item eventKey="0">
                        <Accordion.Header>
                            <FontAwesomeIcon icon={faGears} className="me-2" /> 
                            Pokémon Stats & Attributes
                        </Accordion.Header>
                        <Accordion.Body className={styles.accordionBodyEnhanced}>
                            <Row>
                                {/* HP Range */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>HP Range: {advancedFilterOptions.hpRange[0]} - {advancedFilterOptions.hpRange[1]}</Form.Label>
                                    <div className="d-flex align-items-center">
                                        <span className="me-2">0</span>
                                        <Form.Range
                                            className="mx-2"
                                            min={0}
                                            max={340}
                                            step={10}
                                            value={advancedFilterOptions.hpRange[0]}
                                            onChange={(e) => handleAdvancedFilterChange('hpRange', [parseInt(e.target.value), advancedFilterOptions.hpRange[1]])}
                                        />
                                        <Form.Range
                                            className="mx-2"
                                            min={0}
                                            max={340}
                                            step={10}
                                            value={advancedFilterOptions.hpRange[1]}
                                            onChange={(e) => handleAdvancedFilterChange('hpRange', [advancedFilterOptions.hpRange[0], parseInt(e.target.value)])}
                                        />
                                        <span className="ms-2">340</span>
                                    </div>
                                </Col>
                                
                                {/* Retreat Cost */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>Retreat Cost: {advancedFilterOptions.retreatCost[0]} - {advancedFilterOptions.retreatCost[1]}</Form.Label>
                                    <div className="d-flex align-items-center">
                                        <span className="me-2">0</span>
                                        <Form.Range
                                            className="mx-2"
                                            min={0}
                                            max={5}
                                            value={advancedFilterOptions.retreatCost[0]}
                                            onChange={(e) => handleAdvancedFilterChange('retreatCost', [parseInt(e.target.value), advancedFilterOptions.retreatCost[1]])}
                                        />
                                        <Form.Range
                                            className="mx-2"
                                            min={0}
                                            max={5}
                                            value={advancedFilterOptions.retreatCost[1]}
                                            onChange={(e) => handleAdvancedFilterChange('retreatCost', [advancedFilterOptions.retreatCost[0], parseInt(e.target.value)])}
                                        />
                                        <span className="ms-2">5</span>
                                    </div>
                                </Col>
                                
                                {/* Has Ability Checkbox */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Check
                                        type="checkbox"
                                        id="has-ability"
                                        label="Has Ability"
                                        checked={advancedFilterOptions.hasAbility}
                                        onChange={(e) => handleAdvancedFilterChange('hasAbility', e.target.checked)}
                                        className={styles.enhancedCheckbox}
                                    />
                                </Col>
                                
                                {/* National Pokedex Number */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>National Pokédex Number</Form.Label>
                                    <Form.Control
                                        type="number"
                                        placeholder="Enter Pokédex number..."
                                        min={1}
                                        max={1000}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (!isNaN(value) && value > 0) {
                                                if (!advancedFilterOptions.pokedexNumbers.includes(value)) {
                                                    handleAdvancedFilterChange('pokedexNumbers', [...advancedFilterOptions.pokedexNumbers, value]);
                                                }
                                            }
                                        }}
                                    />
                                    {/* Display selected pokedex numbers */}
                                    <div className="d-flex flex-wrap mt-2">
                                        {advancedFilterOptions.pokedexNumbers.map(num => (
                                            <Badge 
                                                key={num} 
                                                bg="primary" 
                                                className="me-1 mb-1" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleAdvancedFilterChange('pokedexNumbers', advancedFilterOptions.pokedexNumbers.filter(n => n !== num))}
                                            >
                                                #{num} ×
                                            </Badge>
                                        ))}
                                    </div>
                                </Col>
                                
                                {/* Attack Energy Cost */}
                                <Col xs={12} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>Attack Energy Requirements</Form.Label>
                                    <div className="d-flex flex-wrap">
                                        {energyTypes.map(type => (
                                            <div key={type} className="me-2 mb-2">
                                                <Button
                                                    variant={advancedFilterOptions.attackCost.includes(type) ? "primary" : "outline-secondary"}
                                                    size="sm"
                                                    onClick={() => handleAdvancedArrayFilter('attackCost', type, !advancedFilterOptions.attackCost.includes(type))}
                                                    style={{
                                                        backgroundColor: advancedFilterOptions.attackCost.includes(type) ? getEnergyColor(type) : '',
                                                        borderColor: getEnergyColor(type),
                                                        color: advancedFilterOptions.attackCost.includes(type) && ['Colorless', 'Lightning'].includes(type) ? 'black' : '',
                                                    }}
                                                >
                                                    {type}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <small className="text-muted">Filter cards that have attacks requiring these energy types</small>
                                </Col>
                            </Row>
                        </Accordion.Body>
                    </Accordion.Item>
                    
                    {/* Card Details Panel */}
                    <Accordion.Item eventKey="1">
                        <Accordion.Header>
                            <FontAwesomeIcon icon={faSliders} className="me-2" /> 
                            Card Details & Metadata
                        </Accordion.Header>
                        <Accordion.Body className={styles.accordionBodyEnhanced}>
                            <Row>
                                {/* Series Filter */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>Series</Form.Label>
                                    <div className="d-flex flex-wrap" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                        {availableFilters.series.map(series => (
                                            <Form.Check
                                                key={series}
                                                type="checkbox"
                                                id={`series-${series}`}
                                                label={series}
                                                className="me-3 mb-2"
                                                checked={advancedFilterOptions.series.includes(series)}
                                                onChange={(e) => handleAdvancedArrayFilter('series', series, e.target.checked)}
                                            />
                                        ))}
                                    </div>
                                </Col>
                                
                                {/* Regulation Marks */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>Regulation Mark</Form.Label>
                                    <div className="d-flex flex-wrap">
                                        {availableFilters.regulationMarks.map(mark => (
                                            <Badge 
                                                key={mark}
                                                bg={advancedFilterOptions.regulationMarks.includes(mark) ? "primary" : "secondary"}
                                                className="me-2 mb-2 p-2"
                                                style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                                                onClick={() => handleAdvancedArrayFilter('regulationMarks', mark, !advancedFilterOptions.regulationMarks.includes(mark))}
                                            >
                                                {mark}
                                            </Badge>
                                        ))}
                                    </div>
                                </Col>
                                
                                {/* Artist Filter */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>Artist</Form.Label>
                                    <Form.Select 
                                        onChange={(e) => {
                                            if (e.target.value && !advancedFilterOptions.artists.includes(e.target.value)) {
                                                handleAdvancedFilterChange('artists', [...advancedFilterOptions.artists, e.target.value]);
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="">Select an artist...</option>
                                        {availableFilters.artists.map(artist => (
                                            <option key={artist} value={artist}>{artist}</option>
                                        ))}
                                    </Form.Select>
                                    
                                    {/* Selected artists */}
                                    <div className="d-flex flex-wrap mt-2">
                                        {advancedFilterOptions.artists.map(artist => (
                                            <Badge 
                                                key={artist} 
                                                bg="info" 
                                                className="me-1 mb-1" 
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleAdvancedFilterChange('artists', advancedFilterOptions.artists.filter(a => a !== artist))}
                                            >
                                                {artist} ×
                                            </Badge>
                                        ))}
                                    </div>
                                </Col>
                                
                                {/* Flavor Text Search */}
                                <Col xs={12} md={6} className="mb-3">
                                    <Form.Label className={styles.filterHeaderGlow}>Flavor Text</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search by flavor text..."
                                        value={advancedFilterOptions.flavorText}
                                        onChange={(e) => handleAdvancedFilterChange('flavorText', e.target.value)}
                                    />
                                    <small className="text-muted">Search cards by the flavor text at the bottom</small>
                                </Col>
                                
                                {/* Format Legality - MOVED TO BOTTOM */}
                                <Col xs={12} className="mb-3 mt-4">
                                    <h6 className={styles.filterHeaderGlow}>Format Legality</h6>
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
                                
                                {/* Card Subtypes - MOVED TO BOTTOM */}
                                <Col xs={12} className="mb-3">
                                    <h6 className={styles.filterHeaderGlow}>Card Subtypes</h6>
                                    <div className="d-flex flex-wrap" >
                                        {availableFilters.subtypes.slice(0, 20).map(subtype => (
                                            <Form.Check
                                                key={subtype}
                                                type="checkbox"
                                                id={`subtype-${subtype}`}
                                                label={subtype}
                                                className="me-3 mb-2"
                                                checked={filterOptions.subtypes.includes(subtype)}
                                                onChange={(e) => handleFilterChange('subtypes', subtype, e.target.checked)}
                                            />
                                        ))}
                                    </div>
                                </Col>
                                
                                {/* Rarities Filter - MOVED TO BOTTOM */}
                                <Col xs={12} className="mb-3">
                                    <h6 className={styles.filterHeaderGlow}>Rarities</h6>
                                    <div className="d-flex flex-wrap">
                                        {availableFilters.rarities.map(rarity => (
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
                            </Row>
                        </Accordion.Body>
                    </Accordion.Item>
                </Accordion>
            </div>
        </Form>
    );

    // Pagination controls
    const PaginationControls = () => (
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

    return (
        <div className={styles.searchPanel} ref={searchPanelRef}>
            <Card className={styles.fixedHeaderCard}>
                {/* Fixed header with tabs */}
                <div className={styles.fixedHeader} ref={headerRef}>
                    <Card.Header>
                        <Tabs
                            activeKey={tabKey}
                            onSelect={handleTabChange}
                            className="mb-0"
                        >
                            <Tab eventKey="search" title={<><FontAwesomeIcon icon={faMagnifyingGlass} /> Search</>} />
                            <Tab eventKey="favorites" title={<><FontAwesomeIcon icon={faStar} /> Favorites</>} />
                            <Tab eventKey="custom" title={<><FontAwesomeIcon icon={faFileImport} /> Custom Cards</>} />
                            <Tab eventKey="history" title={<><FontAwesomeIcon icon={faHistory} /> History</>} />
                        </Tabs>
                    </Card.Header>
                    
                    {tabKey === 'search' && (
                        <>
                            {/* Search Type Selection Tabs - fixed */}
                            <Card.Header className={styles.secondaryHeader}>
                                <Tabs
                                    activeKey={searchTabKey}
                                    onSelect={handleSearchTabChange}
                                    variant={theme === 'dark' ? 'dark' : 'tabs'}
                                    className="mb-0 searchTypeTabs"
                                >
                                    <Tab eventKey="basic" title={<><FontAwesomeIcon icon={faMagnifyingGlass} className="me-1" /> Basic Search</>} />
                                    <Tab eventKey="advanced" title={<><FontAwesomeIcon icon={faFlask} className="me-1" /> Advanced Search</>} />
                                </Tabs>
                            </Card.Header>
                            
                            {/* Search Form - fixed */}
                            <Card.Header className={styles.searchFormHeader}>
                                {searchTabKey === 'basic' ? BasicSearchTab : AdvancedSearchTab}
                            </Card.Header>
                        </>
                    )}
                </div>
                
                {/* Scrollable Body */}
                <Card.Body className={styles.scrollableBody} ref={searchResultsRef}>
                    {tabKey === 'search' && (
                        isLoading ? (
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
                                    handleDoubleClick={handleCardDoubleClick} 
                                    containerType={"Search"}
                                    handleToggleFavorite={handleToggleFavorite}
                                    favoriteCards={favoriteCards}
                                    ref={cardContainerRef}
                                    onCardHover={handleCardHover}
                                    onCardPreview={handleOpenPreviewModal}
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
                        )
                    )}
                    
                    {tabKey === 'favorites' && (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>{favoriteCards.length} Favorite Cards</h5>
                                {favoriteCards.length > 0 && (
                                    <Button variant="outline-danger" size="sm" onClick={() => {
                                        if (window.confirm('Are you sure you want to clear all favorites?')) {
                                            setFavoriteCards([]);
                                            saveFavorites([]);
                                        }
                                    }}>
                                        Clear Favorites
                                    </Button>
                                )}
                            </div>
                            
                            {favoriteCards.length > 0 ? (
                                <CardContainer 
                                    cards={favoriteCards} 
                                    handleDoubleClick={handleCardDoubleClick} 
                                    containerType={"Search"}
                                    handleToggleFavorite={handleToggleFavorite}
                                    favoriteCards={favoriteCards}
                                    onCardHover={handleCardHover}
                                    onCardPreview={handleOpenPreviewModal}
                                />
                            ) : (
                                <div className="text-center my-5">
                                    <p>You haven't favorited any cards yet.</p>
                                    <p>Click the star icon on a card to add it to your favorites.</p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {tabKey === 'custom' && (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>{customCards.length} Custom Cards</h5>
                                <div>
                                    <Button 
                                        variant="primary" 
                                        onClick={() => setShowCustomCardModal(true)}
                                        className="me-2"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        Create Card
                                    </Button>
                                    <Button 
                                        variant="info" 
                                        onClick={handleCustomCardImportExport}
                                    >
                                        <FontAwesomeIcon icon={faFileImport} className="me-2" />
                                        Import/Export
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Add search for custom cards */}
                            <Form className="mb-3">
                                <InputGroup>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search custom cards..."
                                        value={customCardSearchTerm}
                                        onChange={(e) => handleCustomCardSearch(e.target.value)}
                                    />
                                    <Button variant="outline-secondary">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                                    </Button>
                                </InputGroup>
                            </Form>
                            
                            {customCards.length > 0 ? (
                                <CardContainer 
                                    cards={customCards} 
                                    handleDoubleClick={handleCardDoubleClick} 
                                    containerType={"Search"}
                                    handleDeleteCard={handleDeleteCustomCard}
                                    isCustomContainer={true}
                                    onCardHover={handleCardHover}
                                    onCardPreview={handleOpenPreviewModal}
                                />
                            ) : (
                                <div className="text-center my-5">
                                    <p>You haven't created any custom cards yet.</p>
                                    <p>Click the "Create Custom Card" button to get started.</p>
                                </div>
                            )}
                        </>
                    )}
                    
                    {tabKey === 'history' && (
                        <>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5>Search History</h5>
                                {searchHistory.length > 0 && (
                                    <Button 
                                        variant="outline-secondary" 
                                        size="sm"
                                        onClick={() => {
                                            if (window.confirm('Clear search history?')) {
                                                setSearchHistory([]);
                                                saveSearchHistory([]);
                                            }
                                        }}
                                    >
                                        Clear History
                                    </Button>
                                )}
                            </div>
                            
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
                                                    <FontAwesomeIcon 
                                                        icon={historyItem.isAdvanced ? faFlask : faMagnifyingGlass} 
                                                        className="me-2 text-secondary" 
                                                    />
                                                    <strong>{historyItem.term || '(No search term)'}</strong>
                                                    {historyItem.isAdvanced && (
                                                        <Badge bg="info" className="ms-2">Advanced</Badge>
                                                    )}
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
                                                    
                                                    {/* Display advanced filters if available */}
                                                    {historyItem.isAdvanced && historyItem.advancedFilters && (
                                                        <div className="mt-1">
                                                            <span>Advanced: </span>
                                                            {historyItem.advancedFilters.hpRange[0] > 0 || historyItem.advancedFilters.hpRange[1] < 340 ? (
                                                                <Badge bg="success" className="me-1">
                                                                    HP {historyItem.advancedFilters.hpRange[0]}-{historyItem.advancedFilters.hpRange[1]}
                                                                </Badge>
                                                            ) : null}
                                                            {historyItem.advancedFilters.retreatCost[0] > 0 || historyItem.advancedFilters.retreatCost[1] < 5 ? (
                                                                <Badge bg="success" className="me-1">
                                                                    Retreat {historyItem.advancedFilters.retreatCost[0]}-{historyItem.advancedFilters.retreatCost[1]}
                                                                </Badge>
                                                            ) : null}
                                                            {historyItem.advancedFilters.hasAbility && (
                                                                <Badge bg="success" className="me-1">Has Ability</Badge>
                                                            )}
                                                            {historyItem.advancedFilters.artists?.length > 0 && (
                                                                <Badge bg="success" className="me-1">{historyItem.advancedFilters.artists.length} Artist(s)</Badge>
                                                            )}
                                                            {historyItem.advancedFilters.series?.length > 0 && (
                                                                <Badge bg="success" className="me-1">{historyItem.advancedFilters.series.length} Series</Badge>
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
                        </>
                    )}
                </Card.Body>
            </Card>
            
            {/* Modals */}
            <CustomCardCreator 
                show={showCustomCardModal} 
                handleClose={() => setShowCustomCardModal(false)} 
                onCardCreated={handleCustomCardCreated}
            />
            
            <CustomCardImportExport
                show={showCustomCardImportExport}
                onHide={() => setShowCustomCardImportExport(false)}
                onImportComplete={handleCustomCardImportComplete}
                theme={theme}
            />

            {/* Use the improved CardPreviewModal component */}
            <CardPreviewModal
                show={showPreviewModal}
                onHide={() => setShowPreviewModal(false)}
                card={previewCard}
                theme={theme}
                onAddToDeck={handleCardDoubleClick}
            />
        </div>
    );
}

export default EnhancedCardSearchPanel;