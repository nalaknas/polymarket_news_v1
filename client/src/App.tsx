import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Header from './components/Header';

function App() {
  const [activeTab, setActiveTab] = useState<'markets' | 'reports'>('markets');

  return (
    <div className="App">
      <Header />
      <div className="tabs">
        <button
          className={activeTab === 'markets' ? 'active' : ''}
          onClick={() => setActiveTab('markets')}
        >
          Markets
        </button>
        <button
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          News Reports
        </button>
      </div>
      <main className="main-content">
        {activeTab === 'markets' ? <Dashboard /> : <Reports />}
      </main>
    </div>
  );
}

export default App;

