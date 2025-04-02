import { useQuery } from "@tanstack/react-query";
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
import { useLocation } from "wouter";
import { FileCheck, ClipboardCheck, X, Info, Loader2 } from "lucide-react";

interface DashboardStats {
  pendingQuotes: number;
  pendingQuotesCount: number;
  quotes?: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
}

const QuotesSummary = () => {
  const [, navigate] = useLocation();
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden h-full">
        <CardHeader className="bg-violet-50 p-2">
          <CardTitle className="text-lg text-violet-700 flex items-center">
            <FileCheck className="mr-2 h-5 w-5" />
            Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 flex items-center justify-center h-[240px]">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </CardContent>
      </Card>
    );
  }

  // Obtener datos de presupuestos
  const totalQuotes = stats?.quotes?.total || 0;
  const pendingQuotes = stats?.quotes?.pending || 0;
  const acceptedQuotes = stats?.quotes?.accepted || 0;
  const rejectedQuotes = stats?.quotes?.rejected || 0;
  
  // Calcular el porcentaje de aceptación (evitar división por cero)
  const acceptanceRate = totalQuotes > 0 
    ? Math.round((acceptedQuotes / totalQuotes) * 100) 
    : 0;

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-violet-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-violet-700 flex items-center">
            <FileCheck className="mr-2 h-5 w-5" />
            Presupuestos
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">Resumen de los presupuestos emitidos y su estado actual</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-2xl font-bold text-violet-600">{totalQuotes}</p>
        <p className="text-sm text-gray-500 mb-3">Total de presupuestos</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-400 mr-2"></div>
              <span className="text-sm">Pendientes</span>
            </div>
            <span className="font-medium">{pendingQuotes}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
              <span className="text-sm">Aceptados</span>
            </div>
            <span className="font-medium">{acceptedQuotes}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
              <span className="text-sm">Rechazados</span>
            </div>
            <span className="font-medium">{rejectedQuotes}</span>
          </div>
        </div>
        
        <div className="mt-3">
          <p className="text-sm text-gray-500">Tasa de aceptación</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${acceptanceRate}%` }}
            ></div>
          </div>
          <p className="text-right text-xs text-gray-500 mt-1">{acceptanceRate}%</p>
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-violet-600 border-violet-300 hover:bg-violet-50"
            onClick={() => navigate("/quotes")}
          >
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Ver presupuestos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuotesSummary;