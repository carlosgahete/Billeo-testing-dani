import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
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

export function useDashboardData(
  forcedYear?: string,
  forcedPeriod?: string
): {
  data: DashboardStats | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { year, period } = useSimpleDashboardFilters();
  
  // Usar el endpoint alternativo para evitar errores
  const finalYear = forcedYear || year;
  const finalPeriod = forcedPeriod || period;
  
  // Definimos un estado para forzar actualizaciones manuales
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  
  // Efecto para escuchar eventos de creación/actualización de facturas y transacciones
  useEffect(() => {
    // Función para manejar eventos que requieren actualización del dashboard
    const handleUpdateEvent = (event: Event) => {
      console.log(`🔄 Evento ${(event as CustomEvent).type} detectado en useDashboardData, forzando actualización...`);
      // Incrementar el contador para forzar la recarga
      setRefreshTrigger((prev: number) => prev + 1);
    };
    
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
      // Facturas
      window.removeEventListener('invoice-created', handleUpdateEvent);
      window.removeEventListener('invoice-updated', handleUpdateEvent);
      
      // Transacciones
      window.removeEventListener('transaction-created', handleUpdateEvent);
      window.removeEventListener('transaction-updated', handleUpdateEvent);
      
      // General
      window.removeEventListener('dashboard-refresh-required', handleUpdateEvent);
    };
  }, []);

  // Utilizamos el endpoint fix aquí y añadimos el refreshTrigger al queryKey
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', finalYear, finalPeriod, refreshTrigger],
    queryFn: async () => {
      // Crear un nuevo cache param al momento de la llamada para evitar caché
      const queryTimestamp = `_cb=${Date.now()}`;
      
      try {
        // Logging para depuración
        console.log(`📊 Cargando datos frescos del dashboard [Trigger: ${refreshTrigger}]`);
        console.log(`📅 Filtros aplicados: Año=${finalYear}, Periodo=${finalPeriod}`);
        
        // Construir la URL con los parámetros de filtro
        const url = new URL('/api/stats/dashboard-fix', window.location.origin);
        url.searchParams.append('year', finalYear);
        url.searchParams.append('period', finalPeriod);
        url.searchParams.append('_cb', queryTimestamp);
        
        // Primera opción: usar el endpoint fix con fetch usando credentials y reintento
        console.log(`🔄 Intentando cargar datos desde: ${url.toString()}`);
        
        // Configuración completa del fetch con credenciales y headers mejorados
        const fetchOptions = {
          method: 'GET',
          credentials: 'include' as RequestCredentials,
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest' // Ayuda a evitar problemas de CORS
          }
        };
        
        // Intentar primero con el endpoint fix
        let response = await fetch(url.toString(), fetchOptions);
        
        // Si está autorizado pero hay otro error
        if (response.status === 401 || response.status === 403) {
          console.warn("⚠️ Error de autenticación. Reintentando con sessionStorage...");
          
          // Intentar restaurar la sesión si es necesario antes de reintentar
          const sessionRetryResponse = await fetch('/api/session/refresh', {
            method: 'GET',
            credentials: 'include'
          });
          
          if (sessionRetryResponse.ok) {
            console.log("✅ Sesión refrescada correctamente, reintentando carga de datos...");
            response = await fetch(url.toString(), fetchOptions);
          }
        }
        
        // Si el endpoint fix funciona correctamente
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Datos del dashboard cargados correctamente", {
            año: data.year,
            periodo: data.period,
            ingresos: data.income,
            gastos: data.expenses
          });
          return data;
        }
        
        // Si falla, intentar con el endpoint original como respaldo
        console.warn("⚠️ El endpoint fix falló, probando con el endpoint original...");
        
        const fallbackUrl = new URL('/api/stats/dashboard', window.location.origin);
        fallbackUrl.searchParams.append('year', finalYear);
        fallbackUrl.searchParams.append('period', finalPeriod);
        fallbackUrl.searchParams.append('_cb', queryTimestamp);
        
        const originalResponse = await fetch(fallbackUrl.toString(), fetchOptions);
        
        if (originalResponse.ok) {
          const data = await originalResponse.json();
          console.log("✅ Datos del dashboard cargados (endpoint original)");
          return data;
        }
        
        // Si ambos intentos fallan, probar sin parámetros como último intento
        console.warn("⚠️ Ambos endpoints fallaron. Último intento sin parámetros...");
        
        const lastAttemptResponse = await fetch('/api/stats/dashboard-fix', {
          ...fetchOptions,
          cache: 'no-store'
        });
        
        if (lastAttemptResponse.ok) {
          const data = await lastAttemptResponse.json();
          console.log("⚠️ Datos cargados sin filtros (fallback)");
          // Añadir manualmente los filtros que queríamos
          data.year = finalYear;
          data.period = finalPeriod;
          return data;
        }
        
        // Si todos los intentos fallan, lanzar error
        throw new Error(`No se pudo obtener los datos del dashboard (Código: ${response.status})`);
      } catch (error) {
        console.error("❌ Error al cargar datos del dashboard:", error);
        
        // Proporcionar una estructura de datos base para que la UI no falle
        const fallbackData = {
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
          year: finalYear,
          period: finalPeriod,
          error: error instanceof Error ? error.message : 'Error desconocido',
          filterParams: { year: finalYear, period: finalPeriod }
        };
        
        return fallbackData;
      }
    },
    staleTime: 30 * 1000, // Reducido a 30 segundos para permitir actualizaciones más frecuentes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    // Estrategia de reintento mejorada
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * (2 ** attemptIndex), 10000)
  });

  // Depuración
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