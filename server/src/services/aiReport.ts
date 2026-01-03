import Anthropic from '@anthropic-ai/sdk';
import { MarketData } from '../database';
import { Anomaly } from './anomalyDetection';
import axios from 'axios';

let anthropic: Anthropic | null = null;
let useOpenAI = false;

export function initializeAI(apiKey: string, useOpenAIFlag: boolean = false) {
  useOpenAI = useOpenAIFlag;
  if (!useOpenAIFlag) {
    anthropic = new Anthropic({ apiKey });
  }
}

export interface GeneratedReport {
  headline: string;
  summary: string;
  analysis: string;
  keyTakeaways: string;
}

async function generateWithClaude(market: MarketData, anomalies: Anomaly[]): Promise<GeneratedReport> {
  if (!anthropic) {
    throw new Error('Anthropic client not initialized');
  }
  
  const priceChange1h = market.previousPrice1h !== null
    ? ((market.currentPrice - market.previousPrice1h) / market.previousPrice1h * 100).toFixed(1)
    : 'N/A';
  
  const priceChange24h = market.previousPrice24h !== null
    ? ((market.currentPrice - market.previousPrice24h) / market.previousPrice24h * 100).toFixed(1)
    : 'N/A';
  
  const volumeSpike = market.volumeAverage > 0
    ? ((market.volume24h / market.volumeAverage - 1) * 100).toFixed(1)
    : 'N/A';
  
  const anomalyDescriptions = anomalies.map(a => `- ${a.type}: ${a.description} (${a.severity} severity)`).join('\n');
  
  const prompt = `A prediction market on Polymarket is showing unusual activity. Generate a neutral news report explaining this to a general audience:

Market Question: ${market.question}
Category: ${market.category}
Current Probability: ${(market.currentPrice * 100).toFixed(1)}%
Previous Probability (1h ago): ${market.previousPrice1h !== null ? (market.previousPrice1h * 100).toFixed(1) + '%' : 'N/A'}
Previous Probability (24h ago): ${market.previousPrice24h !== null ? (market.previousPrice24h * 100).toFixed(1) + '%' : 'N/A'}
Price Change (1h): ${priceChange1h}%
Price Change (24h): ${priceChange24h}%
Volume (24h): $${market.volume24h.toLocaleString()}
Volume Spike: ${volumeSpike}%

Detected Anomalies:
${anomalyDescriptions}

Write a news report with the following structure:
1. HEADLINE: A clear, factual headline (max 80 characters)
2. SUMMARY: A 2-3 sentence summary paragraph explaining what happened
3. ANALYSIS: A detailed 3-4 paragraph analysis that:
   - Explains what the market is about in plain language
   - Describes the price movement and what it likely signals
   - Provides context on why this matters
   - Notes any limitations or caveats
4. KEY_TAKEAWAYS: 3-4 bullet points highlighting the most important information

Keep the tone neutral, factual, and accessible to non-traders. Focus on "markets are pricing in" language rather than making predictions. Avoid speculation and sensationalism.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const content = message.content[0];
    if (content.type === 'text') {
      return parseReport(content.text);
    }
    
    throw new Error('Unexpected response format from Claude');
  } catch (error) {
    console.error('Error generating report with Claude:', error);
    throw error;
  }
}

async function generateWithOpenAI(market: MarketData, anomalies: Anomaly[]): Promise<GeneratedReport> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not set');
  }
  
  const priceChange1h = market.previousPrice1h !== null
    ? ((market.currentPrice - market.previousPrice1h) / market.previousPrice1h * 100).toFixed(1)
    : 'N/A';
  
  const priceChange24h = market.previousPrice24h !== null
    ? ((market.currentPrice - market.previousPrice24h) / market.previousPrice24h * 100).toFixed(1)
    : 'N/A';
  
  const volumeSpike = market.volumeAverage > 0
    ? ((market.volume24h / market.volumeAverage - 1) * 100).toFixed(1)
    : 'N/A';
  
  const anomalyDescriptions = anomalies.map(a => `- ${a.type}: ${a.description} (${a.severity} severity)`).join('\n');
  
  const prompt = `A prediction market on Polymarket is showing unusual activity. Generate a neutral news report explaining this to a general audience:

Market Question: ${market.question}
Category: ${market.category}
Current Probability: ${(market.currentPrice * 100).toFixed(1)}%
Previous Probability (1h ago): ${market.previousPrice1h !== null ? (market.previousPrice1h * 100).toFixed(1) + '%' : 'N/A'}
Previous Probability (24h ago): ${market.previousPrice24h !== null ? (market.previousPrice24h * 100).toFixed(1) + '%' : 'N/A'}
Price Change (1h): ${priceChange1h}%
Price Change (24h): ${priceChange24h}%
Volume (24h): $${market.volume24h.toLocaleString()}
Volume Spike: ${volumeSpike}%

Detected Anomalies:
${anomalyDescriptions}

Write a news report with the following structure:
1. HEADLINE: A clear, factual headline (max 80 characters)
2. SUMMARY: A 2-3 sentence summary paragraph explaining what happened
3. ANALYSIS: A detailed 3-4 paragraph analysis that:
   - Explains what the market is about in plain language
   - Describes the price movement and what it likely signals
   - Provides context on why this matters
   - Notes any limitations or caveats
4. KEY_TAKEAWAYS: 3-4 bullet points highlighting the most important information

Keep the tone neutral, factual, and accessible to non-traders. Focus on "markets are pricing in" language rather than making predictions. Avoid speculation and sensationalism.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const content = response.data.choices[0].message.content;
    return parseReport(content);
  } catch (error) {
    console.error('Error generating report with OpenAI:', error);
    throw error;
  }
}

function parseReport(text: string): GeneratedReport {
  const headlineMatch = text.match(/HEADLINE:\s*(.+?)(?:\n|SUMMARY:|$)/i);
  const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?:\nANALYSIS:|$)/is);
  const analysisMatch = text.match(/ANALYSIS:\s*(.+?)(?:\nKEY_TAKEAWAYS:|$)/is);
  const takeawaysMatch = text.match(/KEY_TAKEAWAYS:\s*(.+?)$/is);
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'Market Movement Detected',
    summary: summaryMatch ? summaryMatch[1].trim() : text.substring(0, 200),
    analysis: analysisMatch ? analysisMatch[1].trim() : text,
    keyTakeaways: takeawaysMatch ? takeawaysMatch[1].trim() : '• Market showing unusual activity'
  };
}

export async function generateReport(market: MarketData, anomalies: Anomaly[]): Promise<GeneratedReport> {
  if (useOpenAI) {
    return generateWithOpenAI(market, anomalies);
  } else {
    return generateWithClaude(market, anomalies);
  }
}

