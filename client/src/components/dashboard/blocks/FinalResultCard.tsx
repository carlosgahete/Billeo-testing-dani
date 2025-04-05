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
  
  // Valores reales o por defecto si no hay datos
  const income = data?.income || 0;
  const expenses = data?.expenses || 0;
  const result = income - expenses;
  const ivaLiquidar = data?.taxStats?.ivaLiquidar || 0;
  const irpfAdelantado = data?.taxStats?.irpfRetenido || 0;
  
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
        <p className="text-2xl font-bold text-blue-600">
          {new Intl.NumberFormat('es-ES', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }).format(result / 100)} €
        </p>
        
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA a liquidar:</span>
            <span className="font-medium text-red-600">{(ivaLiquidar / 100).toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">IRPF adelantado:</span>
            <span className="font-medium text-green-600">{(irpfAdelantado / 100).toLocaleString('es-ES')} €</span>
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