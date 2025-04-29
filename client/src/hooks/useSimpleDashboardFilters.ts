import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Función de utilidad para debounce
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
  };
}

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
  
  // Version optimizada de forzar actualización sin congelar la interfaz
  // Esta operación ya no causa bloqueos en la UI
  const forceRefresh = useCallback(() => {
    console.log('🔄 Forzando actualización manual optimizada del dashboard...');
    
    // 1. Actualizar el timestamp global para forzar consultas nuevas
    globalRefreshTrigger = Date.now();
    
    // 2. Mostrar algún indicador visual de que se está actualizando
    // (esto se maneja automáticamente en la UI por los estados de isLoading)
    
    // 3. Primero actualizar consultas específicas para la vista actual (más prioritario)
    queryClient.invalidateQueries({
      queryKey: ['/api/dashboard-direct', year, period],
      // Usar refetchType para controlar cómo se realiza la actualización
      refetchType: 'all', // Forzar actualización inmediata para los datos visibles
    });
    
    // 4. Programar la invalidación del resto de consultas con un pequeño retraso
    // para dar prioridad a la actualización de la vista actual
    setTimeout(() => {
      // Invalidamos otras consultas relacionadas con el dashboard
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Solo invalidar otras consultas, no la que ya actualizamos
          const key = query.queryKey;
          if (!Array.isArray(key) || key.length < 3) return false;
          
          return key[0] === '/api/dashboard-direct' && 
                 (key[1] !== year || key[2] !== period);
        },
        refetchType: 'inactive', // No refrescar automáticamente
      });
      
      // También invalidamos consultas antiguas relacionadas con el dashboard
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && 
            key.startsWith('/api/stats/dashboard');
        },
        refetchType: 'inactive', // No refrescar automáticamente
      });
    }, 500); // 500ms de retraso para dar prioridad a los datos actuales
    
    // 5. Disparar un evento para notificar a otros componentes
    const event = new CustomEvent('dashboard-refresh-triggered', {
      detail: { year, period, timestamp: globalRefreshTrigger }
    });
    window.dispatchEvent(event);
    
    return globalRefreshTrigger; // Devolver el nuevo timestamp para usar en componentes
  }, [queryClient, year, period]);
  
  // Versión con debounce de las acciones costosas al cambiar de año
  // para evitar sobrecarga del servidor con múltiples solicitudes
  const debouncedClearQueries = useCallback(
    debounce((queryClient) => {
      console.log('🧹 Limpieza de caché diferida ejecutándose ahora...');
      queryClient.removeQueries({
        queryKey: ['/api/dashboard-direct'],
      });
    }, 500), // 500ms de delay para evitar múltiples limpiezas si el usuario cambia rápidamente
    [queryClient]
  );
  
  // Función para cambiar el año - optimizada para rendimiento
  const changeYear = useCallback((newYear: string) => {
    if (newYear === year) return; // Evitar trabajo innecesario
    
    console.log('🗓️ Cambiando año a:', newYear);
    
    // Indicar que esta es una actualización manual
    window.forceDashboardRefresh = false;
    
    // 1. Actualizar el timestamp global para forzar consultas nuevas
    globalRefreshTrigger = Date.now();
    
    // 2. Verificar si hay datos en caché para mostrar inmediatamente
    const cacheKey = `dashboard_cache_${newYear}_${period}`;
    sessionStorage.setItem('current_dashboard_cache_key', cacheKey);
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        console.log(`🚀 Pre-cargando datos en caché para ${newYear}/${period}`);
        const data = JSON.parse(cachedData);
        queryClient.setQueryData(['/api/dashboard-direct', newYear, period], data);
        
        // 3. Cambiar el año en el estado local (primero para UI responsiva)
        setYear(newYear);
        
        // 4. Actualizar en segundo plano sin bloquear la interfaz
        setTimeout(() => {
          // Forzar actualización en segundo plano
          queryClient.invalidateQueries({
            queryKey: ['/api/dashboard-direct', newYear, period],
            refetchType: 'inactive' // No refrescar automáticamente
          });
        }, 500);
      } catch (e) {
        console.error('Error al pre-cargar datos en caché:', e);
        // Si falla la caché, simplemente cambiamos el año
        setYear(newYear);
      }
    } else {
      // Sin caché disponible, actualizar inmediatamente
      setYear(newYear);
    }
    
    // 5. Programar limpieza diferida de caché para evitar bloquear la UI
    // pero no limpiar todo, solo las consultas más antiguas
    setTimeout(() => {
      debouncedClearQueries(queryClient);
    }, 1000);
    
    // 6. Log detallado para entender qué año estamos realmente usando
    console.log(`⚠️ CAMBIO DE AÑO: anterior=${year}, nuevo=${newYear}, timestamp=${globalRefreshTrigger}`);
    
    // 7. Disparar eventos personalizados con el nuevo año
    const event = new CustomEvent('dashboard-year-changed', {
      detail: { year: newYear, period, timestamp: globalRefreshTrigger }
    });
    
    const filterEvent = new CustomEvent('dashboard-filters-changed', {
      detail: { year: newYear, period, timestamp: globalRefreshTrigger }
    });
    
    // Emitir ambos eventos
    window.dispatchEvent(event);
    window.dispatchEvent(filterEvent);
  }, [queryClient, year, period, debouncedClearQueries]);
  
  // Versión con debounce para la limpieza de caché al cambiar periodo
  const debouncedPeriodCacheCleanup = useCallback(
    debounce((queryClient, year, period) => {
      console.log('🧹 Limpieza diferida de caché para nuevo periodo...');
      
      // Eliminar solo consultas específicas, no todo el caché
      queryClient.removeQueries({
        predicate: (query: any) => {
          const key = query.queryKey;
          if (Array.isArray(key) && key.length > 0) {
            return key[0] === '/api/dashboard-direct' && key[1] !== year && key[2] !== period;
          }
          return false;
        },
      });
    }, 800), // 800ms delay para dar tiempo a la interfaz a actualizarse
    [queryClient]
  );

  // Función para cambiar el periodo - optimizada para rendimiento
  const changePeriod = useCallback((newPeriod: string) => {
    if (newPeriod === period) return; // No hacer trabajo innecesario
    
    console.log('🔢 Cambiando periodo a:', newPeriod);
    
    // Asegurarnos que el formato del periodo es el correcto (backend espera Q1, Q2, etc.)
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
    
    // Actualizamos el timestamp global para forzar una nueva consulta
    globalRefreshTrigger = Date.now();
    
    // 1. Verificar si hay datos en caché para mostrar inmediatamente
    const cachedData = sessionStorage.getItem(`dashboard_cache_${year}_${formattedPeriod}`);
    if (cachedData) {
      try {
        console.log(`🚀 Pre-cargando datos en caché para ${year}/${formattedPeriod}`);
        queryClient.setQueryData(['/api/dashboard-direct', year, formattedPeriod], JSON.parse(cachedData));
      } catch (e) {
        console.error('Error al pre-cargar datos en caché:', e);
      }
    }
    
    // 2. Actualizar el estado UI inmediatamente para feedback de usuario
    setPeriod(formattedPeriod);
    
    // 3. Programar limpieza diferida de caché para no bloquear la UI
    debouncedPeriodCacheCleanup(queryClient, year, formattedPeriod);
    
    // 4. Disparar evento para notificar a otros componentes
    const event = new CustomEvent('dashboard-filters-changed', {
      detail: { year, period: formattedPeriod, timestamp: globalRefreshTrigger }
    });
    window.dispatchEvent(event);
    
    // 5. Invalidar (no eliminar) la consulta específica para actualizar en segundo plano
    queryClient.invalidateQueries({
      queryKey: ['/api/dashboard-direct', year, formattedPeriod],
      refetchType: 'active' // No forzar refresco inmediato
    });
  }, [queryClient, year, period, debouncedPeriodCacheCleanup]);
  
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