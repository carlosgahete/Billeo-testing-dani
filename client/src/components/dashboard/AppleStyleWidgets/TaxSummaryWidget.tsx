import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface TaxSummaryWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const TaxSummaryWidget: React.FC<TaxSummaryWidgetProps> = ({ data, size }) => {
  if (!data || !data.taxStats) {
    return <div className="flex items-center justify-center h-full">Cargando datos fiscales...</div>;
  }
  
  const { taxStats } = data;

  // Renderizado para tamaño pequeño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex justify-between w-full">
          <div className="text-center">
            <span className="text-lg font-semibold text-blue-500">{formatCurrency(taxStats.ivaLiquidar)}</span>
            <p className="text-xs text-muted-foreground">IVA</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-semibold text-amber-500">{formatCurrency(taxStats.irpfPagar)}</span>
            <p className="text-xs text-muted-foreground">IRPF</p>
          </div>
        </div>
      </div>
    );
  }

  // Para tamaños mediano y grande
  const quarterlyIVA = Math.round(taxStats.ivaLiquidar / 4);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  // Fechas de presentación para cada trimestre
  const quarterlyDates = [
    { quarter: 1, label: "1T (Ene-Mar)", date: "20 Abr" },
    { quarter: 2, label: "2T (Abr-Jun)", date: "20 Jul" },
    { quarter: 3, label: "3T (Jul-Sep)", date: "20 Oct" },
    { quarter: 4, label: "4T (Oct-Dic)", date: "30 Ene" },
  ];

  // Calcular días restantes hasta el próximo vencimiento
  const getNextDeadline = () => {
    const year = currentDate.getFullYear();
    let deadlineDate;
    
    if (currentQuarter === 1) {
      deadlineDate = new Date(year, 3, 20); // 20 de abril
    } else if (currentQuarter === 2) {
      deadlineDate = new Date(year, 6, 20); // 20 de julio
    } else if (currentQuarter === 3) {
      deadlineDate = new Date(year, 9, 20); // 20 de octubre
    } else {
      deadlineDate = new Date(year + 1, 0, 30); // 30 de enero del año siguiente
    }
    
    const daysRemaining = Math.ceil((deadlineDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 ? daysRemaining : 0;
  };
  
  const daysToDeadline = getNextDeadline();

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">IVA a liquidar</h4>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(taxStats.ivaLiquidar)}</span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Trimestral</span>
              <p className="text-sm font-semibold">{formatCurrency(quarterlyIVA)}</p>
            </div>
          </div>
          
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>IVA Repercutido</span>
              <span className="font-medium">{formatCurrency(taxStats.ivaRepercutido)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>IVA Soportado</span>
              <span className="font-medium">{formatCurrency(taxStats.ivaSoportado)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">IRPF estimado</h4>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(taxStats.irpfPagar)}</span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Retenido</span>
              <p className="text-sm font-semibold">{formatCurrency(taxStats.irpfRetenido)}</p>
            </div>
          </div>
          
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>IRPF Total</span>
              <span className="font-medium">{formatCurrency(taxStats.irpfTotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Pagos a cuenta</span>
              <span className="font-medium">0,00 €</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Calendario fiscal</h4>
        
        <div className={`rounded-lg border p-3 mb-3 ${
          daysToDeadline <= 7 ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 
          'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Próximo vencimiento: {quarterlyDates[currentQuarter - 1]?.date}</p>
              <p className="text-xs text-muted-foreground">
                {quarterlyDates[currentQuarter - 1]?.label} - Modelo 303 (IVA)
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${daysToDeadline <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                {daysToDeadline} días
              </p>
              <p className="text-xs text-muted-foreground">restantes</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {quarterlyDates.map((quarter, index) => (
            <div 
              key={index}
              className={`text-center p-2 rounded-lg text-xs ${
                currentQuarter === quarter.quarter 
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-gray-100 dark:bg-gray-700/50'
              }`}
            >
              <p className="font-medium">{quarter.label}</p>
              <p className="text-muted-foreground">{quarter.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaxSummaryWidget;