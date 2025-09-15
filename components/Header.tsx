
import React from 'react';
import { Bot, Bell, UserCircle2 } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-surface/80 backdrop-blur-sm border-b border-border-color p-4 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            AI Analytics
          </h1>
        </div>
        <div className="flex items-center gap-5">
            <button className="text-text-secondary hover:text-text-primary transition-colors relative">
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
            </button>
            <UserCircle2 className="h-8 w-8 text-text-secondary" />
        </div>
      </div>
    </header>
  );
};