
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { analyzeSentiment } from '../services/geminiService';
import type { Review, SentimentData, AnalyzedReview } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ThumbsUp, ThumbsDown, Meh, RefreshCw } from 'lucide-react';

interface SentimentAnalysisProps {
  reviews: Review[];
}

const COLORS = {
  positive: '#10b981', // green-500
  neutral: '#f59e0b',  // amber-500
  negative: '#ef4444', // red-500
};

const SENTIMENT_ICONS = {
  positive: <ThumbsUp className="h-5 w-5 text-green-500" />,
  neutral: <Meh className="h-5 w-5 text-amber-500" />,
  negative: <ThumbsDown className="h-5 w-5 text-red-500" />,
};

type SentimentFilter = 'positive' | 'neutral' | 'negative' | null;

export const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ reviews }) => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SentimentFilter>(null);

  const fetchSentiment = useCallback(async () => {
    if (reviews.length > 0) {
      setLoading(true);
      const data = await analyzeSentiment(reviews.slice(0, 15)); // Analyze latest 15 reviews
      setSentimentData(data);
      setLoading(false);
    }
  }, [reviews]);

  useEffect(() => {
    fetchSentiment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch only on initial component mount

  const handlePieClick = (data: any) => {
    const sentiment = data.name.toLowerCase() as SentimentFilter;
    setFilter(prevFilter => (prevFilter === sentiment ? null : sentiment));
  };
  
  const filteredReviews = useMemo(() => {
    if (!filter || !sentimentData) {
      return sentimentData?.analysis || [];
    }
    return sentimentData.analysis.filter(
      (review: AnalyzedReview) => review.sentiment === filter
    );
  }, [filter, sentimentData]);


  if (loading && !sentimentData) { // Only show full-screen loader on initial load
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <LoadingSpinner />
        <p className="text-text-secondary mt-2">Analyzing sentiment...</p>
      </div>
    );
  }

  if (!sentimentData) {
    return <div className="flex items-center justify-center h-[400px] text-text-secondary">Could not fetch sentiment data.</div>;
  }

  const chartData = [
    { name: 'Positive', value: sentimentData.positive },
    { name: 'Neutral', value: sentimentData.neutral },
    { name: 'Negative', value: sentimentData.negative },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="h-48 w-full cursor-pointer">
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
              onClick={handlePieClick}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
                  className={filter && filter !== entry.name.toLowerCase() ? 'opacity-50' : 'opacity-100'}
                  style={{ transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.5rem',
              }}
            />
            <Legend onClick={handlePieClick} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-border-color flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-text-primary">AI Summary:</h3>
            <button
                onClick={fetchSentiment}
                disabled={loading}
                className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh'}
            </button>
        </div>
        <p className="text-sm text-text-secondary mb-4 italic">"{sentimentData.summary}"</p>
        
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-text-primary">
                {filter ? `Filtered Reviews (${filter})` : 'Recent Reviews'}
            </h4>
            {filter && (
                <button 
                    onClick={() => setFilter(null)}
                    className="text-xs text-primary hover:underline"
                >
                    Clear Filter
                </button>
            )}
        </div>

        <div className="space-y-3 pr-2 overflow-y-auto flex-grow h-40 sm:h-48">
            {filteredReviews.length > 0 ? filteredReviews.map((review, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                    <div className="flex-shrink-0 mt-1">{SENTIMENT_ICONS[review.sentiment]}</div>
                    <p className="text-text-secondary">{review.reviewText}</p>
                </div>
            )) : (
              <div className="text-center text-text-secondary py-4">No reviews match the filter.</div>
            )}
        </div>

      </div>
    </div>
  );
};
