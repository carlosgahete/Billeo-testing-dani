import { useEffect, useState, useCallback } from 'react';

/**
 * Estados posibles de conexión WebSocket
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Hook para manejar la conexión WebSocket para actualizaciones del dashboard en tiempo real
 * @param refreshCallback - Función a llamar cuando se reciba una notificación de actualización
 * @returns Object con el estado de la conexión y funciones para controlarla
 */
export function useWebSocketDashboard(refreshCallback: () => void) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Función para crear una nueva conexión WebSocket
  const createWebSocketConnection = useCallback(() => {
    // Si ya hay una conexión activa, no hacemos nada
    if (socket) {
      return;
    }

    // Verificar si hay un usuario autenticado - verificando diferentes fuentes
    const isAuthenticated = () => {
      try {
        // 0. Siempre intentamos la conexión WebSocket, ya que el servidor verificará la autenticación
        // y recibiremos el error correspondiente si no estamos autenticados
        // Esto es útil en casos donde la sesión existe en el servidor pero no tenemos datos locales
        return true;
      } catch (err) {
        console.warn("Error comprobando autenticación:", err);
        return true; // Seguimos intentando conectar de todas formas
      }
    };

    // Si no hay un usuario autenticado, no intentamos conectar
    if (!isAuthenticated()) {
      console.log('⚠️ No hay usuario autenticado, postergando conexión WebSocket');
      setConnectionState(ConnectionState.FAILED);
      setErrorMessage("Es necesario iniciar sesión para actualizaciones en tiempo real");
      return null;
    }
    
    // Determinar el protocolo correcto (ws o wss) basado en HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log(`🔌 Intentando conectar al WebSocket: ${wsUrl}`);
    
    setConnectionState(ConnectionState.CONNECTING);
    setErrorMessage(null);

    try {
      const newSocket = new WebSocket(wsUrl);
      setSocket(newSocket);

      // Variable para el intervalo de ping
      let pingInterval: NodeJS.Timeout | null = null;
      
      // Manejar eventos de conexión
      newSocket.onopen = () => {
        console.log('✅ Conexión WebSocket establecida');
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionAttempts(0); // Reiniciar contador de intentos al conectar exitosamente
        setErrorMessage(null);
        
        // Iniciar envío periódico de pings para mantener la conexión viva
        pingInterval = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            try {
              // Enviar mensaje de ping al servidor
              newSocket.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
            } catch (err) {
              console.error('Error enviando ping:', err);
            }
          }
        }, 25000); // Ping cada 25 segundos
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
        setErrorMessage('Error de conexión al servidor en tiempo real');
      };

      // Manejar cierre de conexión y reintentar si es necesario
      newSocket.onclose = (event) => {
        console.log(`🔌 Conexión WebSocket cerrada: ${event.code} - ${event.reason}`);
        setConnectionState(ConnectionState.DISCONNECTED);
        setSocket(null);

        // Intentar reconectar después de un tiempo si no fue un cierre limpio
        if (event.code !== 1000) { // 1000 es un cierre normal
          const nextAttempt = connectionAttempts + 1;
          setConnectionAttempts(nextAttempt);
          
          // Reintentamos indefinidamente con un tiempo máximo de espera
          setConnectionState(ConnectionState.RECONNECTING);
          const timeout = Math.min(1000 * Math.pow(1.5, Math.min(nextAttempt - 1, 6)), 10000);
          console.log(`🔄 Reintentando conexión en ${timeout}ms (intento ${nextAttempt})`);
          setTimeout(() => {
            setSocket(null); // Forzar reconexión
          }, timeout);
        }
      };

      return newSocket;
    } catch (error) {
      console.error('❌ Error al crear conexión WebSocket:', error);
      setConnectionAttempts(prev => prev + 1);
      setConnectionState(ConnectionState.FAILED);
      setErrorMessage('No se pudo establecer la conexión');
      return null;
    }
  }, [socket, connectionAttempts, refreshCallback]);

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    console.log('🔄 Reconectando manualmente...');
    
    // Cerrar socket existente si hay alguno
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    
    // Reiniciar contadores y estado
    setConnectionAttempts(0);
    setSocket(null);
    setErrorMessage(null);
    
    // Forzar un pequeño retraso antes de reconectar para permitir que los estados se actualicen
    setTimeout(() => {
      createWebSocketConnection();
    }, 500);
  }, [socket, createWebSocketConnection]);

  // Efectuar conexión al WebSocket cuando el componente se monta
  useEffect(() => {
    // No intentar conectar si ya hay un socket activo
    if (socket) {
      return;
    }

    const newSocket = createWebSocketConnection();
    
    // Limpiar conexión al desmontar
    return () => {
      console.log('🔌 Cerrando conexión WebSocket (cleanup)');
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
      setSocket(null);
      setConnectionState(ConnectionState.DISCONNECTED);
    };
  }, [socket, connectionAttempts, connectionState, createWebSocketConnection]);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING,
    isFailed: connectionState === ConnectionState.FAILED,
    lastMessage,
    connectionAttempts,
    errorMessage,
    reconnect // Exponemos la función de reconexión
  };
}