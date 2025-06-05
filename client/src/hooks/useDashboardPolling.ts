import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook para manejar actualizaciones del dashboard mediante polling
 * Reemplaza a useWebSocketDashboard con un enfoque más robusto y eficiente
 * @param refreshCallback - Función a llamar cuando se detecte un cambio
 * @param pollingInterval - Intervalo de consulta en ms (ahora por defecto 300000ms = 5 minutos)
 * @returns Estado de la conexión y último mensaje recibido
 */
export function useDashboardPolling(
  refreshCallback: () => void,
  pollingInterval: number = 300000  // CORREGIDO: 5 minutos (300,000ms) en lugar de 30 segundos
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
      
      // Obtener ID de usuario del localStorage para enviarlo como header
      const userId = localStorage.getItem('user_id') || '';
      const username = localStorage.getItem('username') || '';
      
      const response = await fetch('/api/polling/dashboard-status', {
        signal: abortControllerRef.current.signal,
        credentials: 'include',
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
      
      // CORREGIDO: Solo hacer log cada 10 consultas para reducir ruido
      const shouldLog = Math.random() < 0.1; // 10% de probabilidad
      if (shouldLog) {
        console.log('🕒 Polling dashboard status - última actualización:', new Date(data.updated_at).toLocaleTimeString());
      }
      
      // CORREGIDO: Solo actualizar si hay un cambio SIGNIFICATIVO (más de 30 segundos)
      if (lastUpdatedAt === null || (data.updated_at && data.updated_at > lastUpdatedAt + 30000)) {
        console.log('🔄 Cambio significativo detectado después de 30s+:', data);
        setLastUpdatedAt(data.updated_at);
        setLastMessage({ type: data.lastEvent || 'dashboard-refresh-required' });
        
        // CORREGIDO: No llamar callback automáticamente, dejar que sea manual
        // Solo notificar que hay cambios disponibles
        if (shouldLog) {
          console.log('📊 Datos del dashboard actualizados - usar botón refresh para obtener cambios');
        }
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