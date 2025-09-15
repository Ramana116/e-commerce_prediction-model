
import React, { useState, useEffect, useCallback } from 'react';
import { getOptimalPrice } from '../services/geminiService';
import type { Product } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface DynamicPricingProps {
  products: Product[];
}

type DemandSignal = 'High' | 'Medium' | 'Low';

export const DynamicPricing: React.FC<DynamicPricingProps> = ({ products }) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [demandSignal, setDemandSignal] = useState<DemandSignal>('Medium');
  const [result, setResult] = useState<{ optimalPrice: number; justification: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const handleFetchPrice = useCallback(async () => {
    if (!selectedProductId) return;

    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      setLoading(true);
      setResult(null);
      // Simulate competitor prices
      const competitorPrices = [product.price * 0.95, product.price * 1.02, product.price * 1.1];
      const data = await getOptimalPrice(product, competitorPrices, demandSignal);
      setResult(data);
      setLoading(false);
    }
  }, [selectedProductId, products, demandSignal]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="bg-background border border-border-color rounded-md px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none flex-grow"
        >
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <select
          value={demandSignal}
          onChange={(e) => setDemandSignal(e.target.value as DemandSignal)}
          className="bg-background border border-border-color rounded-md px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none"
        >
          <option value="High">High Demand</option>
          <option value="Medium">Medium Demand</option>
          <option value="Low">Low Demand</option>
        </select>
        <button
          onClick={handleFetchPrice}
          disabled={loading}
          className="bg-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Optimizing...' : 'Optimize Price'}
        </button>
      </div>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-24">
          <LoadingSpinner />
           <p className="text-text-secondary mt-2">Calculating optimal price...</p>
        </div>
      ) : (
        result && selectedProduct && (
          <div className="bg-background border border-border-color p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-2">
                <div className="text-left">
                    <h4 className="font-semibold text-text-primary">AI Pricing Suggestion for {selectedProduct.name}</h4>
                    <p className="text-sm text-text-secondary">Current Price: ${selectedProduct.price.toFixed(2)}</p>
                </div>
                 <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold text-secondary">${result.optimalPrice.toFixed(2)}</p>
                    <p className="text-sm text-secondary">Optimal Price</p>
                </div>
            </div>
            <p className="mt-4 text-text-secondary italic">"{result.justification}"</p>
          </div>
        )
      )}
    </div>
  );
};
