import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook para manejar actualizaciones del dashboard mediante polling
 * Reemplaza a useWebSocketDashboard con un enfoque más robusto y eficiente
 * @param refreshCallback - Función a llamar cuando se detecte un cambio
 * @param pollingInterval - Intervalo de consulta en ms (ahora por defecto 30000ms = 30s)
 * @returns Estado de la conexión y último mensaje recibido
 */
export function useDashboardPolling(
  refreshCallback: () => void,
  pollingInterval: number = 30000  // Aumentado a 30 segundos para reducir carga
) {
  const [isActive, setIsActive] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Función para realizar la consulta al endpoint de estado
  const checkForUpdates = useCallback(async () => {
    try {
      // Cancelar consulta anterior si existe
      if (abortControllerRef.current) {
        try {
          // Verificamos que el controlador no esté ya abortado antes de llamar a abort()
          if (!abortControllerRef.current.signal.aborted && 
              typeof abortControllerRef.current.abort === 'function') {
            abortControllerRef.current.abort();
          }
        } catch (err) {
          console.warn('Error al abortar petición previa:', err);
        }
      }
      
      // Crear un nuevo AbortController para esta petición
      abortControllerRef.current = new AbortController();
      
      // Obtener ID de usuario del localStorage para enviarlo como header (lo mantenemos por compatibilidad)
      const userId = localStorage.getItem('user_id') || '';
      const username = localStorage.getItem('username') || '';
      
      // Usar la nueva ruta de polling que no requiere autenticación
      // Esta ruta siempre permite acceso usando el usuario demo
      const response = await fetch('/api/polling/dashboard-status', {
        signal: abortControllerRef.current.signal,
        credentials: 'include', // Mantener por compatibilidad
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-User-ID': userId,
          'X-Username': username
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error al consultar estado: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Imprimir logs para depuración
      console.log('🕒 Última actualización local:', lastUpdatedAt);
      console.log('🕒 Última actualización del servidor:', data.updated_at);
      
      // Si es la primera consulta o si detectamos un cambio (con margen de seguridad de 500ms)
      // Aumentamos el margen para evitar actualizaciones innecesarias por pequeñas diferencias
      if (lastUpdatedAt === null || (data.updated_at && data.updated_at > lastUpdatedAt + 500)) {
        console.log('🔄 Cambio significativo detectado en el dashboard:', data);
        setLastUpdatedAt(data.updated_at);
        setLastMessage({ type: data.lastEvent || 'dashboard-refresh-required' });
        
        // Comprobar si hay datos en sessionStorage antes de llamar al callback
        const cacheKey = sessionStorage.getItem('current_dashboard_cache_key');
        if (cacheKey) {
          const cachedData = sessionStorage.getItem(cacheKey);
          if (cachedData) {
            console.log('💾 Usando datos en caché mientras se actualiza en segundo plano:', cacheKey);
            // El callback solo se llamará si no hay datos en caché
            setTimeout(refreshCallback, 250); // Ligero retraso para permitir renderizado de la UI
            return;
          }
        }
        
        // Si no hay caché, actualizamos inmediatamente
        refreshCallback();
      }
      
      // Reiniciar contador de errores
      if (errorCount > 0) {
        setErrorCount(0);
      }
      
      // Confirmar que el polling está activo
      setIsActive(true);
      
    } catch (error) {
      // Ignorar errores de aborto (son normales al cambiar de página)
      if ((error as Error).name === 'AbortError') {
        return;
      }
      
      console.error('❌ Error al consultar estado del dashboard:', error);
      setErrorCount(prev => prev + 1);
      
      // Si hay muchos errores consecutivos, marcar como inactivo
      if (errorCount >= 3) {
        setIsActive(false);
      }
    }
  }, [lastUpdatedAt, errorCount, refreshCallback]);
  
  // Iniciar el polling cuando el componente se monta
  useEffect(() => {
    // Realizar una consulta inicial
    checkForUpdates();
    
    // Configurar el intervalo para consultas periódicas
    intervalRef.current = window.setInterval(() => {
      checkForUpdates();
    }, pollingInterval);
    
    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      
      // Cancelar cualquier petición pendiente
      if (abortControllerRef.current) {
        try {
          // Verificamos que el controlador no esté ya abortado antes de llamar a abort()
          if (!abortControllerRef.current.signal.aborted && 
              typeof abortControllerRef.current.abort === 'function') {
            abortControllerRef.current.abort();
          }
        } catch (err) {
          console.warn('Error al abortar petición:', err);
        }
      }
    };
  }, [checkForUpdates, pollingInterval]);
  
  return {
    isConnected: isActive, // Mantenemos el mismo nombre que en useWebSocketDashboard para compatibilidad
    lastMessage,
    lastUpdatedAt,
    errorCount
  };
}