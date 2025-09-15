
import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-surface border border-border-color rounded-xl shadow-lg shadow-black/20 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-primary/10 ${className}`}>
      <h2 className="text-xl font-semibold text-text-primary mb-5 tracking-tight">{title}</h2>
      <div className="h-full flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
};