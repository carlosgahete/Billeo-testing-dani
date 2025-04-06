import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { 
  Loader2, 
  ArrowUp, 
  ArrowDown, 
  PiggyBank, 
  FileText, 
  BarChart3, 
  InfoIcon, 
  ExternalLink,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CalendarRange,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    <div className={cn("p-6 bg-gray-50", className)}>
      {/* Cabecera del dashboard con título y controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-3 md:mb-0">
          <div className="bg-[#04C4D9] p-2 rounded-full mr-3">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Financiero</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center">
            <Calendar className="text-gray-400 h-4 w-4 mr-2" />
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px] border-gray-200 h-9">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
            <CalendarRange className="text-gray-400 h-4 w-4 mr-2" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px] border-gray-200 h-9">
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
          
          <Button 
            size="sm"
            onClick={() => refreshDashboard()}
            className="h-9 bg-[#04C4D9] hover:bg-[#03b3c7] text-white"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Primera fila: Widgets principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Widget de Ingresos */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Ingresos</h3>
              <div className="p-2 rounded-full bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            
            <div className="mt-6 flex items-end space-x-1">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(baseImponibleIngresos)}
              </div>
              <div className="text-sm text-gray-500 mb-1 ml-1">
                sin IVA
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500">Base imponible</span>
                <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(baseImponibleIngresos)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500">IVA repercutido</span>
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-100">21%</Badge>
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(ivaRepercutido)}</span>
            </div>
            <Separator className="my-3 bg-gray-200" />
            <Link href="/invoices" className="inline-block w-full">
              <Button variant="ghost" className="w-full border border-gray-200 hover:bg-green-50 text-gray-700 hover:text-gray-900 font-medium">
                <ArrowUpRight className="h-4 w-4 mr-2 text-green-600" />
                Ver facturas
              </Button>
            </Link>
          </div>
        </Card>

        {/* Widget de Gastos */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Gastos</h3>
              <div className="p-2 rounded-full bg-red-100">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
            
            <div className="mt-6 flex items-end space-x-1">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(baseImponibleGastos)}
              </div>
              <div className="text-sm text-gray-500 mb-1 ml-1">
                sin IVA
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500">Base imponible</span>
                <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(baseImponibleGastos)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-500">IVA soportado</span>
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-blue-50 text-blue-700 border-blue-100">21%</Badge>
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(ivaSoportado)}</span>
            </div>
            <Separator className="my-3 bg-gray-200" />
            <Link href="/income-expense" className="inline-block w-full">
              <Button variant="ghost" className="w-full border border-gray-200 hover:bg-red-50 text-gray-700 hover:text-gray-900 font-medium">
                <ArrowDownRight className="h-4 w-4 mr-2 text-red-600" />
                Ver gastos
              </Button>
            </Link>
          </div>
        </Card>

        {/* Widget de Resultado Final */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Resultado Final</h3>
              <div className="p-2 rounded-full bg-[#e6f9fb]">
                <PiggyBank className="h-5 w-5 text-[#04C4D9]" />
              </div>
            </div>
            
            <div className="mt-6 flex items-end space-x-1">
              <div className="text-3xl font-bold text-[#04C4D9]">
                {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
              </div>
              <div className="text-sm text-gray-500 mb-1 ml-1">
                beneficio neto
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500">Ingresos</span>
              <span className="font-medium text-green-600">+{formatCurrency(baseImponibleIngresos)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-500">Gastos</span>
              <span className="font-medium text-red-600">-{formatCurrency(baseImponibleGastos)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 pb-1 border-t border-gray-200 mt-2">
              <span className="text-sm font-medium text-gray-700">Resultado Final</span>
              <span className="font-bold text-[#04C4D9]">{formatCurrency(baseImponibleIngresos - baseImponibleGastos)}</span>
            </div>
            <Separator className="my-3 bg-gray-200" />
            <Link href="/reports" className="inline-block w-full">
              <Button variant="ghost" className="w-full border border-gray-200 hover:bg-[#f0fdfe] text-gray-700 hover:text-gray-900 font-medium">
                <BarChart3 className="h-4 w-4 mr-2 text-[#04C4D9]" />
                Ver informes
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Segunda fila: Widgets de Resumen Fiscal y Comparativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Widget de Resumen Fiscal */}
        <Card className="overflow-hidden rounded-lg shadow-md border-0">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Resumen Fiscal</h3>
              <div className="flex items-center space-x-2 text-sm ml-auto">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-[80px] h-8 text-xs bg-gray-100 border-gray-200">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-100 border-gray-200">
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

            {/* IVA a liquidar */}
            <div className="bg-blue-50 rounded-md p-4 mb-3 border border-blue-100">
              <div className="text-sm text-gray-700 mb-1 flex justify-between items-center">
                <span>IVA a liquidar (Todo el año, 2025)</span>
                <span className="bg-blue-100 text-xs py-0.5 px-1.5 rounded text-blue-700">21% IVA</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(ivaALiquidar)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Resumen anual de IVA (modelo 390)
              </div>
            </div>

            {/* IRPF */}
            <div className="bg-amber-50 rounded-md p-4 border border-amber-100">
              <div className="text-sm text-gray-700 mb-1 flex justify-between items-center">
                <span>Retenciones IRPF (Todo el año, 2025)</span>
                <span className="bg-amber-100 text-xs py-0.5 px-1.5 rounded text-amber-700">15% IRPF</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(dashboardStats.taxes?.incomeTax || 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Retenciones acumuladas en el año (modelo 190)
              </div>
            </div>

            {/* Botón de Informes */}
            <div className="mt-4">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                Ver informes fiscales
              </Button>
            </div>
          </div>
        </Card>

        {/* Widget de Comparativa Financiera */}
        <Card className="overflow-hidden rounded-lg shadow-md border-0">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-violet-500"></div>
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Comparativa Financiera</h3>
              <div className="flex items-center space-x-2 text-sm ml-auto">
                <Select value="trimestral">
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-gray-100 border-gray-200">
                    <SelectValue placeholder="Trimestral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value="2025">
                  <SelectTrigger className="w-[80px] h-8 text-xs bg-gray-100 border-gray-200">
                    <SelectValue placeholder="2025" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selector de vista de gráfico */}
            <div className="flex justify-center space-x-2 mb-4">
              <Button
                variant={graphView === "barras" ? "default" : "outline"}
                size="sm"
                className={graphView === "barras" ? "text-xs bg-purple-600 hover:bg-purple-700" : "text-xs"}
                onClick={() => setGraphView("barras")}
              >
                Barras
              </Button>
              <Button
                variant={graphView === "area" ? "default" : "outline"}
                size="sm"
                className={graphView === "area" ? "text-xs bg-purple-600 hover:bg-purple-700" : "text-xs"}
                onClick={() => setGraphView("area")}
              >
                Área
              </Button>
            </div>

            {/* Gráfico */}
            <div className="h-[280px] p-3 bg-gray-50 rounded-md border border-gray-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
                  <Tooltip 
                    formatter={(value: number) => [`${value}€`, undefined]}
                    contentStyle={{ 
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                      border: 'none'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resultado" fill="#04C4D9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CompleteDashboard;