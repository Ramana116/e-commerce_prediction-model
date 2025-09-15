
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { forecastDemand } from '../services/geminiService';
import type { Sale, ForecastDataPoint } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface DemandForecastProps {
  sales: Sale[];
}

export const DemandForecast: React.FC<DemandForecastProps> = ({ sales }) => {
  const [forecastData, setForecastData] = useState<ForecastDataPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      if (sales.length > 0) {
        setLoading(true);
        const data = await forecastDemand(sales);
        setForecastData(data);
        setLoading(false);
      }
    };
    fetchForecast();
  }, [sales]);

  if (loading) {
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
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart
          data={forecastData}
          margin={{
            top: 5, right: 30, left: 20, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#d1d5db" />
          <YAxis stroke="#d1d5db" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              borderColor: '#374151',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="forecast" name="Forecasted Sales" stroke="#3b82f6" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
