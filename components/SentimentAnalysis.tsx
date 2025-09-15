
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { analyzeSentiment } from '../services/geminiService';
import type { Review, SentimentData } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface SentimentAnalysisProps {
  reviews: Review[];
}

const COLORS = {
  positive: '#10b981', // green-500
  neutral: '#f59e0b',  // amber-500
  negative: '#ef4444', // red-500
};

export const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ reviews }) => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSentiment = async () => {
      if (reviews.length > 0) {
        setLoading(true);
        const data = await analyzeSentiment(reviews.slice(0, 10)); // Analyze latest 10 reviews
        setSentimentData(data);
        setLoading(false);
      }
    };
    fetchSentiment();
  }, [reviews]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LoadingSpinner />
        <p className="text-text-secondary mt-2">Analyzing sentiment...</p>
      </div>
    );
  }

  if (!sentimentData) {
    return <div className="flex items-center justify-center h-64 text-text-secondary">Could not fetch sentiment data.</div>;
  }

  const chartData = [
    { name: 'Positive', value: sentimentData.positive },
    { name: 'Neutral', value: sentimentData.neutral },
    { name: 'Negative', value: sentimentData.negative },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-border-color">
        <h3 className="font-semibold text-text-primary mb-2">AI Summary:</h3>
        <p className="text-sm text-text-secondary">{sentimentData.summary}</p>
      </div>
    </div>
  );
};
