import { useState, useCallback } from 'react';
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
      queryKey: ['dashboard'],
    });
    
    // No es necesario forzar el refetch, el useDashboardData se encargará
  }, [queryClient]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('Cambiando periodo a:', newPeriod);
    setPeriod(newPeriod);
    
    // Invalidar consultas existentes para ambos endpoints
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // No es necesario forzar el refetch, el useDashboardData se encargará
  }, [queryClient]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod
  };
}