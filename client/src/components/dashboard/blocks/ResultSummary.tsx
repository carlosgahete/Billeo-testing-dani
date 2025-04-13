import React from "react";
import { BarChart3, BarChart, TrendingUp, ExternalLink } from "lucide-react";
import BaseBlock from "./BaseBlock";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useDashboardData } from "@/hooks/useDashboardData";

// Interfaz para las propiedades del componente 
interface ResultSummaryProps {
  data?: {
    income: number;
    expenses: number;
    baseImponible?: number;
    taxes?: {
      ivaALiquidar?: number;
      incomeTax?: number;
    };
    taxStats?: {
      ivaRepercutido?: number;
      ivaSoportado?: number;
      ivaLiquidar?: number;
      irpfRetenido?: number;
      irpfTotal?: number;
      irpfPagar?: number;
    };
  };
  isLoading?: boolean;
  sizeType?: string;
}

const ResultSummary: React.FC<ResultSummaryProps> = ({ data: propData, isLoading: propIsLoading, sizeType = "medium" }) => {
  // Obtener datos del contexto si no se proporcionan como props
  const dashboardDataResult = useDashboardData();
  const contextData = dashboardDataResult.data;
  const contextIsLoading = dashboardDataResult.isLoading;
  
  // Usar datos de props si están disponibles, de lo contrario usar datos del contexto
  const data = propData || contextData || { income: 0, expenses: 0 };
  const isLoading = propIsLoading !== undefined ? propIsLoading : contextIsLoading;
  
  // Calcular resultados
  const income = data.income || 0;
  const expenses = data.expenses || 0;
  const result = income - expenses;
  
  // Datos de impuestos
  const baseImponibleIngresos = data.baseImponible || Math.round(income / 1.21);
  const baseImponibleGastos = Math.round(expenses / 1.21);
  const resultadoBaseImponible = baseImponibleIngresos - baseImponibleGastos;
  
  const ivaRepercutido = data.taxStats?.ivaRepercutido || 0;
  const ivaSoportado = data.taxStats?.ivaSoportado || 0;
  const ivaALiquidar = data.taxes?.ivaALiquidar || data.taxStats?.ivaLiquidar || 0;
  const irpfRetenido = data.taxStats?.irpfRetenido || 0;
  const irpfTotal = data.taxes?.incomeTax || data.taxStats?.irpfTotal || 0;
  const irpfPagar = data.taxStats?.irpfPagar || 0;
  
  // Resultado después de impuestos
  const netResult = result - ivaALiquidar - irpfPagar;
  
  // Porcentajes para las barras de progreso
  const expensePercentage = income > 0 ? (expenses / income) * 100 : 0;
  const ivaPercentage = income > 0 ? (ivaALiquidar / income) * 100 : 0;
  const irpfPercentage = income > 0 ? (irpfPagar / income) * 100 : 0;

  // Renderizado base para todos los tamaños
  return (
    <BaseBlock
      title="Resumen de Resultados"
      icon={<BarChart3 className="h-5 w-5" />}
      bgColor="bg-green-50"
      iconColor="text-green-600"
    >
      <div className="flex-1 flex flex-col justify-between h-full">
        <div className="space-y-3 md:space-y-4">
          {/* Cabecera con título y resultado principal - versión móvil más compacta */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold">
              {formatCurrency(result)}
            </span>
            {/* Enlace compacto en móvil */}
            <span className="md:text-sm text-xs md:block flex items-center text-muted-foreground">
              <span>Resultado con IVA</span>
              <a 
                href="/reports" 
                className="md:hidden text-blue-600 text-xs ml-2 hover:text-blue-800"
              >
                Ver
              </a>
            </span>
          </div>
          
          {/* Base imponible - versión compacta en móvil */}
          <div className="px-2 py-1.5 bg-gray-50 rounded-md border">
            <span className="flex justify-between items-center text-sm mb-1">
              <span className="font-medium">Base imponible</span>
              <span className="font-semibold">{formatCurrency(resultadoBaseImponible)}</span>
            </span>
            <p className="text-xs text-gray-500 md:block hidden">Resultado calculado con los valores sin IVA</p>
          </div>
          
          {/* Grid de IVA y IRPF - más compacto en móvil */}
          <div className="grid grid-cols-2 gap-2 md:gap-3">
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
              <p className="text-base font-medium text-amber-500">{formatCurrency(irpfPagar)}</p>
            </div>
          </div>
          
          {/* Resultado neto - igual en ambas versiones */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Resultado neto (aprox.)</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(netResult)}</p>
            </div>
          </div>
        </div>
        
        {/* Botón de acción - solo visible en desktop */}
        <div className="mt-3 hidden md:block">
          <a 
            href="/reports" 
            className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition flex items-center justify-center"
          >
            Ver informe fiscal
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </div>
    </BaseBlock>
  );
};

export default ResultSummary;