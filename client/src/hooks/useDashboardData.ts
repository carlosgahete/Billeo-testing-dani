import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardStats } from '@/types/dashboard';
import { toast } from '@/hooks/use-toast';

// Hook para obtener y refrescar los datos del dashboard
export function useDashboardData() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [period, setPeriod] = useState('all');
  
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<DashboardStats>({
    queryKey: ['/api/stats/dashboard', year, period],
    queryFn: async () => {
      // Añadimos nocache=true para forzar la actualización sin caché en cada petición
      const response = await fetch(`/api/stats/dashboard?year=${year}&period=${period}&nocache=true`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Error fetching dashboard data');
      }
      return response.json();
    },
    // Configuraciones para actualización en tiempo real
    refetchOnWindowFocus: true,      // Refresca cuando la ventana obtiene el foco
    refetchOnMount: true,            // Refresca cuando el componente se monta
    refetchInterval: 5000,           // Refresca cada 5 segundos
    staleTime: 0                     // Los datos siempre se consideran obsoletos
  });
  
  // Manejar errores
  useEffect(() => {
    if (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudieron cargar las estadísticas del dashboard. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    }
  }, [error]);
  
  // Configuración para sincronización con eventos del cliente
  const queryClient = useQueryClient();
  
  const refreshDashboardData = useCallback(() => {
    console.log('🔄 Actualizando datos del dashboard en tiempo real...');
    refetch();
  }, [refetch]);
  
  // Eventos que escuchar para actualizar el dashboard
  useEffect(() => {
    // Suscribirse a eventos de facturación (creación, edición, eliminación)
    const handleInvoiceChange = () => {
      console.log('📝 Factura modificada, actualizando dashboard...');
      refreshDashboardData();
    };
    
    // Suscribirse a eventos de transacciones (creación, edición, eliminación)
    const handleTransactionChange = () => {
      console.log('💰 Transacción modificada, actualizando dashboard...');
      refreshDashboardData();
    };
    
    // Escuchar invalidaciones de consultas relacionadas con facturas
    const unsubscribeInvoices = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey && Array.isArray(event.query.queryKey)) {
        const key = event.query.queryKey[0];
        if (typeof key === 'string' && 
            (key.includes('/invoices') || 
             key.includes('/api/invoices'))) {
          handleInvoiceChange();
        }
        
        if (typeof key === 'string' && 
            (key.includes('/transactions') || 
             key.includes('/api/transactions'))) {
          handleTransactionChange();
        }
      }
    });
    
    return () => {
      unsubscribeInvoices();
    };
  }, [queryClient, refreshDashboardData]);
  
  // Funciones para cambiar filtros
  const changeYear = (newYear: string) => {
    setYear(newYear);
  };
  
  const changePeriod = (newPeriod: string) => {
    setPeriod(newPeriod);
  };
  
  return {
    data,
    isLoading,
    error,
    refetch,
    filters: {
      year,
      period,
      changeYear,
      changePeriod
    }
  };
}