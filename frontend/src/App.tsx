import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ReviewsList from './components/ReviewsList';
import ReviewDetail from './components/ReviewDetail';
import Analytics from './components/Analytics';
import DataIngestion from './components/DataIngestion';
import ErrorBoundary from './components/ErrorBoundary';
import { BarChart3, List, Upload, Wifi, WifiOff } from 'lucide-react';
import { reviewsAPI } from './services/api';

function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="nav">
      <div className="container">
        <ul className="nav-list">
          <li className="nav-item">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <List size={16} style={{ marginRight: '0.5rem' }} />
              Reviews
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/analytics" 
              className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}
            >
              <BarChart3 size={16} style={{ marginRight: '0.5rem' }} />
              Analytics
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/ingest" 
              className={`nav-link ${location.pathname === '/ingest' ? 'active' : ''}`}
            >
              <Upload size={16} style={{ marginRight: '0.5rem' }} />
              Upload Data
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check API health
    const checkApiHealth = async () => {
      try {
        await reviewsAPI.healthCheck();
        setApiStatus('online');
      } catch (error) {
        setApiStatus('offline');
      }
    };

    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && apiStatus === 'online') return null;

  return (
    <div className="connection-status">
      <div className="connection-indicator">
        {!isOnline ? (
          <>
            <WifiOff size={16} />
            <span>No internet connection</span>
          </>
        ) : apiStatus === 'offline' ? (
          <>
            <WifiOff size={16} />
            <span>API server unavailable</span>
          </>
        ) : (
          <>
            <Wifi size={16} />
            <span>Checking connection...</span>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Check API health on startup
        await reviewsAPI.healthCheck();
        setIsInitialized(true);
      } catch (error) {
        console.warn('API health check failed on startup:', error);
        setIsInitialized(true); // Still show the app
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div className="loading">
        <div>Initializing Reviews Copilot...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <ConnectionStatus />
          
          <header className="header">
            <div className="container">
              <h1>Reviews Copilot</h1>
              <p>AI-powered review management system for multi-location businesses</p>
            </div>
          </header>
          
          <Navigation />
          
          <main className="container">
            <Routes>
              <Route path="/" element={<ReviewsList />} />
              <Route path="/reviews/:id" element={<ReviewDetail />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/ingest" element={<DataIngestion />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
