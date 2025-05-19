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
  // Obtenemos los filtros y el trigger de actualización del hook centralizado
  const filters = useSimpleDashboardFilters();
  const { year, period, refreshTrigger: filtersRefreshTrigger } = filters;
  
  // Usar los valores proporcionados o los del filtro global
  const finalYear = forcedYear || year;
  const finalPeriod = forcedPeriod || period;
  
  // Definimos un estado para forzar actualizaciones manuales
  const [refreshTrigger, setRefreshTrigger] = useState<number>(filtersRefreshTrigger || Date.now());
  
  // Efecto para responder a cambios en el filtro global
  useEffect(() => {
    // Cuando el filtro global cambia, actualizar nuestro trigger local
    console.log(`📊 useDashboardData: Detectado cambio en refreshTrigger: ${filtersRefreshTrigger}`);
    setRefreshTrigger(filtersRefreshTrigger || Date.now());
  }, [filtersRefreshTrigger]);
  
  // Memoizamos la función de manejo de eventos para evitar recreaciones innecesarias
  const handleUpdateEvent = useCallback((event: Event) => {
    // Si es un evento de cambio de filtros, ya nos encargamos separadamente
    if ((event as CustomEvent).type === 'dashboard-filters-changed') {
      console.log(`📊 Evento de cambio de filtros detectado, ya manejado por filtersRefreshTrigger`);
      return;
    }
    
    // Optimización: verificar si el evento es relevante para el año/periodo actual
    const eventDetail = (event as CustomEvent).detail;
    if (eventDetail && eventDetail.year && eventDetail.year !== finalYear) {
      console.log(`🔍 Evento para año ${eventDetail.year}, ignorado en vista de ${finalYear}`);
      return;
    }
    
    console.log(`🔄 Evento ${(event as CustomEvent).type} detectado en useDashboardData, forzando actualización...`);
    // Incrementar el contador para forzar la recarga
    setRefreshTrigger((prev: number) => prev + 1);
  }, [finalYear, setRefreshTrigger]);
  
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
    queryKey: ['/api/dashboard-direct', finalYear, finalPeriod, refreshTrigger],
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: true,
    // Configuración para optimizar rendimiento y prevenir peticiones innecesarias
    gcTime: 10 * 60 * 1000, // 10 minutos (tiempo antes de que los datos en caché sean eliminados)
    staleTime: 5 * 60 * 1000, // 5 minutos para mejorar significativamente la velocidad de filtrado
    queryFn: async ({ queryKey }) => {
      try {
        // Extraer parámetros de la consulta
        const [endpoint, year, period, trigger] = queryKey as [string, string, string, number];
        
        console.log(`📊 CONECTANDO A ENDPOINT DIRECTO: año=${year}, periodo=${period} [${trigger}]...`);
        
        // Validar parámetros
        if (!year || year === "undefined") {
          throw new Error("Año no definido en la solicitud del dashboard");
        }
        
        // Nombre de clave para caché
        const cacheKey = `dashboard_cache_${year}_${period}`;
        sessionStorage.setItem('current_dashboard_cache_key', cacheKey);
        
        // Comprobar si hay datos en caché y su frescura
        const cachedString = sessionStorage.getItem(cacheKey);
        const cachedTimestamp = sessionStorage.getItem(`${cacheKey}_timestamp`);
        const now = new Date().getTime();
        const cacheFreshness = cachedTimestamp ? now - parseInt(cachedTimestamp, 10) : Infinity;
        
        // Solo usar caché si existe y no hay forzado de refresco
        if (cachedString && !window.forceDashboardRefresh) {
          try {
            const cachedData = JSON.parse(cachedString);
            const freshnessSecs = Math.round(cacheFreshness / 1000);
            console.log(`🚀 Usando caché para ${year}/${period} (antigüedad: ${freshnessSecs}s)`);
            
            // Estrategia de actualización inteligente:
            // 1. Si los datos tienen más de 1 minuto, actualizar inmediatamente en segundo plano
            // 2. Si tienen entre 30s y 1min, actualizar con un pequeño retraso
            // 3. Si tienen menos de 30s, no actualizar (son muy recientes)
            
            if (cacheFreshness > 60000) {
              // Más de 1 minuto: actualizar inmediatamente en segundo plano
              console.log(`⏱️ Caché tiene más de 1 min, actualizando en segundo plano`);
              setTimeout(() => {
                fetchDashboardData(endpoint, year, period, trigger)
                  .then(data => {
                    console.log(`💾 Actualizada caché para ${year}/${period} (era de hace ${freshnessSecs}s)`);
                  })
                  .catch(e => console.error('Error en actualización en segundo plano:', e));
              }, 100);
            } else if (cacheFreshness > 30000) {
              // Entre 30s y 1min: actualizar con retraso
              console.log(`⏱️ Caché tiene entre 30s y 1min, programando actualización diferida`);
              setTimeout(() => {
                fetchDashboardData(endpoint, year, period, trigger)
                  .catch(e => console.error('Error en actualización diferida:', e));
              }, 2000);
            } else {
              console.log(`✅ Caché muy reciente (${freshnessSecs}s), no es necesario actualizar`);
            }
            
            return cachedData;
          } catch (e) {
            console.warn('Error con los datos en caché:', e);
          }
        }
        
        // Si no hay caché o se fuerza actualización, obtener datos frescos
        return await fetchDashboardData(endpoint, year, period, trigger);
        
      } catch (error) {
        console.error("❌ Error al cargar datos del dashboard:", error);
        
        // Devolver estructura base para evitar errores en UI
        return getEmptyDashboardData(finalYear, finalPeriod);
      }
    },
    refetchOnWindowFocus: true
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
  
  console.log("🔍 SOLICITUD A ENDPOINT DIRECTO:", url, isAdminViewingAsUser ? "(Admin viendo como usuario)" : "");
  
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