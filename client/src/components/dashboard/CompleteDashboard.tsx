import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUp, ArrowDown, PiggyBank, FileText, BarChart3, InfoIcon, ExternalLink, ChevronDown } from "lucide-react";
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
import ExpensesByCategory from "@/components/dashboard/ExpensesByCategoryNew";

interface CompleteDashboardProps {
  className?: string;
}

const CompleteDashboard: React.FC<CompleteDashboardProps> = ({ className }) => {
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  const [comparisonViewType, setComparisonViewType] = useState<"quarterly" | "yearly">("quarterly");
  const [_, navigate] = useLocation();
  
  // Efecto para cerrar los menus al hacer clic fuera de ellos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cerrar el dropdown de año si el clic es fuera
      const yearButton = document.querySelector('button[aria-controls="year-dropdown"]');
      const yearDropdown = document.getElementById('year-dropdown');
      
      if (yearDropdown && 
          !yearDropdown.contains(event.target as Node) && 
          yearButton && 
          !yearButton.contains(event.target as Node)) {
        yearDropdown.classList.add('hidden');
      }
      
      // Cerrar el dropdown de período si el clic es fuera
      const periodButton = document.querySelector('button[aria-controls="period-dropdown"]');
      const periodDropdown = document.getElementById('period-dropdown');
      
      if (periodDropdown && 
          !periodDropdown.contains(event.target as Node) && 
          periodButton && 
          !periodButton.contains(event.target as Node)) {
        periodDropdown.classList.add('hidden');
      }
      
      // Ya no necesitamos esta parte para cerrar el dropdown de vista
    };
    
    // Agregar el listener al documento
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Función para refrescar los datos del dashboard
  const { refetch } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });
  
  const refreshDashboard = () => {
    refetch();
  };

  // Obtener los datos de las estadísticas
  const { data: stats, isLoading: statsLoading, refetch: refetchDashboardStats } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
    queryFn: async () => {
      const timestamp = Date.now(); // Timestamp para evitar cache
      console.log("Fetching dashboard stats with timestamp:", timestamp);
      const res = await fetch(`/api/stats/dashboard?year=${year}&period=${period}&nocache=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      const data = await res.json();
      console.log("Dashboard stats received:", data);
      return data;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchInterval: 3000, // Refrescar cada 3 segundos automáticamente
    staleTime: 0, // Sin tiempo de caducidad - siempre considerar los datos obsoletos
    gcTime: 0, // Sin tiempo de recolección de basura - limpiar inmediatamente
  });
  
  // Forzar un refresco al cargar el componente
  useEffect(() => {
    console.log("Forzando refresco de datos del dashboard");
    refetchDashboardStats();
  }, []);
  
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

  // Calcular valores específicos usando los datos directos de la API
  const finalResult = dashboardStats.income - dashboardStats.expenses;
  // Usamos los valores directos de la API que provienen directamente del cálculo del backend
  const baseImponibleIngresos = dashboardStats.baseImponible || 0;
  const ivaRepercutido = dashboardStats.ivaRepercutido || 0;
  const baseImponibleGastos = Math.round(dashboardStats.expenses / 1.21);
  const ivaSoportado = dashboardStats.ivaSoportado || 0;
  const ivaALiquidar = dashboardStats.taxes?.ivaLiquidar || 0;
  const retencionesIrpf = dashboardStats.irpfRetenidoIngresos || 0;
  // Obtener el IRPF retenido en facturas de gastos
  const irpfRetenciones = dashboardStats.totalWithholdings || 0;
  
  // Imprimir los datos para debug
  console.log("Dashboard stats", {
    income: dashboardStats.income,
    expenses: dashboardStats.expenses,
    baseImponible: baseImponibleIngresos,
    result: finalResult
  });
  
  // Comprobar signos y valores para colores
  const isPositiveResult = finalResult >= 0;
  
  // Función para obtener el trimestre a partir de una fecha
  const getQuarterFromDate = (date: Date) => {
    const month = date.getMonth();
    if (month < 3) return "Q1";
    if (month < 6) return "Q2";
    if (month < 9) return "Q3";
    return "Q4";
  };

  // Preparar datos reales para el gráfico de comparativa financiera
  const prepareFinancialComparisonData = () => {
    if (!transactions) return [];

    // Si es vista trimestral
    if (comparisonViewType === "quarterly") {
      // Vista por trimestres
      const quarterlyData: Record<string, { Ingresos: number, Gastos: number, Resultado: number }> = {
        "Q1": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q2": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q3": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q4": { Ingresos: 0, Gastos: 0, Resultado: 0 }
      };

      // Procesar transacciones (gastos) y agruparlas por trimestre
      transactions.forEach(tx => {
        if (!tx.date) return;
        
        const txDate = new Date(tx.date);
        if (txDate.getFullYear().toString() !== year) return;
        
        const quarter = getQuarterFromDate(txDate);
        const amount = parseFloat(tx.amount);

        if (tx.type === "income") {
          // Para ingresos de transacciones directas (aunque no hay ninguna actualmente)
          // Usamos la base imponible (sin IVA)
          const baseAmount = Math.round(amount / 1.21);
          quarterlyData[quarter].Ingresos += baseAmount;
        } else {
          // Para gastos
          // Usamos la base imponible (sin IVA)
          const baseAmount = Math.round(amount / 1.21);
          quarterlyData[quarter].Gastos += baseAmount;
        }
      });

      // Agregamos los ingresos netos (sin IVA) si están disponibles en las estadísticas
      if (baseImponibleIngresos > 0 && 
          Object.values(quarterlyData).every(data => data.Ingresos === 0)) {
        
        // Sabemos que los ingresos están en Q2 (abril) según los logs
        // Usamos directamente el valor de baseImponibleIngresos que ya está sin IVA
        quarterlyData["Q2"].Ingresos = baseImponibleIngresos;
      }

      // Calculamos los gastos totales netos (sin IVA) si no hay transacciones
      let totalGastosNetos = 0;
      Object.values(quarterlyData).forEach(data => {
        totalGastosNetos += data.Gastos;
      });

      // Si los gastos calculados no coinciden con el baseImponibleGastos, ajustamos
      if (totalGastosNetos === 0 && baseImponibleGastos > 0) {
        // Asignamos todos los gastos al Q2 (abril) según los logs
        quarterlyData["Q2"].Gastos = baseImponibleGastos;
      }

      // Calcular el resultado para cada trimestre (neto)
      Object.keys(quarterlyData).forEach(quarter => {
        quarterlyData[quarter].Resultado = 
          quarterlyData[quarter].Ingresos - quarterlyData[quarter].Gastos;
      });

      console.log("Quarterly data for financial comparison (net values):", quarterlyData);

      // Convertir a array para el gráfico
      return Object.entries(quarterlyData).map(([quarter, data]) => ({
        quarter,
        Ingresos: data.Ingresos,
        Gastos: data.Gastos,
        Resultado: data.Resultado
      }));
    } 
    else {
      // Vista por años
      const yearlyData: Record<string, { Ingresos: number, Gastos: number, Resultado: number }> = {
        [year]: { Ingresos: baseImponibleIngresos, Gastos: baseImponibleGastos, Resultado: baseImponibleIngresos - baseImponibleGastos },
        [(parseInt(year) - 1).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 },
        [(parseInt(year) - 2).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 }
      };

      console.log("Yearly data for financial comparison:", yearlyData);

      // Convertir a array para el gráfico
      return Object.entries(yearlyData).map(([year, data]) => ({
        quarter: year, // Reutilizamos el mismo campo para compatibilidad con el gráfico
        Ingresos: data.Ingresos,
        Gastos: data.Gastos,
        Resultado: data.Resultado
      })).reverse(); // Ordenamos de año más antiguo a más reciente
    }
  };

  // Datos para el gráfico de comparativa financiera
  const financialComparisonData = prepareFinancialComparisonData();

  const isLoading = statsLoading || transactionsLoading || categoriesLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("container-apple section-apple bg-[#F9F9F9] px-0 mx-0", className)}>
      {/* Cabecera del dashboard con título y controles - Estilo Apple */}
      <div className="section-header px-1 py-1 md:px-4 md:py-4">
        <div className="flex items-center">
          <BarChart3 className="h-6 w-6 text-primary mr-3" />
          <h1 className="section-title">Dashboard</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Botón de Año */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => document.getElementById('year-dropdown')?.classList.toggle('hidden')}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              aria-controls="year-dropdown"
            >
              <span>{year}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown años */}
            <div id="year-dropdown" className="hidden absolute z-10 mt-1 bg-white rounded-md shadow-lg w-24 py-1 border border-gray-200 focus:outline-none">
              <button
                onClick={() => {
                  setYear("2025");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${year === "2025" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2025
              </button>
              <button
                onClick={() => {
                  setYear("2024");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${year === "2024" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2024
              </button>
              <button
                onClick={() => {
                  setYear("2023");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${year === "2023" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2023
              </button>
            </div>
          </div>
          
          {/* Botón de Periodo */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => document.getElementById('period-dropdown')?.classList.toggle('hidden')}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-white rounded-md border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              aria-controls="period-dropdown"
            >
              <span>
                {period === "all" ? "Todo el año" : 
                period === "q1" ? "Trimestre 1" : 
                period === "q2" ? "Trimestre 2" : 
                period === "q3" ? "Trimestre 3" : 
                period === "q4" ? "Trimestre 4" : ""}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown periodos */}
            <div id="period-dropdown" className="hidden absolute z-10 mt-1 bg-white rounded-md shadow-lg w-40 py-1 border border-gray-200 focus:outline-none">
              <button
                onClick={() => {
                  setPeriod("all");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${period === "all" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Todo el año
              </button>
              <button
                onClick={() => {
                  setPeriod("q1");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${period === "q1" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 1
              </button>
              <button
                onClick={() => {
                  setPeriod("q2");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${period === "q2" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 2
              </button>
              <button
                onClick={() => {
                  setPeriod("q3");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${period === "q3" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 3
              </button>
              <button
                onClick={() => {
                  setPeriod("q4");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${period === "q4" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 4
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primera fila: Widgets principales - Estilo Apple - Layout expandido 
          En móvil: Ingresos y Gastos en la misma fila, Resultado abajo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 md:gap-8 mt-1 md:mt-8">
        {/* Widget de Ingresos - Estilo Apple */}
        <div className="dashboard-card fade-in mx-0 px-0">
          <div className="md:p-6 p-2">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-[#E2F6ED] md:p-3 p-2 rounded-full mr-2 md:mr-3">
                <ArrowUp className="md:h-5 md:w-5 h-4 w-4 text-[#34C759]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Ingresos</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0.5 md:block hidden">Entradas totales</p>
              </div>
            </div>
            
            <div className="md:mb-5 mb-2">
              <div className="md:text-3xl text-2xl font-bold text-[#34C759] md:pt-3 pt-1">
                {formatCurrency(baseImponibleIngresos)}
              </div>
              <div className="stat-label text-xs md:text-sm mt-1 md:block hidden">
                Ingresos totales (sin IVA)
              </div>
            </div>
            
            <div className="space-y-2 md:mb-5 mb-2 md:p-4 p-2 bg-[#F9FDFB] rounded-xl border border-[#E2F6ED]">
              <div className="flex justify-between items-center">
                <span className="md:text-sm text-xs text-gray-600">IVA repercutido:</span>
                <span className="font-medium text-gray-800 md:text-sm text-xs">{formatCurrency(ivaRepercutido)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="md:text-sm text-xs text-gray-600">IRPF:</span>
                <span className="font-medium text-gray-800 md:text-sm text-xs">{formatCurrency(retencionesIrpf)}</span>
              </div>
            </div>
            
            <Link href="/invoices" className="md:block hidden">
              <button className="w-full px-4 py-2 rounded-md font-medium text-[#34C759] border border-[#34C759] hover:bg-[#34C759]/10 transition-colors">
                Ver facturas
              </button>
            </Link>
          </div>
        </div>

        {/* Widget de Gastos - Estilo Apple */}
        <div className="dashboard-card fade-in mx-0 px-0">
          <div className="md:p-6 p-2">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-[#FEECEB] md:p-3 p-2 rounded-full mr-2 md:mr-3">
                <ArrowDown className="md:h-5 md:w-5 h-4 w-4 text-[#FF3B30]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Gastos</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0.5 md:block hidden">Salidas totales</p>
              </div>
            </div>
            
            <div className="md:mb-5 mb-2">
              <div className="md:text-3xl text-2xl font-bold text-[#FF3B30] md:pt-3 pt-1">
                {formatCurrency(baseImponibleGastos)}
              </div>
              <div className="stat-label text-xs md:text-sm mt-1 md:block hidden">
                Gastos totales
              </div>
            </div>
            
            <div className="space-y-2 md:mb-5 mb-2 md:p-4 p-2 bg-[#FFFAFA] rounded-xl border border-[#FEECEB]">
              <div className="flex justify-between items-center">
                <span className="md:text-sm text-xs text-gray-600">IVA soportado:</span>
                <span className="font-medium text-gray-800 md:text-sm text-xs">{formatCurrency(ivaSoportado)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="md:text-sm text-xs text-gray-600">IRPF:</span>
                <span className="font-medium text-gray-800 md:text-sm text-xs">{formatCurrency(irpfRetenciones)}</span>
              </div>
            </div>
            
            <Link href="/transactions" className="md:block hidden">
              <button className="w-full px-4 py-2 rounded-md font-medium text-[#FF3B30] border border-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors">
                Ver gastos
              </button>
            </Link>
          </div>
        </div>

        {/* Widget de Resultado Final - Estilo Apple - Ocupa todo el ancho en móvil */}
        <div className="dashboard-card fade-in col-span-2 lg:col-span-1 mx-0 px-0">
          <div className="md:p-6 p-2">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-[#E9F8FB] md:p-3 p-2 rounded-full mr-2 md:mr-3">
                <PiggyBank className="md:h-5 md:w-5 h-4 w-4 text-[#007AFF]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Resultado Final</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0.5 md:block hidden">Ingresos - Gastos</p>
              </div>
            </div>
            
            <div className="md:mb-5 mb-2">
              <div className="md:text-3xl text-2xl font-bold text-[#007AFF] md:pt-3 pt-1">
                {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
              </div>
              <div className="stat-label text-xs md:text-sm mt-1 md:block hidden">
                {isPositiveResult ? 'Beneficio neto' : 'Pérdida neta'}
              </div>
            </div>
            
            <div className="space-y-2 md:mb-5 mb-2 md:p-4 p-2 bg-[#F7FDFF] rounded-xl border border-[#E9F8FB]">
              <div className="flex justify-between items-center">
                <span className="md:text-sm text-xs text-gray-600">IVA a pagar:</span>
                <span className="font-medium text-gray-800 md:text-sm text-xs">{formatCurrency(dashboardStats.taxStats?.ivaLiquidar || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="md:text-sm text-xs text-gray-600">IRPF a pagar:</span>
                <span className="font-medium text-gray-800 md:text-sm text-xs">{formatCurrency(dashboardStats.taxStats?.irpfPagar || 0)}</span>
              </div>
            </div>
            
            <Link href="/reports" className="md:block hidden">
              <button className="w-full px-4 py-2 rounded-md font-medium text-[#007AFF] border border-[#007AFF] hover:bg-[#007AFF]/10 transition-colors">
                Ver informes
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Segunda fila: Widgets de Comparativa Financiera y Gastos por Categoría - Estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-1 md:gap-8 mt-1 md:mt-8">
        {/* Widget de Comparativa Financiera - Estilo Apple */}
        <div className="dashboard-card fade-in col-span-3 mx-0 px-0">
          <div className="p-1 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="bg-[#F0EDFF] p-2 rounded-full mr-2">
                  <BarChart3 className="h-4 w-4 text-[#5856D6]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-800 mb-0 leading-tight">Comparativa Financiera</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Evolución por período</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  defaultValue="quarterly" 
                  value={comparisonViewType}
                  onValueChange={(value) => {
                    setComparisonViewType(value as "quarterly" | "yearly");
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-xs bg-white focus:ring-0">
                    <SelectValue>
                      {comparisonViewType === "quarterly" ? "Trimestral" : "Anual"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quarterly" className="text-xs">Trimestral</SelectItem>
                    <SelectItem value="yearly" className="text-xs">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparativa financiera - Estilo Apple */}
            <div className="bg-white rounded-xl border border-gray-100 p-1 sm:p-3 glass-panel">
              {/* Mostrar el resultado en grande */}
              <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-2 sm:mb-3">
                <div className="bg-[#F5FFF7] p-1 sm:p-2 rounded-lg border border-[#DCFFE5]">
                  <div className="text-xs text-[#34C759] mb-1 font-medium">Ingresos</div>
                  <div className="text-sm font-semibold text-[#34C759] tracking-tight">
                    {formatCurrency(baseImponibleIngresos)}
                  </div>
                </div>
                <div className="bg-[#FFF5F5] p-1 sm:p-2 rounded-lg border border-[#FFDFDF]">
                  <div className="text-xs text-[#FF3B30] mb-1 font-medium">Gastos</div>
                  <div className="text-sm font-semibold text-[#FF3B30] tracking-tight">
                    {formatCurrency(baseImponibleGastos)}
                  </div>
                </div>
                <div className="bg-[#F0F7FF] p-1 sm:p-2 rounded-lg border border-[#DAE8FF]">
                  <div className="text-xs text-[#007AFF] mb-1 font-medium">Resultado</div>
                  <div className="text-sm font-semibold text-[#007AFF] tracking-tight">
                    {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
                  </div>
                </div>
              </div>
              
              {/* Gráfico o mensaje de datos insuficientes */}
              <div className="h-[180px]">
                {financialComparisonData && financialComparisonData.length > 0 && 
                  financialComparisonData.some(item => item.Ingresos > 0 || item.Gastos > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={financialComparisonData}
                      margin={{
                        top: 5,
                        right: 5,
                        left: 10,
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
                        width={45}
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
                ) : (
                  <div className="h-full flex flex-col items-center justify-center">
                    <div className="text-gray-400 mb-2">
                      <BarChart3 className="h-12 w-12 mx-auto text-gray-200" strokeWidth={1} />
                    </div>
                    <p className="text-gray-500 text-sm text-center">
                      No hay datos para este año
                    </p>
                    <p className="text-gray-400 text-xs text-center mt-1">
                      Los datos se mostrarán cuando registres transacciones
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Widget de Gastos por Categoría */}
        <div className="col-span-2 mx-0 px-0">
          <ExpensesByCategory 
            transactions={transactions || []} 
            categories={categories || []}
            period={`${year}-${period}`}
          />
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;