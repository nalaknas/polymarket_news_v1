import { MarketData } from '../database';

export interface Anomaly {
  marketId: string;
  type: 'price_spike' | 'volume_spike' | 'volatility' | 'new_trend';
  severity: 'low' | 'medium' | 'high';
  priceChange: number;
  volumeChange: number;
  confidence: number;
  description: string;
}

export function detectAnomalies(market: MarketData): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Price movement detection
  if (market.previousPrice1h !== null) {
    const priceChange1h = Math.abs(market.currentPrice - market.previousPrice1h) / market.previousPrice1h;
    
    if (priceChange1h >= 0.10) { // 10% change
      const severity = priceChange1h >= 0.20 ? 'high' : priceChange1h >= 0.15 ? 'medium' : 'low';
      anomalies.push({
        marketId: market.marketId,
        type: 'price_spike',
        severity,
        priceChange: (market.currentPrice - market.previousPrice1h) / market.previousPrice1h,
        volumeChange: market.volumeAverage > 0 ? (market.volume24h - market.volumeAverage) / market.volumeAverage : 0,
        confidence: Math.min(0.9, 0.5 + priceChange1h),
        description: `Price moved ${(priceChange1h * 100).toFixed(1)}% in the last hour`
      });
    }
  }
  
  // Volume spike detection
  if (market.volumeAverage > 0) {
    const volumeRatio = market.volume24h / market.volumeAverage;
    
    if (volumeRatio >= 3.0) {
      const severity = volumeRatio >= 5.0 ? 'high' : volumeRatio >= 4.0 ? 'medium' : 'low';
      anomalies.push({
        marketId: market.marketId,
        type: 'volume_spike',
        severity,
        priceChange: market.previousPrice1h !== null 
          ? (market.currentPrice - market.previousPrice1h) / market.previousPrice1h 
          : 0,
        volumeChange: volumeRatio - 1,
        confidence: Math.min(0.85, 0.4 + (volumeRatio - 3) * 0.1),
        description: `Volume is ${volumeRatio.toFixed(1)}x the 24h average`
      });
    }
  }
  
  // Volatility detection (rapid price swings)
  if (market.previousPrice1h !== null && market.previousPrice24h !== null) {
    const change1h = Math.abs(market.currentPrice - market.previousPrice1h);
    const change24h = Math.abs(market.currentPrice - market.previousPrice24h);
    
    // If 1h change is significant but 24h change is small, that's volatility
    if (change1h > 0.05 && change24h < change1h * 2) {
      anomalies.push({
        marketId: market.marketId,
        type: 'volatility',
        severity: change1h > 0.10 ? 'high' : 'medium',
        priceChange: (market.currentPrice - market.previousPrice1h) / market.previousPrice1h,
        volumeChange: market.volumeAverage > 0 ? (market.volume24h - market.volumeAverage) / market.volumeAverage : 0,
        confidence: 0.6,
        description: 'Rapid price swings detected'
      });
    }
  }
  
  // New trend detection (new market with high volume)
  if (market.previousPrice24h === null && market.volume24h > 1000) {
    anomalies.push({
      marketId: market.marketId,
      type: 'new_trend',
      severity: market.volume24h > 5000 ? 'high' : 'medium',
      priceChange: 0,
      volumeChange: 0,
      confidence: 0.5,
      description: 'New market gaining traction'
    });
  }
  
  return anomalies;
}

export function shouldGenerateReport(anomalies: Anomaly[]): boolean {
  // Generate report if there's at least one medium or high severity anomaly
  return anomalies.some(a => a.severity === 'medium' || a.severity === 'high');
}

