import React, { useState, useEffect } from 'react';
import { NewsReport } from '../types';
import { fetchReports } from '../services/api';
import ReportCard from './ReportCard';
import './Reports.css';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<NewsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await fetchReports(50);
      setReports(data);
      setError(null);
    } catch (err) {
      setError('Failed to load reports. Please try again later.');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  if (error && reports.length === 0) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={loadReports}>Retry</button>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="reports-header">
        <h2>AI-Generated News Reports</h2>
        <p className="reports-subtitle">
          Reports generated from detected market anomalies
        </p>
      </div>

      <div className="reports-list">
        {reports.length === 0 ? (
          <div className="no-reports">
            <p>No reports available yet. Reports will appear here when anomalies are detected.</p>
          </div>
        ) : (
          reports.map(report => (
            <ReportCard key={report.id} report={report} />
          ))
        )}
      </div>

      {loading && reports.length > 0 && (
        <div className="refreshing-indicator">
          <span>Refreshing...</span>
        </div>
      )}
    </div>
  );
};

export default Reports;

