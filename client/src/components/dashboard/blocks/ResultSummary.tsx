import React from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  BarChart 
} from "lucide-react";
import BaseBlock from "./BaseBlock";

const ResultSummary: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Formato para moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(value / 100);
  };
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <BaseBlock 
        title="Resumen de Resultados" 
        icon={<Skeleton className="h-5 w-5" />}
        bgColor="bg-green-50"
      >
        <Skeleton className="h-7 w-24 mb-2" />
        <div className="space-y-4 flex-1">
          <Skeleton className="h-20 w-full" />
          <div className="border-t pt-2">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </BaseBlock>
    );
  }

  // Calcular resultados
  const income = data.income || 0;
  const expenses = data.expenses || 0;
  const result = income - expenses;
  
  // Datos de impuestos
  const ivaALiquidar = data.taxes?.ivaALiquidar || data.taxStats?.ivaLiquidar || 0;
  const irpfTotal = data.taxes?.incomeTax || data.taxStats?.irpfPagar || 0;
  
  // Resultado después de impuestos
  const netResult = result - ivaALiquidar - irpfTotal;

  return (
    <BaseBlock 
      title="Resumen de Resultados" 
      icon={<BarChart3 className="h-5 w-5" />}
      bgColor="bg-green-50"
      iconColor="text-green-600"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold">
              {formatCurrency(result)}
            </span>
            <span className="text-sm text-muted-foreground">
              Resultado bruto
            </span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between items-center p-2 border rounded-md">
              <div className="flex items-center">
                <BarChart className="h-4 w-4 text-blue-500 mr-2" />
                <p className="text-sm font-medium">IVA a liquidar</p>
              </div>
              <p className="text-lg font-medium text-blue-500">{formatCurrency(ivaALiquidar)}</p>
            </div>
            
            <div className="flex justify-between items-center p-2 border rounded-md">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-amber-500 mr-2" />
                <p className="text-sm font-medium">IRPF</p>
              </div>
              <p className="text-lg font-medium text-amber-500">{formatCurrency(irpfTotal)}</p>
            </div>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Resultado neto (aprox.)</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(netResult)}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
            Ver informe fiscal
          </button>
        </div>
      </div>
    </BaseBlock>
  );
};

export default ResultSummary;