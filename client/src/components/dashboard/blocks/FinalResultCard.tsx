import React from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PiggyBank, Info } from "lucide-react";

interface FinalResultCardProps {
  data: any;
  isLoading: boolean;
}

const FinalResultCard: React.FC<FinalResultCardProps> = ({ data, isLoading }) => {
  const [, navigate] = useLocation();
  
  // Obtener valores brutos y netos
  // Valores brutos
  const income = data?.income || 0;
  const expenses = data?.expenses || 0;
  const result = income - expenses;
  
  // Valores netos (usando los nuevos campos)
  const netIncome = data?.netIncome !== undefined ? data.netIncome : income;
  const netExpenses = data?.netExpenses !== undefined ? data.netExpenses : expenses;
  const netResult = data?.netResult !== undefined ? data.netResult : result;
  
  // Información fiscal
  const ivaLiquidar = data?.taxStats?.ivaLiquidar || 0;
  const irpfAdelantado = data?.taxStats?.irpfRetenido || 0;
  const irpfPagar = data?.taxStats?.irpfPagar || 0;
  
  return (
    <Card className="overflow-hidden flex-grow">
      <CardHeader className="bg-blue-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <PiggyBank className="mr-2 h-5 w-5" />
            Resultado Final
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">El beneficio final después de descontar impuestos y retenciones</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {/* Resultado neto */}
        <div className="mb-3">
          <h3 className="text-sm font-medium text-blue-700">Resultado neto (después de IRPF)</h3>
          <p className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('es-ES', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            }).format(netResult)} €
          </p>
        </div>
        
        {/* Comparación con el bruto */}
        <div className="mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Resultado bruto:</span>
            <span className="font-medium">{result.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-neutral-500">Diferencia por IRPF:</span>
            <span className="font-medium text-purple-600">{(netResult - result).toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
          </div>
        </div>
        
        {/* Información de impuestos */}
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA a liquidar:</span>
            <span className="font-medium text-red-600">{ivaLiquidar.toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">IRPF adelantado:</span>
            <span className="font-medium text-green-600">{irpfAdelantado.toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">IRPF a pagar:</span>
            <span className="font-medium text-orange-600">{irpfPagar.toLocaleString('es-ES')} €</span>
          </div>
        </div>
        
        <div className="mt-auto pt-8 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/analytics")}
          >
            Ver informes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalResultCard;