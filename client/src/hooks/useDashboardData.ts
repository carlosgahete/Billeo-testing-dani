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
      // Si es un evento de cambio de filtros, ya nos encargamos separadamente
      if ((event as CustomEvent).type === 'dashboard-filters-changed') {
        console.log(`📊 Evento de cambio de filtros detectado, ya manejado por filtersRefreshTrigger`);
        return;
      }
      
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
    // Ya no lo añadimos aquí, se maneja en el efecto de filtersRefreshTrigger
    // window.addEventListener('dashboard-filters-changed', handleUpdateEvent);
    
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
      // Ya no lo eliminamos, no lo añadimos
      // window.removeEventListener('dashboard-filters-changed', handleUpdateEvent);
    };
  }, []);

  // Utilizamos el endpoint DIRECTO que no requiere autenticación estándar
  const dashboardQuery = useQuery({
    // Usar el endpoint directo en lugar del fix
    queryKey: [`/api/dashboard-direct`, finalYear, finalPeriod, refreshTrigger],
    // Esta configuración evita múltiples llamadas innecesarias
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: true, // Aseguramos que se ejecuta cuando cambian los parámetros
    gcTime: 5 * 60 * 1000, // 5 minutos (tiempo antes de que los datos en caché sean eliminados)
    staleTime: 3 * 60 * 1000, // 3 minutos para mejorar la velocidad de filtrado
    queryFn: async ({ queryKey }) => {
      const [endpoint, year, period, trigger] = queryKey as [string, string, string, number];
      
      // Usamos los parámetros de la queryKey que React Query mantiene actualizados
      // No usamos valores capturados en closures que podrían estar obsoletos
      console.log(`📊 CONECTANDO A ENDPOINT DIRECTO: año=${year}, periodo=${period} [${trigger}]...`);
      
      // Construir URL con los parámetros de filtro correctos - asegurarnos de estar pasando año y periodo
      if (!year || year === "undefined") {
        console.error("❌ Error: Año no definido en la solicitud del dashboard");
        throw new Error("Año no definido en la solicitud del dashboard");
      }
      
      // Forzar actualización limpiando cualquier dato en sessionStorage
      try {
        // Limpiar cualquier estado almacenado para asegurar datos frescos
        sessionStorage.removeItem('dashboard_last_data');
        sessionStorage.removeItem('dashboard_cache');
        
        // Crear una URL con parámetros explícitos y una marca de tiempo aleatoria para evitar caché
        const randomParam = Math.random().toString(36).substring(2, 15);
        const url = `${endpoint}?year=${year}&period=${period}&forceRefresh=true&random=${randomParam}`;
        
        // Obtener el timestamp actual para prevenir aún más el caché
        const timestamp = new Date().getTime();
        const urlWithTimestamp = `${url}&_t=${timestamp}`;
        
        console.log("🔍 SOLICITUD A ENDPOINT DIRECTO:", urlWithTimestamp);
        
        // Incluir los parámetros de filtro en la URL y headers adicionales
        const data = await fetch(urlWithTimestamp, {
          credentials: "include", // Importante: incluir las cookies en la petición
          headers: { 
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Refresh-Trigger': trigger.toString(), // Enviamos el refreshTrigger como header
            'X-Dashboard-Year': year, // Añadimos año como header para facilitar depuración
            'X-Dashboard-Period': period, // Añadimos periodo como header para facilitar depuración
            'X-Force-Refresh': 'true', // Header adicional para indicar que es un refresco forzado
            'X-Random': randomParam // Header adicional para evitar caché
          }
        }).then(res => {
          if (!res.ok) {
            throw new Error(`Error al cargar datos: ${res.status}`);
          }
          return res.json();
        });
        
        // Guardar los datos en sessionStorage para futuras consultas
        try {
          sessionStorage.setItem(`dashboard_cache_${year}_${period}`, JSON.stringify(data));
          console.log(`💾 Datos guardados en caché local para ${year}/${period}`);
        } catch (error) {
          console.warn('No se pudo guardar los datos en caché:', error);
        }
        
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
    refetchOnWindowFocus: true // Ahora sí refrescamos al cambiar el foco para obtener datos actualizados
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