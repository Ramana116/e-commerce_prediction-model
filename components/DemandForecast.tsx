
import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { forecastDemand } from '../services/geminiService';
import type { Sale, ForecastDataPoint } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { RefreshCw } from 'lucide-react';

interface DemandForecastProps {
  sales: Sale[];
}

export const DemandForecast: React.FC<DemandForecastProps> = ({ sales }) => {
  const [forecastData, setForecastData] = useState<ForecastDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    if (sales.length > 0) {
      setLoading(true);
      const data = await forecastDemand(sales);
      setForecastData(data);
      setLoading(false);
    }
  }, [sales]);

  useEffect(() => {
    fetchForecast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch only on initial component mount

  if (loading && !forecastData) { // Only show full-screen loader on initial load
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LoadingSpinner />
        <p className="text-text-secondary mt-2">Forecasting demand...</p>
      </div>
    );
  }

  if (!forecastData) {
    return <div className="flex items-center justify-center h-64 text-text-secondary">Could not fetch forecast data.</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
        <div className="flex justify-end mb-2">
            <button
                onClick={fetchForecast}
                disabled={loading}
                className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh Forecast'}
            </button>
        </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecastData}
            margin={{
              top: 5, right: 20, left: 0, bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#d1d5db" tick={{ fontSize: 12 }} />
            <YAxis stroke="#d1d5db" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.5rem',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }}/>
            <Line type="monotone" dataKey="forecast" name="Forecasted Sales" stroke="#3b82f6" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
