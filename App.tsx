
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { DashboardCard } from './components/DashboardCard';
import { KpiCard } from './components/KpiCard';
import { SentimentAnalysis } from './components/SentimentAnalysis';
import { ProductRecommendation } from './components/ProductRecommendation';
import { DynamicPricing } from './components/DynamicPricing';
import { DemandForecast } from './components/DemandForecast';
import { TopProducts } from './components/TopProducts';
import { ActivityFeed } from './components/ActivityFeed';
import { mockDataService } from './services/mockDataService';
import type { Review, Product, Sale, UserSession, Activity } from './types';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';

const App: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const updateData = useCallback(() => {
    const {
      reviews: newReviews,
      products: newProducts,
      sales: newSales,
      userSessions: newSessions,
      activity: newActivity
    } = mockDataService.getUpdatedData();

    setReviews(newReviews);
    setProducts(newProducts);
    setSales(newSales);
    setUserSessions(newSessions);
    setActivities(prev => [newActivity, ...prev].slice(0, 10));
  }, []);

  useEffect(() => {
    updateData(); // Initial data load
    const interval = setInterval(updateData, 5000); // Simulate real-time updates every 5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const memoizedKpis = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.price * sale.quantity, 0);
    const totalSales = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const activeUsers = new Set(userSessions.map(s => s.userId)).size;
    const avgOrderValue = totalSales > 0 ? totalRevenue / sales.length : 0;

    return [
      { title: "Total Revenue", value: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, trend: "+5.2%" },
      { title: "Total Sales", value: totalSales.toLocaleString(), icon: ShoppingCart, trend: "+8.1%" },
      { title: "Active Users", value: activeUsers.toLocaleString(), icon: Users, trend: "+2.3%" },
      { title: "Avg. Order Value", value: `$${avgOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, trend: "-1.4%" },
    ];
  }, [sales, userSessions]);

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans">
      <Header />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {memoizedKpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard title="Real-Time Customer Sentiment">
              <SentimentAnalysis reviews={reviews} />
            </DashboardCard>
            <DashboardCard title="Inventory & Demand Forecast">
              <DemandForecast sales={sales} />
            </DashboardCard>
            <DashboardCard title="Predictive Product Recommendation" className="md:col-span-2">
              <ProductRecommendation products={products} userSessions={userSessions} />
            </DashboardCard>
            <DashboardCard title="Dynamic Pricing Optimization" className="md:col-span-2">
              <DynamicPricing products={products} />
            </DashboardCard>
          </div>
          <div className="lg:col-span-1 flex flex-col gap-6">
            <DashboardCard title="Top Selling Products">
              <TopProducts sales={sales} products={products} />
            </DashboardCard>
            <DashboardCard title="Live Activity Feed">
              <ActivityFeed activities={activities} />
            </DashboardCard>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
