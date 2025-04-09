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
import ExpensesByCategory from "@/components/dashboard/NewExpensesByCategory";

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
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
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
  
  // Obtener las transacciones para el análisis de gastos por categoría
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions", { year }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?year=${year}`);
      if (!res.ok) throw new Error("Error al cargar transacciones");
      return res.json();
    }
  });
  
  // Obtener las categorías
  const { data: categories, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Error al cargar categorías");
      return res.json();
    }
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

  const isLoading = statsLoading || transactionsLoading || categoriesLoading;
  
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

      {/* Primera fila: Widgets principales - Estilo Apple - Layout expandido */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Widget de Ingresos - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#E2F6ED] p-3 rounded-full mr-3">
                <ArrowUp className="h-5 w-5 text-[#34C759]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Ingresos</h3>
                <p className="text-sm text-gray-500">Entradas totales</p>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="text-3xl font-bold text-[#34C759] pt-3">
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
              <div className="bg-[#FEECEB] p-3 rounded-full mr-3">
                <ArrowDown className="h-5 w-5 text-[#FF3B30]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Gastos</h3>
                <p className="text-sm text-gray-500">Salidas totales</p>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="text-3xl font-bold text-[#FF3B30] pt-3">
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
            
            <Link href="/transactions" className="block">
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
              <div className="bg-[#E9F8FB] p-3 rounded-full mr-3">
                <PiggyBank className="h-5 w-5 text-[#007AFF]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Resultado Final</h3>
                <p className="text-sm text-gray-500">Ingresos - Gastos</p>
              </div>
            </div>
            
            <div className="mb-5">
              <div className="text-3xl font-bold text-[#007AFF] pt-3">
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
                <span className="text-gray-800 font-medium">Resultado:</span>
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

      {/* Segunda fila: Widgets de Comparativa Financiera y Gastos por Categoría - Estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Widget de Comparativa Financiera - Estilo Apple */}
        <div className="dashboard-card fade-in">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="bg-[#F0EDFF] p-2 rounded-full mr-2">
                  <BarChart3 className="h-4 w-4 text-[#5856D6]" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-800">Comparativa Financiera</h3>
                  <p className="text-xs text-gray-500">Evolución por período</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Select value="trimestral">
                  <SelectTrigger className="select-apple text-xs h-7 min-h-0 py-1 px-2">
                    <SelectValue placeholder="Trimestral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparativa financiera - Estilo Apple */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 glass-panel">
              {/* Mostrar el resultado en grande */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#F5FFF7] p-2 rounded-lg border border-[#DCFFE5]">
                  <div className="text-xs text-[#34C759] mb-1 font-medium">Ingresos</div>
                  <div className="text-sm font-semibold text-[#34C759] tracking-tight">
                    {formatCurrency(baseImponibleIngresos)}
                  </div>
                </div>
                <div className="bg-[#FFF5F5] p-2 rounded-lg border border-[#FFDFDF]">
                  <div className="text-xs text-[#FF3B30] mb-1 font-medium">Gastos</div>
                  <div className="text-sm font-semibold text-[#FF3B30] tracking-tight">
                    {formatCurrency(baseImponibleGastos)}
                  </div>
                </div>
                <div className="bg-[#F0F7FF] p-2 rounded-lg border border-[#DAE8FF]">
                  <div className="text-xs text-[#007AFF] mb-1 font-medium">Resultado</div>
                  <div className="text-sm font-semibold text-[#007AFF] tracking-tight">
                    {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
                  </div>
                </div>
              </div>
              
              {/* Gráfico */}
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={financialComparisonData}
                    margin={{
                      top: 5,
                      right: 5,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis 
                      dataKey="quarter" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `${value}€`}
                      width={30}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}€`, undefined]}
                      contentStyle={{ 
                        borderRadius: '10px',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                        border: 'none',
                        padding: '6px',
                        fontSize: '10px'
                      }}
                    />
                    <Legend 
                      iconType="circle" 
                      iconSize={5}
                      wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
                    />
                    <Bar dataKey="Ingresos" fill="#34C759" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Gastos" fill="#FF3B30" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Resultado" fill="#007AFF" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Widget de Gastos por Categoría */}
        <ExpensesByCategory 
          transactions={transactions || []} 
          categories={categories || []}
          period={`${year}-${period}`}
        />
      </div>
    </div>
  );
};

export default CompleteDashboard;