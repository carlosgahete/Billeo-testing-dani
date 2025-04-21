import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Configuración global para mantener sincronizados los filtros entre componentes
interface GlobalFilters {
  year: string;
  period: string;
}

// Singleton para gestionar el estado global y sus actualizaciones
class FiltersSingleton {
  private state: GlobalFilters;
  private listeners: ((state: GlobalFilters) => void)[];
  
  constructor() {
    this.state = {
      year: new Date().getFullYear().toString(),
      period: 'all'
    };
    this.listeners = [];
  }
  
  // Obtener el estado actual
  getState(): GlobalFilters {
    return {...this.state};
  }
  
  // Actualizar un valor específico
  setState(key: keyof GlobalFilters, value: string): void {
    if (this.state[key] === value) return; // Evitar actualizaciones innecesarias
    
    console.log(`FiltersSingleton: Actualizando ${key} a ${value}`);
    this.state = {
      ...this.state,
      [key]: value
    };
    
    // Notificar a todos los listeners
    this.notifyListeners();
  }
  
  // Registrar un nuevo listener
  subscribe(listener: (state: GlobalFilters) => void): () => void {
    this.listeners.push(listener);
    
    // Devolver función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  // Notificar a todos los listeners
  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error al notificar cambio de filtros:', error);
      }
    });
  }
}

// Crear una única instancia para toda la aplicación
const filtersInstance = new FiltersSingleton();

export function useSimpleDashboardFilters() {
  // Estado local que se sincroniza con el global
  const [filters, setFilters] = useState<GlobalFilters>(filtersInstance.getState());
  const queryClient = useQueryClient();
  
  // Suscripción a cambios globales
  useEffect(() => {
    // Esta función se ejecutará cada vez que cambie el estado global
    const handleStateChange = (newState: GlobalFilters) => {
      console.log('Actualizando filtros locales:', newState);
      setFilters(newState);
    };
    
    // Suscribirse a cambios y obtener la función para cancelar suscripción
    const unsubscribe = filtersInstance.subscribe(handleStateChange);
    
    // Limpiar suscripción al desmontar
    return unsubscribe;
  }, []);
  
  // Función para cambiar el año
  const changeYear = useCallback((newYear: string) => {
    console.log('Hook: Solicitando cambio de año a:', newYear);
    
    // Actualizar estado global (que a su vez actualizará el estado local vía subscription)
    filtersInstance.setState('year', newYear);
    
    // Invalidar consultas existentes para forzar recarga de datos
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // Forzar refetch explícito para asegurar que se actualicen los datos
    setTimeout(() => {
      queryClient.refetchQueries({
        queryKey: ['dashboard', newYear, filters.period],
      });
    }, 50);
    
  }, [queryClient, filters.period]);
  
  // Función para cambiar el periodo
  const changePeriod = useCallback((newPeriod: string) => {
    console.log('Hook: Solicitando cambio de periodo a:', newPeriod);
    
    // Verificar que el periodo tiene un formato válido
    const isValidPeriod = newPeriod === 'all' || 
                         (newPeriod.startsWith('q') && 
                          newPeriod.length === 2 && 
                          ['1', '2', '3', '4'].includes(newPeriod.charAt(1)));
    
    if (!isValidPeriod) {
      console.error(`Formato de periodo no válido: ${newPeriod}, usando 'all' como fallback`);
      newPeriod = 'all';
    }
    
    // Actualizar estado global (que a su vez actualizará el estado local vía subscription)
    filtersInstance.setState('period', newPeriod);
    
    // Invalidar consultas existentes para forzar recarga de datos
    queryClient.invalidateQueries({
      queryKey: ['dashboard'],
    });
    
    // Forzar refetch explícito para asegurar que se actualicen los datos
    setTimeout(() => {
      queryClient.refetchQueries({
        queryKey: ['dashboard', filters.year, newPeriod],
      });
    }, 50);
    
  }, [queryClient, filters.year]);
  
  return {
    year: filters.year,
    period: filters.period,
    changeYear,
    changePeriod
  };
}