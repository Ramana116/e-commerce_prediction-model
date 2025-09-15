
import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-surface border border-border-color rounded-lg shadow-lg p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-text-primary mb-4">{title}</h2>
      <div className="h-full">
        {children}
      </div>
    </div>
  );
};
