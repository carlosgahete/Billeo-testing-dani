import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useSimpleDashboardFilters() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [period, setPeriod] = useState('all');
  const queryClient = useQueryClient();
  
  // Función para cambiar el año
  const changeYear = useCallback((newYear: string) => {
    console.log('Cambiando año a:', newYear);
    setYear(newYear);
    
    // Invalidar consultas existentes para ambos endpoints
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix'],
    });
    
    // También invalidar por el patrón parcial para asegurar que se capturan las consultas con parámetros
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/stats/dashboard');
      },
    });
  }, [queryClient]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('Cambiando periodo a:', newPeriod);
    setPeriod(newPeriod);
    
    // Invalidar consultas existentes para ambos endpoints
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard-fix'],
    });
    
    // También invalidar por el patrón parcial para asegurar que se capturan las consultas con parámetros
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/stats/dashboard');
      },
    });
  }, [queryClient]);
  
  // Efecto para notificar cambios visualmente cuando cambian los filtros
  useEffect(() => {
    // Disparamos un evento personalizado para que otros componentes puedan reaccionar
    const event = new CustomEvent('dashboard-filters-changed', { 
      detail: { year, period } 
    });
    window.dispatchEvent(event);
    
    console.log(`📊 Filtros del dashboard actualizados: año=${year}, periodo=${period}`);
  }, [year, period]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod
  };
}