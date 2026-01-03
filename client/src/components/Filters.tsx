import React from 'react';
import './Filters.css';

interface FiltersProps {
  categories: string[];
  filters: {
    category: string;
    sortBy: 'recency' | 'magnitude' | 'volume';
    showAnomaliesOnly: boolean;
  };
  onFilterChange: (filters: {
    category: string;
    sortBy: 'recency' | 'magnitude' | 'volume';
    showAnomaliesOnly: boolean;
  }) => void;
}

const Filters: React.FC<FiltersProps> = ({ categories, filters, onFilterChange }) => {
  return (
    <div className="filters">
      <div className="filter-group">
        <label htmlFor="category">Category:</label>
        <select
          id="category"
          value={filters.category}
          onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sortBy">Sort by:</label>
        <select
          id="sortBy"
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
        >
          <option value="recency">Most Recent</option>
          <option value="magnitude">Largest Change</option>
          <option value="volume">Highest Volume</option>
        </select>
      </div>

      <div className="filter-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={filters.showAnomaliesOnly}
            onChange={(e) => onFilterChange({ ...filters, showAnomaliesOnly: e.target.checked })}
          />
          Show anomalies only
        </label>
      </div>
    </div>
  );
};

export default Filters;

