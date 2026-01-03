import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./polymarket.db');

// Helper functions to promisify sqlite3 methods
function dbRun(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbAll(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export interface MarketData {
  marketId: string;
  question: string;
  category: string;
  currentPrice: number;
  previousPrice1h: number | null;
  previousPrice24h: number | null;
  volume24h: number;
  volumeAverage: number;
  liquidity: number;
  traders: number;
  timestamp: number;
}

export interface MarketHistory {
  marketId: string;
  price: number;
  volume: number;
  timestamp: number;
}

export interface NewsReport {
  id?: number;
  marketId: string;
  headline: string;
  summary: string;
  analysis: string;
  keyTakeaways: string;
  confidence: number;
  priceChange: number;
  volumeChange: number;
  timestamp: number;
  createdAt: number;
}

export async function initDatabase() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS markets (
      marketId TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      category TEXT,
      currentPrice REAL,
      previousPrice1h REAL,
      previousPrice24h REAL,
      volume24h REAL,
      volumeAverage REAL,
      liquidity REAL,
      traders INTEGER,
      timestamp INTEGER,
      lastUpdated INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS market_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketId TEXT NOT NULL,
      price REAL NOT NULL,
      volume REAL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (marketId) REFERENCES markets(marketId)
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_history_market_timestamp 
    ON market_history(marketId, timestamp DESC)
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS news_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketId TEXT NOT NULL,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      analysis TEXT NOT NULL,
      keyTakeaways TEXT NOT NULL,
      confidence REAL,
      priceChange REAL,
      volumeChange REAL,
      timestamp INTEGER NOT NULL,
      createdAt INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (marketId) REFERENCES markets(marketId)
    )
  `);

  await dbRun(`
    CREATE INDEX IF NOT EXISTS idx_reports_timestamp 
    ON news_reports(timestamp DESC)
  `);

  console.log('Database initialized');
}

export async function saveMarketData(data: MarketData) {
  await dbRun(`
    INSERT OR REPLACE INTO markets 
    (marketId, question, category, currentPrice, previousPrice1h, previousPrice24h, 
     volume24h, volumeAverage, liquidity, traders, timestamp, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  `, [
    data.marketId,
    data.question,
    data.category,
    data.currentPrice,
    data.previousPrice1h,
    data.previousPrice24h,
    data.volume24h,
    data.volumeAverage,
    data.liquidity,
    data.traders,
    data.timestamp
  ]);
}

export async function saveMarketHistory(history: MarketHistory) {
  await dbRun(`
    INSERT INTO market_history (marketId, price, volume, timestamp)
    VALUES (?, ?, ?, ?)
  `, [history.marketId, history.price, history.volume, history.timestamp]);
}

export async function getMarketData(marketId: string): Promise<MarketData | null> {
  const row = await dbGet('SELECT * FROM markets WHERE marketId = ?', [marketId]) as any;
  if (!row) return null;
  
  return {
    marketId: row.marketId,
    question: row.question,
    category: row.category,
    currentPrice: row.currentPrice,
    previousPrice1h: row.previousPrice1h,
    previousPrice24h: row.previousPrice24h,
    volume24h: row.volume24h,
    volumeAverage: row.volumeAverage,
    liquidity: row.liquidity,
    traders: row.traders,
    timestamp: row.timestamp
  };
}

export async function getAllMarkets(): Promise<MarketData[]> {
  const rows = await dbAll('SELECT * FROM markets ORDER BY lastUpdated DESC') as any[];
  return rows.map(row => ({
    marketId: row.marketId,
    question: row.question,
    category: row.category,
    currentPrice: row.currentPrice,
    previousPrice1h: row.previousPrice1h,
    previousPrice24h: row.previousPrice24h,
    volume24h: row.volume24h,
    volumeAverage: row.volumeAverage,
    liquidity: row.liquidity,
    traders: row.traders,
    timestamp: row.timestamp
  }));
}

export async function getMarketHistory(marketId: string, hours: number = 24): Promise<MarketHistory[]> {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const rows = await dbAll(`
    SELECT * FROM market_history 
    WHERE marketId = ? AND timestamp > ?
    ORDER BY timestamp ASC
  `, [marketId, cutoff]) as any[];
  
  return rows.map(row => ({
    marketId: row.marketId,
    price: row.price,
    volume: row.volume,
    timestamp: row.timestamp
  }));
}

export async function saveNewsReport(report: NewsReport): Promise<number> {
  const result = await dbRun(`
    INSERT INTO news_reports 
    (marketId, headline, summary, analysis, keyTakeaways, confidence, 
     priceChange, volumeChange, timestamp, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
  `, [
    report.marketId,
    report.headline,
    report.summary,
    report.analysis,
    report.keyTakeaways,
    report.confidence,
    report.priceChange,
    report.volumeChange,
    report.timestamp
  ]) as any;
  
  return result.lastID;
}

export async function getRecentReports(limit: number = 50): Promise<NewsReport[]> {
  const rows = await dbAll(`
    SELECT * FROM news_reports 
    ORDER BY timestamp DESC 
    LIMIT ?
  `, [limit]) as any[];
  
  return rows.map(row => ({
    id: row.id,
    marketId: row.marketId,
    headline: row.headline,
    summary: row.summary,
    analysis: row.analysis,
    keyTakeaways: row.keyTakeaways,
    confidence: row.confidence,
    priceChange: row.priceChange,
    volumeChange: row.volumeChange,
    timestamp: row.timestamp,
    createdAt: row.createdAt
  }));
}

export async function clearAllData() {
  try {
    await dbRun('DELETE FROM news_reports');
    await dbRun('DELETE FROM market_history');
    await dbRun('DELETE FROM markets');
    console.log('✅ All data cleared from database');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

export async function clearNewsReports() {
  try {
    await dbRun('DELETE FROM news_reports');
    console.log('✅ News reports cleared');
  } catch (error) {
    console.error('Error clearing news reports:', error);
    throw error;
  }
}

export async function clearMarkets() {
  try {
    await dbRun('DELETE FROM market_history');
    await dbRun('DELETE FROM markets');
    console.log('✅ Markets and history cleared');
  } catch (error) {
    console.error('Error clearing markets:', error);
    throw error;
  }
}

export function closeDatabase() {
  db.close();
}

