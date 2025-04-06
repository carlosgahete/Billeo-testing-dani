import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUp, ArrowDown, PlusCircle, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface SimpleAppleDashboardProps {
  className?: string;
}

const SimpleAppleDashboard: React.FC<SimpleAppleDashboardProps> = ({ className }) => {
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  const [_, navigate] = useLocation();

  // Obtener los datos de las estadísticas
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
    queryFn: async () => {
      const timestamp = Date.now();
      const res = await fetch(`/api/stats/dashboard?year=${year}&period=${period}&nocache=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0,
  });

  // Definir datos predeterminados si no hay datos
  const defaultStats: DashboardStats = {
    income: 0,
    expenses: 0,
    pendingInvoices: 0,
    pendingCount: 0,
    pendingQuotes: 0,
    pendingQuotesCount: 0,
    taxes: {
      vat: 0,
      incomeTax: 0,
      ivaALiquidar: 0
    }
  };

  // Estadísticas para usar (reales o predeterminadas)
  const dashboardStats = stats || defaultStats;

  // Calcular el resultado final (ingresos - gastos)
  const finalResult = dashboardStats.income - dashboardStats.expenses;
  const isPositiveResult = finalResult >= 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filtros para el dashboard */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center">
          <h2 className="text-3xl font-semibold">Resumen Financiero</h2>
          <Button 
            variant="outline"
            className="ml-4 border-slate-300 flex items-center"
            onClick={() => navigate("/dashboard/complete")}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Ver dashboard completo</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              <SelectItem value="q1">Trimestre 1</SelectItem>
              <SelectItem value="q2">Trimestre 2</SelectItem>
              <SelectItem value="q3">Trimestre 3</SelectItem>
              <SelectItem value="q4">Trimestre 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Widgets al estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Widget de Ingresos */}
        <Card className="overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-green-500/10 p-3 rounded-full mr-4">
                  <ArrowUp className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-green-700">Ingresos</h3>
                  <p className="text-sm text-green-600/70">Entradas totales</p>
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className="text-3xl font-bold text-green-700">
                {formatCurrency(dashboardStats.income)}
              </div>
              <div className="text-sm text-green-600/70">
                Base imponible + IVA
              </div>
            </div>
          </div>
        </Card>

        {/* Widget de Gastos */}
        <Card className="overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-shadow">
          <div className="bg-gradient-to-r from-red-50 to-red-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-red-500/10 p-3 rounded-full mr-4">
                  <ArrowDown className="h-7 w-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-red-700">Gastos</h3>
                  <p className="text-sm text-red-600/70">Pagos totales</p>
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className="text-3xl font-bold text-red-700">
                {formatCurrency(dashboardStats.expenses)}
              </div>
              <div className="text-sm text-red-600/70">
                Base imponible + IVA
              </div>
            </div>
          </div>
        </Card>

        {/* Widget de Resultado Final */}
        <Card className="overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-shadow">
          <div className={`bg-gradient-to-r ${isPositiveResult ? 'from-blue-50 to-blue-100' : 'from-amber-50 to-amber-100'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`${isPositiveResult ? 'bg-blue-500/10' : 'bg-amber-500/10'} p-3 rounded-full mr-4`}>
                  <PlusCircle className={`h-7 w-7 ${isPositiveResult ? 'text-blue-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${isPositiveResult ? 'text-blue-700' : 'text-amber-700'}`}>Resultado</h3>
                  <p className={`text-sm ${isPositiveResult ? 'text-blue-600/70' : 'text-amber-600/70'}`}>Ingresos - Gastos</p>
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className={`text-3xl font-bold ${isPositiveResult ? 'text-blue-700' : 'text-amber-700'}`}>
                {formatCurrency(finalResult)}
              </div>
              <div className={`text-sm ${isPositiveResult ? 'text-blue-600/70' : 'text-amber-600/70'}`}>
                {isPositiveResult ? 'Beneficio' : 'Pérdida'}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SimpleAppleDashboard;