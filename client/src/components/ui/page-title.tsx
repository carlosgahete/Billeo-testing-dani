import React from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageTitle({ title, description, className = '' }: PageTitleProps) {
  return (
    <div className={`md:ml-16 ${className}`}>
      <h1 className="text-2xl font-bold text-neutral-800">
        {title}
      </h1>
      {description && (
        <p className="text-neutral-500">
          {description}
        </p>
      )}
    </div>
  );
}