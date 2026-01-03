import axios from 'axios';
import { MarketData, NewsReport, MarketHistory } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchMarkets = async (): Promise<MarketData[]> => {
  const response = await api.get<MarketData[]>('/markets');
  return response.data;
};

export const fetchReports = async (limit: number = 50): Promise<NewsReport[]> => {
  const response = await api.get<NewsReport[]>('/reports', {
    params: { limit }
  });
  return response.data;
};

export const fetchMarketHistory = async (
  marketId: string,
  hours: number = 24
): Promise<MarketHistory[]> => {
  const response = await api.get<MarketHistory[]>(`/markets/${marketId}/history`, {
    params: { hours }
  });
  return response.data;
};

export default api;

