import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, Info } from "lucide-react";
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

interface ExpensesSummaryProps {
  data: DashboardStats;
  isLoading: boolean;
}

const ExpensesSummary = ({ data, isLoading }: ExpensesSummaryProps) => {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-red-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-red-700 flex items-center">
              <ArrowDownToLine className="mr-2 h-5 w-5" />
              Gastos
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
  const expenses = data?.expenses || 0;
  const ivaSoportado = data?.ivaSoportado || 0;

  return (
    <Card className="overflow-hidden">
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
                <p className="w-[250px] text-xs">Total de gastos relacionados con tu actividad económica, incluyendo el IVA soportado que podrás deducir.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-2xl font-bold text-red-600">
          {new Intl.NumberFormat('es-ES', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          }).format(expenses)} €
        </p>
        
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA soportado:</span>
            <span className="font-medium">{ivaSoportado.toLocaleString('es-ES')} €</span>
          </div>
        </div>
        
        <div className="mt-8 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/transactions?type=expense")}
          >
            Ver transacciones
          </Button>
        </div>
        
        <div className="mt-auto pt-2 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => navigate("/income-expense?tab=expense")}
          >
            Ver gastos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesSummary;