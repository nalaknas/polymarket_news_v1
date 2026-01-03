import axios from 'axios';
import { MarketData, saveMarketData, saveMarketHistory, getMarketData, getMarketHistory } from '../database';

// Polymarket API endpoints
// Note: These endpoints may need adjustment based on Polymarket's current API documentation
// Check https://docs.polymarket.com for the latest API endpoints
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const CLOB_API_BASE = 'https://clob.polymarket.com';

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  description?: string;
  endDate?: string;
  image?: string;
  icon?: string;
  tags?: string[];
  outcomes?: string | string[]; // Can be JSON string or array
  active?: boolean;
  closed?: boolean;
  liquidity?: number | string;
  volume?: number | string;
  volumeNum?: number;
  liquidityNum?: number;
  volume24hr?: number;
  createdAt?: string;
  conditionId?: string;
  clobTokenIds?: string | string[]; // Can be JSON string or array
  outcomePrices?: string | number[]; // Can be JSON string or array
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
}

export interface PolymarketPrice {
  market: string;
  outcome: string;
  price: number;
  timestamp: number;
}

export interface PolymarketTicker {
  market: string;
  outcome: string;
  price: string;
  volume24h?: string;
  liquidity?: string;
}

// Map Polymarket categories/tags and question text to our categories
function mapCategory(tags: string[] = [], question: string = ''): string {
  const tagStr = tags.join(' ').toLowerCase();
  const questionLower = question.toLowerCase();
  const combinedText = `${tagStr} ${questionLower}`;
  
  // Politics & Elections
  if (combinedText.match(/\b(politics|political|election|president|senate|congress|congressional|governor|mayor|trump|biden|democrat|republican|vote|voting|ballot|campaign|primary|caucus|impeachment|supreme court|scotus)\b/)) {
    return 'Politics';
  }
  
  // Economics & Finance
  if (combinedText.match(/\b(economics|economy|economic|inflation|gdp|recession|unemployment|fed|federal reserve|interest rate|stock market|dow|s&p|nasdaq|bitcoin|btc|ethereum|eth|crypto|cryptocurrency|defi|nft|dollar|currency|yuan|euro|trading|market cap)\b/)) {
    return 'Economics';
  }
  
  // Technology
  if (combinedText.match(/\b(technology|tech|ai|artificial intelligence|machine learning|ml|llm|gpt|chatgpt|openai|anthropic|claude|google|apple|microsoft|meta|facebook|twitter|x|tesla|spacex|neuralink|quantum|blockchain|web3|software|hardware|chip|semiconductor|nvidia|amd|intel)\b/)) {
    return 'Technology';
  }
  
  // Sports
  if (combinedText.match(/\b(sports|sport|football|nfl|nba|mlb|nhl|soccer|basketball|baseball|hockey|tennis|golf|olympics|super bowl|world cup|championship|playoff|playoff|mvp|heisman|draft|trade|player|team|coach)\b/)) {
    return 'Sports';
  }
  
  // World Events & Geopolitics
  if (combinedText.match(/\b(world|international|war|conflict|russia|ukraine|china|iran|israel|palestine|middle east|nato|un|united nations|sanctions|embargo|trade war|military|defense|nuclear|missile|attack|invasion|peace|treaty|summit|g7|g20)\b/)) {
    return 'World Events';
  }
  
  // Entertainment & Media
  if (combinedText.match(/\b(entertainment|movie|film|oscar|emmy|grammy|award|netflix|disney|hbo|streaming|music|album|song|artist|actor|actress|director|celebrity|hollywood|box office)\b/)) {
    return 'Entertainment';
  }
  
  // Health & Science
  if (combinedText.match(/\b(health|medical|medicine|disease|virus|pandemic|epidemic|covid|vaccine|fda|clinical trial|drug|pharmaceutical|biotech|research|study|scientific|nasa|space|mars|moon|climate|global warming|environment|green|renewable|energy)\b/)) {
    return 'Health & Science';
  }
  
  // Business & Companies
  if (combinedText.match(/\b(business|company|corporate|merger|acquisition|ipo|bankruptcy|layoff|hiring|ceo|executive|startup|unicorn|venture capital|vc|ipo|earnings|revenue|profit|loss|quarterly|annual report)\b/)) {
    return 'Business';
  }
  
  // Legal & Crime
  if (combinedText.match(/\b(legal|law|court|lawsuit|trial|verdict|judge|jury|attorney|lawyer|crime|criminal|arrest|charges|indictment|conviction|prison|jail|sentencing)\b/)) {
    return 'Legal';
  }
  
  return 'Other';
}

