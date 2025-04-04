import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Info, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickStatsProps {
  data: DashboardStats;
  isLoading: boolean;
}

const QuickStats = ({ data, isLoading }: QuickStatsProps) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gray-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-gray-700 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Estadísticas rápidas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular la rentabilidad
  const income = data?.income || 0;
  const expenses = data?.expenses || 0;
  const balance = income - expenses;
  const profitMargin = income > 0 ? ((balance / income) * 100).toFixed(1) : "0.0";
  const isPositiveMargin = balance >= 0;
  
  // Calcular pendientes
  const pendingInvoicesAmount = data?.pendingInvoices || 0;
  const pendingInvoicesCount = data?.pendingCount || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gray-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-gray-700 flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Estadísticas rápidas
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Resumen rápido de tus métricas financieras clave.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Margen de beneficio */}
          <div className="border rounded-md p-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Rentabilidad</h3>
                <div className="flex items-center mt-1">
                  {isPositiveMargin ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <p className={`text-lg font-bold ${
                    isPositiveMargin ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {profitMargin}%
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Beneficio / Ingresos totales
            </div>
          </div>
          
          {/* Balance */}
          <div className="border rounded-md p-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Balance</h3>
              <p className={`text-lg font-bold mt-1 ${
                balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(balance)} €
              </p>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Ingresos - Gastos
            </div>
          </div>
          
          {/* Facturas pendientes */}
          <div className="border rounded-md p-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Por cobrar</h3>
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(pendingInvoicesAmount)} €
                </p>
              </div>
              <div className="bg-amber-100 p-1 rounded-full">
                <Wallet className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {pendingInvoicesCount} factura{pendingInvoicesCount !== 1 ? 's' : ''} pendiente{pendingInvoicesCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStats;