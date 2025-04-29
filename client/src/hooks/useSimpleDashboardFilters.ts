import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Variable global para el timestamp de actualización manual
let globalRefreshTrigger = Date.now();

export function useSimpleDashboardFilters() {
  // Detectar parámetros de URL al inicializar para sincronizar con la URL actual
  const getInitialFiltersFromUrl = () => {
    if (typeof window === 'undefined') return { year: new Date().getFullYear().toString(), period: 'all' };
    
    // Obtener los parámetros de la URL actual
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year');
    const periodParam = urlParams.get('period');
    
    console.log("📃 PARÁMETROS INICIALES DE URL:", { yearParam, periodParam });
    
    // Usar los parámetros de la URL o los valores predeterminados
    return {
      year: yearParam && /^\d{4}$/.test(yearParam) ? yearParam : new Date().getFullYear().toString(),
      period: periodParam || 'all'
    };
  };
  
  // Inicializar estados con los valores de la URL
  const initialFilters = getInitialFiltersFromUrl();
  const [year, setYear] = useState(initialFilters.year);
  const [period, setPeriod] = useState(initialFilters.period);
  const queryClient = useQueryClient();
  
  // Efecto para sincronizar los filtros con la URL cuando cambia la ubicación
  useEffect(() => {
    const syncFiltersWithUrl = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const yearParam = urlParams.get('year');
      const periodParam = urlParams.get('period');
      
      console.log("🔄 SINCRONIZANDO DESDE URL:", { yearParam, periodParam, currentYear: year, currentPeriod: period });
      
      // Actualizar estado solo si los parámetros existen y son diferentes a los actuales
      if (yearParam && yearParam !== year && /^\d{4}$/.test(yearParam)) {
        console.log(`🗓️ Actualizando año desde URL: ${year} -> ${yearParam}`);
        setYear(yearParam);
      }
      
      if (periodParam && periodParam !== period) {
        console.log(`📅 Actualizando periodo desde URL: ${period} -> ${periodParam}`);
        setPeriod(periodParam);
      }
    };
    
    // Sincronizar al montar el componente
    syncFiltersWithUrl();
    
    // Agregar listener para popstate (cuando usas botón de atrás/adelante)
    window.addEventListener('popstate', syncFiltersWithUrl);
    
    return () => {
      window.removeEventListener('popstate', syncFiltersWithUrl);
    };
  }, [year, period]);
  
  // Función para forzar una actualización manual incrementando el trigger
  const forceRefresh = useCallback(() => {
    console.log('🔄 Forzando actualización manual del dashboard...');
    globalRefreshTrigger = Date.now(); // Actualizamos el timestamp global
    
    // Invalidamos completamente la caché de consultas del dashboard
    queryClient.invalidateQueries({
      queryKey: ['/api/dashboard-direct'],
    });
    
    // También invalidamos cualquier consulta relacionada con el dashboard
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && 
          (key.startsWith('/api/stats/dashboard') || key.startsWith('/api/dashboard-direct'));
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
      queryKey: ['/api/dashboard-direct'],
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
    // Corregir: siempre normalizar a Q1, Q2, etc. en mayúsculas para consistencia
    let formattedPeriod: string;
    
    if (newPeriod.toLowerCase() === 'all') {
      formattedPeriod = 'all';
    } else if (newPeriod.toLowerCase().startsWith('q') && ['q1', 'q2', 'q3', 'q4', 'Q1', 'Q2', 'Q3', 'Q4'].includes(newPeriod)) {
      // Convertir siempre a formato Q1, Q2, Q3, Q4 (en mayúsculas)
      formattedPeriod = newPeriod.toUpperCase();
    } else {
      // Si no es un formato reconocido, usar 'all' como fallback
      console.warn(`⚠️ Formato de periodo no reconocido: ${newPeriod}, usando 'all' como fallback`);
      formattedPeriod = 'all';
    }
    
    console.log('🔢 Periodo formateado para backend:', formattedPeriod);
    
    // Actualizamos el timestamp global para forzar una nueva consulta
    globalRefreshTrigger = Date.now();
    
    // Primero invalidar las consultas con los parámetros antiguos
    queryClient.invalidateQueries({
      queryKey: ['/api/dashboard-direct', year, period],
    });
    
    // También invalidar posibles consultas con formato inconsistente
    if (period.toLowerCase() !== 'all') {
      const alternativePeriod = period.startsWith('q') ? period.toUpperCase() : 
                               period.startsWith('Q') ? period.toLowerCase() : period;
      queryClient.invalidateQueries({
        queryKey: ['/api/dashboard-direct', year, alternativePeriod],
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
          return key[0] === '/api/dashboard-direct';
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
    
    // Optimización: Almacenar datos de consultas anteriores en sessionStorage
    // para mejorar el rendimiento al cambiar entre filtros
    const previousData = sessionStorage.getItem(`dashboard_cache_${year}_${period}`);
    if (previousData) {
      console.log(`🚀 Usando caché local para ${year}/${period} mientras se actualiza en segundo plano`);
      try {
        // Restaurar los datos en caché para una respuesta inmediata
        const cachedData = JSON.parse(previousData);
        queryClient.setQueryData(['/api/dashboard-direct', year, period], cachedData);
      } catch (e) {
        console.error('Error al usar datos en caché:', e);
      }
    }
    
    // Actualizamos en segundo plano, sin afectar la interfaz
    queryClient.invalidateQueries({
      queryKey: ['/api/dashboard-direct', year, period],
      // No refetch immediately to avoid UI lag
      refetchType: 'active',
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