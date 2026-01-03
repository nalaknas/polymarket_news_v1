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

export interface MarketNoiseScore {
  market: MarketData;
  score: number;
  anomalies: Anomaly[];
  reasons: string[];
}

// Minimum volume threshold to avoid noise from tiny markets
const MIN_VOLUME_THRESHOLD = 5000; // $5k minimum 24h volume

// Stricter thresholds for major spikes only
const MAJOR_PRICE_SPIKE_THRESHOLD = 0.25; // 25% price change (was 10%)
const MAJOR_VOLUME_SPIKE_THRESHOLD = 10.0; // 10x volume (was 3x)
const EXTREME_PRICE_SPIKE_THRESHOLD = 0.40; // 40% price change
const EXTREME_VOLUME_SPIKE_THRESHOLD = 20.0; // 20x volume

export function detectAnomalies(market: MarketData): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Skip low-volume markets entirely
  if (market.volume24h < MIN_VOLUME_THRESHOLD) {
    return anomalies;
  }
  
  // MAJOR price spike detection (much stricter)
  if (market.previousPrice1h !== null) {
    const priceChange1h = Math.abs(market.currentPrice - market.previousPrice1h) / market.previousPrice1h;
    
    // Only flag MAJOR spikes (25%+)
    if (priceChange1h >= MAJOR_PRICE_SPIKE_THRESHOLD) {
      const severity = priceChange1h >= EXTREME_PRICE_SPIKE_THRESHOLD ? 'high' : 'high'; // Both are high now
      anomalies.push({
        marketId: market.marketId,
        type: 'price_spike',
        severity,
        priceChange: (market.currentPrice - market.previousPrice1h) / market.previousPrice1h,
        volumeChange: market.volumeAverage > 0 ? (market.volume24h - market.volumeAverage) / market.volumeAverage : 0,
        confidence: Math.min(0.95, 0.7 + priceChange1h * 0.5),
        description: `MAJOR price spike: ${(priceChange1h * 100).toFixed(1)}% in the last hour`
      });
    }
  }
  
  // MAJOR volume spike detection (much stricter)
  if (market.volumeAverage > 0) {
    const volumeRatio = market.volume24h / market.volumeAverage;
    
    // Only flag MAJOR volume spikes (10x+)
    if (volumeRatio >= MAJOR_VOLUME_SPIKE_THRESHOLD) {
      const severity = volumeRatio >= EXTREME_VOLUME_SPIKE_THRESHOLD ? 'high' : 'high'; // Both are high now
      anomalies.push({
        marketId: market.marketId,
        type: 'volume_spike',
        severity,
        priceChange: market.previousPrice1h !== null 
          ? (market.currentPrice - market.previousPrice1h) / market.previousPrice1h 
          : 0,
        volumeChange: volumeRatio - 1,
        confidence: Math.min(0.95, 0.7 + (volumeRatio - MAJOR_VOLUME_SPIKE_THRESHOLD) * 0.02),
        description: `EXTREME volume spike: ${volumeRatio.toFixed(1)}x the 24h average`
      });
    }
  }
  
  // Extreme volatility detection (only for very rapid swings)
  if (market.previousPrice1h !== null && market.previousPrice24h !== null) {
    const change1h = Math.abs(market.currentPrice - market.previousPrice1h);
    const change24h = Math.abs(market.currentPrice - market.previousPrice24h);
    
    // Only flag if 1h change is MAJOR (>20%) and represents most of the 24h movement
    if (change1h >= 0.20 && change24h < change1h * 1.5) {
      anomalies.push({
        marketId: market.marketId,
        type: 'volatility',
        severity: 'high',
        priceChange: (market.currentPrice - market.previousPrice1h) / market.previousPrice1h,
        volumeChange: market.volumeAverage > 0 ? (market.volume24h - market.volumeAverage) / market.volumeAverage : 0,
        confidence: 0.75,
        description: `EXTREME volatility: ${(change1h * 100).toFixed(1)}% swing in 1h`
      });
    }
  }
  
  // New trend detection (only for very high volume new markets)
  if (market.previousPrice24h === null && market.volume24h > 20000) { // Increased threshold
    anomalies.push({
      marketId: market.marketId,
      type: 'new_trend',
      severity: 'high',
      priceChange: 0,
      volumeChange: 0,
      confidence: 0.7,
      description: `New market with EXTREME volume: $${(market.volume24h / 1000).toFixed(0)}k`
    });
  }
  
  return anomalies;
}

/**
 * Calculate a "noisiness" score for a market based on its anomalies
 * Higher score = more noisy/interesting
 */
export function calculateNoiseScore(market: MarketData, anomalies: Anomaly[]): MarketNoiseScore {
  let score = 0;
  const reasons: string[] = [];
  
  // Base score from anomalies
  for (const anomaly of anomalies) {
    switch (anomaly.type) {
      case 'price_spike':
        // Price spikes are weighted heavily
        const priceMagnitude = Math.abs(anomaly.priceChange);
        score += priceMagnitude * 100; // 25% change = 25 points
        reasons.push(`Price spike: ${(priceMagnitude * 100).toFixed(1)}%`);
        break;
      case 'volume_spike':
        // Volume spikes are also weighted heavily
        const volumeMagnitude = anomaly.volumeChange;
        score += Math.min(volumeMagnitude * 5, 50); // Cap at 50 points
        reasons.push(`Volume spike: ${(volumeMagnitude * 100).toFixed(0)}%`);
        break;
      case 'volatility':
        score += 20;
        reasons.push('Extreme volatility');
        break;
      case 'new_trend':
        score += 15;
        reasons.push('New high-volume market');
        break;
    }
    
    // Boost score for high confidence
    score += anomaly.confidence * 10;
  }
  
  // Bonus for markets with BOTH price AND volume spikes (most interesting)
  const hasPriceSpike = anomalies.some(a => a.type === 'price_spike');
  const hasVolumeSpike = anomalies.some(a => a.type === 'volume_spike');
  if (hasPriceSpike && hasVolumeSpike) {
    score *= 1.5; // 50% bonus for combined signals
    reasons.push('COMBINED: Price + Volume spike');
  }
  
  // Volume bonus (higher volume = more significant)
  if (market.volume24h > 50000) {
    score += 10;
    reasons.push('High absolute volume');
  }
  
  return {
    market,
    score,
    anomalies,
    reasons
  };
}

/**
 * Filter markets to only the absolute noisiest ones
 * Returns markets sorted by noise score (highest first)
 */
export function filterNoisiestMarkets(
  markets: MarketData[],
  maxReports: number = 3
): MarketNoiseScore[] {
  const scoredMarkets: MarketNoiseScore[] = [];
  
  for (const market of markets) {
    const anomalies = detectAnomalies(market);
    
    // Only consider markets with at least one anomaly
    if (anomalies.length === 0) {
      continue;
    }
    
    const noiseScore = calculateNoiseScore(market, anomalies);
    
    // Only include markets with a minimum score threshold
    // This ensures we only report truly significant events
    if (noiseScore.score >= 30) { // Minimum threshold
      scoredMarkets.push(noiseScore);
    }
  }
  
  // Sort by score (highest first)
  scoredMarkets.sort((a, b) => b.score - a.score);
  
  // Return only the top N markets
  return scoredMarkets.slice(0, maxReports);
}

export function shouldGenerateReport(anomalies: Anomaly[]): boolean {
  // Only generate reports for markets with high-severity anomalies
  // This is now used as a secondary check after filtering
  return anomalies.some(a => a.severity === 'high');
}

