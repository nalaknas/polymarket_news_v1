# Polymarket News Monitor

A web application that monitors Polymarket prediction markets to detect emerging news and trends before traditional media reports them.

## Features

- **Real-time Monitoring Dashboard**: Track markets with significant price movements, volume spikes, and volatility
- **AI-Generated Reports**: Automatically generate neutral, factual news reports explaining market movements
- **Anomaly Detection**: Flags markets with >10% price changes, volume spikes (>3x average), and rapid volatility
- **Historical Charts**: Visualize price movements over time
- **Category Filtering**: Filter by Politics, Economics, World Events, Technology, Sports, etc.

## Setup

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
```bash
# The .env file should already exist. Edit it and add your OpenAI API key:
# server/.env should contain:
# PORT=3001
# USE_OPENAI=true
# OPENAI_API_KEY=your_actual_key_here
```

3. Start the development servers:
```bash
npm run dev
```

The backend will run on http://localhost:3001 and the frontend on http://localhost:3000

## Troubleshooting API Issues

If you're getting 422 errors from Polymarket API:

1. **Test the API endpoints:**
   Visit `http://localhost:3001/api/test/polymarket` to see which endpoints work and what errors you're getting.

2. **Check the server logs** for detailed error messages about which endpoints failed.

3. **See DEBUGGING.md** for more detailed troubleshooting steps.

4. **For testing without API:** You can temporarily use mock data (see DEBUGGING.md)

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **AI**: Anthropic Claude API (or OpenAI)
- **Database**: SQLite (for storing market history)
- **Data Source**: Polymarket API (Gamma API + CLOB API)

## Project Structure

```
polymarket_news_v1/
├── client/          # React frontend
├── server/          # Express backend
└── package.json     # Root package.json for convenience scripts
```

