import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { initDatabase, saveNewsReport } from './database';
import { updateAllMarkets } from './services/polymarket';
import { detectAnomalies, shouldGenerateReport } from './services/anomalyDetection';
import { generateReport, initializeAI } from './services/aiReport';
import { getAllMarkets } from './database';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize AI service
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const useOpenAI = process.env.USE_OPENAI === 'true';

if (useOpenAI && openaiKey) {
  initializeAI(openaiKey, true);
  console.log('Initialized OpenAI for report generation');
} else if (anthropicKey) {
  initializeAI(anthropicKey, false);
  console.log('Initialized Anthropic Claude for report generation');
} else {
  console.warn('Warning: No AI API key found. Report generation will fail.');
}

// Market update function
async function updateMarketsAndGenerateReports() {
  try {
    console.log('Updating markets...');
    const updatedMarkets = await updateAllMarkets();
    console.log(`Updated ${updatedMarkets.length} markets`);
    
    // Check for anomalies and generate reports
    for (const market of updatedMarkets) {
      const anomalies = detectAnomalies(market);
      
      if (shouldGenerateReport(anomalies)) {
        try {
          console.log(`Generating report for market: ${market.question.substring(0, 50)}...`);
          const report = await generateReport(market, anomalies);
          
          const primaryAnomaly = anomalies.find(a => a.severity === 'high') || anomalies[0];
          
          await saveNewsReport({
            marketId: market.marketId,
            headline: report.headline,
            summary: report.summary,
            analysis: report.analysis,
            keyTakeaways: report.keyTakeaways,
            confidence: primaryAnomaly.confidence,
            priceChange: primaryAnomaly.priceChange,
            volumeChange: primaryAnomaly.volumeChange,
            timestamp: Date.now()
          });
          
          console.log(`Generated report: ${report.headline}`);
          
          // Rate limiting: wait between reports
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error generating report for market ${market.marketId}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in market update cycle:', error);
  }
}

// Schedule market updates every 5 minutes
cron.schedule('*/5 * * * *', updateMarketsAndGenerateReports);

// Initial update on startup
initDatabase().then(() => {
  console.log('Database initialized');
  
  // Run initial update after a short delay
  setTimeout(() => {
    updateMarketsAndGenerateReports();
  }, 5000);
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Market updates scheduled every 5 minutes');
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

