import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';

interface InvoicesWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const InvoicesWidget: React.FC<InvoicesWidgetProps> = ({ data, size }) => {
  if (!data) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }

  // Renderizado según tamaño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-2xl font-bold text-primary">
          {formatCurrency(data.income || 0)}
        </span>
        <span className="text-xs text-muted-foreground">Total facturado</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col mb-4">
        <span className="text-3xl font-bold text-primary">
          {formatCurrency(data.income || 0)}
        </span>
        <span className="text-sm text-muted-foreground">Facturación total</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-amber-500 text-lg mr-2">⏱️</span>
            <div>
              <p className="text-lg font-semibold">{formatCurrency(data.pendingInvoices || 0)}</p>
              <p className="text-xs text-muted-foreground">Pendiente de cobro</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-green-500 text-lg mr-2">✓</span>
            <div>
              <p className="text-lg font-semibold">{data.pendingCount || 0}</p>
              <p className="text-xs text-muted-foreground">Facturas cobradas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicesWidget;