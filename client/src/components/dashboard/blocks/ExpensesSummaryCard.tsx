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
import { ArrowDownToLine, Info } from "lucide-react";

interface ExpensesSummaryCardProps {
  data: any;
  isLoading: boolean;
}

const ExpensesSummaryCard: React.FC<ExpensesSummaryCardProps> = ({ data, isLoading }) => {
  const [, navigate] = useLocation();
  
  // Valores reales o por defecto si no hay datos
  const expenses = data?.expenses || 0;
  const ivaSoportado = data?.taxStats?.ivaSoportado || 0;
  const irpfLiquidar = data?.taxStats?.irpfPagar || 0;
  
  return (
    <Card className="overflow-hidden flex-grow">
      <CardHeader className="bg-red-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-red-700 flex items-center">
            <ArrowDownToLine className="mr-2 h-5 w-5" />
            Gastos
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">Dinero que sale para pagar gastos operativos o de inversión. Incluye todos los conceptos de gastos deducibles.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex flex-col">
          <p className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat('es-ES', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            }).format(expenses / 100)} €
          </p>
          <p className="text-xs text-neutral-500 -mt-1">Total</p>
        </div>
        
        <div className="mt-3 pt-3 border-t border-red-100 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500 font-semibold">Neto (sin IVA):</span>
            <span className="font-medium">{((expenses - ivaSoportado) / 100).toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA soportado:</span>
            <span className="font-medium">{(ivaSoportado / 100).toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">IRPF a liquidar:</span>
            <span className="font-medium">-{(irpfLiquidar / 100).toLocaleString('es-ES')} €</span>
          </div>
        </div>
        
        <div className="mt-auto pt-8 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/transactions")}
          >
            Ver gastos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesSummaryCard;