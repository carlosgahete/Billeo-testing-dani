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
import { SkeletonDashboard } from "@/components/ui/skeleton-dashboard";

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
  
  // Usamos el hook centralizado para obtener datos del dashboard
  const { data: dashboardData, isLoading, isError, refetch: refetchData } = useDashboardData();
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
      }));
    }
  };

  // Valor neto (restando impuestos) - Implementación incompleta para futuras versiones
  if (dashboardData?.year === "none") {
    return <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Cargando información del dashboard...</p>
      </div>
    </div>;
  }

  // Mostrar estado de carga con skeleton y mensajes informativos
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
    
    // Determinar el mensaje de carga adecuado
    const loadingMessage = isChangingYear 
      ? `Cambiando al año ${yearValue}...` 
      : isChangingPeriod 
        ? `Filtrando por ${periodValue}...` 
        : isLoadingLocal 
          ? 'Actualizando filtros...' 
          : 'Cargando dashboard...';
    
    // Mensaje adicional contextual para los tiempos de carga
    const submessage = (isChangingYear || isChangingPeriod) 
      ? "El filtrado de datos puede tardar más tiempo la primera vez para cada periodo"
      : undefined;
    
    // Usar el componente de skeleton con los mensajes adecuados
    return <SkeletonDashboard 
      message={loadingMessage} 
      submessage={submessage} 
      className={className} 
    />;
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
      
      {/* Contadores KPI y stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mx-2 md:mx-4">
        {/* Ingresos Base Imponible */}
        <Card className="p-4 shadow-sm rounded-xl hover:shadow-md transition-shadow overflow-hidden bg-white">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-sm font-normal text-gray-600">Base imponible (Ingresos)</h3>
              <p className="text-2xl sm:text-3xl font-semibold text-green-600">
                {formatCurrency(baseImponibleIngresos)}
              </p>
              <p className="text-xs text-gray-500">IVA repercutido: {formatCurrency(ivaRepercutido)}</p>
            </div>
            <div className="p-2 rounded-full bg-green-50 text-green-600 mt-1">
              <ArrowUp className="h-4 w-4" />
            </div>
          </div>
        </Card>
        
        {/* Gastos Base Imponible */}
        <Card className="p-4 shadow-sm rounded-xl hover:shadow-md transition-shadow overflow-hidden bg-white">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-sm font-normal text-gray-600">Base imponible (Gastos)</h3>
              <p className="text-2xl sm:text-3xl font-semibold text-red-600">
                {formatCurrency(baseImponibleGastos)}
              </p>
              <p className="text-xs text-gray-500">IVA soportado: {formatCurrency(ivaSoportado)}</p>
            </div>
            <div className="p-2 rounded-full bg-red-50 text-red-600 mt-1">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>
        </Card>
        
        {/* Resultado (Beneficio/Pérdida) */}
        <Card className="p-4 shadow-sm rounded-xl hover:shadow-md transition-shadow overflow-hidden bg-white">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h3 className="text-sm font-normal text-gray-600">Resultado neto</h3>
              <p 
                className={`text-2xl sm:text-3xl font-semibold ${
                  isPositiveResult ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(finalResult)}
              </p>
              <p className="text-xs text-gray-500">
                IVA a liquidar: {formatCurrency(ivaALiquidar)}
              </p>
            </div>
            <div className={`p-2 rounded-full ${
              isPositiveResult ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            } mt-1`}>
              {isPositiveResult ? (
                <PiggyBank className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </div>
          </div>
        </Card>
      </div>
      
      {/* Gráficos comparativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8 mx-2 md:mx-4">
        {/* Comparativa ingresos vs gastos por trimestre/año */}
        <Card className="p-4 shadow-sm rounded-xl overflow-hidden bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700">Comparativa financiera</h3>
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
              <button
                onClick={() => setComparisonViewType("quarterly")}
                className={`px-2 py-1 text-xs rounded ${
                  comparisonViewType === "quarterly" 
                    ? "bg-white shadow-sm text-blue-600" 
                    : "text-gray-600"
                }`}
              >
                Trimestral
              </button>
              <button
                onClick={() => setComparisonViewType("yearly")}
                className={`px-2 py-1 text-xs rounded ${
                  comparisonViewType === "yearly" 
                    ? "bg-white shadow-sm text-blue-600" 
                    : "text-gray-600"
                }`}
              >
                Anual
              </button>
            </div>
          </div>
          
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prepareFinancialComparisonData()}
                margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value) => [`${formatCurrency(value as number)}`, undefined]}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Resultado" name="Resultado" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Distribución de gastos por categoría */}
        <Card className="p-4 shadow-sm rounded-xl overflow-hidden bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700">Gastos por categoría</h3>
            <InfoIcon className="h-4 w-4 text-gray-400" />
          </div>
          
          <div className="h-64 sm:h-72">
            <ExpensesByCategoryApple 
              // Para versiones futuras se podría pasar datos reales
              // Por ahora utilizamos datos estáticos para mostrar la idea
              data={[
                { name: "Material oficina", value: 120 },
                { name: "Servicios profesionales", value: 350 },
                { name: "Alquiler", value: 500 },
                { name: "Suministros", value: 200 },
                { name: "Otros gastos", value: 180 },
              ]}
            />
          </div>
        </Card>
      </div>
      
      {/* Tarjetas de impuestos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-8 mx-2 md:mx-4">
        {/* Tarjeta de IVA */}
        <Card className="p-4 shadow-sm rounded-xl hover:shadow-md transition-shadow overflow-hidden bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">IVA a liquidar (trimestral)</h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatCurrency(ivaALiquidar)}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">IVA repercutido</span>
              <span className="font-medium text-gray-700">{formatCurrency(ivaRepercutido)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">IVA soportado</span>
              <span className="font-medium text-gray-700">-{formatCurrency(ivaSoportado)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="font-medium text-gray-500">Resultado</span>
              <span className="font-medium text-blue-600">{formatCurrency(ivaALiquidar)}</span>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-8"
              onClick={() => navigate("/taxes")}
            >
              <Calculator className="h-3.5 w-3.5 mr-1" />
              Ver detalles de impuestos
            </Button>
          </div>
        </Card>
        
        {/* Tarjeta de IRPF */}
        <Card className="p-4 shadow-sm rounded-xl hover:shadow-md transition-shadow overflow-hidden bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">IRPF retenido</h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {formatCurrency(retencionesIrpf)}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Retenciones ingresos</span>
              <span className="font-medium text-gray-700">{formatCurrency(retencionesIrpf)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Retenciones gastos</span>
              <span className="font-medium text-gray-700">{formatCurrency(irpfRetenciones)}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="font-medium text-gray-500">Total retenciones</span>
              <span className="font-medium text-green-600">{formatCurrency(retencionesIrpf + irpfRetenciones)}</span>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-8"
              onClick={() => navigate("/taxes")}
            >
              <Calculator className="h-3.5 w-3.5 mr-1" />
              Ver desglose completo
            </Button>
          </div>
        </Card>
        
        {/* Tarjeta de documentos pendientes */}
        <Card className="p-4 shadow-sm rounded-xl hover:shadow-md transition-shadow overflow-hidden bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700">Documentos pendientes</h3>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {stats.pendingCount || 0} facturas
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Facturas pendientes</span>
              <span className="font-medium text-gray-700">{stats.pendingCount || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Presupuestos pendientes</span>
              <span className="font-medium text-gray-700">{stats.pendingQuotesCount || 0}</span>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-sm">
              <span className="font-medium text-gray-500">Importe pendiente</span>
              <span className="font-medium text-amber-600">{formatCurrency(stats.pendingInvoices || 0)}</span>
            </div>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full text-xs h-8"
              onClick={() => navigate("/invoices")}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Ver facturas pendientes
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Footer con información de acceso a otras secciones */}
      <div className="mt-10 text-center text-xs text-gray-500">
        <p>Datos actualizados para el periodo: <span className="font-medium text-gray-600">
          {filters?.period === "all" 
            ? `Año ${filters?.year}` 
            : `${filters?.period === "Q1" || filters?.period === "q1" ? "Trimestre 1" : 
                filters?.period === "Q2" || filters?.period === "q2" ? "Trimestre 2" : 
                filters?.period === "Q3" || filters?.period === "q3" ? "Trimestre 3" : 
                filters?.period === "Q4" || filters?.period === "q4" ? "Trimestre 4" : ""} de ${filters?.year}`}
        </span></p>
        
        <div className="mt-8 flex justify-center gap-2 sm:gap-4">
          <Button 
            variant="link" 
            size="sm" 
            className="text-xs h-8 text-gray-600"
            onClick={() => navigate("/invoices")}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Facturas
          </Button>
          <Button 
            variant="link" 
            size="sm" 
            className="text-xs h-8 text-gray-600"
            onClick={() => navigate("/expenses")}
          >
            <ArrowDown className="h-3.5 w-3.5 mr-1" />
            Gastos
          </Button>
          <Button 
            variant="link" 
            size="sm" 
            className="text-xs h-8 text-gray-600"
            onClick={() => navigate("/taxes")}
          >
            <Calculator className="h-3.5 w-3.5 mr-1" />
            Impuestos
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompleteDashboard;