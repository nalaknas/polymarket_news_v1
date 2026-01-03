# Setup Instructions

## Prerequisites

- Node.js 18+ and npm
- An Anthropic API key (or OpenAI API key)

## Installation Steps

1. **Install root dependencies:**
```bash
npm install
```

2. **Install server dependencies:**
```bash
cd server
npm install
```

3. **Install client dependencies:**
```bash
cd ../client
npm install
```

4. **Set up environment variables:**

Create a `.env` file in the `server` directory:
```bash
cd ../server
cp .env.example .env
```

Edit `server/.env` and add your API key:
```
PORT=3001
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# OR use OpenAI:
# OPENAI_API_KEY=your_openai_api_key_here
# USE_OPENAI=true
```

5. **Start the application:**

From the root directory:
```bash
npm run dev
```

This will start both the backend server (port 3001) and frontend (port 3000).

Alternatively, start them separately:
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm start
```

## First Run

On first run, the server will:
1. Create a SQLite database (`polymarket.db`) in the server directory
2. Start polling Polymarket API every 5 minutes
3. Detect anomalies and generate AI reports

The frontend will automatically connect to the backend API.

## Troubleshooting

### API Rate Limits
If you encounter rate limiting from Polymarket API, the server includes delays between requests. You can adjust these in `server/src/services/polymarket.ts`.

### AI API Errors
Make sure your API key is correctly set in the `.env` file. Check the server logs for specific error messages.

### Database Issues
If you need to reset the database, delete `server/polymarket.db` and restart the server.

## Configuration

### Polling Interval
The default polling interval is 5 minutes. To change it, edit the cron schedule in `server/src/index.ts`:
```typescript
cron.schedule('*/5 * * * *', updateMarketsAndGenerateReports);
```

### Number of Markets
By default, the app monitors the top 30 markets. Change this in `server/src/services/polymarket.ts`:
```typescript
const markets = await fetchMarkets(30); // Change 30 to your desired number
```

### Anomaly Thresholds
Adjust anomaly detection thresholds in `server/src/services/anomalyDetection.ts`:
- Price spike: Currently 10% change in 1 hour
- Volume spike: Currently 3x average volume
- Volatility: Currently 5% rapid swings

