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
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);
  const [lastPongTime, setLastPongTime] = useState<number | null>(null);
  
  // Referencias para los timers
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Configuración
  const maxRetries = 10; // Intentos máximos de reconexión
  const pingInterval = 15000; // 15 segundos entre pings
  const pingTimeout = 10000; // 10 segundos de espera para pong
  const healthCheckInterval = 30000; // 30 segundos entre verificaciones de salud
  
  // Estado de conexión actual en referencia para evitar problemas con closures
  const isConnectedRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Función para limpiar todos los timers y recursos
  const cleanupResources = useCallback(() => {
    // Limpiar todos los timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (pingTimerRef.current) {
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    
    if (healthCheckTimerRef.current) {
      clearTimeout(healthCheckTimerRef.current);
      healthCheckTimerRef.current = null;
    }
    
    // Cerrar socket si existe
    if (socket) {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        try {
          socket.close();
        } catch (e) {
          console.error('Error al cerrar socket:', e);
        }
      }
      setSocket(null);
      socketRef.current = null;
    }
  }, [socket]);

  // Función para enviar ping al servidor
  const sendPing = useCallback(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        console.log('📤 Enviando ping al servidor WebSocket');
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        };
        
        socket.send(JSON.stringify(pingMessage));
        setLastPingTime(Date.now());
        
        // Configurar timeout para verificar respuesta
        pingTimerRef.current = setTimeout(() => {
          const elapsed = lastPongTime ? Date.now() - lastPongTime : null;
          
          // Si no hemos recibido respuesta en el tiempo esperado, consideramos la conexión perdida
          if (!lastPongTime || (elapsed && elapsed > pingTimeout)) {
            console.warn('⚠️ No se recibió respuesta al ping, reconectando...');
            setIsConnected(false);
            isConnectedRef.current = false;
            
            // Forzar reconexión
            cleanupResources();
            setConnectionAttempts(0);
            connectWebSocket();
          }
        }, pingTimeout);
      } catch (e) {
        console.error('Error al enviar ping:', e);
      }
    }
  }, [socket, lastPongTime, cleanupResources]);

  // Función para verificar el estado de salud de la conexión
  const checkConnectionHealth = useCallback(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.log('🔍 Verificación de salud: Socket no está abierto, reconectando...');
      setIsConnected(false);
      isConnectedRef.current = false;
      
      // Forzar reconexión
      cleanupResources();
      setConnectionAttempts(0);
      setTimeout(() => {
        connectWebSocket();
      }, 1000);
      
      return;
    }
    
    // También podríamos enviar un ping aquí
    sendPing();
    
    // Programar siguiente verificación
    healthCheckTimerRef.current = setTimeout(checkConnectionHealth, healthCheckInterval);
  }, [socket, sendPing, cleanupResources]);

  // Función para conectar al WebSocket
  const connectWebSocket = useCallback(() => {
    // Limpiar recursos primero
    cleanupResources();
    
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
      socketRef.current = newSocket;

      // Manejar eventos de conexión
      newSocket.onopen = () => {
        console.log('✅ Conexión WebSocket establecida');
        setIsConnected(true);
        isConnectedRef.current = true;
        setConnectionAttempts(0); // Reiniciar contador de intentos al conectar exitosamente
        
        // Programar ping inicial después de la conexión
        setTimeout(() => {
          sendPing();
        }, 1000);
        
        // Iniciar verificaciones periódicas
        healthCheckTimerRef.current = setTimeout(checkConnectionHealth, healthCheckInterval);
      };

      // Manejar mensajes recibidos
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📝 Mensaje WebSocket recibido:', data);
          setLastMessage(data);

          // Manejar respuesta de ping (pong)
          if (data.type === 'pong') {
            console.log('📨 Respuesta pong recibida');
            setLastPongTime(Date.now());
            
            // Programar el siguiente ping
            if (pingTimerRef.current) {
              clearTimeout(pingTimerRef.current);
            }
            pingTimerRef.current = setTimeout(sendPing, pingInterval);
            
            return;
          }

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
        isConnectedRef.current = false;
        setSocket(null);
        socketRef.current = null;

        // Limpiar timers asociados
        if (pingTimerRef.current) {
          clearTimeout(pingTimerRef.current);
          pingTimerRef.current = null;
        }
        
        if (healthCheckTimerRef.current) {
          clearTimeout(healthCheckTimerRef.current);
          healthCheckTimerRef.current = null;
        }

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
  }, [connectionAttempts, cleanupResources, refreshCallback, sendPing, checkConnectionHealth]);

  // Efecto para manejar ventana en primer/segundo plano
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Ventana visible nuevamente, verificando conexión WebSocket...');
        
        // Si el socket debería estar conectado pero no responde, reconectar
        if (isConnectedRef.current && (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)) {
          console.log('🔄 Reconectando debido a cambio de visibilidad');
          cleanupResources();
          setConnectionAttempts(0);
          connectWebSocket();
        } else if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          // Enviar ping para verificar conexión
          sendPing();
        }
      }
    };
    
    // Registrar evento para detectar cuando la ventana vuelve al primer plano
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanupResources, connectWebSocket, sendPing]);

  // Efectuar conexión al WebSocket cuando el componente se monta
  useEffect(() => {
    connectWebSocket();
    
    // Limpiar todos los recursos al desmontar
    return () => {
      console.log('🔌 Cerrando conexión WebSocket (cleanup)');
      cleanupResources();
    };
  }, [connectWebSocket, cleanupResources]);

  // Función para reconexión manual
  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual solicitada');
    cleanupResources();
    setConnectionAttempts(0); // Reset contador
    connectWebSocket();
  }, [cleanupResources, connectWebSocket]);

  // Función para forzar refresco de datos
  const forceRefresh = useCallback(() => {
    console.log('🔄 Refresco manual de datos solicitado');
    refreshCallback();
    
    // También enviamos un ping para verificar la conexión
    sendPing();
  }, [refreshCallback, sendPing]);

  return {
    isConnected,
    lastMessage,
    connectionAttempts,
    reconnect, // Exponemos la función de reconexión manual
    forceRefresh // Exponemos función para forzar refresco de datos
  };
}