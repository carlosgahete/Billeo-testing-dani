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
    refetchInterval: 5000, // Refrescar cada 5 segundos automáticamente
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
    <div className={cn("p-6 bg-slate-50/80", className)}>
      {/* Cabecera del dashboard con título y controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-slate-200 mb-4">
        <div className="flex items-center mb-3 md:mb-0">
          <BarChart3 className="h-6 w-6 text-indigo-600 mr-2" />
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px] bg-slate-50 border-slate-200 h-9">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 h-9">
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
          
          <Button 
            size="sm"
            onClick={() => refreshDashboard()}
            className="h-9 bg-indigo-600 hover:bg-indigo-700"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Primera fila: Widgets principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Widget de Ingresos */}
        <Card className="overflow-hidden rounded-md shadow-sm">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-green-500/10 p-3 rounded-full mr-4">
                  <ArrowUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-700">Ingresos</h3>
                  <p className="text-sm text-green-600/70">Entradas totales</p>
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className="text-3xl font-bold text-green-700">
                {formatCurrency(baseImponibleIngresos)}
              </div>
              <div className="text-sm text-green-600/70">
                Base imponible (sin IVA)
              </div>
            </div>
            <div className="space-y-2 mb-4 p-3 bg-white/60 rounded-md border border-green-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800">Base imponible:</span>
                <span className="font-medium text-green-800">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800">IVA repercutido (21%):</span>
                <span className="font-medium text-green-800">{formatCurrency(ivaRepercutido)}</span>
              </div>
            </div>
            <div>
              <Link href="/invoices">
                <Button variant="outline" className="w-full bg-white border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
                  Ver facturas
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Widget de Gastos */}
        <Card className="overflow-hidden rounded-md shadow-sm">
          <div className="bg-gradient-to-r from-red-50 to-red-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-red-500/10 p-3 rounded-full mr-4">
                  <ArrowDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-700">Gastos</h3>
                  <p className="text-sm text-red-600/70">Salidas totales</p>
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className="text-3xl font-bold text-red-700">
                {formatCurrency(baseImponibleGastos)}
              </div>
              <div className="text-sm text-red-600/70">
                Base imponible (sin IVA)
              </div>
            </div>
            <div className="space-y-2 mb-4 p-3 bg-white/60 rounded-md border border-red-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-800">Base imponible:</span>
                <span className="font-medium text-red-800">{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-800">IVA soportado (21%):</span>
                <span className="font-medium text-red-800">{formatCurrency(ivaSoportado)}</span>
              </div>
            </div>
            <div>
              <Link href="/income-expense">
                <Button variant="outline" className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                  Ver gastos
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Widget de Resultado Final */}
        <Card className="overflow-hidden rounded-md shadow-sm">
          <div className={`bg-gradient-to-r ${isPositiveResult ? 'from-[#e6f9fb] to-[#daf7fa]' : 'from-amber-50 to-amber-100'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className={`${isPositiveResult ? 'bg-[#04C4D9]/10' : 'bg-amber-500/10'} p-3 rounded-full mr-4`}>
                  <PiggyBank className={`h-6 w-6 ${isPositiveResult ? 'text-[#04C4D9]' : 'text-amber-600'}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isPositiveResult ? 'text-[#04a6b8]' : 'text-amber-700'}`}>Resultado Final</h3>
                  <p className={`text-sm ${isPositiveResult ? 'text-[#04C4D9]/70' : 'text-amber-600/70'}`}>Ingresos - Gastos</p>
                </div>
              </div>
            </div>
            <div className="mb-4 space-y-2">
              <div className={`text-3xl font-bold ${isPositiveResult ? 'text-[#04a6b8]' : 'text-amber-700'}`}>
                {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
              </div>
              <div className={`text-sm ${isPositiveResult ? 'text-[#04C4D9]/70' : 'text-amber-600/70'}`}>
                {isPositiveResult ? 'Beneficio neto (base imponible)' : 'Pérdida neta (base imponible)'}
              </div>
            </div>
            <div className="space-y-2 mb-4 p-3 bg-white/60 rounded-md border border-[#04C4D9]/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Base imponible ingresos:</span>
                <span className="font-medium text-green-700">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-700">Base imponible gastos:</span>
                <span className="font-medium text-red-700">-{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200 mt-1">
                <span className="text-slate-800 font-medium">Resultado (base imponible):</span>
                <span className="font-bold text-slate-800">{formatCurrency(baseImponibleIngresos - baseImponibleGastos)}</span>
              </div>
            </div>
            <div>
              <Link href="/reports">
                <Button variant="outline" className={`w-full bg-white ${isPositiveResult ? 'border-[#04C4D9]/30 text-[#04a6b8] hover:bg-[#f0fdfe] hover:text-[#04a6b8]' : 'border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800'}`}>
                  Ver informes
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Segunda fila: Widgets de Resumen Fiscal y Comparativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Widget de Resumen Fiscal */}
        <Card className="overflow-hidden rounded-md shadow-sm">
          <div className="bg-white p-5 border-t-4 border-indigo-500">
            <div className="flex items-center mb-4 border-b pb-2">
              <FileText className="mr-2 h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-semibold text-slate-800">Resumen Fiscal</h3>
              <div className="flex items-center space-x-2 text-sm ml-auto">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-[80px] h-8 text-xs bg-slate-50">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-50">
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
            <div className="bg-slate-50 rounded-md p-4 mb-3 border border-slate-200">
              <div className="text-sm text-slate-800 mb-1 flex justify-between items-center">
                <span>IVA a liquidar (Todo el año, 2025)</span>
                <span className="bg-blue-100 text-xs py-0.5 px-1.5 rounded text-blue-700">21% IVA</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(ivaALiquidar)}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Resumen anual de IVA (modelo 390)
              </div>
            </div>

            {/* IRPF */}
            <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
              <div className="text-sm text-slate-800 mb-1 flex justify-between items-center">
                <span>Retenciones IRPF (Todo el año, 2025)</span>
                <span className="bg-amber-100 text-xs py-0.5 px-1.5 rounded text-amber-700">15% IRPF</span>
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(dashboardStats.taxes?.incomeTax || 0)}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Retenciones acumuladas en el año (modelo 190)
              </div>
            </div>

            {/* Botón de Informes */}
            <div className="mt-4">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Ver informes fiscales
              </Button>
            </div>
          </div>
        </Card>

        {/* Widget de Comparativa Financiera */}
        <Card className="overflow-hidden rounded-md shadow-sm">
          <div className="bg-white p-5 border-t-4 border-purple-500">
            <div className="flex items-center mb-4 border-b pb-2">
              <BarChart3 className="mr-2 h-5 w-5 text-purple-500" />
              <h3 className="text-base font-semibold text-slate-800">Comparativa Financiera</h3>
              <div className="flex items-center space-x-2 text-sm ml-auto">
                <Select value="trimestral">
                  <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-50">
                    <SelectValue placeholder="Trimestral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value="2025">
                  <SelectTrigger className="w-[80px] h-8 text-xs bg-slate-50">
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
            <div className="h-[280px] p-2 bg-slate-50 rounded-md border border-slate-200">
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
                  <Bar dataKey="Resultado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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