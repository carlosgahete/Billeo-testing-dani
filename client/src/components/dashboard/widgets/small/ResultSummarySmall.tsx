import React from "react";
import { BarChart3 } from "lucide-react";
import BaseBlock from "../../blocks/BaseBlock";
import { formatCurrency } from "@/lib/utils";

interface ResultSummarySmallProps {
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

const ResultSummarySmall: React.FC<ResultSummarySmallProps> = ({ data, isLoading }) => {
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
};

export default ResultSummarySmall;