export async function fetchMarkets(limit: number = 50): Promise<PolymarketMarket[]> {
  // Try multiple endpoint variations to find what works
  // Note: Based on test results, status=open works but returns closed markets too
  // We'll filter them client-side
  // Try multiple endpoints to get current markets
  const endpoints = [
    // Try /events endpoint with active=true&closed=false (recommended for current markets)
    { url: `${GAMMA_API_BASE}/events`, params: { active: true, closed: false, limit: limit * 3 } },
    // Try /markets endpoint with active=true&closed=false
    { url: `${GAMMA_API_BASE}/markets`, params: { active: true, closed: false, limit: limit * 3 } },
    // Fallback: /markets with status=open
    { url: `${GAMMA_API_BASE}/markets`, params: { status: 'open', limit: limit * 3 } },
    // Last resort: just /markets
    { url: `${GAMMA_API_BASE}/markets`, params: { limit: limit * 3 } },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, {
        params: endpoint.params,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Polymarket-News-Monitor/1.0'
        },
        timeout: 10000
      });
      
      // Handle different possible response formats
      let markets: PolymarketMarket[] = [];
      
      // If using /events endpoint, extract markets from events
      if (endpoint.url.includes('/events')) {
        if (Array.isArray(response.data)) {
          // Events endpoint returns array of events, each with markets
          response.data.forEach((event: any) => {
            if (event.markets && Array.isArray(event.markets)) {
              markets.push(...event.markets);
            }
            // Some events might have the market data directly
            if (event.id && event.question) {
              markets.push(event);
            }
          });
        } else if (response.data && Array.isArray(response.data.data)) {
          response.data.data.forEach((event: any) => {
            if (event.markets && Array.isArray(event.markets)) {
              markets.push(...event.markets);
            }
          });
        }
      } else {
        // Standard /markets endpoint
        if (Array.isArray(response.data)) {
          markets = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          markets = response.data.data;
        } else if (response.data && Array.isArray(response.data.markets)) {
          markets = response.data.markets;
        } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
          markets = response.data.results;
        }
      }
      
      if (markets.length > 0) {
        // Analyze date range of all fetched markets
        const dates = markets
          .map((m: any) => ({
            endDate: m.endDate ? new Date(m.endDate) : null,
            createdAt: m.createdAt ? new Date(m.createdAt) : null,
            question: m.question?.substring(0, 40)
          }))
          .filter(d => d.endDate || d.createdAt);
        
        if (dates.length > 0) {
          const endDates = dates.map(d => d.endDate).filter(d => d !== null) as Date[];
          const createdDates = dates.map(d => d.createdAt).filter(d => d !== null) as Date[];
          
          const now = new Date();
          
          console.log('\n📅 DATE RANGE ANALYSIS:');
          console.log(`Total markets fetched: ${markets.length}`);
          
          if (endDates.length > 0) {
            const sortedEndDates = endDates.sort((a, b) => a.getTime() - b.getTime());
            const oldestEndDate = sortedEndDates[0];
            const newestEndDate = sortedEndDates[sortedEndDates.length - 1];
            const futureEndDates = endDates.filter(d => d > now).length;
            const pastEndDates = endDates.filter(d => d < now).length;
            
            console.log(`\nEnd Dates:`);
            console.log(`  Oldest: ${oldestEndDate.toISOString().split('T')[0]} (${Math.floor((now.getTime() - oldestEndDate.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
            console.log(`  Newest: ${newestEndDate.toISOString().split('T')[0]} (${newestEndDate > now ? Math.floor((newestEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + ' days in future' : Math.floor((now.getTime() - newestEndDate.getTime()) / (1000 * 60 * 60 * 24)) + ' days ago'})`);
            console.log(`  Future markets: ${futureEndDates}`);
            console.log(`  Past markets: ${pastEndDates}`);
          }
          
          if (createdDates.length > 0) {
            const sortedCreatedDates = createdDates.sort((a, b) => a.getTime() - b.getTime());
            const oldestCreated = sortedCreatedDates[0];
            const newestCreated = sortedCreatedDates[sortedCreatedDates.length - 1];
            
            console.log(`\nCreated Dates:`);
            console.log(`  Oldest: ${oldestCreated.toISOString().split('T')[0]} (${Math.floor((now.getTime() - oldestCreated.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
            console.log(`  Newest: ${newestCreated.toISOString().split('T')[0]} (${Math.floor((now.getTime() - newestCreated.getTime()) / (1000 * 60 * 60 * 24))} days ago)`);
          }
          
          // Show sample markets with dates
          console.log(`\n📋 Sample markets (first 5):`);
          markets.slice(0, 5).forEach((m: any, idx: number) => {
            const endDateStr = m.endDate ? new Date(m.endDate).toISOString().split('T')[0] : 'N/A';
            const createdStr = m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : 'N/A';
            console.log(`  ${idx + 1}. ${m.question?.substring(0, 50)}`);
            console.log(`     EndDate: ${endDateStr}, Created: ${createdStr}`);
          });
        }
        
        // Filter for CURRENT markets only - prioritize recent/upcoming markets
        const activeMarkets = markets.filter((m: any) => {
          // Must be active
          if (m.active !== true) {
            return false;
          }
          
          // Must not be archived
          if (m.archived === true) {
            return false;
          }
          
          const now = new Date();
          
          // PRIMARY FILTER: End date must be in the future OR very recent (within last 7 days)
          // This ensures we only get current/upcoming markets, not old ones
          if (m.endDate) {
            const endDate = new Date(m.endDate);
            const daysUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            const daysSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // STRICT FILTER: Only include markets that:
            // 1. Haven't ended yet (endDate in future), OR
            // 2. Ended within last 7 days (recently resolved)
            // Filter out anything that ended more than 7 days ago (this catches 2020/2021 markets)
            if (daysSinceEnd > 7) {
              // This market ended more than 7 days ago - filter it out
              return false;
            }
          } else {
            // If no endDate, check createdAt to ensure it's a recent market
            if (m.createdAt) {
              const createdAt = new Date(m.createdAt);
              const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
              // Only include markets created in last 90 days if no endDate
              if (daysSinceCreation > 90) {
                return false;
              }
            }
          }
          
          // Parse liquidity and volume
          const liquidity = m.liquidityNum || 
            (typeof m.liquidity === 'string' ? parseFloat(m.liquidity) : m.liquidity) || 0;
          const volume24hr = m.volume24hr || 0;
          
          // SECONDARY FILTER: Prefer markets with liquidity or recent activity
          // But for testing, we'll be lenient - just log if they don't have it
          // Remove this filter temporarily to see all current markets
          // if (liquidity < 100 && volume24hr === 0) {
          //   return false;
          // }
          
          return true;
        });
        
        // Log what was filtered out for debugging
        const filteredOut = markets.length - activeMarkets.length;
        if (filteredOut > 0) {
          const sampleFiltered = markets
            .filter((m: any) => {
              return !activeMarkets.some((am: any) => am.id === m.id);
            })
            .slice(0, 3);
          
          console.log(`🚫 Filtered out ${filteredOut} markets. Sample reasons:`, 
            sampleFiltered.map((m: any) => ({
              question: m.question?.substring(0, 40),
              active: m.active,
              closed: m.closed,
              archived: m.archived,
              liquidity: m.liquidityNum || m.liquidity,
              volume24hr: m.volume24hr,
              volumeNum: m.volumeNum,
              endDate: m.endDate
            }))
          );
        }
        
        // Sort by RECENT activity first (volume24hr), then liquidity, then total volume
        activeMarkets.sort((a: any, b: any) => {
          // Prioritize markets with recent 24hr volume
          const vol24A = a.volume24hr || 0;
          const vol24B = b.volume24hr || 0;
          if (vol24A !== vol24B) {
            return vol24B - vol24A;
          }
          
          // Then by liquidity (tradeable markets)
          const liqA = a.liquidityNum || (typeof a.liquidity === 'string' ? parseFloat(a.liquidity) : a.liquidity) || 0;
          const liqB = b.liquidityNum || (typeof b.liquidity === 'string' ? parseFloat(b.liquidity) : b.liquidity) || 0;
          if (liqA !== liqB) {
            return liqB - liqA;
          }
          
          // Finally by total volume
          const volA = a.volumeNum || (typeof a.volume === 'string' ? parseFloat(a.volume) : a.volume) || 0;
          const volB = b.volumeNum || (typeof b.volume === 'string' ? parseFloat(b.volume) : b.volume) || 0;
          return volB - volA;
        });
        
        const result = activeMarkets.slice(0, limit);
        console.log(`\n✅ FILTER RESULTS:`);
        console.log(`  Total fetched: ${markets.length}`);
        console.log(`  Passed filter: ${activeMarkets.length}`);
        console.log(`  Returning: ${result.length}`);
        
        // Log date range of filtered markets
        if (activeMarkets.length > 0) {
          const filteredDates = activeMarkets
            .map((m: any) => m.endDate ? new Date(m.endDate) : null)
            .filter(d => d !== null) as Date[];
          
          if (filteredDates.length > 0) {
            const sorted = filteredDates.sort((a, b) => a.getTime() - b.getTime());
            const now = new Date();
            console.log(`\n📅 FILTERED MARKETS DATE RANGE:`);
            console.log(`  Oldest endDate: ${sorted[0].toISOString().split('T')[0]}`);
            console.log(`  Newest endDate: ${sorted[sorted.length - 1].toISOString().split('T')[0]}`);
            console.log(`  Future markets: ${filteredDates.filter(d => d > now).length}`);
            console.log(`  Past markets (within 7 days): ${filteredDates.filter(d => d < now && (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= 7).length}`);
          }
        }
        
        // Log statistics about the markets we're returning
        if (result.length > 0) {
          const stats = {
            active: result.filter((m: any) => m.active === true).length,
            closed: result.filter((m: any) => m.closed === true).length,
            hasVolume: result.filter((m: any) => (m.volumeNum || m.volume24hr || 0) > 0).length,
            hasLiquidity: result.filter((m: any) => (m.liquidityNum || 0) > 0).length,
            hasPrice: result.filter((m: any) => 
              m.outcomePrices || m.bestBid || m.bestAsk || m.lastTradePrice
            ).length
          };
          console.log('\n📊 Market stats:', stats);
        }
        
        return result;
      }
    } catch (error: any) {
      // Log the error but continue to next endpoint
      if (error.response) {
        console.log(`Endpoint ${endpoint.url} failed with status ${error.response.status}:`, 
          JSON.stringify(error.response.data, null, 2));
        // If we get detailed error info, log it
        if (error.response.data?.message) {
          console.log('Error message:', error.response.data.message);
        }
        if (error.response.data?.errors) {
          console.log('Validation errors:', error.response.data.errors);
        }
      } else {
        console.log(`Endpoint ${endpoint.url} failed:`, error.message);
      }
      continue;
    }
  }
  
  // If all endpoints failed, try GraphQL endpoint as fallback
  try {
    const graphqlMarkets = await fetchMarketsGraphQL(limit);
    if (graphqlMarkets.length > 0) {
      return graphqlMarkets;
    }
  } catch (error: any) {
    console.log('GraphQL endpoint also failed:', error.message);
  }
  
  // If all API methods fail, log warning and return empty array
  // In development, you can uncomment the mock data fallback for testing
  console.warn('⚠️  All Polymarket API endpoints failed. Returning empty array.');
  console.warn('💡 Tip: Use /api/test/polymarket endpoint to debug API issues');
  console.warn('💡 Tip: For testing, you can temporarily use mock data in updateAllMarkets()');
  
  // Uncomment below for testing with mock data:
  // const { getMockMarkets } = require('./polymarketMock');
  // return getMockMarkets(limit);
  
  return [];
}

// Alternative GraphQL endpoint
async function fetchMarketsGraphQL(limit: number): Promise<PolymarketMarket[]> {
  const query = `
    query GetMarkets($limit: Int) {
      markets(limit: $limit, sort: volume, order: desc) {
        id
        question
        slug
        description
        endDate
        image
        icon
        tags
        outcomes
        active
        liquidity
        volume
        createdAt
      }
    }
  `;
  
  try {
    const response = await axios.post(`${GAMMA_API_BASE}/graphql`, {
      query,
      variables: { limit }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.data && response.data.data.markets) {
      return response.data.data.markets;
    }
  } catch (error: any) {
    console.log('GraphQL endpoint also failed:', error.message);
  }
  
  return [];
}

export async function fetchMarketPrices(marketIdOrConditionId: string): Promise<PolymarketPrice[]> {
  try {
    // Try using conditionId format (0x...)
    const response = await axios.get(`${CLOB_API_BASE}/book`, {
      params: {
        market: marketIdOrConditionId
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    
    // Extract prices from order book
    // Note: The actual API response structure may vary - adjust parsing logic as needed
    const prices: PolymarketPrice[] = [];
    
    if (response.data) {
      // Try different possible response formats
      if (response.data.levels) {
        for (const [outcome, levels] of Object.entries(response.data.levels)) {
          if (Array.isArray(levels) && levels.length > 0) {
            // Get best bid price (highest buy order)
            const bestBid = levels.find((l: any) => l.side === 'bid');
            if (bestBid) {
              prices.push({
                market: marketIdOrConditionId,
                outcome: outcome as string,
                price: parseFloat(bestBid.price),
                timestamp: Date.now()
              });
            }
          }
        }
      } else if (response.data.price) {
        // Alternative format: direct price in response
        prices.push({
          market: marketIdOrConditionId,
          outcome: 'Yes',
          price: parseFloat(response.data.price),
          timestamp: Date.now()
        });
      } else if (Array.isArray(response.data)) {
        // Alternative format: array of price data
        response.data.forEach((item: any) => {
          if (item.price) {
            prices.push({
              market: marketIdOrConditionId,
              outcome: item.outcome || 'Yes',
              price: parseFloat(item.price),
              timestamp: Date.now()
            });
          }
        });
      }
    }
    
    return prices;
  } catch (error: any) {
    // Silently fail - we'll use fallback prices from market data
    // console.error(`Error fetching prices for market ${marketIdOrConditionId}:`, error.message);
    // Return empty array on error to allow other markets to continue processing
    return [];
  }
}

export async function fetchMarketTicker(marketId: string): Promise<PolymarketTicker | null> {
  try {
    const response = await axios.get(`${CLOB_API_BASE}/ticker`, {
      params: {
        market: marketId
      },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ticker for market ${marketId}:`, error);
    return null;
  }
}

export async function updateMarketData(market: PolymarketMarket): Promise<MarketData | null> {
  try {
    const existingData = await getMarketData(market.id);
    
    // Try to get price from market data first (from outcomePrices or bestBid/bestAsk)
    let currentPrice: number | null = null;
    
    // Parse outcomePrices if available
    if (market.outcomePrices) {
      let prices: number[] = [];
      if (typeof market.outcomePrices === 'string') {
        try {
          const parsed = JSON.parse(market.outcomePrices);
          prices = Array.isArray(parsed) ? parsed.map((p: any) => typeof p === 'string' ? parseFloat(p) : p) : [];
        } catch (e) {
          // outcomePrices might be a comma-separated string or invalid JSON
          console.log(`Could not parse outcomePrices for market ${market.id}: ${market.outcomePrices}`);
        }
      } else {
        prices = Array.isArray(market.outcomePrices) ? market.outcomePrices : [];
      }
      
      // Get the "Yes" outcome price (usually first outcome)
      // Prices are typically in cents (0-100) or decimals (0-1)
      if (prices.length > 0) {
        const price = prices[0];
        if (price > 0) {
          // If price > 1, it's probably in cents, convert to decimal
          currentPrice = price > 1 ? price / 100 : price;
        }
      }
    }
    
    // Fallback to bestBid/bestAsk
    if (currentPrice === null) {
      if (market.bestBid !== undefined && market.bestBid > 0) {
        currentPrice = market.bestBid;
      } else if (market.bestAsk !== undefined && market.bestAsk < 1) {
        currentPrice = market.bestAsk;
      } else if (market.lastTradePrice !== undefined && market.lastTradePrice > 0) {
        currentPrice = market.lastTradePrice;
      }
    }
    
    // If still no price, try fetching from CLOB API using conditionId or clobTokenIds
    if (currentPrice === null) {
      const prices = await fetchMarketPrices(market.conditionId || market.id);
      if (prices.length > 0) {
        const yesPrice = prices.find(p => p.outcome.toLowerCase().includes('yes')) || prices[0];
        currentPrice = yesPrice.price;
      }
    }
    
    // If still no price, use a default/estimated price for testing
    // TODO: Remove this fallback once we understand the data better
    if (currentPrice === null || currentPrice <= 0) {
      // Try to estimate from bestAsk/bestBid spread
      if (market.bestAsk !== undefined && market.bestBid !== undefined) {
        currentPrice = (market.bestAsk + market.bestBid) / 2;
      } else if (market.bestAsk !== undefined) {
        currentPrice = market.bestAsk;
      } else if (market.bestBid !== undefined) {
        currentPrice = market.bestBid;
      } else {
        // Last resort: use 0.5 (50%) as default for testing
        console.log(`⚠️  No price found for market ${market.id}, using default 0.5 for testing`);
        currentPrice = 0.5;
      }
    }
    
    // Ensure price is between 0 and 1
    if (currentPrice > 1) {
      currentPrice = currentPrice / 100; // Convert from percentage
    }
    currentPrice = Math.max(0, Math.min(1, currentPrice)); // Clamp to [0, 1]
    
    // Calculate volume and other metrics
    const volume24h = market.volume24hr || market.volumeNum || 
      (typeof market.volume === 'string' ? parseFloat(market.volume) : market.volume) || 0;
    const liquidity = market.liquidityNum || 
      (typeof market.liquidity === 'string' ? parseFloat(market.liquidity) : market.liquidity) || 0;
    
    // Get historical prices for comparison
    const history = await getMarketHistory(market.id, 24);
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    const price1hAgo = history.find(h => h.timestamp <= oneHourAgo && h.timestamp > oneHourAgo - (30 * 60 * 1000))?.price || null;
    const price24hAgo = history.find(h => h.timestamp <= twentyFourHoursAgo && h.timestamp > twentyFourHoursAgo - (60 * 60 * 1000))?.price || null;
    
    // Calculate average volume
    const volumeHistory = history.map(h => h.volume || 0).filter(v => v > 0);
    const volumeAverage = volumeHistory.length > 0
      ? volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length
      : volume24h;
    
    // Parse outcomes if it's a JSON string
    let outcomes: string[] = [];
    if (market.outcomes) {
      if (typeof market.outcomes === 'string') {
        try {
          outcomes = JSON.parse(market.outcomes);
        } catch (e) {
          outcomes = [market.outcomes];
        }
      } else {
        outcomes = market.outcomes;
      }
    }
    
    // Parse tags if needed
    let tags: string[] = [];
    if (market.tags) {
      tags = Array.isArray(market.tags) ? market.tags : [market.tags];
    } else if (market.category) {
      tags = [market.category];
    }
    
    const marketData: MarketData = {
      marketId: market.id,
      question: market.question,
      category: mapCategory(tags, market.question),
      currentPrice,
      previousPrice1h: price1hAgo,
      previousPrice24h: price24hAgo,
      volume24h,
      volumeAverage,
      liquidity,
      traders: 0, // Not available from API
      timestamp: now
    };
    
    console.log(`Updated market: ${market.question.substring(0, 50)} - Price: ${(currentPrice * 100).toFixed(1)}%, Volume: $${(volume24h / 1000).toFixed(1)}k`);
    
    await saveMarketData(marketData);
    
    // Save to history
    await saveMarketHistory({
      marketId: market.id,
      price: currentPrice,
      volume: volume24h,
      timestamp: now
    });
    
    return marketData;
  } catch (error) {
    console.error(`Error updating market data for ${market.id}:`, error);
    return null;
  }
}

export async function updateAllMarkets(): Promise<MarketData[]> {
  console.log('📊 Fetching markets from Polymarket...');
  const markets = await fetchMarkets(30); // Monitor top 30 markets
  
  if (markets.length === 0) {
    console.warn('⚠️  No markets fetched from API');
    return [];
  }
  
  console.log(`📈 Processing ${markets.length} markets...`);
  const results: MarketData[] = [];
  let skipped = 0;
  
  for (const market of markets) {
    try {
      const data = await updateMarketData(market);
      if (data) {
        results.push(data);
      } else {
        skipped++;
      }
    } catch (error: any) {
      console.error(`Error processing market ${market.id}:`, error.message);
      skipped++;
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`✅ Successfully updated ${results.length} markets, skipped ${skipped}`);
  return results;
}

