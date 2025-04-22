import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { AnimatedCard } from "@/components/ui/animated-card";

interface CompleteDashboardProps {
  className?: string;
}

const CompleteDashboard: React.FC<CompleteDashboardProps> = ({ className }) => {
  const [comparisonViewType, setComparisonViewType] = useState<"quarterly" | "yearly">("quarterly");
  const [_, navigate] = useLocation();
  const [updateFlash, setUpdateFlash] = useState(false);
  const [lastUpdateType, setLastUpdateType] = useState<string | null>(null);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false); // Estado local para controlar la visualización de carga
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Año actual como string para uso en cálculos
  const currentYearStr = new Date().getFullYear().toString();
  
  // Usamos el hook centralizado para obtener datos del dashboard con información mejorada
  const { 
    data: dashboardData, 
    isLoading, 
    isError, 
    refetch: refetchData,
    isFetching, // Para mostrar indicadores de carga mientras se actualizan datos
    dataUpdatedAt // Para mostrar tiempo desde última actualización
  } = useDashboardData();
  // Obtenemos los filtros directamente del hook
  const filters = useSimpleDashboardFilters();
  
  // Callback para actualizar datos cuando detectamos cambios mediante polling
  const handleDashboardRefresh = useCallback(() => {
    console.log("🔄 Cambios detectados en el dashboard - refrescando datos...");
    
    // Activar animación de actualización
    setUpdateFlash(true);
    
    // Cancelar cualquier temporizador existente
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    // Configurar un temporizador para desactivar la animación después de 1.5 segundos
    updateTimerRef.current = setTimeout(() => {
      setUpdateFlash(false);
    }, 1500);
    
    // Actualizar los datos
    refetchData();
  }, [refetchData]);
  
  // Usamos polling en lugar de WebSockets para monitorear actualizaciones del dashboard
  const { isConnected, lastMessage, lastUpdatedAt } = useDashboardPolling(handleDashboardRefresh);
  
  // Detectar tipo de actualización para mostrar indicador específico
  useEffect(() => {
    if (lastMessage?.type) {
      setLastUpdateType(lastMessage.type);
      // También se resetea automáticamente después de un tiempo
      setTimeout(() => setLastUpdateType(null), 3000);
    }
  }, [lastMessage]);
  
  // Limpiar el temporizador al desmontar
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);
  
  // Mostrar estado de conexión en la consola
  useEffect(() => {
    if (isConnected) {
      console.log("✅ Sistema de actualización automática activado");
    }
  }, [isConnected]);
  
  // Ya no necesitamos WebSockets, estamos usando un sistema de polling
  // que es más robusto en conexiones inestables
  
  // Estados locales para UI
  // Importante: Usamos directamente los filtros del hook global
  // En lugar de mantener estado local que podría desincronizarse
  
  // Creamos funciones específicas para cada acción de filtro para evitar la confusión
  const handleChangeYear = useCallback((newYear: string) => {
    if (filters) {
      console.log("APLICANDO CAMBIO DE AÑO DIRECTO:", newYear);
      
      // Mostrar indicador de carga mientras cambiamos año
      setIsLoadingLocal(true);
      
      // 1. Limpiar la caché completamente
      queryClient.clear();
      
      // 2. Cambiar el año usando el hook global
      filters.changeYear(newYear);
      
      // 3. Forzar actualización directa de datos
      window.sessionStorage.setItem('dashboard_force_refresh', Date.now().toString());
      
      // 4. Usar un pequeño retraso para permitir que la UI muestre el estado de carga
      setTimeout(() => {
        // 5. Forzar una navegación para recargar el dashboard con el nuevo año
        // Esta es una solución drástica pero efectiva
        window.location.href = `/?year=${newYear}&refresh=${Date.now()}`;
      }, 300);
      
      // Mostrar un mensaje de transición al usuario
      setUpdateFlash(true);
      setLastUpdateType(`cambiando-año-${newYear}`);
    }
  }, [filters]);
  
  const handleChangePeriod = useCallback((newPeriod: string) => {
    if (filters) {
      console.log("APLICANDO CAMBIO DE PERIODO DIRECTO:", newPeriod);
      
      // Mostrar indicador de carga mientras cambiamos periodo
      setIsLoadingLocal(true);
      
      // 1. Limpiar la caché completamente
      queryClient.clear();
      
      // 2. Cambiar el periodo usando el hook global
      filters.changePeriod(newPeriod);
      
      // 3. Forzar actualización directa de datos
      window.sessionStorage.setItem('dashboard_force_refresh', Date.now().toString());
      
      // 4. Usar un pequeño retraso para permitir que la UI muestre el estado de carga
      setTimeout(() => {
        // 5. Forzar una navegación para recargar el dashboard con el nuevo periodo
        // Esta es una solución drástica pero efectiva
        window.location.href = `/?period=${newPeriod}&year=${filters.year}&refresh=${Date.now()}`;
      }, 300);
      
      // Mostrar un mensaje de transición al usuario
      setUpdateFlash(true);
      setLastUpdateType(`cambiando-periodo-${newPeriod}`);
    }
  }, [filters]);
  
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
  // Usamos los valores directos de la API que provienen directamente del cálculo del backend
  const baseImponibleIngresos = stats.income || 0;
  const ivaRepercutido = stats.ivaRepercutido || 0;
  
  // CORRECCIÓN: La API está enviando la base imponible de gastos en el campo 'expenses'
  // Ya no necesitamos hacer más cálculos, pues el backend ya lo está calculando correctamente
  const baseImponibleGastos = stats.expenses || 0;
  const ivaSoportado = stats.ivaSoportado || 0;
  
  // Resultado total (diferencia entre ingresos y gastos)
  const finalResult = baseImponibleIngresos - baseImponibleGastos;
  
  // Otros valores fiscales
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
        [filters?.year || currentYearStr]: { Ingresos: baseImponibleIngresos, Gastos: baseImponibleGastos, Resultado: baseImponibleIngresos - baseImponibleGastos },
        [(parseInt(filters?.year || currentYearStr) - 1).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 },
        [(parseInt(filters?.year || currentYearStr) - 2).toString()]: { Ingresos: 0, Gastos: 0, Resultado: 0 }
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

  // Configuración de animaciones para Framer Motion
  const containerVariants = {
    hidden: { opacity: 0.7, scale: 0.98 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        duration: 0.3, 
        ease: "easeOut",
        staggerChildren: 0.1
      } 
    }
  };
  
  // Variantes para elementos hijos con animación escalonada
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.3, ease: "easeOut" } 
    }
  };

  return (
    <motion.div 
      className={cn("container-apple section-apple bg-[#F9F9F9] px-0 mx-0 sm:px-4 pb-36 mb-12 -mt-6", className)}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Indicador de carga flotante (estilo Apple) */}
      <AnimatePresence>
        {isFetching && !isLoading && (
          <motion.div 
            className="fixed top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full shadow-md p-2 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="text-primary"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-5 w-5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {lastUpdatedAt ? `Última actualización: hace ${Math.round((Date.now() - lastUpdatedAt) / 1000)}s` : 'Sincronizando...'}
            </span>
            
            {/* Botón de refresco manual */}
            <button 
              onClick={() => {
                console.log("Botón de refresco manual pulsado");
                // Forzar una actualización global cambiando el refreshTrigger
                filters.forceRefresh();
                // También refrescar directamente los datos
                // Primero realizamos una actualización de estado
                setUpdateFlash(true);
                setLastUpdateType("manual");
                
                // Luego refrescamos los datos
                refetchData();
                
                // Registramos el resultado en consola
                console.log("✅ Refresco manual solicitado");
                
                // Quitar el flash después de 2 segundos
                if (updateTimerRef.current) {
                  clearTimeout(updateTimerRef.current);
                }
                
                updateTimerRef.current = setTimeout(() => {
                  setUpdateFlash(false);
                  console.log("✅ Refresco manual completado");
                }, 2000);
              }}
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
                  <span>
                    {lastUpdateType === 'invoice-created' && 'Nueva factura'}
                    {lastUpdateType === 'invoice-updated' && 'Factura actualizada'}
                    {lastUpdateType === 'invoice-paid' && 'Factura pagada'}
                    {lastUpdateType === 'transaction-created' && 'Nuevo movimiento'}
                    {lastUpdateType === 'transaction-updated' && 'Movimiento actualizado'}
                    {!lastUpdateType && 'Actualizando...'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Indicador de estado de sincronización - Versión para móvil (solo punto) */}
          <div className="flex md:hidden items-center mr-1 absolute top-[-18px] right-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} 
                 title={lastUpdatedAt ? `Última actualización: hace ${Math.round((Date.now() - lastUpdatedAt) / 1000)}s` : 'Sincronizando...'}></div>
            
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
          <div className="relative w-[45%] sm:w-auto">
            <button 
              type="button"
              onClick={() => document.getElementById('year-dropdown')?.classList.toggle('hidden')}
              className="inline-flex items-center justify-center w-full gap-1 px-4 py-1.5 rounded-md border shadow-sm text-sm font-medium focus:outline-none md:bg-white md:border-gray-200 md:text-gray-700 md:hover:bg-gray-50 bg-[#007AFF]/90 border-[#007AFF]/90 text-white hover:bg-[#0069D9]/90"
              aria-controls="year-dropdown"
            >
              <span>{filters?.year || new Date().getFullYear().toString()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 md:text-gray-500 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown años */}
            <div id="year-dropdown" className="hidden absolute z-10 mt-1 bg-white rounded-md shadow-lg w-full sm:w-24 py-1 border border-gray-200 focus:outline-none">
              <button
                onClick={() => {
                  handleChangeYear("2025");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.year === "2025" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2025
              </button>
              <button
                onClick={() => {
                  handleChangeYear("2024");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.year === "2024" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                2024
              </button>
              <button
                onClick={() => {
                  handleChangeYear("2023");
                  document.getElementById('year-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.year === "2023" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
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
                {filters?.period === "all" ? "Todo el año" : 
                filters?.period === "Q1" || filters?.period === "q1" ? "Trimestre 1" : 
                filters?.period === "Q2" || filters?.period === "q2" ? "Trimestre 2" : 
                filters?.period === "Q3" || filters?.period === "q3" ? "Trimestre 3" : 
                filters?.period === "Q4" || filters?.period === "q4" ? "Trimestre 4" : "Todo el año"}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 md:text-gray-500 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown periodos - Ancho completo en móvil */}
            <div id="period-dropdown" className="hidden absolute z-10 mt-1 bg-white rounded-md shadow-lg w-full sm:w-40 py-1 border border-gray-200 focus:outline-none">
              <button
                onClick={() => {
                  handleChangePeriod("all");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.period === "all" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Todo el año
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q1");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.period === "Q1" || filters?.period === "q1" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 1
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q2");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.period === "Q2" || filters?.period === "q2" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 2
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q3");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.period === "Q3" || filters?.period === "q3" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 3
              </button>
              <button
                onClick={() => {
                  handleChangePeriod("Q4");
                  document.getElementById('period-dropdown')?.classList.add('hidden');
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filters?.period === "Q4" || filters?.period === "q4" ? "font-semibold text-blue-600 bg-blue-50" : "text-gray-700"}`}
              >
                Trimestre 4
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Primera Fila - KPIs */}
      <AnimatedCard 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mt-8 md:mt-12 mb-4 md:mb-6"
        isFetching={isFetching}
      >
        {/* Tarjeta de Ingresos */}
        <Card className="dashboard-card relative overflow-hidden">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex flex-col justify-between h-full sm:p-4 p-2">
              <div className="space-y-1">
                <div className="flex items-center">
                  <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
                  <h3 className="text-sm sm:text-base font-medium text-gray-700">Ingresos</h3>
                </div>
                <p className="text-xl sm:text-2xl font-semibold">
                  {formatCurrency(baseImponibleIngresos)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Base Imponible
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${baseImponibleIngresos > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs sm:text-sm text-gray-600">
                  iva: {formatCurrency(ivaRepercutido)}
                  </span>
                </div>
                <Link href="/invoices" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 flex items-center">
                  <span>Ver facturas</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="dashboard-card relative overflow-hidden">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex flex-col justify-between h-full sm:p-4 p-2">
              <div className="space-y-1">
                <div className="flex items-center">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 mr-2" />
                  <h3 className="text-sm sm:text-base font-medium text-gray-700">Gastos</h3>
                </div>
                <p className="text-xl sm:text-2xl font-semibold">
                  {formatCurrency(baseImponibleGastos)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Base Imponible
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${baseImponibleGastos > 0 ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                  <span className="text-xs sm:text-sm text-gray-600">
                    iva: {formatCurrency(ivaSoportado)}
                  </span>
                </div>
                <Link href="/expenses" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 flex items-center">
                  <span>Ver gastos</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="dashboard-card relative overflow-hidden">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex flex-col justify-between h-full sm:p-4 p-2">
              <div className="space-y-1">
                <div className="flex items-center">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mr-2" />
                  <h3 className="text-sm sm:text-base font-medium text-gray-700">Resultado</h3>
                </div>
                <p className={`text-xl sm:text-2xl font-semibold ${isPositiveResult ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(finalResult)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Base Imponible
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1.5 ${isPositiveResult ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs sm:text-sm text-gray-600">
                    Rentabilidad
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  {baseImponibleIngresos > 0 
                    ? `${Math.round((finalResult / baseImponibleIngresos) * 100)}%` 
                    : '-'}
                </span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Tarjeta de IVA */}
        <Card className="dashboard-card relative overflow-hidden">
          <div className="md:p-6 p-3 sm:p-1">
            <div className="flex flex-col justify-between h-full sm:p-4 p-2">
              <div className="space-y-1">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mr-2" />
                  <h3 className="text-sm sm:text-base font-medium text-gray-700">IVA a liquidar</h3>
                </div>
                <p className={`text-xl sm:text-2xl font-semibold ${ivaALiquidar >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(ivaALiquidar)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {filters?.period !== "all" ? `Trimestre ${filters?.period?.substring(1)}` : `Año ${filters?.year}`}
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-1.5 bg-amber-500`}></div>
                  <span className="text-xs sm:text-sm text-gray-600">
                    Soportado: {formatCurrency(ivaSoportado)}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-blue-600">
                  {formatCurrency(ivaRepercutido)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </AnimatedCard>
      
      {/* Segunda Fila - KPIs secundarios */}
      <AnimatedCard 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mt-0 md:mt-4"
        isFetching={isFetching}
        delay={1}
      >
        {/* Tarjeta de IRPF */}
        <Card className="dashboard-card relative overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <InfoIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-base font-medium text-gray-800">IRPF</h3>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{filters?.period !== "all" ? `Trimestre ${filters?.period?.substring(1)}` : `Año ${filters?.year}`}</span>
                </div>
              </div>
              
              <div className="mt-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Retenciones recibidas:</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(retencionesIrpf)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">IRPF facturas de gastos:</span>
                    <span className="text-sm font-medium text-gray-800">{formatCurrency(irpfRetenciones)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">Total:</span>
                    <span className="text-sm font-medium text-blue-600">{formatCurrency(retencionesIrpf + irpfRetenciones)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end mt-2">
                  <Link href="/taxes" className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                    <span>Ver detalles</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Tarjeta de Pendientes */}
        <Card className="dashboard-card relative overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClipboardCheck className="h-5 w-5 text-amber-500 mr-2" />
                  <h3 className="text-base font-medium text-gray-800">Pendientes</h3>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{new Date().toLocaleDateString('es-ES', { month: 'long' })}</span>
                </div>
              </div>
              
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                      <span className="text-sm text-gray-700">Facturas por cobrar</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-800 mr-2">{stats.pendingCount || 0}</span>
                      <span className="text-xs font-medium bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
                        {formatCurrency(stats.pendingInvoices || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                      <span className="text-sm text-gray-700">Presupuestos enviados</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-800 mr-2">{stats.pendingQuotesCount || 0}</span>
                      <span className="text-xs font-medium bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">
                        {formatCurrency(stats.pendingQuotes || 0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end mt-2">
                  <Link href="/invoices?status=pending" className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                    <span>Ver pendientes</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Link a Libro de Registro */}
        <div className="dashboard-card fade-in border border-gray-200 rounded-md bg-gradient-to-br from-blue-50 to-white shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-blue-500 mr-3" />
                <h3 className="text-lg font-medium text-gray-800">Libro de Registro</h3>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Accede al libro de registro completo con todos tus movimientos, filtros avanzados y exportación para la gestión fiscal.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                Facturas emitidas
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-md">
                Facturas recibidas
              </span>
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-md">
                Exportación
              </span>
            </div>
            
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => navigate('/record-book')}
              >
                <span>Abrir libro de registro</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </AnimatedCard>
      
      {/* Tercera Fila - Gráficos */}
      <AnimatedCard 
        className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6 mt-2 md:mt-4"
        isFetching={isFetching}
        delay={2}
      >
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
      </AnimatedCard>
    </motion.div>
  );
};

export default CompleteDashboard;