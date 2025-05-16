import React, { useEffect, useState, useContext, lazy, Suspense } from 'react';
import './App.css';
import './DarkMode.css';
import './LightMode.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AppThemeContext, ThemeProvider } from './context/AppThemeContext';
import { PrereleaseCardContext, ProxyContextProvider } from './context/PrereleaseCardContext';
import { DoubleClickProvider } from './context/DoubleClickContext';
import Header from './components/layout/Header';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import EnhancedTCGController from './utils/TCGapi/EnhancedTCGController';

// Lazy load components for better performance
const EnhancedCardSearchPanel = lazy(() => import('./components/layout/EnhancedCardSearchPanel'));
const DeckViewPanel = lazy(() => import('./components/layout/DeckViewPanel'));

// Create a loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
    <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  </div>
);

function App() {
  const { theme } = useContext(AppThemeContext);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check for mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      return mobile;
    };
    
    if (checkMobile()) {
      alert('PTCG Deck builder is still in mobile development. Please view on a desktop for full functionality.');
    }
  }, []);
  
  // Initialize the Enhanced TCG Controller
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the TCG controller
        await EnhancedTCGController.initialize();
        
        // Load any saved state from local storage
        const loadSavedDecks = async () => {
          try {
            // Any additional initialization could go here
            console.log('App initialized successfully');
          } catch (error) {
            console.error('Error loading saved state:', error);
          }
        };
        
        await loadSavedDecks();
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setInitError(error.message || 'Failed to initialize application');
      }
    };
    
    initializeApp();
    
    // Clean up function
    return () => {
      // Any cleanup code would go here
    };
  }, []);
  
  // Responsive design adjustments
  useEffect(() => {
    const handleResize = () => {
      // You could add responsive design logic here
      // For example, adjusting layout based on window size
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Check initial size
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Error boundary fallback
  if (initError) {
    return (
      <div className={`App ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
        <Header />
        <div className="container mt-5">
          <Alert variant="danger">
            <Alert.Heading>Initialization Error</Alert.Heading>
            <p>There was a problem initializing the application: {initError}</p>
            <hr />
            <p className="mb-0">
              Please try refreshing the page. If the problem persists, check your internet connection.
            </p>
          </Alert>
        </div>
      </div>
    );
  }
  
  // Main app rendering
  return (
    <div className={`App ${theme === 'dark' ? 'dark-theme' : 'light-theme'}`}>
      <Header />
      <div className="content">
        {!isInitialized ? (
          <LoadingSpinner />
        ) : (
          <ProxyContextProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <EnhancedCardSearchPanel />
              <DeckViewPanel />
            </Suspense>
          </ProxyContextProvider>
        )}
      </div>
      
      {isMobile && (
        <div className="mobile-warning">
          <Alert variant="warning" className="text-center m-2">
            <small>Mobile experience may be limited. For best results, use a desktop browser.</small>
          </Alert>
        </div>
      )}
    </div>
  );
}

// Error Boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mt-5">
          <Alert variant="danger">
            <Alert.Heading>Something went wrong</Alert.Heading>
            <p>{this.state.error?.message || "An unexpected error occurred"}</p>
            <hr />
            <p className="mb-0">
              Please try refreshing the page. If the problem persists, check the console for more details.
            </p>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// App wrapper with all providers
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DoubleClickProvider>
          <App />
        </DoubleClickProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}