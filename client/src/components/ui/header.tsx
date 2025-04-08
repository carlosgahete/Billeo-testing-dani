import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface HeaderAction {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: ButtonProps["variant"];
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBgColor?: string; 
  iconColor?: string;
  actions?: HeaderAction[];
}

/**
 * Componente Header estandarizado con estilo Apple para toda la aplicación
 */
export function Header({
  title,
  subtitle,
  icon,
  iconBgColor = "#F0F7FF",
  iconColor = "#007AFF",
  actions
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 px-4">
      {/* Título e icono */}
      <div className="flex items-center">
        {icon && (
          <div 
            className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 flex-shrink-0`}
            style={{ backgroundColor: iconBgColor }}
          >
            <div style={{ color: iconColor }}>
              {icon}
            </div>
          </div>
        )}
        
        <div>
          <h1 className="text-xl font-semibold text-gray-800 tracking-tight leading-none">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {/* Acciones / Botones */}
      {actions && actions.length > 0 && (
        <div className="flex space-x-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              className={action.variant === "default" ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}
              onClick={action.onClick}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}