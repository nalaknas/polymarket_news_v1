# Debugging Polymarket API Issues

## Testing the API

1. **Start your server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Test the API endpoints:**
   Visit `http://localhost:3001/api/test/polymarket` in your browser or use curl:
   ```bash
   curl http://localhost:3001/api/test/polymarket
   ```

   This will show you:
   - Which endpoints work
   - What the response format is
   - What error messages you're getting

## Common Issues and Solutions

### 422 Error (Unprocessable Entity)

This usually means:
- Wrong query parameters
- Missing required parameters
- Invalid parameter values

**Solutions:**
1. Check the test endpoint results to see which parameters work
2. Try removing optional parameters one by one
3. Check Polymarket's latest API documentation

### Authentication Required

If you see 401/403 errors:
1. You may need a Polymarket API key
2. Add it to your `.env` file:
   ```
   POLYMARKET_API_KEY=your_key_here
   ```
3. Update the API calls to include the Authorization header

### Rate Limiting

If you see 429 errors:
- Increase delays between requests
- Reduce the number of markets you're fetching
- Implement exponential backoff

## Using Mock Data for Testing

If the API is completely unavailable, you can temporarily use mock data:

1. Edit `server/src/services/polymarket.ts`
2. In the `fetchMarkets` function, uncomment the mock data fallback:
   ```typescript
   // Uncomment below for testing with mock data:
   const { getMockMarkets } = require('./polymarketMock');
   return getMockMarkets(limit);
   ```

3. Also update `updateMarketData` to generate mock prices:
   ```typescript
   // In updateMarketData, if prices.length === 0, generate mock price
   if (prices.length === 0) {
     // Mock price for testing
     prices.push({
       market: market.id,
       outcome: 'Yes',
       price: 0.5 + (Math.random() - 0.5) * 0.2, // Random price between 0.4-0.6
       timestamp: Date.now()
     });
   }
   ```

## Alternative: Using Community SDK

If the official API continues to have issues, consider using the community SDK:

1. Install: `npm install @polymarket/data-sdk` (if available)
2. Check: https://polymarket-data.com/ for documentation
3. Update the service to use the SDK instead of direct API calls

## Checking API Status

1. Visit Polymarket's status page (if available)
2. Check their Discord/community channels for API issues
3. Review their GitHub for API changes

## Getting Help

- Polymarket Docs: https://docs.polymarket.com
- Check the test endpoint output for specific error details
- Review server logs for detailed error messages

