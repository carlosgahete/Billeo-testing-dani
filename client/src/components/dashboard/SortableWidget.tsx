import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetSize } from '@/types/dashboard';
import { ArrowsMove, Maximize, Minimize, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { WIDGET_SIZES } from './AppleStyleDashboard';

interface SortableWidgetProps {
  id: string;
  children: ReactNode;
  isCustomizing: boolean;
  onSizeChange: (size: WidgetSize) => void;
  onRemove: () => void;
  size: WidgetSize;
  className?: string;
}

export const SortableWidget = ({
  id,
  children,
  isCustomizing,
  onSizeChange,
  onRemove,
  size,
  className = '',
}: SortableWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${className}`}
    >
      {isCustomizing && (
        <div className="absolute -top-3 -right-3 z-10 flex space-x-1">
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-full w-7 h-7 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                {size === 'large' ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-1">
                <p className="text-xs font-medium mb-2">Cambiar tamaño</p>
                {Object.entries(WIDGET_SIZES).map(([sizeKey, config]) => (
                  <button
                    key={sizeKey}
                    onClick={() => onSizeChange(sizeKey as WidgetSize)}
                    className={`w-full text-left px-2 py-1.5 text-sm rounded ${
                      size === sizeKey
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {sizeKey === 'small' && 'Pequeño'}
                    {sizeKey === 'medium' && 'Mediano'}
                    {sizeKey === 'large' && 'Grande'}
                    {sizeKey === 'full-width' && 'Ancho completo'}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <button
            onClick={onRemove}
            className="rounded-full w-7 h-7 bg-white dark:bg-gray-700 text-red-500 shadow flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <div
            {...attributes}
            {...listeners}
            className="rounded-full cursor-grab active:cursor-grabbing w-7 h-7 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowsMove className="w-4 h-4" />
          </div>
        </div>
      )}
      
      <motion.div
        layout
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};