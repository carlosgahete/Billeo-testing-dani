import React from "react";
import { BarChart3, TrendingUp, BarChart } from "lucide-react";
import BaseBlock from "../../blocks/BaseBlock";
import { formatCurrency } from "@/lib/utils";

interface ResultSummaryMediumProps {
  data: {
    income: number;
    expenses: number;
    taxes?: {
      ivaALiquidar?: number;
      incomeTax?: number;
    };
    taxStats?: {
      ivaLiquidar?: number;
      irpfPagar?: number;
    };
  };
  isLoading: boolean;
}

const ResultSummaryMedium: React.FC<ResultSummaryMediumProps> = ({ data, isLoading }) => {
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
};

export default ResultSummaryMedium;