import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = React.memo(function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={`mb-3 ${className}`}>
      <h1 className="text-2xl font-bold mb-0 leading-tight">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5 leading-tight">
          {description}
        </p>
      )}
      {children}
    </div>
  );
});