import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUp, ArrowDown, PiggyBank, FileText, BarChart3, InfoIcon, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CompleteDashboardProps {
  className?: string;
}

const CompleteDashboard: React.FC<CompleteDashboardProps> = ({ className }) => {
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
    <div className={cn("container-apple section-apple bg-[#F9F9F9]", className)}>
      {/* Cabecera del dashboard con título y controles - Estilo Apple */}
      <div className="section-header">
        <div className="flex items-center">
          <BarChart3 className="h-6 w-6 text-primary mr-3" />
          <h1 className="section-title">Dashboard</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="select-apple w-[100px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="select-apple w-[150px]">
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
            onClick={() => refreshDashboard()}
            className="button-apple button-apple-icon"
          >
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Primera fila: Widgets principales - Estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Widget de Ingresos - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#E2F6ED] p-3 rounded-full mr-4">
                <ArrowUp className="h-5 w-5 text-[#34C759]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Ingresos</h3>
                <p className="text-sm text-gray-500">Entradas totales</p>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="stat-value">
                {formatCurrency(baseImponibleIngresos)}
              </div>
              <div className="stat-label mt-1">
                Base imponible (sin IVA)
              </div>
            </div>
            
            <div className="space-y-3 mb-5 p-4 bg-[#F9FDFB] rounded-xl border border-[#E2F6ED]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-800">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA repercutido (21%):</span>
                <span className="font-medium text-gray-800">{formatCurrency(ivaRepercutido)}</span>
              </div>
            </div>
            
            <Link href="/invoices" className="block">
              <button className="button-apple-secondary w-full">
                Ver facturas
              </button>
            </Link>
          </div>
        </div>

        {/* Widget de Gastos - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#FEECEB] p-3 rounded-full mr-4">
                <ArrowDown className="h-5 w-5 text-[#FF3B30]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Gastos</h3>
                <p className="text-sm text-gray-500">Salidas totales</p>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="stat-value" style={{background: 'linear-gradient(90deg, #FF3B30, #FF9500)'}}>
                {formatCurrency(baseImponibleGastos)}
              </div>
              <div className="stat-label mt-1">
                Base imponible (sin IVA)
              </div>
            </div>
            
            <div className="space-y-3 mb-5 p-4 bg-[#FFFAFA] rounded-xl border border-[#FEECEB]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-800">{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA soportado (21%):</span>
                <span className="font-medium text-gray-800">{formatCurrency(ivaSoportado)}</span>
              </div>
            </div>
            
            <Link href="/income-expense" className="block">
              <button className="button-apple-secondary w-full">
                Ver gastos
              </button>
            </Link>
          </div>
        </div>

        {/* Widget de Resultado Final - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#E9F8FB] p-3 rounded-full mr-4">
                <PiggyBank className="h-5 w-5 text-[#007AFF]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Resultado Final</h3>
                <p className="text-sm text-gray-500">Ingresos - Gastos</p>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="stat-value" style={{background: 'linear-gradient(90deg, #007AFF, #5AC8FA)'}}>
                {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
              </div>
              <div className="stat-label mt-1">
                {isPositiveResult ? 'Beneficio neto (base imponible)' : 'Pérdida neta (base imponible)'}
              </div>
            </div>
            
            <div className="space-y-3 mb-5 p-4 bg-[#F7FDFF] rounded-xl border border-[#E9F8FB]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible ingresos:</span>
                <span className="font-medium text-gray-800">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible gastos:</span>
                <span className="font-medium text-gray-800">-{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                <span className="text-gray-800 font-medium">Resultado (base imponible):</span>
                <span className="font-bold text-gray-800">{formatCurrency(baseImponibleIngresos - baseImponibleGastos)}</span>
              </div>
            </div>
            
            <Link href="/reports" className="block">
              <button className="button-apple-secondary w-full">
                Ver informes
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Segunda fila: Widgets de Resumen Fiscal y Comparativa - Estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Widget de Resumen Fiscal - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="bg-[#EEF2FF] p-3 rounded-full mr-3">
                  <FileText className="h-5 w-5 text-[#5856D6]" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Resumen Fiscal</h3>
              </div>
              <div className="flex items-center gap-2">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="select-apple text-sm h-8 min-h-0 py-1 px-2">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="select-apple text-sm h-8 min-h-0 py-1 px-2">
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

            {/* IVA a liquidar - Estilo Apple */}
            <div className="bg-[#F8FBFF] rounded-xl p-5 mb-4 border border-[#E6F0FD]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">IVA a liquidar (Todo el año, 2025)</span>
                <span className="bg-blue-50 text-xs py-1 px-2 rounded-full text-blue-700 font-medium">21% IVA</span>
              </div>
              <div className="text-2xl font-medium text-[#007AFF]">
                {formatCurrency(ivaALiquidar)}
              </div>
              <div className="text-xs text-gray-500 mt-1.5">
                Resumen anual de IVA (modelo 390)
              </div>
            </div>

            {/* IRPF - Estilo Apple */}
            <div className="bg-[#FFF9F5] rounded-xl p-5 mb-4 border border-[#FEECD2]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Retenciones IRPF (Todo el año, 2025)</span>
                <span className="bg-amber-50 text-xs py-1 px-2 rounded-full text-amber-600 font-medium">15% IRPF</span>
              </div>
              <div className="text-2xl font-medium text-[#FF9500]">
                {formatCurrency(dashboardStats.taxes?.incomeTax || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1.5">
                Retenciones acumuladas en el año (modelo 190)
              </div>
            </div>

            {/* Botón de Informes - Estilo Apple */}
            <div className="mt-5">
              <button className="button-apple w-full">
                Ver informes fiscales
              </button>
            </div>
          </div>
        </div>

        {/* Widget de Comparativa Financiera - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center">
                <div className="bg-[#F0EDFF] p-3 rounded-full mr-3">
                  <BarChart3 className="h-5 w-5 text-[#5856D6]" />
                </div>
                <h3 className="text-lg font-medium text-gray-800">Comparativa Financiera</h3>
              </div>
              <div className="flex items-center gap-2">
                <Select value="trimestral">
                  <SelectTrigger className="select-apple text-sm h-8 min-h-0 py-1 px-2">
                    <SelectValue placeholder="Trimestral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value="2025">
                  <SelectTrigger className="select-apple text-sm h-8 min-h-0 py-1 px-2">
                    <SelectValue placeholder="2025" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selector de vista de gráfico - Estilo Apple */}
            <div className="flex justify-center bg-[#F9F9F9] p-1.5 rounded-full gap-1 mb-5 max-w-[200px] mx-auto border border-gray-100">
              <button
                className={`text-xs font-medium rounded-full px-4 py-1.5 transition-all ${
                  graphView === "barras" 
                  ? "bg-white text-gray-800 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setGraphView("barras")}
              >
                Barras
              </button>
              <button
                className={`text-xs font-medium rounded-full px-4 py-1.5 transition-all ${
                  graphView === "area" 
                  ? "bg-white text-gray-800 shadow-sm" 
                  : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setGraphView("area")}
              >
                Área
              </button>
            </div>

            {/* Gráfico - Estilo Apple */}
            <div className="h-[280px] p-4 bg-white rounded-xl border border-gray-100 glass-panel">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={financialComparisonData}
                  margin={{
                    top: 15,
                    right: 15,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="quarter" axisLine={false} tickLine={false} />
                  <YAxis 
                    tickFormatter={(value) => `${value}€`}
                    width={45}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}€`, undefined]}
                    contentStyle={{ 
                      borderRadius: '12px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                      border: 'none',
                      padding: '10px'
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="Ingresos" fill="#34C759" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#FF3B30" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Resultado" fill="#007AFF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;