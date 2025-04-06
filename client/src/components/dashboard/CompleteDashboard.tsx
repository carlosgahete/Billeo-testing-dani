import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUp, ArrowDown, PlusCircle, FileText, BarChart3, InfoIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
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
    <div className={cn("space-y-6", className)}>
      {/* Filtros para el dashboard */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold">Dashboard Financiero</h2>
        <div className="flex items-center space-x-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]">
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

      {/* Primera fila: Widgets principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Widget de Ingresos */}
        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-medium text-green-700">Ingresos</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-green-700/50 hover:text-green-700 hover:bg-green-200/20"
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(dashboardStats.income)}
              </div>
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-green-600/80">Base imponible:</span>
                <span className="font-medium">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600/80">IVA repercutido:</span>
                <span className="font-medium">{formatCurrency(ivaRepercutido)}</span>
              </div>
            </div>
            <div className="mt-3">
              <Link href="/invoices">
                <Button variant="outline" className="w-full text-xs h-8 text-green-700 border-green-300 bg-green-100/50 hover:bg-green-200/50">
                  Ver facturas
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Widget de Gastos */}
        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-red-50 to-red-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-medium text-red-700">Gastos</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-700/50 hover:text-red-700 hover:bg-red-200/20"
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-red-700">
                {formatCurrency(dashboardStats.expenses)}
              </div>
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-red-600/80">Base imponible:</span>
                <span className="font-medium">{formatCurrency(baseImponibleGastos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600/80">IVA soportado:</span>
                <span className="font-medium">{formatCurrency(ivaSoportado)}</span>
              </div>
            </div>
            <div className="mt-3">
              <Link href="/income-expense">
                <Button variant="outline" className="w-full text-xs h-8 text-red-700 border-red-300 bg-red-100/50 hover:bg-red-200/50">
                  Ver gastos
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Widget de Ingresos Brutos */}
        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium text-blue-700">Ingresos Brutos</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-700/50 hover:text-blue-700 hover:bg-blue-200/20"
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(dashboardStats.income)}
              </div>
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-blue-600/80">Base imponible:</span>
                <span className="font-medium">{formatCurrency(baseImponibleIngresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600/80">IVA (21%):</span>
                <span className="font-medium">{formatCurrency(ivaRepercutido)}</span>
              </div>
            </div>
            
            {/* Facturas pendientes */}
            <div className="mt-2 bg-white/60 rounded-lg p-2 border border-blue-200">
              <div className="flex justify-between items-center text-xs text-blue-700 font-medium mb-1">
                <span>Facturas pendientes</span>
                <span className="bg-blue-100 px-1.5 py-0.5 rounded">↓ {dashboardStats.pendingCount || 0} facturas por cobrar</span>
              </div>
              <div className="text-lg font-bold text-blue-800">
                {formatCurrency(dashboardStats.pendingInvoices)}
              </div>
            </div>
          </div>
        </Card>

        {/* Widget de Resultado Final */}
        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-medium text-emerald-700">Resultado Final</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-emerald-700/50 hover:text-emerald-700 hover:bg-emerald-200/20"
              >
                <InfoIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-2">
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(finalResult)}
              </div>
            </div>
            <div className="text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-emerald-600/80">Base + IVA (bruto):</span>
                <span className="font-medium">{formatCurrency(dashboardStats.income)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600/80">Retenciones IRPF:</span>
                <span className="font-medium text-red-600">-{formatCurrency(retencionesIrpf)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600/80">IVA a liquidar:</span>
                <span className="font-medium text-blue-600">{formatCurrency(ivaALiquidar)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200 mt-1">
                <span className="text-emerald-700 font-medium">Total neto (cobrado):</span>
                <span className="font-bold">{formatCurrency(finalResult)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Segunda fila: Widgets de Resumen Fiscal y Comparativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Widget de Resumen Fiscal */}
        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium">Resumen Fiscal</h3>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="w-[80px] h-8 text-xs">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
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
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <div className="text-sm text-blue-800 mb-1 flex justify-between items-center">
                <span>IVA a liquidar (Todo el año, 2025)</span>
                <span className="bg-blue-100 text-xs py-0.5 px-1.5 rounded text-blue-700">21% IVA</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(ivaALiquidar)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Resumen anual de IVA (modelo 390)
              </div>
            </div>

            {/* IRPF */}
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-sm text-amber-800 mb-1 flex justify-between items-center">
                <span>Retenciones IRPF (Todo el año, 2025)</span>
                <span className="bg-amber-100 text-xs py-0.5 px-1.5 rounded text-amber-700">15% IRPF</span>
              </div>
              <div className="text-2xl font-bold text-amber-700">
                {formatCurrency(dashboardStats.taxes?.incomeTax || 0)}
              </div>
              <div className="text-xs text-amber-600 mt-1">
                Retenciones acumuladas en el año (modelo 190)
              </div>
            </div>

            {/* Botón de Informes */}
            <div className="mt-3">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                Ver informes fiscales
              </Button>
            </div>
          </div>
        </Card>

        {/* Widget de Comparativa Financiera */}
        <Card className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-medium">Comparativa Financiera</h3>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Select value="trimestral">
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="Trimestral" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value="2025">
                  <SelectTrigger className="w-[80px] h-8 text-xs">
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
            <div className="flex justify-center space-x-2 mb-3">
              <Button
                variant={graphView === "barras" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setGraphView("barras")}
              >
                Barras
              </Button>
              <Button
                variant={graphView === "area" ? "default" : "outline"}
                size="sm"
                className="text-xs"
                onClick={() => setGraphView("area")}
              >
                Área
              </Button>
            </div>

            {/* Gráfico */}
            <div className="h-[250px]">
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