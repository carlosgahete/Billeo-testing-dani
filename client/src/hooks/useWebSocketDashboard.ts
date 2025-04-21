import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Hook para manejar la conexión WebSocket para actualizaciones del dashboard en tiempo real
 * @param refreshCallback - Función a llamar cuando se reciba una notificación de actualización
 * @returns Object con el estado de la conexión y mensajes recibidos
 */
export function useWebSocketDashboard(refreshCallback: () => void) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 10; // Aumentado de 3 a 10 para más persistencia

  // Función para limpiar recursos de WebSocket
  const cleanupWebSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (socket) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      setSocket(null);
    }
  }, [socket]);

  // Función para conectar al WebSocket
  const connectWebSocket = useCallback(() => {
    // Limpiar cualquier conexión anterior
    cleanupWebSocket();
    
    // No intentar conectar si ya hay máximos intentos
    if (connectionAttempts >= maxRetries) {
      console.warn('⚠️ Máximo de intentos de reconexión alcanzado');
      // Reset después de un tiempo prolongado
      reconnectTimerRef.current = setTimeout(() => {
        setConnectionAttempts(0);
      }, 60000); // 1 minuto
      return;
    }

    try {
      // Determinar el protocolo correcto (ws o wss) basado en HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`🔌 Intentando conectar al WebSocket: ${wsUrl}`);

      const newSocket = new WebSocket(wsUrl);
      setSocket(newSocket);

      // Manejar eventos de conexión
      newSocket.onopen = () => {
        console.log('✅ Conexión WebSocket establecida');
        setIsConnected(true);
        setConnectionAttempts(0); // Reiniciar contador de intentos al conectar exitosamente
      };

      // Manejar mensajes recibidos
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📝 Mensaje WebSocket recibido:', data);
          setLastMessage(data);

          // Si es un mensaje de actualización, refrescar los datos del dashboard
          if (data.type === 'transaction-created' || 
              data.type === 'transaction-updated' ||
              data.type === 'invoice-created' ||
              data.type === 'invoice-updated' ||
              data.type === 'invoice-paid' ||
              data.type === 'dashboard-refresh-required' ||
              data.type === 'connection') {
            if (data.type !== 'connection') {
              console.log(`🔄 Actualizando dashboard debido a evento: ${data.type}`);
              refreshCallback();
            }
          }
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      };

      // Manejar errores de conexión
      newSocket.onerror = (error) => {
        console.error('❌ Error en conexión WebSocket:', error);
        // No cerramos aquí, dejamos que onclose maneje la reconexión
      };

      // Manejar cierre de conexión y reintentar si es necesario
      newSocket.onclose = (event) => {
        console.log(`🔌 Conexión WebSocket cerrada: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        setSocket(null);

        // Intentar reconectar después de un tiempo si no fue un cierre limpio
        if (event.code !== 1000) { // 1000 es un cierre normal
          const nextAttempt = connectionAttempts + 1;
          setConnectionAttempts(nextAttempt);
          
          if (nextAttempt <= maxRetries) {
            // Backoff exponencial con límite máximo (15 segundos)
            const baseDelay = 1000; // 1 segundo
            const maxDelay = 15000; // 15 segundos
            const exponentialBackoff = baseDelay * Math.pow(1.5, Math.min(nextAttempt, 10));
            const jitter = Math.random() * 1000; // Añadir algo de aleatoriedad
            const timeout = Math.min(exponentialBackoff + jitter, maxDelay);
            
            console.log(`🔄 Reintentando conexión en ${Math.round(timeout)}ms (intento ${nextAttempt}/${maxRetries})`);
            
            reconnectTimerRef.current = setTimeout(() => {
              connectWebSocket(); // Intentar reconectar
            }, timeout);
          } else {
            console.warn(`⚠️ Máximo de intentos de reconexión alcanzado (${maxRetries})`);
            
            // Intentar un último intento después de 60 segundos
            reconnectTimerRef.current = setTimeout(() => {
              console.log('🔄 Realizando intento final de reconexión...');
              setConnectionAttempts(0); // Reset contador para permitir nuevos intentos
              connectWebSocket();
            }, 60000);
          }
        }
      };
    } catch (error) {
      console.error('❌ Error al crear conexión WebSocket:', error);
      // Incrementar contador y programar reintento
      setConnectionAttempts(prev => prev + 1);
      
      reconnectTimerRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000); // Reintento rápido si hay error al crear
    }
  }, [connectionAttempts, cleanupWebSocket, refreshCallback]);

  // Efectuar conexión al WebSocket cuando el componente se monta
  useEffect(() => {
    connectWebSocket();
    
    // Limpiar todos los recursos al desmontar
    return () => {
      console.log('🔌 Cerrando conexión WebSocket (cleanup)');
      cleanupWebSocket();
    };
  }, [connectWebSocket, cleanupWebSocket]);

  // Función para reconexión manual
  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual solicitada');
    cleanupWebSocket();
    setConnectionAttempts(0); // Reset contador
    connectWebSocket();
  }, [cleanupWebSocket, connectWebSocket]);

  return {
    isConnected,
    lastMessage,
    connectionAttempts,
    reconnect // Exponemos la función de reconexión manual por si es necesaria
  };
}