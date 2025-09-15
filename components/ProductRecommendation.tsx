
import React, { useState, useEffect, useCallback } from 'react';
import { getRecommendations } from '../services/geminiService';
import type { Product, UserSession } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface ProductRecommendationProps {
  products: Product[];
  userSessions: UserSession[];
}

export const ProductRecommendation: React.FC<ProductRecommendationProps> = ({ products, userSessions }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userSessions.length > 0) {
      setSelectedUserId(userSessions[0].userId);
    }
  }, [userSessions]);
  
  const handleFetchRecommendations = useCallback(async () => {
    if (!selectedUserId) return;

    const userSession = userSessions.find(u => u.userId === selectedUserId);
    if (userSession) {
      setLoading(true);
      setRecommendations([]);
      const recommendedIds = await getRecommendations(userSession, products);
      if (recommendedIds) {
        const recommendedProducts = products.filter(p => recommendedIds.includes(p.id));
        setRecommendations(recommendedProducts);
      }
      setLoading(false);
    }
  }, [selectedUserId, userSessions, products]);
  
  useEffect(() => {
    // Automatically fetch recommendations when user changes
    if (selectedUserId) {
        handleFetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="bg-background border border-border-color rounded-md px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
        >
          {userSessions.map(session => (
            <option key={session.userId} value={session.userId}>
              User: {session.userId}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-24">
          <LoadingSpinner />
           <p className="text-text-secondary mt-2">Generating recommendations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {recommendations.length > 0 ? (
            recommendations.map(product => (
              <div key={product.id} className="bg-background border border-border-color p-4 rounded-lg">
                <h4 className="font-semibold text-primary">{product.name}</h4>
                <p className="text-sm text-text-secondary">{product.category}</p>
                <p className="text-lg font-bold mt-2">${product.price.toFixed(2)}</p>
              </div>
            ))
          ) : (
            <p className="text-text-secondary col-span-3">No recommendations to display. Select a user and generate.</p>
          )}
        </div>
      )}
    </div>
  );
};
