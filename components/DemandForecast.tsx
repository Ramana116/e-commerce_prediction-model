import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { forecastProductDemand } from '../services/geminiService';
import type { Sale, Product, ProductForecastResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { RefreshCw, TrendingUp, Package, AlertTriangle } from 'lucide-react';

interface DemandForecastProps {
  sales: Sale[];
  products: Product[];
}

const STATUS_CONFIG = {
    Healthy: { color: 'text-secondary', icon: <Package className="h-6 w-6" />, borderColor: 'border-secondary' },
    Watch: { color: 'text-yellow-400', icon: <TrendingUp className="h-6 w-6" />, borderColor: 'border-yellow-400' },
    Alert: { color: 'text-red-500', icon: <AlertTriangle className="h-6 w-6" />, borderColor: 'border-red-500' },
};


export const DemandForecast: React.FC<DemandForecastProps> = ({ sales, products }) => {
  const [forecastResult, setForecastResult] = useState<ProductForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
        setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const fetchForecast = useCallback(async () => {
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      setLoading(true);
      const productSales = sales.filter(s => s.productId === product.id);
      const data = await forecastProductDemand(product, productSales);
      setForecastResult(data);
      setLoading(false);
    }
  }, [sales, products, selectedProductId]);

  useEffect(() => {
    if(selectedProductId) {
        fetchForecast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <LoadingSpinner />
          <p className="text-text-secondary mt-2">Forecasting demand for {selectedProduct?.name}...</p>
        </div>
      );
    }
    if (!forecastResult || !selectedProduct) {
      return <div className="flex items-center justify-center h-64 text-text-secondary">Select a product to see its forecast.</div>;
    }

    const { status, recommendation, totalForecast, forecast } = forecastResult;
    const stockPercentage = Math.min(100, (selectedProduct.stock / (totalForecast || 1)) * 100);
    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.Watch;

    return (
        <div className="h-full w-full flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-lg bg-surface flex items-center gap-4 border-l-4 ${statusConfig.borderColor}`}>
                     <div className={`flex-shrink-0 ${statusConfig.color}`}>{statusConfig.icon}</div>
                     <div>
                        <p className={`font-bold text-lg ${statusConfig.color}`}>{status} </p>
                        <p className="text-sm text-text-secondary">{recommendation}</p>
                     </div>
                </div>
                <div>
                     <div className="text-sm text-text-secondary mb-1">Stock vs. 3-Month Forecast</div>
                     <div className="w-full bg-border-color rounded-full h-4 relative overflow-hidden">
                        <div className={`h-4 rounded-full ${stockPercentage > 50 ? 'bg-secondary' : stockPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${stockPercentage}%` }} />
                     </div>
                     <div className="flex justify-between text-xs mt-1 text-text-secondary">
                        <span>Stock: {selectedProduct.stock}</span>
                        <span>Forecasted Demand: {totalForecast}</span>
                     </div>
                </div>
            </div>
            <div className="flex-grow h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecast} margin={{ top: 5, right: 20, left: 0, bottom: 5, }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', }}/>
                        <Legend wrapperStyle={{ fontSize: '14px' }}/>
                        <Line type="monotone" dataKey="forecast" name="Forecasted Sales" stroke="#60a5fa" strokeWidth={2} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="bg-surface border border-border-color rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-primary focus:outline-none flex-grow transition"
            >
                {products.map(product => (
                    <option key={product.id} value={product.id}>
                    {product.name}
                    </option>
                ))}
            </select>
            <button
                onClick={fetchForecast}
                disabled={loading || !selectedProductId}
                className="flex items-center gap-2 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-wait"
            >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing...' : 'Refresh Forecast'}
            </button>
        </div>
        {renderContent()}
    </div>
  );
};