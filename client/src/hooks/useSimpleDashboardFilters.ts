import React, { useState, useCallback, useEffect } from 'react';
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
    console.log('Cambiando año directamente a:', newYear);
    
    // Método drástico: actualizar el año y forzar una recarga completa del dashboard
    
    // 1. Actualizar el timestamp global para forzar consultas nuevas
    globalRefreshTrigger = Date.now();
    
    // 2. Eliminar TODAS las consultas cache relacionadas con el dashboard
    queryClient.removeQueries({
      queryKey: ['/api/stats/dashboard-fix'],
    });
    
    // 3. Cambiar el año en el estado local
    setYear(newYear);
    
    // 4. Vaciar completamente el caché de la consulta (más agresivo)
    queryClient.clear();
    
    // 5. Log detallado para entender qué año estamos realmente usando
    console.log(`⚠️ CAMBIO DRÁSTICO DE AÑO: anterior=${year}, nuevo=${newYear}, timestamp=${globalRefreshTrigger}`);
    
    // 6. Disparar un evento personalizado con el nuevo año
    const event = new CustomEvent('dashboard-year-changed', {
      detail: { year: newYear, period, timestamp: globalRefreshTrigger }
    });
    
    // 7. Disparar un evento normal de cambio de filtros
    const filterEvent = new CustomEvent('dashboard-filters-changed', {
      detail: { year: newYear, period, timestamp: globalRefreshTrigger }
    });
    
    // 8. Emitir ambos eventos
    window.dispatchEvent(event);
    window.dispatchEvent(filterEvent);
  }, [queryClient, year, period]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('🔢 Cambiando periodo a:', newPeriod);
    console.log('Cambiando periodo directamente a:', newPeriod);
    
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
    
    // Eliminar cualquier consulta relacionada con el dashboard para forzar recargas completas
    // Esto es más agresivo que invalidar, pero garantiza datos frescos en cada cambio
    queryClient.removeQueries({
      predicate: (query) => {
        // Eliminar todas las consultas relacionadas con el dashboard al cambiar el periodo
        const key = query.queryKey;
        if (Array.isArray(key) && key.length > 0) {
          return key[0] === '/api/stats/dashboard-fix';
        }
        return false;
      },
    });
    
    // Disparamos manualmente un evento para notificar a otros componentes
    const event = new CustomEvent('dashboard-filters-changed', {
      detail: { year, period: formattedPeriod, timestamp: globalRefreshTrigger }
    });
    window.dispatchEvent(event);
  }, [queryClient, year, period]);
  
  // Efecto para notificar cambios visualmente cuando cambian los filtros
  // Utilizamos una referencia para controlar la inicialización
  const isInitialMount = React.useRef(true);
  
  useEffect(() => {
    // Evitar la ejecución en el montaje inicial
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('🚀 Inicialización de los filtros - sin disparar eventos ni sobrecargar');
      return;
    }
    
    // Solo propagamos eventos después del montaje inicial
    console.log(`📊 Filtros del dashboard actualizados: año=${year}, periodo=${period}, trigger=${globalRefreshTrigger}`);
    
    // Disparamos un evento personalizado para que otros componentes puedan reaccionar
    const event = new CustomEvent('dashboard-filters-changed', { 
      detail: { year, period, timestamp: globalRefreshTrigger } 
    });
    window.dispatchEvent(event);
    
    // Forzamos una actualización de los datos al cambiar los filtros
    // pero usando un enfoque más selectivo
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix', year, period],
    });
  }, [year, period, queryClient, globalRefreshTrigger]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod,
    forceRefresh,
    refreshTrigger: globalRefreshTrigger
  };
}