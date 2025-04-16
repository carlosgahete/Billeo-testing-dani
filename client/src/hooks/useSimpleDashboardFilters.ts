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
    
    // Invalidar consultas existentes
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard'],
    });
    
    // Forzar refetch directo
    queryClient.fetchQuery({
      queryKey: ['/api/stats/dashboard', newYear, period],
    });
  }, [period, queryClient]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('Cambiando periodo a:', newPeriod);
    setPeriod(newPeriod);
    
    // Invalidar consultas existentes
    queryClient.invalidateQueries({
      queryKey: ['/api/stats/dashboard'],
    });
    
    // Forzar refetch directo
    queryClient.fetchQuery({
      queryKey: ['/api/stats/dashboard', year, newPeriod],
    });
  }, [year, queryClient]);
  
  return {
    filters: {
      year,
      period,
      changeYear,
      changePeriod
    },
    handleChangeYear: changeYear,
    handleChangePeriod: changePeriod
  };
}