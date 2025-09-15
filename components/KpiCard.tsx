
import React from 'react';
import type { LucideProps } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
  trend: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, trend }) => {
  const isPositive = trend.startsWith('+');
  const trendColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-surface border border-border-color rounded-lg p-5 shadow-lg flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
        <p className={`text-xs mt-2 ${trendColor}`}>{trend}</p>
      </div>
      <div className="bg-blue-900/50 p-3 rounded-full">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  );
};
