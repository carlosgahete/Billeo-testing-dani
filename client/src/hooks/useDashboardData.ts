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
  // Obtenemos los filtros y el trigger de actualización del hook centralizado
  const filters = useSimpleDashboardFilters();
  const { year, period, refreshTrigger: filtersRefreshTrigger } = filters;
  
  // Usar el endpoint alternativo para evitar errores
  const finalYear = forcedYear || year;
  const finalPeriod = forcedPeriod || period;
  
  // Definimos un estado para forzar actualizaciones manuales, inicializado con el valor global
  const [refreshTrigger, setRefreshTrigger] = useState<number>(filtersRefreshTrigger || Date.now());
  
  // Efecto para responder a cambios en el filtro global
  useEffect(() => {
    // Cuando el filtro global cambia, actualizar nuestro trigger local
    console.log(`📊 useDashboardData: Detectado cambio en refreshTrigger: ${filtersRefreshTrigger}`);
    setRefreshTrigger(filtersRefreshTrigger || Date.now());
  }, [filtersRefreshTrigger]);
  
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
    
    // Evento específico para cambios en los filtros
    window.addEventListener('dashboard-filters-changed', handleUpdateEvent);
    
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
      window.removeEventListener('dashboard-filters-changed', handleUpdateEvent);
    };
  }, []);

  // Utilizamos el endpoint fix y pasamos los parámetros de filtrado explícitamente
  const dashboardQuery = useQuery({
    queryKey: [`/api/stats/dashboard-fix`, finalYear, finalPeriod, refreshTrigger],
    queryFn: async ({ queryKey }) => {
      const [endpoint, year, period, trigger] = queryKey as [string, string, string, number];
      console.log(`📊 Cargando datos frescos del dashboard: año=${year}, periodo=${period} [${trigger}]...`);
      
      // Construir URL con los parámetros de filtro
      const url = `${endpoint}?year=${year}&period=${period}`;
      
      try {
        // Obtener el timestamp actual para prevenir el caché
        const timestamp = new Date().getTime();
        const urlWithTimestamp = `${url}&_t=${timestamp}`;
        
        // Incluir los parámetros de filtro en la URL
        const data = await fetch(urlWithTimestamp, {
          credentials: "include", // Importante: incluir las cookies en la petición
          headers: { 
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Refresh-Trigger': trigger.toString(), // Enviamos el refreshTrigger como header
            'X-Dashboard-Year': year, // Añadimos año como header para facilitar depuración
            'X-Dashboard-Period': period // Añadimos periodo como header para facilitar depuración
          }
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Error al cargar datos: ${res.status}`);
          }
          return res.json();
        });
        
        console.log(`✅ Datos actualizados del dashboard (${year}/${period}) cargados correctamente`);
        return data;
      } catch (error) {
        console.error("❌ Error al cargar datos del dashboard:", error);
        
        // Proporcionar una estructura de datos base para que la UI no falle
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
          year: finalYear,
          period: finalPeriod
        };
      }
    },
    staleTime: 60 * 1000, // Reducido a 1 minuto para permitir actualizaciones más frecuentes
    refetchOnWindowFocus: true, // Ahora sí refrescamos al cambiar el foco para obtener datos actualizados
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