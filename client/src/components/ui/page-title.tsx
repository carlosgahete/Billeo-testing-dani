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
      <div className={`w-full rounded-xl mb-3 overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-4 shadow-md">
          <div className="flex justify-between items-start">
            <div className="mb-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-blue-100 text-xs mt-1">
                  {description}
                </p>
              )}
            </div>
            {children && (
              <div className="flex justify-end">
                {children}
              </div>
            )}
          </div>
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