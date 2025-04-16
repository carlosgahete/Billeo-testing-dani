import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  ArrowUpFromLine, 
  ArrowDownToLine, 
  Info
} from "lucide-react";
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
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";

import ComparisonCharts from "@/components/dashboard/ComparisonCharts";
import QuotesSummary from "@/components/dashboard/QuotesSummary";
import InvoicesSummary from "@/components/dashboard/InvoicesSummary";
import { PageTitle } from "@/components/ui/page-title";

// Interfaces simplificadas
interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  [key: string]: any;
}

const InicioPage = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
  });

  return (
    <div className="space-y-2 min-h-screen pb-48 mb-20">
      <div className="flex flex-col gap-2 mt-4">
        <PageTitle 
          title="Resumen Contable"
          description="Visión general de tu actividad económica"
          variant="gradient"
          className="w-full"
        >
          <div className="flex justify-end items-center mt-1">
            <div className="text-white text-sm font-medium bg-white/10 px-4 py-1.5 rounded-md">
              Datos financieros {year} - {period === "all" ? "Todo el año" : 
                period.startsWith("q") ? `${period.replace("q", "")}º trimestre` : 
                period === "m1" ? "Enero" :
                period === "m2" ? "Febrero" :
                period === "m3" ? "Marzo" :
                period === "m4" ? "Abril" :
                period === "m5" ? "Mayo" :
                period === "m6" ? "Junio" :
                period === "m7" ? "Julio" :
                period === "m8" ? "Agosto" :
                period === "m9" ? "Septiembre" :
                period === "m10" ? "Octubre" :
                period === "m11" ? "Noviembre" : "Diciembre"}
            </div>
          </div>
        </PageTitle>
      </div>
      
      {/* Métricas principales */}
      <DashboardMetrics userId={user?.user?.id || 0} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-2 mt-4">
        {/* Primera columna: Tarjeta de Ingresos - Con animaciones al estilo Apple */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col transition-all duration-300 ease-in-out hover:scale-[1.01]">
          {/* Tarjeta de Ingresos */}
          <Card className="overflow-hidden flex-grow shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="bg-emerald-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-emerald-700 flex items-center">
                  <ArrowUpFromLine className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  Ingresos
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500 transition-opacity hover:opacity-80" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[200px] text-xs">Dinero que entra en tu negocio a través de facturas y otros ingresos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-emerald-600 animate-in fade-in duration-500">
                —
              </p>
              
              <div className="mt-2 space-y-1 text-sm animate-in fade-in duration-700 delay-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Facturas cobradas:</span>
                  <span className="font-medium">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA repercutido:</span>
                  <span className="font-medium">—</span>
                </div>
              </div>
              
              <div className="mt-8 mb-2 animate-in fade-in duration-700 delay-300">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50 transition-all duration-300"
                  onClick={() => navigate("/invoices")}
                >
                  Ver facturas
                </Button>
              </div>
              
              <div className="mt-auto pt-2 mb-2 animate-in fade-in duration-700 delay-300">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-green-600 border-green-300 hover:bg-green-50 transition-all duration-300"
                  onClick={() => navigate("/transactions?tab=income")}
                >
                  Ver ingresos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Segunda columna: Tarjeta de Gastos - Con animaciones al estilo Apple */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col transition-all duration-300 ease-in-out hover:scale-[1.01]">
          {/* Tarjeta de Gastos */}
          <Card className="overflow-hidden flex-grow shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="bg-red-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-red-700 flex items-center">
                  <ArrowDownToLine className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  Gastos
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500 transition-opacity hover:opacity-80" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[200px] text-xs">Dinero que sale para cubrir los costos de tu actividad profesional</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {/* Valores para la tarjeta de gastos - con guiones */}
              <p className="text-2xl font-bold text-red-600 animate-in fade-in duration-500">
                —
              </p>
              
              <div className="mt-2 space-y-1 text-sm animate-in fade-in duration-700 delay-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Base imponible:</span>
                  <span className="font-medium">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA soportado:</span>
                  <span className="font-medium">—</span>
                </div>
              </div>
              
              <div className="mt-auto pt-8 mb-2 animate-in fade-in duration-700 delay-300">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-red-600 border-red-300 hover:bg-red-50 transition-all duration-300"
                  onClick={() => navigate("/transactions?tab=expenses")}
                >
                  Ver gastos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tercera columna: Tarjeta de Resultado Final - Con animaciones al estilo Apple */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col transition-all duration-300 ease-in-out hover:scale-[1.01]">
          {/* Tarjeta de Resultado Final */}
          <Card className="overflow-hidden flex-grow shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="bg-blue-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-blue-700 flex items-center">
                  Resultado Final
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500 transition-opacity hover:opacity-80" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[200px] text-xs">Resumen financiero calculado a partir de tus ingresos y gastos, después de impuestos</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              {/* Valores para la tarjeta de resultado final - con guiones */}
              <p className="text-2xl font-bold text-blue-600 animate-in fade-in duration-500">
                —
              </p>
              
              <div className="mt-2 space-y-1 text-sm animate-in fade-in duration-700 delay-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA a liquidar:</span>
                  <span className="font-medium text-red-600">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IRPF adelantado:</span>
                  <span className="font-medium text-green-600">—</span>
                </div>
              </div>
              
              <div className="mt-auto pt-8 mb-2 animate-in fade-in duration-700 delay-300">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50 transition-all duration-300"
                  onClick={() => navigate("/reports")}
                >
                  Ver informes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Fila para presupuestos, facturas y gráficos de comparación - Con animaciones al estilo Apple */}
        <div className="md:col-span-3 mt-6 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Columna 1: Presupuestos (más estrecho) */}
            <div className="lg:col-span-3 transition-all duration-300 ease-in-out hover:translate-y-[-2px] hover:shadow-md">
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-400">
                <QuotesSummary />
              </div>
            </div>
            
            {/* Columna 2: Facturas (más estrecho) */}
            <div className="lg:col-span-3 transition-all duration-300 ease-in-out hover:translate-y-[-2px] hover:shadow-md">
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-500">
                <InvoicesSummary />
              </div>
            </div>
            
            {/* Columna 3: Gráficos de Comparación (más ancha) */}
            <div className="lg:col-span-6 transition-all duration-300 ease-in-out hover:translate-y-[-2px] hover:shadow-md">
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-600">
                <ComparisonCharts />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InicioPage;