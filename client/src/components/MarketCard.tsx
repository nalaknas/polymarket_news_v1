import React, { useState } from 'react';
import { MarketData } from '../types';
import { formatDistanceToNow } from 'date-fns';
import PriceChart from './PriceChart';
import './MarketCard.css';

interface MarketCardProps {
  market: MarketData;
}

const MarketCard: React.FC<MarketCardProps> = ({ market }) => {
  const [showChart, setShowChart] = useState(false);

  const priceChange1h = market.previousPrice1h !== null
    ? ((market.currentPrice - market.previousPrice1h) / market.previousPrice1h) * 100
    : null;

  const priceChange24h = market.previousPrice24h !== null
    ? ((market.currentPrice - market.previousPrice24h) / market.previousPrice24h) * 100
    : null;

  const getChangeColor = (change: number | null) => {
    if (change === null) return '#666';
    return change > 0 ? '#22c55e' : change < 0 ? '#ef4444' : '#666';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#666';
    }
  };

  return (
    <div className={`market-card ${market.hasAnomaly ? 'has-anomaly' : ''}`}>
      <div className="market-header">
        <span className="category-badge">{market.category}</span>
        {market.hasAnomaly && (
          <span className="anomaly-indicator">⚠️ Alert</span>
        )}
      </div>

      <h3 className="market-question">{market.question}</h3>

      <div className="price-section">
        <div className="current-price">
          <span className="price-label">Current Probability</span>
          <span className="price-value">
            {(market.currentPrice * 100).toFixed(1)}%
          </span>
        </div>

        <div className="price-changes">
          {priceChange1h !== null && (
            <div className="price-change">
              <span className="change-label">1h:</span>
              <span
                className="change-value"
                style={{ color: getChangeColor(priceChange1h) }}
              >
                {priceChange1h > 0 ? '+' : ''}
                {priceChange1h.toFixed(1)}%
              </span>
            </div>
          )}
          {priceChange24h !== null && (
            <div className="price-change">
              <span className="change-label">24h:</span>
              <span
                className="change-value"
                style={{ color: getChangeColor(priceChange24h) }}
              >
                {priceChange24h > 0 ? '+' : ''}
                {priceChange24h.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="market-stats">
        <div className="stat">
          <span className="stat-label">24h Volume</span>
          <span className="stat-value">
            ${(market.volume24h / 1000).toFixed(1)}k
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Liquidity</span>
          <span className="stat-value">
            ${(market.liquidity / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {market.anomalies && market.anomalies.length > 0 && (
        <div className="anomalies-section">
          <h4>Detected Anomalies:</h4>
          {market.anomalies.map((anomaly, idx) => (
            <div key={idx} className="anomaly-item">
              <span
                className="anomaly-severity"
                style={{ backgroundColor: getSeverityColor(anomaly.severity) }}
              >
                {anomaly.severity}
              </span>
              <span className="anomaly-description">{anomaly.description}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="chart-toggle"
        onClick={() => setShowChart(!showChart)}
      >
        {showChart ? 'Hide' : 'Show'} Price Chart
      </button>

      {showChart && (
        <div className="chart-container">
          <PriceChart marketId={market.marketId} />
        </div>
      )}

      <div className="market-footer">
        <span className="timestamp">
          Updated {formatDistanceToNow(new Date(market.timestamp), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};

export default MarketCard;

