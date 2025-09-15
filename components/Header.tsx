
import React from 'react';
import { Bot } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-surface border-b border-border-color p-4 shadow-md">
      <div className="container mx-auto flex items-center">
        <Bot className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
          E-commerce AI Analytics Platform
        </h1>
      </div>
    </header>
  );
};
