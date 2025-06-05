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

// Variable inicial para el timestamp de actualización
const INITIAL_REFRESH_TRIGGER = Date.now();

export function useSimpleDashboardFilters() {
  // Detectar parámetros de URL al inicializar
  const getInitialFiltersFromUrl = () => {
    if (typeof window === 'undefined') return { year: new Date().getFullYear().toString(), period: 'all' };
    
    const urlParams = new URLSearchParams(window.location.search);
    const yearParam = urlParams.get('year');
    const periodParam = urlParams.get('period');
    
    return {
      year: yearParam && /^\d{4}$/.test(yearParam) ? yearParam : new Date().getFullYear().toString(),
      period: periodParam || 'all'
    };
  };
  
  // Estados simples y directos
  const initialFilters = getInitialFiltersFromUrl();
  const [year, setYear] = useState(initialFilters.year);
  const [period, setPeriod] = useState(initialFilters.period);
  const [refreshTrigger, setRefreshTrigger] = useState(Date.now());
  const queryClient = useQueryClient();
  
  // Actualizar URL sin recarga
  const updateURL = useCallback((newYear: string, newPeriod: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('year', newYear);
    url.searchParams.set('period', newPeriod);
    window.history.pushState({}, '', url.toString());
  }, []);
  
  // Función para cambiar año - ULTRA SIMPLIFICADA
  const changeYear = useCallback((newYear: string) => {
    console.log('🔥 INICIO changeYear - Año actual:', year, 'Nuevo año:', newYear);
    
    if (newYear === year) {
      console.log('⚠️ Año igual, no cambio nada');
      return;
    }
    
    console.log('🗓️ CAMBIANDO AÑO:', newYear);
    
    // 1. Actualizar estado inmediatamente
    console.log('📝 Actualizando estado año...');
    setYear(newYear);
    updateURL(newYear, period);
    
    // 2. Nuevo trigger único
    const newTrigger = Date.now() + Math.random();
    console.log('🎯 Nuevo trigger generado:', newTrigger);
    setRefreshTrigger(newTrigger);
    
    // 3. LIMPIAR COMPLETAMENTE la caché de React Query
    console.log('🧹 Limpiando caché de React Query...');
    queryClient.clear();
    
    // 4. Forzar refetch inmediato
    console.log('🚀 Forzando refetch en 100ms...');
    setTimeout(() => {
      console.log('💥 EJECUTANDO REFETCH AHORA...');
      queryClient.refetchQueries({
        queryKey: ['/api/dashboard-direct'],
        type: 'all'
      });
    }, 100);
    
    console.log(`✅ AÑO CAMBIADO: ${year} -> ${newYear}, trigger: ${newTrigger}`);
  }, [year, period, updateURL, queryClient]);
  
  // Función para cambiar periodo - ULTRA SIMPLIFICADA
  const changePeriod = useCallback((newPeriod: string) => {
    if (newPeriod === period) return;
    
    console.log('📅 CAMBIANDO PERIODO:', newPeriod);
    
    // 1. Formatear periodo
    let formattedPeriod = newPeriod;
    if (newPeriod.toLowerCase() !== 'all' && newPeriod.toLowerCase().startsWith('q')) {
      formattedPeriod = newPeriod.toUpperCase();
    }
    
    // 2. Actualizar estado inmediatamente
    setPeriod(formattedPeriod);
    updateURL(year, formattedPeriod);
    
    // 3. Nuevo trigger único
    const newTrigger = Date.now() + Math.random();
    setRefreshTrigger(newTrigger);
    
    // 4. LIMPIAR COMPLETAMENTE la caché de React Query
    queryClient.clear();
    
    // 5. Forzar refetch inmediato
    setTimeout(() => {
      queryClient.refetchQueries({
        queryKey: ['/api/dashboard-direct'],
        type: 'all'
      });
    }, 100);
    
    console.log(`✅ PERIODO CAMBIADO: ${period} -> ${formattedPeriod}, trigger: ${newTrigger}`);
  }, [period, year, updateURL, queryClient]);
  
  // Función para refresh manual - ULTRA SIMPLIFICADA
  const forceRefresh = useCallback(() => {
    console.log('🔄 REFRESH MANUAL FORZADO');
    
    // 1. Nuevo trigger único
    const newTrigger = Date.now() + Math.random();
    setRefreshTrigger(newTrigger);
    
    // 2. LIMPIAR COMPLETAMENTE la caché
    queryClient.clear();
    
    // 3. Refetch inmediato
    setTimeout(() => {
      queryClient.refetchQueries({
        queryKey: ['/api/dashboard-direct'],
        type: 'all'
      });
    }, 100);
    
    console.log('✅ REFRESH MANUAL COMPLETADO, trigger:', newTrigger);
    return newTrigger;
  }, [queryClient]);
  
  // Sincronizar con URL cuando cambia (botón atrás/adelante)
  useEffect(() => {
    const handlePopState = () => {
      const newFilters = getInitialFiltersFromUrl();
      if (newFilters.year !== year) setYear(newFilters.year);
      if (newFilters.period !== period) setPeriod(newFilters.period);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [year, period]);
  
  return {
    year,
    period,
    changeYear,
    changePeriod,
    forceRefresh,
    refreshTrigger
  };
}