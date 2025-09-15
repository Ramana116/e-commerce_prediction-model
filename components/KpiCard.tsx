
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
  const trendColor = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-surface border border-border-color rounded-xl p-5 shadow-lg shadow-black/20 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="text-3xl font-bold text-text-primary mt-2">{value}</p>
        <p className={`text-sm mt-2 font-semibold ${trendColor}`}>{trend}</p>
      </div>
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-3 rounded-full">
        <Icon className="h-6 w-6 text-primary" />
      </div>
    </div>
  );
};