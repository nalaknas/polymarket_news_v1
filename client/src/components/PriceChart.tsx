import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMarketHistory } from '../services/api';
import { MarketHistory } from '../types';
import { format } from 'date-fns';
import './PriceChart.css';

interface PriceChartProps {
  marketId: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ marketId }) => {
  const [history, setHistory] = useState<MarketHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [marketId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchMarketHistory(marketId, 24);
      setHistory(data);
    } catch (error) {
      console.error('Error loading market history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  if (history.length === 0) {
    return <div className="chart-empty">No historical data available</div>;
  }

  const chartData = history.map(point => ({
    time: format(new Date(point.timestamp), 'HH:mm'),
    price: (point.price * 100).toFixed(1),
    timestamp: point.timestamp
  }));

  return (
    <div className="price-chart">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            stroke="#666"
            fontSize={12}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#666"
            fontSize={12}
            domain={[0, 100]}
            label={{ value: 'Probability %', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value: any) => [`${value}%`, 'Probability']}
            labelFormatter={(label) => `Time: ${label}`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#000"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceChart;

