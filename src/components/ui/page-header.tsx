import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 min-w-0">
    <div className="min-w-0">
      <h1 className="text-xl sm:text-3xl font-bold text-gradient font-display break-words">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-prose">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {actions}
      </div>
    )}
  </div>
);
