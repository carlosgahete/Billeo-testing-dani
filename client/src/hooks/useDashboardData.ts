import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useCallback } from 'react';
import { useSimpleDashboardFilters } from './useSimpleDashboardFilters';

export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  balance?: number;
  result?: number;
  baseImponible: number;
  baseImponibleGastos: number;
  ivaRepercutido?: number;
  ivaSoportado?: number;
  irpfRetenidoIngresos?: number;
  irpfTotal?: number;
  totalWithholdings?: number;
  netIncome?: number;
  netExpenses?: number;
  netResult?: number;
  taxes?: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
  taxStats?: {
    ivaRepercutido: number;
    ivaSoportado: number;
    ivaLiquidar: number;
    irpfRetenido: number;
    irpfTotal: number;
    irpfPagar: number;
  };
  year?: string;
  period?: string;
  pendingQuotes?: number;
  pendingQuotesCount?: number;
  issuedCount?: number;
  quarterCount?: number;
  quarterIncome?: number;
  yearCount?: number;
  yearIncome?: number;
  invoices?: {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    totalAmount: number;
  };
  quotes?: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
  };
  allQuotes?: number;
  acceptedQuotes?: number;
  rejectedQuotes?: number;
  [key: string]: any;
}

/**
 * Hook optimizado para cargar datos del dashboard con soporte para caché y actualizaciones en segundo plano
 */
