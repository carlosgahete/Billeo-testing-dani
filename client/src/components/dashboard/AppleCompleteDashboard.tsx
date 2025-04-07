import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { 
  Loader2, ArrowUpRight, ArrowDownRight, PiggyBank, FileText, BarChart3, 
  InfoIcon, ExternalLink, CreditCard, Calendar, BarChart 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CompleteDashboardProps {
  className?: string;
}

const AppleCompleteDashboard: React.FC<CompleteDashboardProps> = ({ className }) => {
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  const [graphView, setGraphView] = useState<"barras" | "area">("barras");
  const [_, navigate] = useLocation();
  
  // Función para refrescar los datos del dashboard
  const { refetch } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });
  
  const refreshDashboard = () => {
    refetch();
  };

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
    refetchInterval: 3000, // Refrescar cada 3 segundos automáticamente
    staleTime: 0, // Sin tiempo de caducidad - siempre considerar los datos obsoletos
    gcTime: 0, // Sin tiempo de recolección de basura - limpiar inmediatamente
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

  // Calcular valores específicos
  const finalResult = dashboardStats.income - dashboardStats.expenses;
  const baseImponibleIngresos = dashboardStats.baseImponible || Math.round(dashboardStats.income / 1.21);
  const ivaRepercutido = dashboardStats.ivaRepercutido || dashboardStats.income - baseImponibleIngresos;
  const baseImponibleGastos = Math.round(dashboardStats.expenses / 1.21);
  const ivaSoportado = dashboardStats.ivaSoportado || dashboardStats.expenses - baseImponibleGastos;
  const ivaALiquidar = dashboardStats.taxes?.ivaALiquidar || (ivaRepercutido - ivaSoportado);
  const retencionesIrpf = dashboardStats.irpfRetenidoIngresos || 0;
  
  // Comprobar signos y valores para colores
  const isPositiveResult = finalResult >= 0;
  
  // Datos para el gráfico de comparativa financiera
  const financialComparisonData = [
    {
      quarter: "Q1",
      Ingresos: 1200,
      Gastos: 800,
      Resultado: 400
    },
    {
      quarter: "Q2",
      Ingresos: 1800,
      Gastos: 1000,
      Resultado: 800
    },
    {
      quarter: "Q3",
      Ingresos: 1500,
      Gastos: 1100,
      Resultado: 400
    },
    {
      quarter: "Q4",
      Ingresos: 2000,
      Gastos: 1200,
      Resultado: 800
    }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("p-8 bg-white", className)}>
      {/* Cabecera del dashboard */}
      <div className="section-header mb-8">
        <div className="flex items-center">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Dashboard Financiero
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px] select-apple">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px] select-apple">
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
          
          <button 
            className="button-apple-sm button-apple flex items-center gap-2"
            onClick={() => refreshDashboard()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M8 16H3v5"></path>
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Primera fila: Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Widget de Ingresos */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Ingresos</h3>
              <div className="p-2 rounded-full bg-green-50">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
            </div>
            
            <div className="stat-value mb-3">
              {formatCurrency(baseImponibleIngresos)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Base imponible (sin IVA)
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-900">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA repercutido (21%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(ivaRepercutido)}</span>
              </div>
            </div>
            
            <Link href="/invoices">
              <button className="button-apple-secondary w-full">
                Ver facturas
              </button>
            </Link>
          </div>
        </div>

        {/* Widget de Gastos */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Gastos</h3>
              <div className="p-2 rounded-full bg-red-50">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
            
            <div className="stat-value mb-3" style={{background: "linear-gradient(90deg, #ff3b30, #ff9500)"}}>
              {formatCurrency(baseImponibleGastos)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Base imponible (sin IVA)
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-900">{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA soportado (21%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(ivaSoportado)}</span>
              </div>
            </div>
            
            <Link href="/income-expense">
              <button className="button-apple-secondary w-full">
                Ver gastos
              </button>
            </Link>
          </div>
        </div>

        {/* Widget de Resultado */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Resultado Final</h3>
              <div className={`p-2 rounded-full ${isPositiveResult ? 'bg-blue-50' : 'bg-amber-50'}`}>
                <PiggyBank className={`h-5 w-5 ${isPositiveResult ? 'text-blue-600' : 'text-amber-600'}`} />
              </div>
            </div>
            
            <div className="stat-value mb-3" style={{background: isPositiveResult 
              ? "linear-gradient(90deg, #007AFF, #5AC8FA)" 
              : "linear-gradient(90deg, #FF9500, #FFCC00)"}}>
              {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              {isPositiveResult ? 'Beneficio neto (base imponible)' : 'Pérdida neta (base imponible)'}
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible ingresos:</span>
                <span className="font-medium text-green-600">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible gastos:</span>
                <span className="font-medium text-red-600">-{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                <span className="text-gray-700 font-medium">Resultado:</span>
                <span className={`font-bold ${isPositiveResult ? 'text-blue-600' : 'text-amber-600'}`}>
                  {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
                </span>
              </div>
            </div>
            
            <Link href="/reports">
              <button className="button-apple-secondary w-full">
                Ver informes
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Segunda fila: Resumen Fiscal y Comparativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Widget de Resumen Fiscal */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Resumen Fiscal</h3>
              <div className="p-2 rounded-full bg-indigo-50">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            
            {/* IVA a liquidar */}
            <div className="glass-panel mb-4">
              <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">IVA a liquidar ({period === 'all' ? 'Año' : 'Trimestre'} {year})</span>
                  <span className="bg-blue-100 text-xs py-0.5 px-2 rounded-full text-blue-700">21% IVA</span>
                </div>
                <div className="text-2xl font-semibold mb-1 text-blue-600">
                  {formatCurrency(ivaALiquidar)}
                </div>
                <div className="text-xs text-gray-500">
                  {period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' 
                    ? `Modelo 303 (${period === 'q1' ? 'Ene-Mar' : period === 'q2' ? 'Abr-Jun' : period === 'q3' ? 'Jul-Sep' : 'Oct-Dic'})` 
                    : 'Resumen anual (modelo 390)'}
                </div>
              </div>
            </div>

            {/* IRPF */}
            <div className="glass-panel mb-4">
              <div className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Retenciones IRPF ({period === 'all' ? 'Año' : 'Trimestre'} {year})</span>
                  <span className="bg-amber-100 text-xs py-0.5 px-2 rounded-full text-amber-700">15% IRPF</span>
                </div>
                <div className="text-2xl font-semibold mb-1 text-amber-600">
                  {formatCurrency(dashboardStats.taxes?.incomeTax || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  {period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' 
                    ? `Modelo 130 (${period === 'q1' ? 'Ene-Mar' : period === 'q2' ? 'Abr-Jun' : period === 'q3' ? 'Jul-Sep' : 'Oct-Dic'})` 
                    : 'Resumen anual (modelo 190)'}
                </div>
              </div>
            </div>

            <button className="button-apple w-full">
              Ver informes fiscales
            </button>
          </div>
        </div>

        {/* Widget de Comparativa */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Comparativa Financiera</h3>
              <div className="p-2 rounded-full bg-purple-50">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            
            {/* Controles del gráfico */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <button 
                  className={`text-xs py-1.5 px-3 rounded-full ${graphView === "barras" 
                    ? "bg-gray-900 text-white" 
                    : "bg-gray-100 text-gray-700"}`}
                  onClick={() => setGraphView("barras")}
                >
                  Barras
                </button>
                <button 
                  className={`text-xs py-1.5 px-3 rounded-full ${graphView === "area" 
                    ? "bg-gray-900 text-white" 
                    : "bg-gray-100 text-gray-700"}`}
                  onClick={() => setGraphView("area")}
                >
                  Área
                </button>
              </div>
              
              <Select value="trimestral">
                <SelectTrigger className="w-[120px] h-8 text-xs select-apple">
                  <SelectValue placeholder="Trimestral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Gráfico */}
            <div className="h-[280px] bg-gray-50 rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart
                  data={financialComparisonData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="quarter" />
                  <YAxis 
                    tickFormatter={(value) => `${value}€`}
                    width={45}
                  />
                  <ReTooltip 
                    formatter={(value: number) => [`${value}€`, undefined]}
                    contentStyle={{ 
                      borderRadius: '12px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      border: 'none',
                      backgroundColor: 'rgba(255,255,255,0.95)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#34C759" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resultado" fill="#007AFF" radius={[4, 4, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tercera fila: Facturas y Presupuestos Pendientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Widget de Facturas Pendientes */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Facturas Pendientes</h3>
              <div className="p-2 rounded-full bg-yellow-50">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            
            <div className="stat-value mb-3" style={{
              background: "linear-gradient(90deg, #FF9500, #FFCC00)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              {formatCurrency(dashboardStats.pendingInvoices)}
            </div>
            
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {dashboardStats.pendingCount} facturas pendientes
              </p>
              
              <div className="bg-yellow-100 text-xs py-0.5 px-2 rounded-full text-yellow-700">
                Por cobrar
              </div>
            </div>
            
            <Link href="/invoices">
              <button className="button-apple-secondary w-full">
                Gestionar facturas
              </button>
            </Link>
          </div>
        </div>
        
        {/* Widget de Presupuestos Pendientes */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Presupuestos Pendientes</h3>
              <div className="p-2 rounded-full bg-teal-50">
                <Calendar className="h-5 w-5 text-teal-600" />
              </div>
            </div>
            
            <div className="stat-value mb-3" style={{
              background: "linear-gradient(90deg, #00BCD4, #5AC8FA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              {formatCurrency(dashboardStats.pendingQuotes || 0)}
            </div>
            
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {dashboardStats.pendingQuotesCount || 0} presupuestos pendientes
              </p>
              
              <div className="bg-teal-100 text-xs py-0.5 px-2 rounded-full text-teal-700">
                Sin respuesta
              </div>
            </div>
            
            <Link href="/quotes">
              <button className="button-apple-secondary w-full">
                Gestionar presupuestos
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppleCompleteDashboard;