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
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank, Info } from "lucide-react";

interface FinalResultCardProps {
  data: any;
  isLoading: boolean;
}

const FinalResultCard: React.FC<FinalResultCardProps> = ({ data, isLoading }) => {
  const [, navigate] = useLocation();
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden flex-grow">
        <CardHeader className="bg-blue-50 p-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="p-3">
          <Skeleton className="h-8 w-24 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-10 w-full mt-8" />
        </CardContent>
      </Card>
    );
  }
  
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
        {/* Ingresos netos */}
        <div className="mb-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-neutral-600">Ingresos netos:</span>
            <span className="font-medium text-emerald-600">—</span>
          </div>
        </div>
        
        {/* Gastos netos */}
        <div className="mb-3 text-sm border-t pt-1">
          <div className="flex justify-between">
            <span className="font-medium text-neutral-600">Gastos netos:</span>
            <span className="font-medium text-red-600">—</span>
          </div>
        </div>
        
        {/* Línea divisoria */}
        <div className="border-b border-gray-300 my-2"></div>
        
        {/* Resultado final */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-blue-700">Resultado final:</h3>
          <p className="text-2xl font-bold text-blue-600">
            —
          </p>
        </div>
        
        {/* Información de impuestos */}
        <div className="mt-3 space-y-1 text-sm">
          <h3 className="font-medium text-neutral-700 mb-1">IVA a pagar:</h3>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">IVA ingresos:</span>
            <span className="font-medium">—</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">- IVA gastos:</span>
            <span className="font-medium">—</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1 pl-2">
            <span className="text-neutral-600 font-medium">IVA a pagar:</span>
            <span className="font-medium text-blue-600">—</span>
          </div>
          
          <h3 className="font-medium text-neutral-700 mt-3 mb-1">IRPF total retenido:</h3>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">IRPF ingresos:</span>
            <span className="font-medium">—</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">+ IRPF gastos:</span>
            <span className="font-medium">—</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1 pl-2">
            <span className="text-neutral-600 font-medium">Total IRPF:</span>
            <span className="font-medium text-blue-600">—</span>
          </div>
        </div>
        
        <div className="mt-auto pt-4 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/analytics")}
          >
            Ver informes completos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalResultCard;