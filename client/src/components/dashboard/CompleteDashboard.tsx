import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { DashboardStats } from "@/types/dashboard";
import { formatCurrency } from "@/lib/utils";
import { Loader2, ArrowUp, ArrowDown, PiggyBank, FileText, BarChart3, InfoIcon, ExternalLink, ChevronDown, Receipt, ClipboardCheck, Calculator, RefreshCw } from "lucide-react";
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
import ExpensesByCategoryApple from "./ExpensesByCategoryApple";
import ExpensesByCategory from "./ExpensesByCategory";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSimpleDashboardFilters } from "@/hooks/useSimpleDashboardFilters";
import { useDashboardPolling } from "@/hooks/useDashboardPolling";
import { AuthenticationStatus } from "@/components/auth/AuthenticationStatus";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

interface CompleteDashboardProps {
  className?: string;
}

const CompleteDashboard: React.FC<CompleteDashboardProps> = ({ className }) => {
  const [comparisonViewType, setComparisonViewType] = useState<"quarterly" | "yearly">("quarterly");
  const [_, navigate] = useLocation();
  const [updateFlash, setUpdateFlash] = useState(false);
  const [lastUpdateType, setLastUpdateType] = useState<string | null>(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // CORREGIDO: Estados para controlar dropdowns
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  
  // Año actual como string para uso en cálculos
  const currentYearStr = new Date().getFullYear().toString();
  
  // CORREGIDO: Usar hook centralizado para datos y filtros
  const { data: dashboardData, isLoading, isError, refetch: refetchData } = useDashboardData();
  const filters = useSimpleDashboardFilters();
  
  // Log para debug cuando cambian los datos
  useEffect(() => {
    console.log('🔄 CompleteDashboard: dashboardData cambió:', dashboardData ? {
      income: dashboardData.income,
      expenses: dashboardData.expenses,
      period: dashboardData.period,
      year: dashboardData.year
    } : 'null');
  }, [dashboardData]);
  
  // Callback para actualizar datos cuando detectamos cambios
  const handleDashboardRefresh = useCallback(() => {
    console.log("🔄 Cambios detectados en el dashboard - refrescando datos...");
    
    // Activar animación de actualización
    setUpdateFlash(true);
    
    // Cancelar temporizador existente
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Configurar temporizador para desactivar animación
    updateTimerRef.current = setTimeout(() => {
      setUpdateFlash(false);
    }, 1500);
    
    // Actualizar los datos
    refetchData();
  }, [refetchData]);
  
  // Polling muy reducido - solo para actualizaciones importantes
  const { isConnected } = useDashboardPolling(handleDashboardRefresh);
  
  // Funciones SIMPLIFICADAS para cambio de filtros
  const handleChangeYear = useCallback((newYear: string) => {
    console.log("🎯 COMPONENTE: handleChangeYear llamado con:", newYear);
    console.log("🎯 COMPONENTE: Año actual del filtro:", filters?.year);
    setYearDropdownOpen(false); // Cerrar dropdown
    filters.changeYear(newYear);
    console.log("🎯 COMPONENTE: changeYear ejecutado, nuevo año debería ser:", newYear);
  }, [filters]);
  
  const handleChangePeriod = useCallback((newPeriod: string) => {
    console.log("📅 COMPONENTE: handleChangePeriod llamado con:", newPeriod);
    console.log("📅 COMPONENTE: Periodo actual del filtro:", filters?.period);
    setPeriodDropdownOpen(false); // Cerrar dropdown
    filters.changePeriod(newPeriod);
    console.log("📅 COMPONENTE: changePeriod ejecutado, nuevo periodo debería ser:", newPeriod);
  }, [filters]);
  
  // Función de refresh manual SIMPLIFICADA
  const handleRefresh = useCallback(() => {
    console.log("🔄 Refresh manual iniciado");
    setIsLoadingLocal(true);
    setUpdateFlash(true);
    
    // Usar forceRefresh del hook
    filters.forceRefresh();
    
    // Indicadores visuales
    setTimeout(() => {
      setIsLoadingLocal(false);
      setUpdateFlash(false);
    }, 1000);
  }, [filters]);
  
  // Efecto para cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Cerrar dropdown de año si click fuera de él
      if (!target.closest('[data-dropdown="year"]')) {
        setYearDropdownOpen(false);
      }
      
      // Cerrar dropdown de periodo si click fuera de él
      if (!target.closest('[data-dropdown="period"]')) {
        setPeriodDropdownOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  // Limpiar temporizadores al desmontar
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
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

  // CORREGIDO: Usar useMemo para recalcular valores cuando stats cambie
  const calculatedValues = useMemo(() => {
    // Calcular valores específicos usando los datos directos de la API
    const baseImponibleIngresos = stats.income || 0;
    const ivaRepercutido = stats.ivaRepercutido || 0;
    
    // La API está enviando la base imponible de gastos en el campo 'expenses'
    const baseImponibleGastos = stats.expenses || 0;
    const ivaSoportado = stats.ivaSoportado || 0;
    
    // NUEVOS CÁLCULOS FISCALES ESPECÍFICOS
    // 1. Gastos netos deducibles (usar datos específicos o asumir 100% deducible)
    const gastosDeducibles = stats.gastosDeducibles || baseImponibleGastos;
    
    // 2. IVA soportado deducible (usar datos específicos o asumir 100% deducible)  
    const ivaDeducible = stats.ivaDeducible || ivaSoportado;
    
    // 3. Resultado fiscal: neto ingresos - neto gastos deducibles
    const resultadoFiscal = baseImponibleIngresos - gastosDeducibles;
    
    // 4. IVA a ingresar: IVA de ingresos - IVA deducible de gastos
    const ivaAIngresar = ivaRepercutido - ivaDeducible;
    
    // Resultado total (diferencia entre ingresos y gastos)
    const finalResult = baseImponibleIngresos - baseImponibleGastos;
    
    // Otros valores fiscales
    const ivaALiquidar = stats.taxes?.ivaALiquidar || 0;
    const retencionesIrpf = stats.irpfRetenidoIngresos || 0;
    const irpfRetenciones = stats.totalWithholdings || 0;
    const irpfGastos = stats.irpfGastos || 0; // NUEVO: IRPF de gastos
    
    console.log("🔄 Recalculando valores fiscales del dashboard:", {
      income: stats.income,
      expenses: stats.expenses,
      baseImponibleIngresos,
      baseImponibleGastos,
      gastosDeducibles,
      ivaDeducible,
      resultadoFiscal,
      ivaAIngresar,
      finalResult,
      irpfGastos // NUEVO: incluir en los logs
    });
    
    return {
      baseImponibleIngresos,
      ivaRepercutido,
      baseImponibleGastos,
      ivaSoportado,
      gastosDeducibles,      // NUEVO: Gastos netos deducibles
      ivaDeducible,          // NUEVO: IVA soportado deducible
      resultadoFiscal,       // NUEVO: Resultado fiscal
      ivaAIngresar,          // NUEVO: IVA a ingresar
      finalResult,
      ivaALiquidar,
      retencionesIrpf,
      irpfRetenciones,
      irpfGastos             // NUEVO: IRPF de gastos
    };
  }, [stats]);
  
  // Extraer valores calculados
  const {
    baseImponibleIngresos,
    ivaRepercutido,
    baseImponibleGastos,
    ivaSoportado,
    gastosDeducibles,
    ivaDeducible,
    resultadoFiscal,
    ivaAIngresar,
    finalResult,
    ivaALiquidar,
    retencionesIrpf,
    irpfRetenciones,
    irpfGastos
  } = calculatedValues;
  
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

  // CORREGIDO: Usar useMemo para recalcular datos del gráfico cuando cambien los valores
  const financialComparisonData = useMemo(() => {
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
      
      console.log("🔄 Recalculando datos trimestrales del gráfico:", quarterlyData);

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
        [filters?.year || currentYearStr]: { Ingresos: baseImponibleIngresos, Gastos: baseImponibleGastos, Resultado: baseImponibleIngresos - baseImponibleGastos },
        [(parseInt(filters?.year || currentYearStr) - 1).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 },
        [(parseInt(filters?.year || currentYearStr) - 2).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 }
      };

      console.log("🔄 Recalculando datos anuales del gráfico:", yearlyData);

      // Convertir a array para el gráfico
      return Object.entries(yearlyData).map(([year, data]) => ({
        quarter: year, // Reutilizamos el mismo campo para compatibilidad con el gráfico
        Ingresos: data.Ingresos,
        Gastos: data.Gastos,
        Resultado: data.Resultado
      })).reverse(); // Ordenamos de año más antiguo a más reciente
    }
  }, [comparisonViewType, baseImponibleIngresos, baseImponibleGastos, filters?.year, currentYearStr]);
  
  // Verificar si hay algún tipo de error
  if (isError) {
    console.error("Error en dashboard: No se pudieron obtener los datos");
    
    // Error del servidor (500 u otros)
    return <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] px-4 text-center">
      <div className="bg-red-100 border border-red-300 rounded-lg p-6 max-w-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error al cargar datos</h2>
        <p className="text-gray-700 mb-4">
          Ha ocurrido un error al cargar los datos del dashboard. Este problema está siendo revisado por nuestro equipo.
        </p>
        <Button 
          onClick={() => refetchData()} 
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Intentar nuevamente
        </Button>
      </div>
    </div>;
  }
  
  // Mostrar estado de carga si está cargando datos o si estamos en transición local
  if (isLoading || isLoadingLocal) {
    // Detectar si estamos cambiando año o periodo basado en el tipo de mensaje
    const isChangingYear = lastUpdateType ? lastUpdateType.startsWith('cambiando-año-') : false;
    const isChangingPeriod = lastUpdateType ? lastUpdateType.startsWith('cambiando-periodo-') : false;
    
    let yearValue = '';
    if (isChangingYear && lastUpdateType) {
      yearValue = lastUpdateType.replace('cambiando-año-', '');
    }
    
    let periodValue = '';
    if (isChangingPeriod && lastUpdateType) {
      periodValue = lastUpdateType.replace('cambiando-periodo-', '');
      // Formatear periodos para ser más legibles
      if (periodValue === 'all') periodValue = 'todo el año';
      else if (periodValue === 'Q1' || periodValue === 'q1') periodValue = 'trimestre 1';
      else if (periodValue === 'Q2' || periodValue === 'q2') periodValue = 'trimestre 2';
      else if (periodValue === 'Q3' || periodValue === 'q3') periodValue = 'trimestre 3';
      else if (periodValue === 'Q4' || periodValue === 'q4') periodValue = 'trimestre 4';
    }
    
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-gray-600">
          {isChangingYear ? `Cambiando al año ${yearValue}...` : 
           isChangingPeriod ? `Filtrando por ${periodValue}...` : 
           isLoadingLocal ? 'Cambiando filtros...' : 'Cargando datos...'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("container-apple section-apple bg-[#F9F9F9] px-0 mx-0 sm:px-4 pb-36 mb-12 -mt-6", className)}>
      {/* Cabecera del dashboard con título centrado y elevado solo en móvil, con icono en desktop */}
      <div className="section-header px-0 pt-0 md:pt-0 pb-0 md:px-4 md:py-4">
        <div className="flex items-center justify-center md:justify-start mt-[-15px] md:mt-0">
          <div className="md:flex hidden items-center mt-8">
            <BarChart3 className="h-6 w-6 text-primary mr-3" />
          </div>
          <h1 className="section-title text-sm md:text-lg font-medium hidden md:block mt-7 -mb-1">Dashboard</h1>
        </div>
        
        <div className="flex items-center w-full gap-1 sm:gap-3 sm:flex-wrap sm:w-auto mt-[-10px] sm:mt-2">
          {/* Indicador de estado del sistema de sincronización - Versión para escritorio */}
          <div className="hidden md:flex items-center mr-1 text-xs text-gray-600">
            <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs">
              {(() => {
                // CORREGIDO: Usar el timestamp real de los datos en lugar del polling
                const currentTime = Date.now();
                let actualLastUpdate: number | null = null;
                
                // 1. Intentar obtener timestamp de sessionStorage (más reciente)
                const year = filters?.year || new Date().getFullYear().toString();
                const period = filters?.period || "all";
                const cacheTimestamp = sessionStorage.getItem(`dashboard_cache_${year}_${period}_timestamp`);
                if (cacheTimestamp) {
                  actualLastUpdate = parseInt(cacheTimestamp);
                }
                
                // 2. Usar timestamp actual si no hay cache
                if (!actualLastUpdate) {
                  actualLastUpdate = Date.now() - 60000; // 1 minuto atrás por defecto
                }
                
                // 3. Calcular y mostrar tiempo transcurrido
                if (actualLastUpdate) {
                  const secondsAgo = Math.floor((currentTime - actualLastUpdate) / 1000);
                  if (secondsAgo < 60) {
                    return `Última actualización: hace ${secondsAgo}s`;
                  } else if (secondsAgo < 3600) {
                    const minutesAgo = Math.floor(secondsAgo / 60);
                    return `Última actualización: hace ${minutesAgo}m`;
                  } else {
                    const hoursAgo = Math.floor(secondsAgo / 3600);
                    return `Última actualización: hace ${hoursAgo}h`;
                  }
                } else {
                  return 'Sincronizando...';
                }
              })()}
            </span>
            
            {/* Botón de refresco manual */}
            <button 
              onClick={handleRefresh}
              className="ml-2 p-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              title="Refrescar datos manualmente"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            </button>
            
            {/* Notificación de actualización en tiempo real */}
            <AnimatePresence>
              {updateFlash && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  <span>Actualizando...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Indicador de estado de sincronización - Versión para móvil (solo punto) */}
          <div className="flex md:hidden items-center mr-1 absolute top-[-18px] right-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} 
                 title={(() => {
                   // Usar el timestamp real de los datos
                   const currentTime = Date.now();
                   let actualLastUpdate: number | null = null;
                   
                   // 1. Intentar obtener timestamp de sessionStorage (más reciente)
                   const year = filters?.year || new Date().getFullYear().toString();
                   const period = filters?.period || "all";
                   const cacheTimestamp = sessionStorage.getItem(`dashboard_cache_${year}_${period}_timestamp`);
                   if (cacheTimestamp) {
                     actualLastUpdate = parseInt(cacheTimestamp);
                   }
                   
                   // 2. Usar timestamp actual si no hay cache
                   if (!actualLastUpdate) {
                     actualLastUpdate = Date.now() - 60000; // 1 minuto atrás por defecto
                   }
                   
                   // 3. Calcular y mostrar tiempo transcurrido
                   if (actualLastUpdate) {
                     const secondsAgo = Math.floor((currentTime - actualLastUpdate) / 1000);
                     if (secondsAgo < 60) {
                       return `Última actualización: hace ${secondsAgo}s`;
                     } else if (secondsAgo < 3600) {
                       const minutesAgo = Math.floor(secondsAgo / 60);
                       return `Última actualización: hace ${minutesAgo}m`;
                     } else {
                       const hoursAgo = Math.floor(secondsAgo / 3600);
                       return `Última actualización: hace ${hoursAgo}h`;
                     }
                   } else {
                     return 'Sincronizando...';
                   }
                 })()}></div>
            
            {/* Notificación móvil */}
            <AnimatePresence>
              {updateFlash && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="ml-1"
                >
                  <RefreshCw className="w-3 h-3 text-green-600 animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Botón de Año - En móvil ocupa el 45% del ancho */}
          <div className="relative w-[45%] sm:w-auto" data-dropdown="year">
            <button 
              type="button"
              onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
              className="inline-flex items-center justify-center w-full gap-1 px-4 py-1.5 rounded-md border shadow-sm text-sm font-medium focus:outline-none md:bg-white md:border-gray-200 md:text-gray-700 md:hover:bg-gray-50 bg-[#007AFF]/90 border-[#007AFF]/90 text-white hover:bg-[#0069D9]/90"
              aria-controls="year-dropdown"
            >
              <span>{filters?.year || new Date().getFullYear().toString()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 md:text-gray-500 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown años */}
            <div id="year-dropdown" className={`${yearDropdownOpen ? '' : 'hidden'} absolute z-10 mt-1 bg-white rounded-md shadow-lg w-full sm:w-24 py-1 border border-gray-200 focus:outline-none`}>
              <button
                onClick={() => {
                  handleChangeYear("2025");
                  setYearDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.year === "2025" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2025
              </button>
              <button
                onClick={() => {
                  handleChangeYear("2024");
                  setYearDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.year === "2024" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2024
              </button>
              <button
                onClick={() => {
                  handleChangeYear("2023");
                  setYearDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.year === "2023" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2023
              </button>
            </div>
          </div>
          
          {/* Botón de Periodo - En móvil ocupa el 55% del ancho */}
          <div className="relative w-[55%] sm:w-auto" data-dropdown="period">
            <button 
              type="button"
              onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              className="inline-flex items-center justify-center w-full gap-1 px-4 py-1.5 rounded-md border shadow-sm text-sm font-medium focus:outline-none md:bg-white md:border-gray-200 md:text-gray-700 md:hover:bg-gray-50 bg-[#007AFF]/90 border-[#007AFF]/90 text-white hover:bg-[#0069D9]/90"
              aria-controls="period-dropdown"
            >
              <span>
                {(filters?.period) === "all" ? "Todo el año" : 
                (filters?.period) === "Q1" || (filters?.period) === "q1" ? "Trimestre 1" : 
                (filters?.period) === "Q2" || (filters?.period) === "q2" ? "Trimestre 2" : 
                (filters?.period) === "Q3" || (filters?.period) === "q3" ? "Trimestre 3" : 
                (filters?.period) === "Q4" || (filters?.period) === "q4" ? "Trimestre 4" : "Todo el año"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 md:text-gray-500 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown periodos - Ancho completo en móvil */}
            <div id="period-dropdown" className={`${periodDropdownOpen ? '' : 'hidden'} absolute z-10 mt-1 bg-white rounded-md shadow-lg w-full sm:w-40 py-1 border border-gray-200 focus:outline-none`}>
              <button
                onClick={() => {
                  handleChangePeriod("all");
                  setPeriodDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${(filters?.period) === "all" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Todo el año
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q1");
                  setPeriodDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${(filters?.period) === "Q1" || (filters?.period) === "q1" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 1
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q2");
                  setPeriodDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${(filters?.period) === "Q2" || (filters?.period) === "q2" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 2
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q3");
                  setPeriodDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${(filters?.period) === "Q3" || (filters?.period) === "q3" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 3
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q4");
                  setPeriodDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${(filters?.period) === "Q4" || (filters?.period) === "q4" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 4
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primera fila: Widgets principales - Estilo Apple - Layout expandido 
          En móvil: Ingresos y Gastos en la misma fila, Resultado abajo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-0 md:mt-4">
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
              <div className="text-3xl md:text-4xl font-bold mb-1 text-[#34C759]">{formatCurrency(baseImponibleIngresos)}</div>
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
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Gastos Deducibles</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Base imponible deducible</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1 text-[#FF3B30]">{formatCurrency(gastosDeducibles)}</div>
              <div className="text-sm text-gray-500">IVA soportado: {formatCurrency(ivaDeducible)}</div>
              <div className="text-sm text-gray-500">IRPF de gastos: {formatCurrency(irpfGastos)}</div>
            </div>
          </div>
        </div>

        {/* Widget de Resultado Fiscal - Estilo Apple - Col-span-1 en móvil, normal en tablet/desktop */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1 border-t-4 border-t-blue-500">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex items-center md:mb-5 mb-2">
              <div className="bg-blue-100 md:p-3 p-2 rounded-full mr-3 md:mr-3">
                <PiggyBank className="md:h-5 md:w-5 h-4 w-4 text-blue-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Resultado Fiscal</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Ingresos - Gastos deducibles</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl md:text-4xl font-bold mb-1 text-blue-600">
                {formatCurrency(resultadoFiscal)}
              </div>
              <div className="text-sm text-gray-500">IVA a ingresar: {formatCurrency(ivaAIngresar)}</div>
              <div className="text-sm text-gray-500">IRPF de gastos: {formatCurrency(irpfGastos)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda fila: Widgets secundarios - Row 2 - De 2 columnas en tablet, 1 columna en móvil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-2 md:mt-4">
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
              <div className="text-3xl md:text-4xl font-bold mb-1 text-amber-600">{formatCurrency(stats.pendingQuotes || 0)}</div>
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
                <h3 className="md:text-lg text-base font-medium text-gray-800 mb-0 leading-tight">Resumen Fiscal</h3>
                <p className="md:text-sm text-xs text-gray-500 mt-0 leading-tight">Información fiscal deducible</p>
              </div>
            </div>
            <div className="flex flex-col mt-2">
              <div className="flex justify-between items-center mb-3">
                <span className="text-base text-gray-700 font-medium">Beneficio:</span>
                <span className="text-lg font-semibold text-emerald-600">{formatCurrency(resultadoFiscal)}</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-base text-gray-700 font-medium">IVA a ingresar:</span>
                <span className="text-lg font-semibold text-blue-600">{formatCurrency(ivaAIngresar)}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-base text-gray-700 font-medium">IRPF a ingresar:</span>
                <span className="text-lg font-semibold text-red-600">{formatCurrency(irpfGastos)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tercera Fila - Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 mt-2 md:mt-4">
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

        {/* Gastos por Categoría - Estilo Apple (sin título) */}
        <div className="dashboard-card fade-in -mx-2 sm:mx-0 px-0 col-span-1">
          <div className="p-0">
            <div className="h-[400px]">
              {/* Usamos el componente Apple sin filtros propios */}
              <ExpensesByCategoryApple />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;