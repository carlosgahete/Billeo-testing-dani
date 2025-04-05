import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, LineChart, CreditCard, Receipt, FileText, ArrowUp, ArrowDown, Wallet } from "lucide-react";
import { useLocation } from "wouter";
import { PageTitle } from "@/components/ui/page-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import ResultSummary from "@/components/dashboard/blocks/ResultSummary";
import InvoicesSummary from "@/components/dashboard/blocks/InvoicesSummary";
import QuotesSummary from "@/components/dashboard/blocks/QuotesSummary";
import ExpensesByCategory from "@/components/dashboard/blocks/ExpensesByCategory";
import TaxSummary from "@/components/dashboard/blocks/TaxSummary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Dashboard con layout fijo
const FixedDashboard = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
    queryFn: async () => {
      // Añadir un timestamp y encabezados no-cache para garantizar datos frescos siempre
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
    refetchOnMount: "always", // Siempre recarga al montar el componente
    refetchOnReconnect: true,
    staleTime: 0, // Considerar los datos obsoletos inmediatamente
    gcTime: 0, // No almacenar en caché
  });
  
  // Define un objeto de stats predeterminado que cumpla con la interfaz DashboardStats
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

  // El objeto de estadísticas que vamos a usar (el real o el predeterminado)
  const dashboardStats = stats || defaultStats;

  // Loading state
  if (userLoading || statsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mt-4">
        <PageTitle 
          title="Dashboard"
          description="Tu panel de control financiero"
          variant="gradient"
          className="w-full overflow-visible"
        />
      </div>
      
      {/* Filtros para el dashboard */}
      <div className="flex items-center justify-between space-x-2 bg-gray-50 p-3 rounded-lg">
        <div className="font-medium">Filtrar por:</div>
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
              <SelectItem value="Q1">Trimestre 1</SelectItem>
              <SelectItem value="Q2">Trimestre 2</SelectItem>
              <SelectItem value="Q3">Trimestre 3</SelectItem>
              <SelectItem value="Q4">Trimestre 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Tarjetas de resumen principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-tr from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <ArrowUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.income || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total facturado en el periodo seleccionado
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-tr from-red-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.expenses || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total gastos en el periodo seleccionado
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-tr from-green-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency((stats?.income || 0) - (stats?.expenses || 0))}</div>
            <p className="text-xs text-muted-foreground">
              Resultado bruto antes de impuestos
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Secciones principales del dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Primera columna: Resumen y facturas */}
        <div className="space-y-4">
          <div className="h-[300px]">
            <ResultSummary 
              data={dashboardStats} 
              isLoading={statsLoading} 
            />
          </div>
          <div className="h-[300px]">
            <InvoicesSummary 
              data={dashboardStats} 
              isLoading={statsLoading} 
            />
          </div>
        </div>
        
        {/* Segunda columna: Impuestos y presupuestos */}
        <div className="space-y-4">
          <div className="h-[300px]">
            <TaxSummary 
              data={dashboardStats} 
              isLoading={statsLoading} 
            />
          </div>
          <div className="h-[300px]">
            <QuotesSummary 
              data={dashboardStats} 
              isLoading={statsLoading} 
            />
          </div>
        </div>
        
        {/* Tercera columna: Gastos por categoría */}
        <div className="space-y-4">
          <div className="h-[620px]">
            <ExpensesByCategory 
              data={dashboardStats} 
              isLoading={statsLoading} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixedDashboard;