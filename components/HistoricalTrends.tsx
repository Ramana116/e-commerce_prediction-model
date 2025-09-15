import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Sale, UserSession } from '../types';

interface HistoricalTrendsProps {
  sales: Sale[];
  userSessions: UserSession[];
}

type Timeframe = '30d' | '6m' | '1y';
type Metric = 'revenue' | 'sales' | 'users';

const METRIC_CONFIG = {
    revenue: { name: 'Revenue', color: '#60a5fa', formatter: (value: number) => value > 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value.toLocaleString()}`},
    sales: { name: 'Sales', color: '#34d399', formatter: (value: number) => value.toLocaleString() },
    users: { name: 'Users', color: '#fb923c', formatter: (value: number) => value.toLocaleString() },
};

const ChartButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs rounded-md transition-colors text-nowrap ${
            isActive
                ? 'bg-primary text-white font-semibold shadow'
                : 'hover:bg-surface text-text-secondary'
        }`}
    >
        {label}
    </button>
);

export const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({ sales, userSessions }) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('30d');
    const [metric, setMetric] = useState<Metric>('revenue');

    const chartData = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let grouping: 'day' | 'week' | 'month';

        switch (timeframe) {
            case '6m':
                startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
                grouping = 'week';
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                grouping = 'month';
                break;
            case '30d':
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                grouping = 'day';
                break;
        }

        const filteredSales = sales.filter(s => s.timestamp >= startDate);
        const filteredSessions = userSessions.filter(s => s.timestamp >= startDate);

        const aggregatedData: { [key: string]: { revenue: number; sales: number; users: Set<string> } } = {};

        const getGroupKey = (date: Date): string => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            if (grouping === 'day') {
                return d.toISOString().split('T')[0];
            }
            if (grouping === 'week') {
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                return new Date(d.setDate(diff)).toISOString().split('T')[0];
            }
            return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        };

        filteredSales.forEach(sale => {
            const key = getGroupKey(sale.timestamp);
            if (!aggregatedData[key]) {
                aggregatedData[key] = { revenue: 0, sales: 0, users: new Set() };
            }
            aggregatedData[key].revenue += sale.price * sale.quantity;
            aggregatedData[key].sales += sale.quantity;
        });

        filteredSessions.forEach(session => {
            const key = getGroupKey(session.timestamp);
            if (!aggregatedData[key]) {
                aggregatedData[key] = { revenue: 0, sales: 0, users: new Set() };
            }
            aggregatedData[key].users.add(session.userId);
        });
        
        let formatOptions: Intl.DateTimeFormatOptions;
        if (grouping === 'month') {
             formatOptions = { year: '2-digit', month: 'short' };
        } else {
             formatOptions = { month: 'short', day: 'numeric' };
        }

        return Object.keys(aggregatedData)
            .map(key => ({
                date: new Date(key),
                value: metric === 'users' ? aggregatedData[key].users.size : (aggregatedData[key][metric] || 0),
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(item => ({
                value: item.value,
                date: item.date.toLocaleDateString('en-US', formatOptions)
            }));
            
    }, [sales, userSessions, timeframe, metric]);
    
    const currentMetricConfig = METRIC_CONFIG[metric];

    return (
        <div className="h-[400px] w-full flex flex-col">
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-2 p-1 bg-background rounded-lg border border-border-color">
                    {Object.keys(METRIC_CONFIG).map((m) => (
                        <ChartButton
                            key={m}
                            label={METRIC_CONFIG[m as Metric].name}
                            isActive={metric === m}
                            onClick={() => setMetric(m as Metric)}
                        />
                    ))}
                </div>
                 <div className="flex items-center gap-2 p-1 bg-background rounded-lg border border-border-color">
                    <ChartButton label="30 Days" isActive={timeframe === '30d'} onClick={() => setTimeframe('30d')} />
                    <ChartButton label="6 Months" isActive={timeframe === '6m'} onClick={() => setTimeframe('6m')} />
                    <ChartButton label="1 Year" isActive={timeframe === '1y'} onClick={() => setTimeframe('1y')} />
                </div>
            </div>
            <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={currentMetricConfig.color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={currentMetricConfig.color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} dy={5} />
                        <YAxis stroke="#94a3b8" tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={currentMetricConfig.formatter} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                borderColor: '#334155',
                                borderRadius: '0.5rem',
                                color: '#f1f5f9'
                            }}
                            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                            formatter={(value: number) => [currentMetricConfig.formatter(value), currentMetricConfig.name]}
                        />
                        <Area type="monotone" dataKey="value" name={currentMetricConfig.name} stroke={currentMetricConfig.color} strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};