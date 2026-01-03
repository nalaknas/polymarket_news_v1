import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { initDatabase, saveNewsReport, getRecentReportsByMarket } from './database';
import { updateAllMarkets } from './services/polymarket';
import { detectAnomalies, shouldGenerateReport, filterNoisiestMarkets } from './services/anomalyDetection';
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
    
    // Filter to only the absolute noisiest markets (top 3 by default)
    const noisiestMarkets = filterNoisiestMarkets(updatedMarkets, 3);
    
    if (noisiestMarkets.length === 0) {
      console.log('No major spikes detected. Skipping report generation.');
      return;
    }
    
    console.log(`\n🔔 Found ${noisiestMarkets.length} major spike(s):`);
    noisiestMarkets.forEach((scored, idx) => {
      console.log(`  ${idx + 1}. Score: ${scored.score.toFixed(1)} - ${scored.market.question.substring(0, 60)}`);
      console.log(`     Reasons: ${scored.reasons.join(', ')}`);
    });
    
    // Generate reports only for the noisiest markets
    for (const scoredMarket of noisiestMarkets) {
      try {
        const { market, anomalies, score, reasons } = scoredMarket;
        
        // Check for duplicate reports (within last 24 hours)
        const recentReports = await getRecentReportsByMarket(market.marketId, 24);
        
        if (recentReports.length > 0) {
          // Check if this is an unprecedented change (score is significantly higher)
          // Calculate previous max score from recent reports
          const previousMaxScore = Math.max(...recentReports.map(r => {
            // Estimate score from price/volume changes
            const priceMag = Math.abs(r.priceChange || 0) * 100;
            const volumeMag = Math.abs(r.volumeChange || 0) * 5;
            return priceMag + volumeMag;
          }));
          
          // Only create new report if score is 50% higher than previous (unprecedented change)
          if (score <= previousMaxScore * 1.5) {
            console.log(`⏭️  Skipping duplicate report for ${market.question.substring(0, 50)}...`);
            console.log(`   Current score: ${score.toFixed(1)}, Previous max: ${previousMaxScore.toFixed(1)}`);
            continue;
          } else {
            console.log(`🆕 Unprecedented change detected for ${market.question.substring(0, 50)}...`);
            console.log(`   Current score: ${score.toFixed(1)}, Previous max: ${previousMaxScore.toFixed(1)}`);
          }
        }
        
        console.log(`\n📰 Generating report for: ${market.question.substring(0, 50)}...`);
        console.log(`   Noise score: ${score.toFixed(1)}, Reasons: ${reasons.join(', ')}`);
        
        const report = await generateReport(market, anomalies, reasons);
        
        const primaryAnomaly = anomalies.find(a => a.severity === 'high') || anomalies[0];
        
        // Calculate actual price change (1h if available, otherwise 24h)
        const actualPriceChange = market.previousPrice1h !== null
          ? (market.currentPrice - market.previousPrice1h) / market.previousPrice1h
          : market.previousPrice24h !== null
          ? (market.currentPrice - market.previousPrice24h) / market.previousPrice24h
          : primaryAnomaly.priceChange;
        
        // Calculate actual volume change (vs average)
        const actualVolumeChange = market.volumeAverage > 0
          ? (market.volume24h - market.volumeAverage) / market.volumeAverage
          : primaryAnomaly.volumeChange;
        
        await saveNewsReport({
          marketId: market.marketId,
          headline: report.headline,
          summary: report.summary,
          analysis: report.analysis,
          keyTakeaways: report.keyTakeaways,
          confidence: primaryAnomaly.confidence,
          priceChange: actualPriceChange,
          volumeChange: actualVolumeChange,
          reasons: report.reasons || reasons,
          timestamp: Date.now()
        });
        
        console.log(`✅ Generated report: ${report.headline}`);
        
        // Rate limiting: wait between reports
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error generating report for market ${scoredMarket.market.marketId}:`, error);
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

