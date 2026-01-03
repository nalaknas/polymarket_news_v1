# Polymarket API Integration Notes

## Important Notes

The Polymarket API endpoints used in this application are based on public documentation, but the actual API structure may vary. You may need to adjust the following:

### 1. API Endpoints

The application uses:
- **Gamma API**: `https://gamma-api.polymarket.com/markets` - for market discovery
- **CLOB API**: `https://clob.polymarket.com/book` and `/ticker` - for prices and trading data

### 2. Response Format Variations

The code includes fallback parsing logic to handle different possible response formats:
- Direct array: `response.data`
- Nested data: `response.data.data` or `response.data.markets`
- Order book structure variations

### 3. Authentication

Currently, the code assumes public API access. If Polymarket requires API keys:
1. Add authentication headers in `server/src/services/polymarket.ts`
2. Store API keys in `.env` file
3. Update axios requests to include headers

### 4. Rate Limiting

The application includes delays between requests (200ms) to avoid rate limiting. If you encounter rate limit errors:
- Increase delays in `updateAllMarkets()` function
- Reduce the number of markets monitored
- Implement exponential backoff retry logic

### 5. Testing the API

To verify the API endpoints work:

```bash
# Test markets endpoint
curl "https://gamma-api.polymarket.com/markets?active=true&limit=5"

# Test order book endpoint (replace MARKET_ID)
curl "https://clob.polymarket.com/book?market=MARKET_ID"
```

### 6. Alternative Data Sources

If Polymarket API is unavailable or changes:
- Consider using Polymarket's GraphQL API (if available)
- Use web scraping as a fallback (with proper rate limiting)
- Integrate with other prediction market APIs

### 7. Error Handling

The application gracefully handles API errors:
- Returns empty arrays on failure
- Logs errors for debugging
- Continues processing other markets
- Frontend displays error messages to users

## Updating API Integration

If you need to update the API integration:

1. Check Polymarket's latest documentation: https://docs.polymarket.com
2. Update endpoint URLs in `server/src/services/polymarket.ts`
3. Adjust response parsing logic based on actual API responses
4. Test with a small number of markets first
5. Monitor server logs for errors

