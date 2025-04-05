import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface QuotesWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const QuotesWidget: React.FC<QuotesWidgetProps> = ({ data, size }) => {
  if (!data || !data.quotes) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }
  
  const { quotes } = data;
  
  // Renderizado según tamaño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-2xl font-bold text-primary">
          {quotes.total || 0}
        </span>
        <span className="text-xs text-muted-foreground">Presupuestos</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col">
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold">{quotes.total || 0}</span>
          <span className="text-sm text-muted-foreground">Total de presupuestos</span>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between items-center text-sm mb-1.5">
            <span>Tasa de aceptación</span>
            <span className="font-medium">{quotes.acceptanceRate || 0}%</span>
          </div>
          <Progress value={quotes.acceptanceRate || 0} className="h-2" />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Aceptados</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {quotes.accepted || 0}
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Rechazados</p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">
            {quotes.rejected || 0}
          </p>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">
            {quotes.pending || 0}
          </p>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <button className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
          Crear nuevo presupuesto
        </button>
      </div>
    </div>
  );
};

export default QuotesWidget;