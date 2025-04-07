import * as React from "react";
import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

interface AddItemButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const AddItemButton = React.forwardRef<HTMLButtonElement, AddItemButtonProps>(
  ({ 
    className, 
    variant = "default", 
    size = "md", 
    iconPosition = "left", 
    fullWidth = false, 
    children, 
    ...props 
  }, ref) => {
    const sizeClasses = {
      sm: "text-xs px-2 py-1",
      md: "text-sm px-3 py-1.5",
      lg: "text-base px-4 py-2",
    };

    const variantClasses = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      ghost: "hover:bg-accent hover:text-accent-foreground",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
          sizeClasses[size],
          variantClasses[variant],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {iconPosition === "left" && (
          <PlusCircle className="mr-1.5 h-4 w-4" />
        )}
        {children}
        {iconPosition === "right" && (
          <PlusCircle className="ml-1.5 h-4 w-4" />
        )}
      </button>
    );
  }
);

AddItemButton.displayName = "AddItemButton";