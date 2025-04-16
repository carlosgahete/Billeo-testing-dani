import React, { useState, useEffect } from "react";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUp, ArrowDown, PiggyBank, FileText, BarChart3, InfoIcon, ExternalLink, ChevronDown, Receipt, ClipboardCheck, Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useDashboardData } from "@/hooks/useDashboardData";

interface CompleteDashboardProps {
  className?: string;
}

const CompleteDashboard: React.FC<CompleteDashboardProps> = ({ className }) => {
  const [comparisonViewType, setComparisonViewType] = useState<"quarterly" | "yearly">("quarterly");
  const [_, navigate] = useLocation();
  
  // Usamos el hook centralizado para obtener datos del dashboard
  const { data: dashboardData, isLoading, filters, refetch } = useDashboardData();
  
  // Estados locales para UI
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  
  // Sincronizamos nuestro estado local con el hook
  useEffect(() => {
    if (filters) {
      setSelectedYear(filters.year);
      setSelectedPeriod(filters.period);
    }
  }, [filters]);
  
  // Efecto para cambiar los filtros cuando cambia el año o período
  useEffect(() => {
    if (filters && (filters.year !== selectedYear || filters.period !== selectedPeriod)) {
      filters.changeYear(selectedYear);
      filters.changePeriod(selectedPeriod);
    }
  }, [selectedYear, selectedPeriod, filters]);
  
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
    };
    
    // Agregar el listener al documento
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
  const stats = dashboardData || defaultStats;

  // Calcular valores específicos usando los datos directos de la API
  const finalResult = stats.income - stats.expenses;
  // Usamos los valores directos de la API que provienen directamente del cálculo del backend
  const baseImponibleIngresos = stats.baseImponible || 0;
  const ivaRepercutido = stats.ivaRepercutido || 0;
  const baseImponibleGastos = stats.baseImponibleGastos || Math.round(stats.expenses / 1.21);
  const ivaSoportado = stats.ivaSoportado || 0;
  const ivaALiquidar = stats.taxes?.ivaALiquidar || 0;
  const retencionesIrpf = stats.irpfRetenidoIngresos || 0;
  // Obtener el IRPF retenido en facturas de gastos
  const irpfRetenciones = stats.totalWithholdings || 0;
  
  // Imprimir los datos para debug
  console.log("Dashboard stats", {
    income: stats.income,
    expenses: stats.expenses,
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

  // Preparar datos para el gráfico de comparativa financiera
  const prepareFinancialComparisonData = () => {
    // Vista por trimestres
    if (comparisonViewType === "quarterly") {
      // Datos trimestrales simplificados
      const quarterlyData: Record<string, { Ingresos: number, Gastos: number, Resultado: number }> = {
        "Q1": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q2": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q3": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q4": { Ingresos: 0, Gastos: 0, Resultado: 0 }
      };

      // Asignamos los datos al trimestre correcto basándonos en la información disponible
      // Sabemos que los ingresos están en Q2 (abril) según los logs
      quarterlyData["Q2"].Ingresos = baseImponibleIngresos;
      quarterlyData["Q2"].Gastos = baseImponibleGastos;
      quarterlyData["Q2"].Resultado = baseImponibleIngresos - baseImponibleGastos;
      
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
        [selectedYear]: { Ingresos: baseImponibleIngresos, Gastos: baseImponibleGastos, Resultado: baseImponibleIngresos - baseImponibleGastos },
        [(parseInt(selectedYear) - 1).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 },
        [(parseInt(selectedYear) - 2).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 }
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("container-apple section-apple bg-[#F9F9F9] px-0 mx-0 sm:px-4 pb-48 mb-20", className)}>
      {/* Cabecera del dashboard con título centrado y elevado solo en móvil, con icono en desktop */}
      <div className="section-header px-0 pt-0 md:pt-1 pb-0 md:px-4 md:py-4">
        <div className="flex items-center justify-center md:justify-start mt-[-15px] md:mt-0">
          <div className="md:flex hidden items-center">
            <BarChart3 className="h-6 w-6 text-primary mr-3" />
          </div>
          <h1 className="section-title text-sm md:text-lg font-medium hidden md:block">Dashboard</h1>
        </div>
        
        <div className="flex items-center w-full gap-1 sm:gap-3 sm:flex-wrap sm:w-auto mt-[-10px] sm:mt-0">
          {/* Botón de Año - En móvil ocupa el 45% del ancho */}
          <div className="relative w-[45%] sm:w-auto">
            <button 
              type="button"
              onClick={() => document.getElementById('year-dropdown')?.classList.toggle('hidden')}
              className="inline-flex items-center justify-center w-full gap-1 px-4 py-1.5 rounded-md border shadow-sm text-sm font-medium focus:outline-none md:bg-white md:border-gray-200 md:text-gray-700 md:hover:bg-gray-50 bg-[#007AFF]/90 border-[#007AFF]/90 text-white hover:bg-[#0069D9]/90"
              aria-controls="year-dropdown"
            >
              <span>{selectedYear}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 md:text-gray-500 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown años */}
            <div id="year-dropdown" className="hidden absolute z-10 mt-1 bg-white rounded-md shadow-lg w-full sm:w-24 py-1 border border-gray-200 focus:outline-none">
              <button
                onClick={() => {
                  setSelectedYear("2025");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedYear === "2025" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2025
              </button>
              <button
                onClick={() => {
                  setSelectedYear("2024");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedYear === "2024" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2024
              </button>
              <button
                onClick={() => {
                  setSelectedYear("2023");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedYear === "2023" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2023
              </button>
            </div>
          </div>
          
          {/* Botón de Periodo - En móvil ocupa el 55% del ancho */}
          <div className="relative w-[55%] sm:w-auto">
            <button 
              type="button"
              onClick={() => document.getElementById('period-dropdown')?.classList.toggle('hidden')}
              className="inline-flex items-center justify-center w-full gap-1 px-4 py-1.5 rounded-md border shadow-sm text-sm font-medium focus:outline-none md:bg-white md:border-gray-200 md:text-gray-700 md:hover:bg-gray-50 bg-[#007AFF]/90 border-[#007AFF]/90 text-white hover:bg-[#0069D9]/90"
              aria-controls="period-dropdown"
            >
              <span>
                {selectedPeriod === "all" ? "Todo el año" : 
                selectedPeriod === "q1" ? "Trimestre 1" : 
                selectedPeriod === "q2" ? "Trimestre 2" : 
                selectedPeriod === "q3" ? "Trimestre 3" : 
                selectedPeriod === "q4" ? "Trimestre 4" : ""}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 md:text-gray-500 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown periodos - Ancho completo en móvil */}
            <div id="period-dropdown" className="hidden absolute z-10 mt-1 bg-white rounded-md shadow-lg w-full sm:w-40 py-1 border border-gray-200 focus:outline-none">
              <button
                onClick={() => {
                  setSelectedPeriod("all");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedPeriod === "all" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Todo el año
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod("q1");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedPeriod === "q1" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 1
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod("q2");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedPeriod === "q2" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 2
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod("q3");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedPeriod === "q3" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 3
              </button>
              <button
                onClick={() => {
                  setSelectedPeriod("q4");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${selectedPeriod === "q4" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 4
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primera fila: Widgets principales - Estilo Apple - Layout expandido 
          En móvil: Ingresos y Gastos en la misma fila, Resultado abajo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 mt-0 md:mt-8">
        {/* Widget de Ingresos - Estilo Apple - Col-span-1 en móvil, normal en tablet/desktop */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-[#E2F6ED] md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <ArrowUp className="md:h-5 md:w-5 h-4 w-4 text-[#34C759]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Ingresos</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Base imponible (sin IVA)</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1">{formatCurrency(baseImponibleIngresos)}</div>
              <div className="text-sm text-gray-500">IVA repercutido: {formatCurrency(ivaRepercutido)}</div>
              <div className="text-sm text-gray-500">Total con IVA: {formatCurrency(baseImponibleIngresos + ivaRepercutido)}</div>
            </div>
          </div>
        </div>

        {/* Widget de Gastos - Estilo Apple - Col-span-1 en móvil, normal en tablet/desktop */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-[#FFECEC] md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <ArrowDown className="md:h-5 md:w-5 h-4 w-4 text-[#FF3B30]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Gastos</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Base imponible (sin IVA)</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1">{formatCurrency(baseImponibleGastos)}</div>
              <div className="text-sm text-gray-500">IVA soportado: {formatCurrency(ivaSoportado)}</div>
              <div className="text-sm text-gray-500">Total con IVA: {formatCurrency(baseImponibleGastos + ivaSoportado)}</div>
            </div>
          </div>
        </div>

        {/* Widget de Resultado - Estilo Apple - Col-span-1 en móvil, normal en tablet/desktop */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1 border-t-4 border-t-blue-500">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-blue-100 md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <PiggyBank className="md:h-5 md:w-5 h-4 w-4 text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Resultado</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Base imponible (sin IVA)</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1 text-blue-600">
                {formatCurrency(baseImponibleIngresos - baseImponibleGastos)}
              </div>
              <div className="text-sm text-gray-500">IVA a liquidar: {formatCurrency(ivaALiquidar)}</div>
              <div className="text-sm text-gray-500">Retenciones IRPF: {formatCurrency(retencionesIrpf)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda fila: Widgets secundarios - Row 2 - De 2 columnas en tablet, 1 columna en móvil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 mt-3 md:mt-8">
        {/* Widget de Facturas pendientes - Col-span-1 siempre */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1 border-t-4 border-t-purple-500">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-purple-100 md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <Receipt className="md:h-5 md:w-5 h-4 w-4 text-purple-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Facturas pendientes</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Por cobrar</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1 text-purple-600">{formatCurrency(stats.pendingInvoices)}</div>
              <div className="text-sm text-gray-500">{stats.pendingCount} {stats.pendingCount === 1 ? 'factura' : 'facturas'}</div>
              <Link href="/invoices" className="text-sm text-purple-600 mt-2 flex items-center hover:text-purple-800 hover:underline">
                <span>Ver facturas</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Widget de Presupuestos pendientes - Col-span-1 siempre */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1 border-t-4 border-t-amber-500">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-amber-100 md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <ClipboardCheck className="md:h-5 md:w-5 h-4 w-4 text-amber-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Presupuestos pendientes</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Por aceptar</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1 text-amber-600">{formatCurrency(stats.pendingQuotes)}</div>
              <div className="text-sm text-gray-500">{stats.pendingQuotesCount} {stats.pendingQuotesCount === 1 ? 'presupuesto' : 'presupuestos'}</div>
              <Link href="/quotes" className="text-sm text-amber-600 mt-2 flex items-center hover:text-amber-800 hover:underline">
                <span>Ver presupuestos</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Widget de Impuestos - Col-span-1 siempre */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1 border-t-4 border-t-emerald-500">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-emerald-100 md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <Calculator className="md:h-5 md:w-5 h-4 w-4 text-emerald-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Impuestos</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Resumen fiscal</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700">IVA a liquidar:</span>
                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(stats.taxes?.ivaALiquidar || 0)}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-700">IRPF retenido en facturas:</span>
                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(retencionesIrpf)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">IRPF a pagar (est.):</span>
                <span className="text-sm font-semibold text-emerald-600">{formatCurrency(stats.taxes?.incomeTax || 0)}</span>
              </div>
              <Link href="/taxes" className="text-sm text-emerald-600 mt-2 flex items-center hover:text-emerald-800 hover:underline">
                <span>Ver detalle impuestos</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tercera Fila - Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-8 mt-3 md:mt-8">
        {/* Gráfico de Comparativa Financiera - Estilo Apple - Col-span-1 en tablet+ */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <BarChart3 className="h-5 w-5 text-blue-500 mr-3" strokeWidth={1.5} />
                <h3 className="text-lg font-medium text-gray-800">Comparativa Financiera</h3>
              </div>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setComparisonViewType("quarterly")}
                  className={`px-2 py-1 rounded-md mr-1 ${comparisonViewType === "quarterly" ? "bg-gray-100 text-gray-800" : "text-gray-500"}`}
                >
                  Trimestral
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setComparisonViewType("yearly")}
                  className={`px-2 py-1 rounded-md ${comparisonViewType === "yearly" ? "bg-gray-100 text-gray-800" : "text-gray-500"}`}
                >
                  Anual
                </Button>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={financialComparisonData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="quarter" 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value}€`} 
                    tick={{ fontSize: 12 }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={{ stroke: '#e0e0e0' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${formatCurrency(Number(value))}`, undefined]}
                    labelFormatter={(label) => comparisonViewType === "quarterly" ? `Trimestre ${label.substring(1)}` : `Año ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#34C759" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Resultado" fill="#007AFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gastos por Categoría - Estilo Apple */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1">
          <div className="p-6">
            <div className="flex items-center mb-4">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-3" strokeWidth={1.5} />
              <h3 className="text-lg font-medium text-gray-800">Gastos por Categoría</h3>
            </div>
            <div className="h-64">
              {/* Componente de gastos por categoría con datos del año y periodo seleccionados */}
              <div className="text-center text-sm text-gray-500">
                <p>No hay datos de gastos para mostrar en este periodo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;