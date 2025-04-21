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
    
    // Invalidar y refrescar inmediatamente las consultas
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // Forzar refresh directo de la API en caso de que la caché no se actualice
    fetch(`/api/stats/dashboard-fix?year=${newYear}&period=${period}&_cb=${Date.now()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Accept': 'application/json'
      }
    }).then(() => {
      console.log('Solicitud directa para refrescar datos después de cambio de año');
      // Disparar evento para que los hooks reaccionen
      window.dispatchEvent(new CustomEvent('dashboard-refresh-required'));
    }).catch(err => {
      console.error('Error al refrescar datos después de cambio de año:', err);
    });
  }, [queryClient, period]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('Cambiando periodo a:', newPeriod);
    setPeriod(newPeriod);
    
    // Invalidar y refrescar inmediatamente las consultas
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // Forzar refresh directo de la API en caso de que la caché no se actualice
    fetch(`/api/stats/dashboard-fix?year=${year}&period=${newPeriod}&_cb=${Date.now()}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Accept': 'application/json'
      }
    }).then(() => {
      console.log('Solicitud directa para refrescar datos después de cambio de periodo');
      // Disparar evento para que los hooks reaccionen
      window.dispatchEvent(new CustomEvent('dashboard-refresh-required'));
    }).catch(err => {
      console.error('Error al refrescar datos después de cambio de periodo:', err);
    });
  }, [queryClient, year]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod
  };
}