import React, { useState, useEffect, useRef } from 'react';
import { MarketData } from '../types';
import { fetchMarkets } from '../services/api';
import MarketCard from './MarketCard';
import Filters from './Filters';
import './Dashboard.css';

interface DashboardProps {
  highlightMarketId?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ highlightMarketId }) => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'recency' as 'recency' | 'magnitude' | 'volume',
    showAnomaliesOnly: false
  });
  const marketRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [markets, filters]);

  useEffect(() => {
    if (highlightMarketId && marketRefs.current[highlightMarketId]) {
      // Ensure the market is visible in filtered results
      const market = markets.find(m => m.marketId === highlightMarketId);
      if (market && !filteredMarkets.some(m => m.marketId === highlightMarketId)) {
        // Market is filtered out, temporarily show it
        setFilters({ ...filters, category: 'all', showAnomaliesOnly: false });
      }
      
      // Scroll to the market
      setTimeout(() => {
        marketRefs.current[highlightMarketId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  }, [highlightMarketId, filteredMarkets, markets, filters]);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const data = await fetchMarkets();
      setMarkets(data);
      setError(null);
    } catch (err) {
      setError('Failed to load markets. Please try again later.');
      console.error('Error loading markets:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...markets];

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(m => m.category === filters.category);
    }

    // Anomalies only filter
    if (filters.showAnomaliesOnly) {
      filtered = filtered.filter(m => m.hasAnomaly);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'magnitude':
          const aChange = a.previousPrice1h !== null
            ? Math.abs(a.currentPrice - a.previousPrice1h) / a.previousPrice1h
            : 0;
          const bChange = b.previousPrice1h !== null
            ? Math.abs(b.currentPrice - b.previousPrice1h) / b.previousPrice1h
            : 0;
          return bChange - aChange;
        case 'volume':
          return b.volume24h - a.volume24h;
        case 'recency':
        default:
          return b.timestamp - a.timestamp;
      }
    });

    setFilteredMarkets(filtered);
  };

  if (loading && markets.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading markets...</p>
      </div>
    );
  }

  if (error && markets.length === 0) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadMarkets}>Retry</button>
      </div>
    );
  }

  const categories = Array.from(new Set(markets.map(m => m.category)));

  return (
    <div className="dashboard">
      <Filters
        categories={categories}
        filters={filters}
        onFilterChange={setFilters}
      />
      
      <div className="markets-grid">
        {filteredMarkets.length === 0 ? (
          <div className="no-results">
            <p>No markets match your filters.</p>
          </div>
        ) : (
          filteredMarkets.map(market => (
            <div
              key={market.marketId}
              ref={el => marketRefs.current[market.marketId] = el}
              style={{
                outline: highlightMarketId === market.marketId ? '3px solid #3b82f6' : 'none',
                borderRadius: highlightMarketId === market.marketId ? '8px' : '0',
                transition: 'outline 0.3s ease'
              }}
            >
              <MarketCard market={market} />
            </div>
          ))
        )}
      </div>
      
      {loading && markets.length > 0 && (
        <div className="refreshing-indicator">
          <span>Refreshing...</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

