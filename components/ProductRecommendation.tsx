import React, { useState, useEffect, useCallback } from 'react';
import { getRecommendations } from '../services/geminiService';
import type { Product, UserSession, Sale } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ProductRecommendationProps {
  products: Product[];
  userSessions: UserSession[];
  sales: Sale[];
}

interface DisplayRecommendation {
  product: Product;
  justification: string;
}

export const ProductRecommendation: React.FC<ProductRecommendationProps> = ({ products, userSessions, sales }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<DisplayRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userSessions.length > 0 && !selectedUserId) {
      setSelectedUserId(userSessions[0].userId);
    }
  }, [userSessions, selectedUserId]);
  
  const handleFetchRecommendations = useCallback(async () => {
    if (!selectedUserId) return;

    const userSession = userSessions.find(u => u.userId === selectedUserId);
    if (userSession) {
      setLoading(true);
      setError(null);
      setRecommendations([]);
      const recommendedItems = await getRecommendations(userSession, products, userSessions, sales);
      if (recommendedItems) {
        const recommendedProducts = recommendedItems
          .map(rec => {
              const product = products.find(p => p.id === rec.productId);
              return product ? { product, justification: rec.justification } : null;
          })
          .filter((item): item is DisplayRecommendation => item !== null);
        
        setRecommendations(recommendedProducts);
      } else {
        setError("Could not generate recommendations. Please try again.");
      }
      setLoading(false);
    }
  }, [selectedUserId, userSessions, products, sales]);
  
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <select
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value)
            setRecommendations([])
            setError(null);
          }}
          className="bg-surface border border-border-color rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none flex-grow transition"
        >
          {userSessions.map(session => (
            <option key={session.userId} value={session.userId}>
              User: {session.userId}
            </option>
          ))}
        </select>
        <button
          onClick={handleFetchRecommendations}
          disabled={loading || !selectedUserId}
          className="bg-primary hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform"
        >
          {loading ? 'Generating...' : 'Get Recommendations'}
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-40">
          <LoadingSpinner />
           <p className="text-text-secondary mt-2">Generating recommendations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recommendations.length > 0 ? (
            recommendations.map(({ product, justification }) => (
              <div key={product.id} className="bg-background border border-border-color p-4 rounded-lg flex flex-col justify-between transition-all hover:border-primary/50">
                <div>
                  <h4 className="font-semibold text-primary">{product.name}</h4>
                  <p className="text-sm text-text-secondary">{product.category}</p>
                  <p className="text-lg font-bold mt-2">${product.price.toFixed(2)}</p>
                </div>
                <p className="text-xs text-text-secondary italic mt-3 pt-2 border-t border-border-color">"{justification}"</p>
              </div>
            ))
          ) : (
            <p className="text-text-secondary col-span-3">
              {error ? error : 'Please click "Get Recommendations" to see suggestions.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};