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
      // Pequeño retardo para asegurar que la transacción en bd se completó
      setTimeout(refreshDashboardData, 300);
    };
    
    // Suscribirse a eventos de transacciones (creación, edición, eliminación)
    const handleTransactionChange = () => {
      console.log('💰 Transacción modificada, actualizando dashboard...');
      setTimeout(refreshDashboardData, 300);
    };

    // Escuchar eventos del DOM para actualización inmediata
    const handleInvoiceCreated = () => {
      console.log('✨ Nueva factura creada, actualizando dashboard inmediatamente...');
      setTimeout(refreshDashboardData, 300);
    };

    const handleInvoiceDeleted = () => {
      console.log('🗑️ Factura eliminada, actualizando dashboard inmediatamente...');
      setTimeout(refreshDashboardData, 300);
    };
    
    const handleDashboardRefreshRequired = () => {
      console.log('🔄 Solicitud explícita de actualización de dashboard recibida...');
      refreshDashboardData();
    };
    
    // Escuchar eventos personalizados del DOM
    window.addEventListener('invoice-created', handleInvoiceCreated);
    window.addEventListener('invoice-updated', handleInvoiceChange);
    window.addEventListener('invoice-deleted', handleInvoiceDeleted);
    window.addEventListener('dashboard-refresh-required', handleDashboardRefreshRequired);
    
    // Escuchar invalidaciones de consultas relacionadas con facturas
    const unsubscribeInvoices = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey && Array.isArray(event.query.queryKey)) {
        const key = event.query.queryKey[0];
        
        // Verificar si es un cambio o invalidación en facturas
        if (typeof key === 'string' && 
            (key.includes('/invoice') || 
             key.includes('/api/invoice'))) {
          handleInvoiceChange();
        }
        
        // Verificar si es un cambio o invalidación en transacciones
        if (typeof key === 'string' && 
            (key.includes('/transaction') || 
             key.includes('/api/transaction'))) {
          handleTransactionChange();
        }
      }
    });
    
    return () => {
      // Limpieza de todos los event listeners
      window.removeEventListener('invoice-created', handleInvoiceCreated);
      window.removeEventListener('invoice-updated', handleInvoiceChange);
      window.removeEventListener('invoice-deleted', handleInvoiceDeleted);
      window.removeEventListener('dashboard-refresh-required', handleDashboardRefreshRequired);
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