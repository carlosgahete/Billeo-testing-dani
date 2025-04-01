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
      <div className={`w-full rounded-md mb-3 overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-3 shadow-md">
          <div className="mb-1">
            <h1 className="text-lg md:text-xl font-bold">
              {title}
            </h1>
            {description && (
              <p className="text-blue-100 text-xs mt-0.5">
                {description}
              </p>
            )}
          </div>
          {children && (
            <div className="mt-1.5">
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