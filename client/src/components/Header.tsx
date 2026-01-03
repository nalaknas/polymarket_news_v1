import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>Polymarket News Monitor</h1>
        <p className="subtitle">Detecting emerging news through prediction markets</p>
      </div>
    </header>
  );
};

export default Header;

