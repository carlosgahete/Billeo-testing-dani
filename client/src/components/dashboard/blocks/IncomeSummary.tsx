import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpFromLine, Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

interface IncomeSummaryProps {
  data: DashboardStats;
  isLoading: boolean;
}

const IncomeSummary = ({ data, isLoading }: IncomeSummaryProps) => {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-emerald-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-emerald-700 flex items-center">
              <ArrowUpFromLine className="mr-2 h-5 w-5" />
              Ingresos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <Skeleton className="h-8 w-32 my-1" />
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="mt-8 mb-2">
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="mt-auto pt-2 mb-2">
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usar datos reales o valores por defecto
  const baseIncome = data?.baseImponible || 0;
  const ivaRepercutido = data?.ivaRepercutido || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-emerald-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-emerald-700 flex items-center">
            <ArrowUpFromLine className="mr-2 h-5 w-5" />
            Ingresos
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Base imponible de todas las facturas cobradas (sin IVA). Representa el valor real de tu actividad económica.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-2xl font-bold text-emerald-600">
          {new Intl.NumberFormat('es-ES', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }).format(baseIncome)} €
        </p>
        
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA repercutido:</span>
            <span className="font-medium">{ivaRepercutido.toLocaleString('es-ES')} €</span>
          </div>
        </div>
        
        <div className="mt-8 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/invoices")}
          >
            Ver facturas
          </Button>
        </div>
        
        <div className="mt-auto pt-2 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-green-600 border-green-300 hover:bg-green-50"
            onClick={() => navigate("/income-expense?tab=income")}
          >
            Ver ingresos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeSummary;