import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook para manejar actualizaciones del dashboard mediante polling
 * Reemplaza a useWebSocketDashboard con un enfoque más robusto y eficiente
 * @param refreshCallback - Función a llamar cuando se detecte un cambio
 * @param pollingInterval - Intervalo de consulta en ms (por defecto 10000ms = 10s)
 * @returns Estado de la conexión y último mensaje recibido
 */
export function useDashboardPolling(
  refreshCallback: () => void,
  pollingInterval: number = 10000
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
      try {
        if (abortControllerRef.current && typeof abortControllerRef.current.abort === 'function') {
          abortControllerRef.current.abort();
        }
      } catch (err) {
        console.warn('Error al abortar petición previa:', err);
      }
      
      // Crear un nuevo AbortController para esta petición
      abortControllerRef.current = new AbortController();
      
      // Obtener ID de usuario del localStorage para enviarlo como header
      const userId = localStorage.getItem('user_id') || '';
      const username = localStorage.getItem('username') || '';
      
      // Realizar la petición con señal de aborto y credenciales de usuario
      const response = await fetch('/api/dashboard-status', {
        signal: abortControllerRef.current.signal,
        credentials: 'include', // Importante para enviar cookies
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
      
      // Si es la primera consulta o si detectamos un cambio (con margen de seguridad de 100ms)
      if (lastUpdatedAt === null || (data.updated_at && data.updated_at > lastUpdatedAt + 100)) {
        console.log('🔄 Cambio significativo detectado en el dashboard:', data);
        setLastUpdatedAt(data.updated_at);
        setLastMessage({ type: data.lastEvent || 'dashboard-refresh-required' });
        
        // Llamar al callback de refresco
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
      try {
        if (abortControllerRef.current && typeof abortControllerRef.current.abort === 'function') {
          abortControllerRef.current.abort();
        }
      } catch (err) {
        console.warn('Error al abortar petición:', err);
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