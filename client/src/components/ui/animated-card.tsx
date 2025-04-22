import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  className?: string;
  children: React.ReactNode;
  isFetching?: boolean;
  delay?: number;
}

/**
 * Animated Card component with Apple-like smooth transitions
 * Shows subtle animations when data is being fetched
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  className, 
  children, 
  isFetching = false,
  delay = 0
}) => {
  return (
    <motion.div
      className={cn(
        "transition-all duration-300 ease-in-out",
        isFetching ? "opacity-80 scale-[0.99] blur-[0.3px]" : "opacity-100 scale-100 blur-0",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.3, 
          delay: delay * 0.1,
          ease: "easeOut" 
        }
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;