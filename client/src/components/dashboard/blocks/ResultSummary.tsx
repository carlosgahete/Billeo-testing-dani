import React from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  BarChart,
  PieChart,
  ArrowRight,
  FileText
} from "lucide-react";
import BaseBlock from "./BaseBlock";
import { WidgetSizeType } from "@/config/widgetSizes";

const ResultSummary: React.FC<DashboardBlockProps> = ({ data, isLoading, sizeType = 'small' }) => {
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

  // Widget pequeño (solo muestra el resultado total con mínima información)
  if (sizeType === 'small') {
    return (
      <BaseBlock 
        title="Resumen de Resultados" 
        icon={<BarChart3 className="h-5 w-5" />}
        bgColor="bg-green-50"
        iconColor="text-green-600"
      >
        <div className="flex-1 flex flex-col justify-between h-full">
          <div className="flex-1 flex flex-col items-center justify-center py-3">
            <span className="text-3xl font-bold text-green-600">
              {formatCurrency(result)}
            </span>
            <span className="text-sm text-gray-500 mt-1">
              Resultado bruto
            </span>
            
            <div className="mt-4 border-t w-full pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-gray-500">Neto (aprox.)</span>
                <span className="text-sm font-semibold">{formatCurrency(netResult)}</span>
              </div>
            </div>
          </div>
          
          <button className="text-blue-600 text-xs w-full border border-blue-600 rounded-md py-1 hover:bg-blue-50 transition">
            Ver detalles
          </button>
        </div>
      </BaseBlock>
    );
  }
  
  // Widget mediano (muestra resultado total y detalle de impuestos)
  if (sizeType === 'medium') {
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
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col p-2 border rounded-md">
                <div className="flex items-center mb-1">
                  <BarChart className="h-3 w-3 text-blue-500 mr-1" />
                  <p className="text-xs font-medium">IVA a liquidar</p>
                </div>
                <p className="text-base font-medium text-blue-500">{formatCurrency(ivaALiquidar)}</p>
              </div>
              
              <div className="flex flex-col p-2 border rounded-md">
                <div className="flex items-center mb-1">
                  <TrendingUp className="h-3 w-3 text-amber-500 mr-1" />
                  <p className="text-xs font-medium">IRPF</p>
                </div>
                <p className="text-base font-medium text-amber-500">{formatCurrency(irpfTotal)}</p>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Resultado neto (aprox.)</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(netResult)}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-3">
            <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
              Ver informe fiscal
            </button>
          </div>
        </div>
      </BaseBlock>
    );
  }
  
  // Widget grande (muestra resultado total, detalle de impuestos, y datos adicionales)
  return (
    <BaseBlock 
      title="Resumen de Resultados" 
      icon={<BarChart3 className="h-5 w-5" />}
      bgColor="bg-green-50"
      iconColor="text-green-600"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-600">Resultado Bruto</h3>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(result)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <BarChart className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border rounded-lg p-3 bg-blue-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Ingresos</p>
                  <p className="text-lg font-semibold">{formatCurrency(income)}</p>
                </div>
                <div className="bg-blue-100 p-1.5 rounded-full">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 bg-red-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Gastos</p>
                  <p className="text-lg font-semibold">-{formatCurrency(expenses)}</p>
                </div>
                <div className="bg-red-100 p-1.5 rounded-full">
                  <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-3 bg-amber-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Impuestos</p>
                  <p className="text-lg font-semibold">-{formatCurrency(ivaALiquidar + irpfTotal)}</p>
                </div>
                <div className="bg-amber-100 p-1.5 rounded-full">
                  <FileText className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex justify-between items-center p-3 border rounded-md">
              <div className="flex items-center">
                <BarChart className="h-5 w-5 text-blue-500 mr-2" />
                <div>
                  <p className="text-sm font-medium">IVA a liquidar</p>
                  <p className="text-xs text-gray-500">Próximo trimestre</p>
                </div>
              </div>
              <p className="text-lg font-medium text-blue-500">{formatCurrency(ivaALiquidar)}</p>
            </div>
            
            <div className="flex justify-between items-center p-3 border rounded-md">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-amber-500 mr-2" />
                <div>
                  <p className="text-sm font-medium">IRPF</p>
                  <p className="text-xs text-gray-500">Estimado anual</p>
                </div>
              </div>
              <p className="text-lg font-medium text-amber-500">{formatCurrency(irpfTotal)}</p>
            </div>
          </div>
          
          <div className="border-t border-b py-3 my-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Resultado neto (aprox.)</p>
                <p className="text-xs text-gray-500">Después de impuestos</p>
              </div>
              <p className="text-2xl font-semibold text-green-600">{formatCurrency(netResult)}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <button className="text-blue-600 text-sm border border-blue-600 rounded-md py-2 hover:bg-blue-50 transition flex items-center justify-center">
            <PieChart className="h-4 w-4 mr-1" />
            Ver gráficos
          </button>
          <button className="text-blue-600 text-sm border border-blue-600 rounded-md py-2 hover:bg-blue-50 transition flex items-center justify-center">
            <FileText className="h-4 w-4 mr-1" />
            Informe fiscal
          </button>
        </div>
      </div>
    </BaseBlock>
  );
};

export default ResultSummary;