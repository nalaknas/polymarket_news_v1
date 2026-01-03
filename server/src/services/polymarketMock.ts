// Mock data fallback for testing when API is unavailable
// This can be used to test the application structure while debugging API issues

import { PolymarketMarket } from './polymarket';

export function getMockMarkets(limit: number = 30): PolymarketMarket[] {
  return [
    {
      id: 'mock-market-1',
      question: 'Will the Federal Reserve cut interest rates by 0.5% in Q1 2024?',
      slug: 'fed-rate-cut-q1-2024',
      description: 'Market on Federal Reserve interest rate decisions',
      tags: ['Economics', 'Federal Reserve', 'Interest Rates'],
      outcomes: ['Yes', 'No'],
      active: true,
      liquidity: 50000,
      volume: 250000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-market-2',
      question: 'Will there be a major tech company acquisition announced in January 2024?',
      slug: 'tech-acquisition-jan-2024',
      description: 'Market on major tech acquisitions',
      tags: ['Technology', 'M&A'],
      outcomes: ['Yes', 'No'],
      active: true,
      liquidity: 30000,
      volume: 150000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-market-3',
      question: 'Will Bitcoin reach $50,000 by end of January 2024?',
      slug: 'bitcoin-50k-jan-2024',
      description: 'Market on Bitcoin price prediction',
      tags: ['Crypto', 'Bitcoin', 'Technology'],
      outcomes: ['Yes', 'No'],
      active: true,
      liquidity: 75000,
      volume: 400000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-market-4',
      question: 'Will there be a major political announcement regarding the 2024 election by February 1st?',
      slug: 'political-announcement-feb-2024',
      description: 'Market on political announcements',
      tags: ['Politics', 'Election'],
      outcomes: ['Yes', 'No'],
      active: true,
      liquidity: 40000,
      volume: 200000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-market-5',
      question: 'Will a major sports team make a significant trade before the trade deadline?',
      slug: 'sports-trade-deadline',
      description: 'Market on sports trades',
      tags: ['Sports'],
      outcomes: ['Yes', 'No'],
      active: true,
      liquidity: 20000,
      volume: 100000,
      createdAt: new Date().toISOString()
    }
  ].slice(0, limit);
}

