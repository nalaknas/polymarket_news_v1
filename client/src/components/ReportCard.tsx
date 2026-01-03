import React, { useState } from 'react';
import { NewsReport } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import './ReportCard.css';

interface ReportCardProps {
  report: NewsReport;
  onViewMarket?: (marketId: string) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onViewMarket }) => {
  const [expanded, setExpanded] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return '#22c55e';
    if (confidence >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <article className="report-card">
      <div className="report-header">
        <div className="report-meta">
          <span className="report-time">
            {format(new Date(report.timestamp), 'MMM d, yyyy • h:mm a')}
          </span>
          <span className="report-age">
            {formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}
          </span>
        </div>
        <div
          className="confidence-badge"
          style={{ backgroundColor: getConfidenceColor(report.confidence) }}
        >
          {getConfidenceLabel(report.confidence)} Confidence
        </div>
      </div>

      <h2 className="report-headline">{report.headline}</h2>

      <div className="report-summary">
        <p>{report.summary}</p>
      </div>

      {expanded && (
        <div className="report-details">
          <div className="report-analysis">
            <h3>Analysis</h3>
            <div className="analysis-content">
              {report.analysis.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="report-takeaways">
            <h3>Key Takeaways</h3>
            <ul>
              {report.keyTakeaways
                .split('\n')
                .filter(item => item.trim().length > 0)
                .map((item, idx) => {
                  const cleaned = item.replace(/^[-•]\s*/, '').trim();
                  return cleaned ? <li key={idx}>{cleaned}</li> : null;
                })}
            </ul>
          </div>

          {report.reasons && report.reasons.length > 0 && (
            <div className="report-reasons">
              <h3>Why This Is Significant</h3>
              <ul>
                {report.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="report-metrics">
            <div className="metric">
              <span className="metric-label">Price Change</span>
              <span
                className="metric-value"
                style={{
                  color: report.priceChange > 0 ? '#22c55e' : report.priceChange < 0 ? '#ef4444' : '#666'
                }}
              >
                {report.priceChange > 0 ? '+' : ''}
                {(report.priceChange * 100).toFixed(1)}%
              </span>
            </div>
            <div className="metric">
              <span className="metric-label">Volume Change</span>
              <span
                className="metric-value"
                style={{
                  color: report.volumeChange > 0 ? '#22c55e' : report.volumeChange < 0 ? '#ef4444' : '#666'
                }}
              >
                {report.volumeChange > 0 ? '+' : ''}
                {report.volumeChange >= 1 
                  ? `${(report.volumeChange * 100).toFixed(0)}%` 
                  : `${(report.volumeChange * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>

          {onViewMarket && (
            <div className="report-market-link">
              <button
                className="view-market-button"
                onClick={() => onViewMarket(report.marketId)}
              >
                📊 View Related Market
              </button>
            </div>
          )}
        </div>
      )}

      <button
        className="expand-button"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show Less' : 'Read Full Report'}
      </button>
    </article>
  );
};

export default ReportCard;

