import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';

interface ResultWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const ResultWidget: React.FC<ResultWidgetProps> = ({ data, size }) => {
  if (!data) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }

  const result = (data.income || 0) - (data.expenses || 0);
  const isPositive = result >= 0;
  
  // Color y clase condicionales basados en el resultado
  const resultColor = isPositive ? 'text-green-500' : 'text-red-500';
  const resultBg = isPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20';
  const resultIcon = isPositive ? '📈' : '📉';

  // Renderizado según tamaño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className={`text-2xl font-bold ${resultColor}`}>
          {formatCurrency(result)}
        </span>
        <span className="text-xs text-muted-foreground">Resultado</span>
      </div>
    );
  }

  const taxes = data.taxStats ? data.taxStats.ivaLiquidar + data.taxStats.irpfPagar : 0;
  const netResult = result - taxes;

  return (
    <div className="flex flex-col h-full">
      <div className={`flex flex-col mb-4 p-3 rounded-lg ${resultBg}`}>
        <div className="flex items-center">
          <span className="text-2xl mr-2">{resultIcon}</span>
          <div>
            <span className={`text-3xl font-bold ${resultColor}`}>{formatCurrency(result)}</span>
            <p className="text-xs text-muted-foreground">Resultado bruto</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 mt-2">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-sm font-medium">IVA a liquidar</p>
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(data.taxStats?.ivaLiquidar || 0)}
          </p>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
          <p className="text-sm font-medium">IRPF a pagar</p>
          <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(data.taxStats?.irpfPagar || 0)}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <p className="text-sm font-medium">Resultado neto (aprox.)</p>
          <p className={`text-lg font-semibold ${netResult >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(netResult)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultWidget;