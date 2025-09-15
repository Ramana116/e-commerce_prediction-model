
import React from 'react';
import type { Activity } from '../types';
import { ShoppingCart, Star, Eye } from 'lucide-react';

interface ActivityFeedProps {
    activities: Activity[];
}

const ICONS: { [key in Activity['type']]: React.ReactNode } = {
    sale: <ShoppingCart className="h-5 w-5 text-secondary" />,
    review: <Star className="h-5 w-5 text-tertiary" />,
    view: <Eye className="h-5 w-5 text-primary" />,
};

const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
    return (
        <div className="space-y-4 h-[400px] overflow-y-auto pr-2">
            {activities.length > 0 ? activities.map(activity => (
                <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">{ICONS[activity.type]}</div>
                    <div>
                        <p className="text-sm text-text-primary">{activity.description}</p>
                        <p className="text-xs text-text-secondary">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                </div>
            )) : (
                <p className="text-text-secondary text-center py-8">No recent activity.</p>
            )}
        </div>
    );
};
