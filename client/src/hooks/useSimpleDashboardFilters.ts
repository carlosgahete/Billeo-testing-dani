import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Singleton para mantener el estado entre componentes
let globalYear = new Date().getFullYear().toString();
let globalPeriod = 'all';
let globalListeners: (() => void)[] = [];

// Función para notificar a todos los listeners sobre cambios
const notifyGlobalListeners = () => {
  globalListeners.forEach(listener => listener());
};

export function useSimpleDashboardFilters() {
  const [year, setYear] = useState(globalYear);
  const [period, setPeriod] = useState(globalPeriod);
  const queryClient = useQueryClient();
  
  // Sincronizar con el estado global al montar el componente
  useEffect(() => {
    // Función que actualiza el estado local cuando cambia el global
    const syncGlobalState = () => {
      setYear(globalYear);
      setPeriod(globalPeriod);
    };
    
    // Registrar listener para cambios globales
    globalListeners.push(syncGlobalState);
    
    // Limpiar listener al desmontar
    return () => {
      globalListeners = globalListeners.filter(listener => listener !== syncGlobalState);
    };
  }, []);
  
  // Función para cambiar el año
  const changeYear = useCallback((newYear: string) => {
    console.log('Cambiando año a:', newYear);
    
    // Actualizar tanto estado local como global
    setYear(newYear);
    globalYear = newYear;
    
    // Invalidar consultas existentes
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // Notificar a otros componentes que usan este hook
    notifyGlobalListeners();
  }, [queryClient]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('Cambiando periodo a:', newPeriod);
    
    // Actualizar tanto estado local como global
    setPeriod(newPeriod);
    globalPeriod = newPeriod;
    
    // Invalidar consultas existentes
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // Notificar a otros componentes que usan este hook
    notifyGlobalListeners();
  }, [queryClient]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod
  };
}