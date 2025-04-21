import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Variable global para el timestamp de actualización manual
let globalRefreshTrigger = Date.now();

export function useSimpleDashboardFilters() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [period, setPeriod] = useState('all');
  const queryClient = useQueryClient();
  
  // Función para forzar una actualización manual incrementando el trigger
  const forceRefresh = useCallback(() => {
    console.log('🔄 Forzando actualización manual del dashboard...');
    globalRefreshTrigger = Date.now(); // Actualizamos el timestamp global
    
    // Invalidamos completamente la caché de consultas del dashboard
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix'],
    });
    
    // También invalidamos cualquier consulta relacionada con el dashboard
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/stats/dashboard');
      },
    });
  }, [queryClient]);
  
  // Función para cambiar el año
  const changeYear = useCallback((newYear: string) => {
    console.log('🗓️ Cambiando año a:', newYear);
    
    // Actualizamos el timestamp global para forzar una nueva consulta
    globalRefreshTrigger = Date.now();
    
    // Primero invalidar las consultas con los parámetros antiguos
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix', year, period],
    });
    
    // Después cambiar el estado para que futuras consultas usen el nuevo año
    setYear(newYear);
    
    // Invalidar cualquier consulta relacionada con el dashboard para forzar recargas
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.includes('dashboard');
      },
    });
    
    // Disparamos manualmente un evento para notificar a otros componentes
    const event = new CustomEvent('dashboard-filters-changed', {
      detail: { year: newYear, period, timestamp: globalRefreshTrigger }
    });
    window.dispatchEvent(event);
  }, [queryClient, year, period]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('🔢 Cambiando periodo a:', newPeriod);
    
    // Asegurarnos que el formato del periodo es el correcto (backend espera Q1, Q2, etc.)
    const formattedPeriod = newPeriod.toLowerCase() === 'all' ? 'all' : 
                           newPeriod.startsWith('q') ? newPeriod.toUpperCase() : newPeriod;
    
    console.log('🔢 Periodo formateado para backend:', formattedPeriod);
    
    // Actualizamos el timestamp global para forzar una nueva consulta
    globalRefreshTrigger = Date.now();
    
    // Primero invalidar las consultas con los parámetros antiguos
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix', year, period],
    });
    
    // También invalidar posibles consultas con formato inconsistente
    if (period.toLowerCase() !== 'all') {
      const alternativePeriod = period.startsWith('q') ? period.toUpperCase() : 
                               period.startsWith('Q') ? period.toLowerCase() : period;
      queryClient.invalidateQueries({
        queryKey: ['/api/stats/dashboard-fix', year, alternativePeriod],
      });
    }
    
    // Después cambiar el estado para que futuras consultas usen el nuevo periodo
    setPeriod(formattedPeriod);
    
    // Invalidar cualquier consulta relacionada con el dashboard para forzar recargas
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.includes('dashboard');
      },
    });
    
    // Disparamos manualmente un evento para notificar a otros componentes
    const event = new CustomEvent('dashboard-filters-changed', {
      detail: { year, period: formattedPeriod, timestamp: globalRefreshTrigger }
    });
    window.dispatchEvent(event);
  }, [queryClient, year, period]);
  
  // Efecto para notificar cambios visualmente cuando cambian los filtros
  useEffect(() => {
    // Disparamos un evento personalizado para que otros componentes puedan reaccionar
    const event = new CustomEvent('dashboard-filters-changed', { 
      detail: { year, period, timestamp: globalRefreshTrigger } 
    });
    window.dispatchEvent(event);
    
    console.log(`📊 Filtros del dashboard actualizados: año=${year}, periodo=${period}, trigger=${globalRefreshTrigger}`);
    
    // Forzamos una actualización de los datos al cambiar los filtros
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix'],
    });
  }, [year, period, queryClient]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod,
    forceRefresh,
    refreshTrigger: globalRefreshTrigger
  };
}