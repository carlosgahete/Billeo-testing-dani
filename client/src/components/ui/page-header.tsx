import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = React.memo(function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
});