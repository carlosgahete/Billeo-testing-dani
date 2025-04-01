import React, { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'gradient';
  children?: ReactNode;
}

export function PageTitle({ 
  title, 
  description, 
  className = '', 
  variant = 'default',
  children
}: PageTitleProps) {
  
  if (variant === 'gradient') {
    return (
      <div className={`w-full rounded-md mb-4 overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 shadow-md">
          <div className="mb-3">
            <h1 className="text-xl md:text-2xl font-bold">
              {title}
            </h1>
            {description && (
              <p className="text-blue-100 text-sm mt-1">
                {description}
              </p>
            )}
          </div>
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }
  
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
      {children && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}