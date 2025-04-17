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
      console.log(`📊 Ejecutando consulta con: año=${year}, periodo=${period}`);
      const response = await fetch(`/api/stats/dashboard?year=${year}&period=${period}&nocache=true`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include' // Asegurar que se envían las cookies de sesión
      });
      
      // Verificar específicamente si el problema es de autenticación
      if (response.status === 401) {
        throw new Error('AUTHENTICATION_ERROR');
      }
      else if (!response.ok) {
        throw new Error('Error fetching dashboard data');
      }
      
      return response.json();
    },
    // Configuraciones para actualización controlada
    refetchOnWindowFocus: false,     // No refrescar automáticamente al obtener el foco
    refetchOnMount: true,            // Refresca cuando el componente se monta
    refetchInterval: false,          // No refrescar automáticamente a intervalos
    staleTime: 5 * 60 * 1000,        // Datos válidos por 5 minutos
    // IMPORTANTE: Esta propiedad hace que la consulta se actualice automáticamente cuando cambian las dependencias
    enabled: !!year && !!period      // Asegurarse de que tenemos los parámetros antes de consultar
  });
  
  // Manejar errores
  useEffect(() => {
    if (error) {
      console.error('Error loading dashboard data:', error);
      
      // Verificar si es un error de autenticación
      if (error instanceof Error && error.message === 'AUTHENTICATION_ERROR') {
        toast({
          title: 'Sesión expirada',
          description: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          variant: 'destructive'
        });
        
        // Redirigir a la página de login después de un breve retraso
        setTimeout(() => {
          window.location.href = '/auth';
        }, 1500);
      } else {
        // Para otros tipos de errores
        toast({
          title: 'Error al cargar datos',
          description: 'No se pudieron cargar las estadísticas del dashboard. Inténtalo de nuevo.',
          variant: 'destructive'
        });
      }
    }
  }, [error]);
  
  // Configuración para sincronización con eventos del cliente
  const queryClient = useQueryClient();
  
  const refreshDashboardData = useCallback(() => {
    console.log('🔄 Actualizando datos del dashboard en tiempo real...');
    refetch();
  }, [refetch]);
  
  // Nota: Removemos este useEffect para evitar ciclos de actualización
  
  // Eventos que escuchar para actualizar el dashboard
  useEffect(() => {
    // Suscribirse a eventos de facturación (creación, edición, eliminación)
    const handleInvoiceChange = () => {
      if (document.hasFocus()) {
        console.log('📝 Factura modificada, actualizando dashboard...');
        // Pequeño retardo para asegurar que la transacción en bd se completó
        setTimeout(refreshDashboardData, 300);
      }
    };
    
    // Suscribirse a eventos de transacciones (creación, edición, eliminación)
    const handleTransactionChange = () => {
      if (document.hasFocus()) {
        console.log('💰 Transacción modificada, actualizando dashboard...');
        setTimeout(refreshDashboardData, 300);
      }
    };

    // Escuchar eventos del DOM para actualización inmediata
    const handleInvoiceCreated = () => {
      if (document.hasFocus()) {
        console.log('✨ Nueva factura creada, actualizando dashboard inmediatamente...');
        setTimeout(refreshDashboardData, 300);
      }
    };

    const handleInvoiceDeleted = () => {
      if (document.hasFocus()) {
        console.log('🗑️ Factura eliminada, actualizando dashboard inmediatamente...');
        setTimeout(refreshDashboardData, 300);
      }
    };
    
    const handleDashboardRefreshRequired = () => {
      if (document.hasFocus()) {
        console.log('🔄 Solicitud explícita de actualización de dashboard recibida...');
        refreshDashboardData();
      }
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
  
  // Funciones para cambiar filtros - implementación directa y de un solo paso
  const changeYear = useCallback((newYear: string) => {
    console.log('🔄 Cambiando año a:', newYear);
    
    // Actualizamos el estado local
    setYear(newYear);
    
    // Invalidar inmediatamente la query exacta
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard', year, period],
      exact: true
    });
    
    // Forzar actualización inmediata
    queryClient.refetchQueries({
      queryKey: ['/api/stats/dashboard', newYear, period],
      exact: true,
      type: 'active'
    });
    
    // Garantizar la actualización con un refresco manual
    setTimeout(() => {
      console.log('⚡ Forzando recarga manual con año:', newYear);
      refetch();
    }, 50);
  }, [refetch, queryClient, year, period]);
  
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('🔄 Cambiando periodo a:', newPeriod);
    
    // Actualizamos el estado local
    setPeriod(newPeriod);
    
    // Invalidar inmediatamente la query exacta
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard', year, period],
      exact: true
    });
    
    // Forzar actualización inmediata
    queryClient.refetchQueries({
      queryKey: ['/api/stats/dashboard', year, newPeriod],
      exact: true,
      type: 'active'
    });
    
    // Garantizar la actualización con un refresco manual
    setTimeout(() => {
      console.log('⚡ Forzando recarga manual con periodo:', newPeriod);
      refetch();
    }, 50);
  }, [refetch, queryClient, year, period]);
  
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