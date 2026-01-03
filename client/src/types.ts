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
  anomalies?: Anomaly[];
  hasAnomaly?: boolean;
}

export interface Anomaly {
  marketId: string;
  type: 'price_spike' | 'volume_spike' | 'volatility' | 'new_trend';
  severity: 'low' | 'medium' | 'high';
  priceChange: number;
  volumeChange: number;
  confidence: number;
  description: string;
}

export interface NewsReport {
  id: number;
  marketId: string;
  headline: string;
  summary: string;
  analysis: string;
  keyTakeaways: string;
  confidence: number;
  priceChange: number;
  volumeChange: number;
  reasons?: string[]; // Reasons why this news is significant
  timestamp: number;
  createdAt: number;
}

export interface MarketHistory {
  marketId: string;
  price: number;
  volume: number;
  timestamp: number;
}

