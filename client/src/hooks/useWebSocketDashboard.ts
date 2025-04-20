import { useEffect, useState } from 'react';

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

  // Efectuar conexión al WebSocket cuando el componente se monta
  useEffect(() => {
    // No intentar conectar si ya hay máximos intentos o ya está conectado
    if (connectionAttempts > 3 || socket) {
      return;
    }

    // Determinar el protocolo correcto (ws o wss) basado en HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log(`🔌 Intentando conectar al WebSocket: ${wsUrl}`);

    try {
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
              data.type === 'dashboard-refresh-required') {
            console.log(`🔄 Actualizando dashboard debido a evento: ${data.type}`);
            refreshCallback();
          }
        } catch (error) {
          console.error('Error al procesar mensaje WebSocket:', error);
        }
      };

      // Manejar errores de conexión
      newSocket.onerror = (error) => {
        console.error('❌ Error en conexión WebSocket:', error);
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
          
          if (nextAttempt <= 3) {
            const timeout = Math.min(1000 * Math.pow(2, nextAttempt - 1), 10000);
            console.log(`🔄 Reintentando conexión en ${timeout}ms (intento ${nextAttempt})`);
            setTimeout(() => {
              setSocket(null); // Forzar reconexión
            }, timeout);
          } else {
            console.warn('⚠️ Máximo de intentos de reconexión alcanzado');
          }
        }
      };

      // Limpiar conexión al desmontar
      return () => {
        console.log('🔌 Cerrando conexión WebSocket (cleanup)');
        if (newSocket && newSocket.readyState === WebSocket.OPEN) {
          newSocket.close();
        }
        setSocket(null);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('❌ Error al crear conexión WebSocket:', error);
      setConnectionAttempts(prev => prev + 1);
      return () => {}; // Cleanup vacío para este caso
    }
  }, [socket, connectionAttempts, refreshCallback]);

  return {
    isConnected,
    lastMessage,
    connectionAttempts
  };
}