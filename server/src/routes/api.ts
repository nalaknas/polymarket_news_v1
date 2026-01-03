import express from 'express';
import { getAllMarkets, getRecentReports, getMarketHistory } from '../database';
import { detectAnomalies } from '../services/anomalyDetection';
import axios from 'axios';

const router = express.Router();

// Get all markets with anomaly status
router.get('/markets', async (req, res) => {
  try {
    const markets = await getAllMarkets();
    const marketsWithAnomalies = markets.map(market => {
      const anomalies = detectAnomalies(market);
      return {
        ...market,
        anomalies,
        hasAnomaly: anomalies.length > 0
      };
    });
    
    res.json(marketsWithAnomalies);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Get recent news reports
router.get('/reports', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const reports = await getRecentReports(limit);
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get market history
router.get('/markets/:marketId/history', async (req, res) => {
  try {
    const { marketId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    const history = await getMarketHistory(marketId, hours);
    res.json(history);
  } catch (error) {
    console.error('Error fetching market history:', error);
    res.status(500).json({ error: 'Failed to fetch market history' });
  }
});

// Get anomalies for a specific market
router.get('/markets/:marketId/anomalies', async (req, res) => {
  try {
    const { marketId } = req.params;
    const markets = await getAllMarkets();
    const market = markets.find(m => m.marketId === marketId);
    
    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    const anomalies = detectAnomalies(market);
    res.json(anomalies);
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
});

// Test endpoint to debug Polymarket API
router.get('/test/polymarket', async (req, res) => {
  const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
  const testEndpoints = [
    // Try /events endpoint (recommended for current markets)
    { url: `${GAMMA_API_BASE}/events`, params: { active: true, closed: false, limit: 5 } },
    // Try /markets with active/closed params
    { url: `${GAMMA_API_BASE}/markets`, params: { active: true, closed: false, limit: 5 } },
    // Fallback: status=open
    { url: `${GAMMA_API_BASE}/markets`, params: { status: 'open', limit: 5 } },
    { url: `${GAMMA_API_BASE}/markets`, params: { limit: 5 } },
    { url: `${GAMMA_API_BASE}/markets`, params: {} },
  ];
  
  const results: any[] = [];
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Polymarket-News-Monitor/1.0'
        },
        timeout: 10000
      });
      
      // Extract markets from response (handle /events vs /markets)
      let markets: any[] = [];
      if (endpoint.url.includes('/events')) {
        if (Array.isArray(response.data)) {
          response.data.forEach((event: any) => {
            if (event.markets && Array.isArray(event.markets)) {
              markets.push(...event.markets);
            } else if (event.id && event.question) {
              markets.push(event);
            }
          });
        }
      } else {
        markets = Array.isArray(response.data) ? response.data : 
          (response.data?.data || response.data?.markets || []);
      }
      
      // Get date range info
      const dates = markets
        .map((m: any) => m.endDate ? new Date(m.endDate) : null)
        .filter(d => d !== null) as Date[];
      
      const dateInfo = dates.length > 0 ? {
        oldest: dates.sort((a, b) => a.getTime() - b.getTime())[0].toISOString().split('T')[0],
        newest: dates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString().split('T')[0],
        futureCount: dates.filter(d => d > new Date()).length
      } : null;
      
      results.push({
        endpoint: endpoint.url,
        params: endpoint.params,
        status: response.status,
        dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        marketsFound: markets.length,
        dateRange: dateInfo,
        sampleData: markets.length > 0 ? {
          question: markets[0].question,
          endDate: markets[0].endDate,
          active: markets[0].active,
          closed: markets[0].closed
        } : (Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : response.data),
        success: true
      });
    } catch (error: any) {
      results.push({
        endpoint: endpoint.url,
        params: endpoint.params,
        success: false,
        status: error.response?.status,
        error: error.response?.data || error.message,
        headers: error.response?.headers
      });
    }
  }
  
  res.json({ testResults: results });
});

export default router;

