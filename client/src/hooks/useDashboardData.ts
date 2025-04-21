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
    queryKey: [`/api/stats/dashboard-fix?year=${finalYear}&period=${finalPeriod}`, refreshTrigger],
    queryFn: async ({ queryKey }) => {
      console.log(`📊 Cargando datos frescos del dashboard [${refreshTrigger}]...`);
      
      try {
        // Usamos directamente el queryKey como URL para asegurar que se manejen correctamente las cookies
        const data = await fetch(queryKey[0] as string, {
          credentials: "include", // Importante: incluir las cookies en la petición
          headers: { 
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Refresh-Trigger': refreshTrigger.toString() // Enviamos el refreshTrigger como header
          }
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Error al cargar datos: ${res.status}`);
          }
          return res.json();
        });
        
        console.log("✅ Datos actualizados del dashboard cargados correctamente");
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