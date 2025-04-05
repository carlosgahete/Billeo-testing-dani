import React from "react";
import { BarChart3, ArrowUp, ArrowDown, Circle, TrendingUp, BarChart } from "lucide-react";
import BaseBlock from "../../blocks/BaseBlock";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface ResultSummaryLargeProps {
  data: {
    income: number;
    expenses: number;
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
  isLoading: boolean;
}

const ResultSummaryLarge: React.FC<ResultSummaryLargeProps> = ({ data, isLoading }) => {
  // Calcular resultados
  const income = data.income || 0;
  const expenses = data.expenses || 0;
  const result = income - expenses;
  
  // Datos de impuestos
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

  return (
    <BaseBlock 
      title="Resumen de Resultados" 
      icon={<BarChart3 className="h-5 w-5" />}
      bgColor="bg-green-50"
      iconColor="text-green-600"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Ingresos vs Gastos</h3>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium">Ingresos</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(income)}</span>
                </div>
                <Progress value={100} className="h-2 bg-green-100" indicatorClassName="bg-green-500" />
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-sm font-medium">Gastos</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(expenses)}</span>
                </div>
                <Progress value={expensePercentage} className="h-2 bg-red-100" indicatorClassName="bg-red-500" />
              </div>
              
              <div className="flex flex-col border-t pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Circle className="h-4 w-4 text-green-600 fill-green-600 mr-1" />
                    <span className="text-sm font-medium">Resultado bruto</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(result)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Impuestos a pagar</h3>
            
            <div className="space-y-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm font-medium">IVA a liquidar</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(ivaALiquidar)}</span>
                </div>
                <Progress value={ivaPercentage} className="h-2 bg-blue-100" indicatorClassName="bg-blue-500" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Repercutido: {formatCurrency(ivaRepercutido)}</span>
                  <span>Soportado: {formatCurrency(ivaSoportado)}</span>
                </div>
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-amber-500 mr-1" />
                    <span className="text-sm font-medium">IRPF a pagar</span>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(irpfPagar)}</span>
                </div>
                <Progress value={irpfPercentage} className="h-2 bg-amber-100" indicatorClassName="bg-amber-500" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Total: {formatCurrency(irpfTotal)}</span>
                  <span>Retenido: {formatCurrency(irpfRetenido)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-4 pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resultado neto estimado</h3>
            <span className="text-2xl font-bold text-green-600">{formatCurrency(netResult)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            *Cálculo aproximado después de impuestos. Consulta con tu asesor fiscal para cifras exactas.
          </p>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <button className="text-blue-600 text-sm flex-1 border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
            Ver informe fiscal
          </button>
          <button className="bg-blue-600 text-white text-sm flex-1 rounded-md py-1.5 hover:bg-blue-700 transition">
            Exportar datos
          </button>
        </div>
      </div>
    </BaseBlock>
  );
};

export default ResultSummaryLarge;