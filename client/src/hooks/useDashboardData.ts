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
  
  // Efecto para escuchar eventos de creación/actualización de facturas
  useEffect(() => {
    // Función para manejar eventos de facturas
    const handleInvoiceEvent = () => {
      console.log("🔄 Evento de factura detectado en useDashboardData, forzando actualización...");
      // Incrementar el contador para forzar la recarga
      setRefreshTrigger((prev: number) => prev + 1);
    };
    
    // Registrar múltiples eventos
    window.addEventListener('invoice-created', handleInvoiceEvent);
    window.addEventListener('invoice-updated', handleInvoiceEvent);
    window.addEventListener('dashboard-refresh-required', handleInvoiceEvent);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('invoice-created', handleInvoiceEvent);
      window.removeEventListener('invoice-updated', handleInvoiceEvent);
      window.removeEventListener('dashboard-refresh-required', handleInvoiceEvent);
    };
  }, []);

  // Utilizamos el endpoint fix aquí y añadimos el refreshTrigger al queryKey
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', finalYear, finalPeriod, refreshTrigger],
    queryFn: async () => {
      // Crear un nuevo cache param al momento de la llamada para evitar caché
      const queryTimestamp = `_cb=${Date.now()}`;
      
      try {
        // Refrescar los datos forzando una solicitud fresca
        console.log(`📊 Cargando datos frescos del dashboard [${refreshTrigger}]...`);
        
        // Intentar primero con el endpoint fijo
        const response = await fetch(`/api/stats/dashboard-fix?year=${finalYear}&period=${finalPeriod}&${queryTimestamp}`, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Datos actualizados del dashboard cargados correctamente");
          return data;
        }
        
        // Si falla, intentar con el endpoint original
        console.log("⚠️ El endpoint fix falló, probando con el original...");
        const originalResponse = await fetch(`/api/stats/dashboard?year=${finalYear}&period=${finalPeriod}&${queryTimestamp}`, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        
        if (originalResponse.ok) {
          const data = await originalResponse.json();
          console.log("✅ Datos actualizados del dashboard cargados correctamente (endpoint original)");
          return data;
        }
        
        // Si ambos fallan, lanzar error
        throw new Error('No se pudo obtener los datos del dashboard');
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