import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { analyzeSentiment } from '../services/geminiService';
import type { Product, Review, SentimentData, AnalyzedReview } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ThumbsUp, ThumbsDown, Meh, RefreshCw, Search } from 'lucide-react';

interface SentimentAnalysisProps {
  reviews: Review[];
  products: Product[];
}

const COLORS = {
  positive: '#34d399', 
  neutral: '#f59e0b',
  negative: '#ef4444',
};

const SENTIMENT_ICONS: { [key in 'positive' | 'neutral' | 'negative']: React.ReactNode } = {
  positive: <ThumbsUp className="h-5 w-5 text-secondary" />,
  neutral: <Meh className="h-5 w-5 text-amber-500" />,
  negative: <ThumbsDown className="h-5 w-5 text-red-500" />,
};

type SentimentFilter = 'positive' | 'neutral' | 'negative' | null;

export const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ reviews, products }) => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>(null);
  const [keywordFilter, setKeywordFilter] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');

  const fetchSentiment = useCallback(async () => {
    const product = products.find(p => p.id === selectedProductId);
    const reviewsToAnalyze = selectedProductId === 'all'
        ? reviews
        : reviews.filter(r => r.productId === selectedProductId);

    if (reviewsToAnalyze.length > 0) {
        setLoading(true);
        setSentimentData(null); // Clear previous data
        const data = await analyzeSentiment(reviewsToAnalyze.slice(0, 20), product);
        setSentimentData(data);
        setLoading(false);
    } else {
        setSentimentData(null);
        setLoading(false);
    }
  }, [reviews, products, selectedProductId]);

  useEffect(() => {
    fetchSentiment();
  }, [fetchSentiment]);

  const handlePieClick = (data: any) => {
    const sentiment = data.name.toLowerCase() as SentimentFilter;
    setSentimentFilter(prevFilter => (prevFilter === sentiment ? null : sentiment));
  };
  
  const filteredReviews = useMemo(() => {
    let reviews = sentimentData?.analysis || [];
    
    if (sentimentFilter) {
      reviews = reviews.filter(review => review.sentiment === sentimentFilter);
    }
    
    if (keywordFilter.trim() !== '') {
      reviews = reviews.filter(review => 
        review.reviewText.toLowerCase().includes(keywordFilter.toLowerCase())
      );
    }

    return reviews;
  }, [sentimentFilter, keywordFilter, sentimentData]);
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-48 bg-slate-700/50 rounded-lg"></div>
                <div className="h-48 bg-slate-700/50 rounded-lg"></div>
            </div>
            <div className="h-24 bg-slate-700/50 rounded-lg"></div>
        </div>
      );
    }

    if (!sentimentData) {
      return <div className="flex items-center justify-center h-full min-h-[300px] text-text-secondary">No reviews found for the selected product.</div>;
    }

    const chartData = [
        { name: 'Positive', value: sentimentData.positive },
        { name: 'Neutral', value: sentimentData.neutral },
        { name: 'Negative', value: sentimentData.negative },
    ];

    return (
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
        {/* Left Column */}
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-40 cursor-pointer">
                    <ResponsiveContainer>
                        <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" labelLine={false} innerRadius={30} outerRadius={60} paddingAngle={5} dataKey="value" nameKey="name" onClick={handlePieClick}>
                            {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} className={sentimentFilter && sentimentFilter !== entry.name.toLowerCase() ? 'opacity-50' : 'opacity-100'} style={{ transition: 'opacity 0.2s' }}/>
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem' }}/>
                        <Legend wrapperStyle={{ fontSize: '12px' }} onClick={handlePieClick} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="h-40">
                    <h4 className="font-semibold text-text-primary text-sm mb-1 text-center">14-Day Sentiment Trend</h4>
                    <ResponsiveContainer>
                        <AreaChart data={sentimentData.sentimentTrend} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.positive} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={COLORS.positive} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#94a3b8' }}/>
                            <YAxis stroke="#94a3b8" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value}%`}/>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}/>
                            <Area type="monotone" dataKey="positivePercentage" name="Positive %" stroke={COLORS.positive} fill="url(#colorPositive)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="pt-4 border-t border-border-color">
                <h3 className="font-semibold text-text-primary">AI Insights</h3>
                <p className="text-sm text-text-secondary mt-2 mb-3 italic">"{sentimentData.summary}"</p>
                <h4 className="font-semibold text-text-primary text-sm mb-2">Key Topics Analysis:</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h5 className="flex items-center text-sm font-semibold text-green-400"><ThumbsUp size={14} className="mr-2" /> Praised Features</h5>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                            {sentimentData.keyTopics.positive.slice(0, 5).map(topic => <li key={topic} className="truncate">- {topic}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h5 className="flex items-center text-sm font-semibold text-red-400"><ThumbsDown size={14} className="mr-2" /> Areas for Improvement</h5>
                        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                           {sentimentData.keyTopics.negative.slice(0, 5).map(topic => <li key={topic} className="truncate">- {topic}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col min-h-0">
            <h3 className="font-semibold text-text-primary mb-2 flex-shrink-0">
                Analyzed Reviews {sentimentFilter && <span className="capitalize text-text-secondary">({sentimentFilter})</span>}
            </h3>
            <div className="relative mb-2 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <input
                    type="text"
                    placeholder="Filter reviews by keyword..."
                    value={keywordFilter}
                    onChange={(e) => setKeywordFilter(e.target.value)}
                    className="w-full bg-background border border-border-color rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition"
                />
            </div>
            <div className="flex-grow overflow-y-auto pr-2 border border-border-color rounded-lg p-3 bg-background">
                {filteredReviews.length > 0 ? filteredReviews.map((review, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 border-b border-border-color last:border-b-0">
                        <div className="flex-shrink-0 mt-1">{SENTIMENT_ICONS[review.sentiment]}</div>
                        <p className="text-sm text-text-secondary italic">"{review.reviewText}"</p>
                    </div>
                )) : <p className="text-center text-text-secondary py-4">No reviews match the current filters.</p>}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="bg-surface border border-border-color rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none flex-grow transition"
                aria-label="Select product for sentiment analysis"
            >
                <option value="all">All Products</option>
                {products.map(product => (
                    <option key={product.id} value={product.id}>
                        {product.name}
                    </option>
                ))}
            </select>
            <button
                onClick={fetchSentiment}
                disabled={loading}
                className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh'}
            </button>
        </div>
        {renderContent()}
    </div>
  );
};