export function useDashboardData(
  forcedYear?: string,
  forcedPeriod?: string
): {
  data: DashboardStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  // CAMBIO RADICAL: Obtener valores directamente de la URL en lugar del hook
  const getParamsFromURL = () => {
    if (typeof window === 'undefined') return { year: new Date().getFullYear().toString(), period: 'all' };
    const urlParams = new URLSearchParams(window.location.search);
    return {
      year: urlParams.get('year') || new Date().getFullYear().toString(),
      period: urlParams.get('period') || 'all'
    };
  };
  
  const urlParams = getParamsFromURL();
  
  // Obtenemos el hook solo para el refreshTrigger
  const filters = useSimpleDashboardFilters();
  const { refreshTrigger: filtersRefreshTrigger } = filters;
  
  // Usar los valores de la URL como fuente de verdad
  const finalYear = forcedYear || urlParams.year;
  const finalPeriod = forcedPeriod || urlParams.period;
  const refreshTrigger = filtersRefreshTrigger;
  
  // LOGS DETALLADOS PARA DEBUG (solo mostrar lo esencial)
  console.log('🔍 Dashboard usando:', { finalYear, finalPeriod, refreshTrigger });
  
  // Crear una queryKey única que SIEMPRE cambie cuando cambien los parámetros
  const uniqueQueryKey = [
    '/api/dashboard-direct',
    finalYear,
    finalPeriod,
    refreshTrigger
  ];
  
  // Log simple para debug (solo cuando cambien los valores importantes)
  console.log(`📊 Dashboard Query: año=${finalYear}, periodo=${finalPeriod}, trigger=${refreshTrigger}`);
  
  // Memoizamos la función de manejo de eventos para evitar recreaciones innecesarias
  const handleUpdateEvent = useCallback((event: Event) => {
    // Si es un evento de cambio de filtros, forzar refresh
    if ((event as CustomEvent).type === 'dashboard-filters-changed') {
      console.log(`📊 Evento de cambio de filtros detectado, refrescando...`);
      // Forzar un nuevo trigger usando el hook de filtros
      filters.forceRefresh();
      return;
    }
    
    // Optimización: verificar si el evento es relevante para el año/periodo actual
    const eventDetail = (event as CustomEvent).detail;
    if (eventDetail && eventDetail.year && eventDetail.year !== finalYear) {
      console.log(`🔍 Evento para año ${eventDetail.year}, ignorado en vista de ${finalYear}`);
      return;
    }
    
    console.log(`🔄 Evento ${(event as CustomEvent).type} detectado en useDashboardData, forzando actualización...`);
    // Usar el forceRefresh del hook de filtros
    filters.forceRefresh();
  }, [finalYear, filters]);
  
  // Efecto para escuchar eventos de creación/actualización de facturas y transacciones
  useEffect(() => {
    // Registrar eventos para facturas
    window.addEventListener('invoice-created', handleUpdateEvent);
    window.addEventListener('invoice-updated', handleUpdateEvent);
    
    // Registrar eventos para transacciones
    window.addEventListener('transaction-created', handleUpdateEvent);
    window.addEventListener('transaction-updated', handleUpdateEvent);
    
    // Evento general de refresco del dashboard
    window.addEventListener('dashboard-refresh-required', handleUpdateEvent);
    
    // Limpiar todos los listeners al desmontar
    return () => {
      window.removeEventListener('invoice-created', handleUpdateEvent);
      window.removeEventListener('invoice-updated', handleUpdateEvent);
      window.removeEventListener('transaction-created', handleUpdateEvent);
      window.removeEventListener('transaction-updated', handleUpdateEvent);
      window.removeEventListener('dashboard-refresh-required', handleUpdateEvent);
    };
  }, [handleUpdateEvent]);

  // Hook principal para obtener datos del dashboard con configuración optimizada
  const dashboardQuery = useQuery<DashboardStats>({
    queryKey: uniqueQueryKey, // Usar la queryKey única que SIEMPRE cambia
    refetchOnMount: true,
    refetchOnReconnect: true,
    enabled: true,
    // CORREGIDO: Configuración ultra agresiva para asegurar actualizaciones inmediatas
    gcTime: 0, // Sin caché en memoria
    staleTime: 0, // Siempre considerar datos obsoletos
    retry: false, // Sin reintentos para acelerar
    refetchOnWindowFocus: false,
    // CLAVE: Forzar nuevo fetch cuando cambie CUALQUIER parte de la queryKey
    queryFn: async ({ queryKey }) => {
      try {
        // Extraer parámetros de la consulta
        const [endpoint, year, period, trigger] = queryKey as [string, string, string, number];
        
        console.log(`🚀 NUEVA QUERY EJECUTÁNDOSE: año=${year}, period=${period}, trigger=${trigger}`);
        
        // Validar parámetros
        if (!year || year === "undefined") {
          throw new Error("Año no definido en la solicitud del dashboard");
        }
        
        // SIEMPRE limpiar caché local
        const cacheKey = `dashboard_cache_${year}_${period}`;
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}_timestamp`);
        
        // Obtener datos SIEMPRE frescos del servidor
        const data = await fetchDashboardData(endpoint, year, period, trigger);
        
        console.log(`🎯 DATOS RECIBIDOS: income=${data.income}, expenses=${data.expenses}, año=${year}, period=${period}`);
        
        return data;
        
      } catch (error) {
        console.error("❌ Error al cargar datos del dashboard:", error);
        
        // Devolver estructura base para evitar errores en UI
        return getEmptyDashboardData(finalYear, finalPeriod);
      }
    }
  });

  // Mostrar estadísticas básicas
  if (dashboardQuery.data) {
    console.log("Dashboard stats", {
      income: dashboardQuery.data.income,
      expenses: dashboardQuery.data.expenses,
      baseImponible: dashboardQuery.data.baseImponible,
      result: dashboardQuery.data.result
    });
  }

  return {
    data: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    isError: dashboardQuery.isError,
    refetch: dashboardQuery.refetch
  };
}

// Función auxiliar para obtener datos del dashboard
async function fetchDashboardData(
  endpoint: string, 
  year: string, 
  period: string, 
  trigger: number
): Promise<DashboardStats> {
  // Generar parámetros para evitar caché
  const randomParam = Math.random().toString(36).substring(2, 15);
  const timestamp = new Date().getTime();
  
  // Verificar si somos un administrador viendo como otro usuario
  const adminInfo = sessionStorage.getItem('admin_viewing_as_user');
  const isAdminViewingAsUser = !!adminInfo;
  
  // Obtener información del usuario autenticado si está disponible
  const userInfoString = sessionStorage.getItem('user_info');
  let userId: string | number | null = null;
  
  if (userInfoString) {
    try {
      const userInfo = JSON.parse(userInfoString);
      userId = userInfo?.id || null;
      console.log(`📊 Usuario identificado para la petición: ID=${userId}`);
    } catch (e) {
      console.warn('Error al parsear información del usuario:', e);
    }
  }
  
  // Construir URL incluyendo el ID del usuario si está disponible
  const url = `${endpoint}?year=${year}&period=${period}&forceRefresh=true&random=${randomParam}&_t=${timestamp}${userId ? `&userId=${userId}` : ''}`;
  
  console.log("🔍 SOLICITUD A ENDPOINT DIRECTO:", url);
  console.log("🚨 ENVIANDO:", { year, period });
  
  // Realizar petición al servidor
  const response = await fetch(url, {
    credentials: "include",
    headers: { 
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Refresh-Trigger': trigger.toString(),
      'X-Dashboard-Year': year,
      'X-Dashboard-Period': period,
      'X-Force-Refresh': 'true',
      'X-Random': randomParam,
      'X-Admin-Viewing': isAdminViewingAsUser ? 'true' : 'false',
      // Añadir el ID de usuario en los headers si está disponible
      ...(userId ? { 'X-User-ID': userId.toString() } : {})
    }
  });
  
  // Comprobar respuesta
  if (!response.ok) {
    throw new Error(`Error al cargar datos: ${response.status}`);
  }
  
  // Parsear datos
  const data = await response.json();
  
  // Guardar en caché con timestamp para control de frescura
  const cacheKey = `dashboard_cache_${year}_${period}`;
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    // Guardar timestamp para controlar la frescura de los datos
    sessionStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
    console.log(`💾 Datos guardados en caché para ${year}/${period} a las ${new Date().toTimeString()}`);
  } catch (error) {
    console.warn('No se pudo guardar en caché:', error);
  }
  
  // Resetear bandera de refresco forzado
  window.forceDashboardRefresh = false;
  
  console.log(`✅ Datos actualizados del dashboard (${year}/${period}) cargados correctamente`);
  return data;
}

// Estructura básica para cuando hay errores
function getEmptyDashboardData(year: string, period: string): DashboardStats {
  return {
    income: 0,
    expenses: 0,
    pendingInvoices: 0,
    pendingCount: 0,
    baseImponible: 0,
    baseImponibleGastos: 0,
    balance: 0,
    result: 0,
    netIncome: 0,
    netExpenses: 0,
    netResult: 0,
    taxes: {
      vat: 0,
      incomeTax: 0,
      ivaALiquidar: 0
    },
    taxStats: {
      ivaRepercutido: 0,
      ivaSoportado: 0,
      ivaLiquidar: 0,
      irpfRetenido: 0,
      irpfTotal: 0,
      irpfPagar: 0
    },
    year: year,
    period: period
  };
}