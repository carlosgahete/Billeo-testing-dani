import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Hook para manejar la conexión WebSocket para actualizaciones del dashboard en tiempo real
 * con soporte para reconnexión limitada y autenticación
 * @param refreshCallback - Función a llamar cuando se reciba una notificación de actualización
 * @returns Object con el estado de la conexión y mensajes recibidos
 */
export function useWebSocketDashboard(refreshCallback: () => void) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  
  // Contadores y referencias para controlar reconexiones
  const reconnectCount = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  // Función para autenticar con el servidor WebSocket
  const authenticate = useCallback((ws: WebSocket) => {
    // Cuando recibamos una solicitud de autenticación, enviar token
    try {
      // Obtener el token del localStorage o sessionStorage si está disponible
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (token && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          token
        }));
        console.log('🔐 Token de autenticación enviado al WebSocket');
      } else {
        console.log('⚠️ No hay token disponible para autenticación WebSocket');
      }
    } catch (error) {
      console.error('Error al autenticar WebSocket:', error);
    }
  }, []);
  
  // Función para establecer conexión
  const connectWebSocket = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket ya está conectado');
      return;
    }
    
    // Si hay demasiados intentos de reconexión, no continuar
    if (reconnectCount.current >= maxReconnectAttempts) {
      console.log(`⚠️ Máximo de intentos de reconexión (${maxReconnectAttempts}) alcanzado.`);
      setConnectionStatus('max_attempts_reached');
      return;
    }
    
    try {
      // Determinar el protocolo correcto (ws o wss) basado en HTTPS
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log(`🔌 Intentando conectar al WebSocket: ${wsUrl} (Intento ${reconnectCount.current + 1}/${maxReconnectAttempts})`);
      
      // Limpiar cualquier socket previo
      if (socketRef.current) {
        try {
          socketRef.current.close(1000, 'Reinicio controlado');
        } catch (e) {
          // Ignorar errores al cerrar socket ya cerrado
        }
      }
      
      // Crear nueva conexión WebSocket
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;
      setSocket(newSocket);
      setConnectionStatus('connecting');
      
      // Manejar eventos de conexión
      newSocket.onopen = () => {
        console.log('✅ Conexión WebSocket establecida');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectCount.current = 0; // Resetear contador al conectar exitosamente
      };
      
      // Manejar mensajes recibidos
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📝 Mensaje WebSocket recibido:', data);
          setLastMessage(data);
          
          // Manejar solicitud de autenticación
          if (data.type === 'auth_required') {
            authenticate(newSocket);
          }
          
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
        setConnectionStatus('error');
      };
      
      // Manejar cierre de conexión y reintentar si es necesario
      newSocket.onclose = (event) => {
        console.log(`🔌 Conexión WebSocket cerrada: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Solo reintentar si:
        // 1. No fue un cierre limpio (código diferente de 1000)
        // 2. No se ha alcanzado el máximo de intentos
        // 3. No estamos desmontando el componente (cleanup)
        if (event.code !== 1000 && reconnectCount.current < maxReconnectAttempts) {
          reconnectCount.current += 1;
          console.log(`🔄 Reintentando conexión en 3 segundos... (Intento ${reconnectCount.current}/${maxReconnectAttempts})`);
          
          // Limpiar timeout previo si existe
          if (reconnectTimeoutRef.current !== null) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          // Esperar tiempo exponencial entre intentos (1s, 2s, 4s...)
          const delay = Math.min(3000 * Math.pow(2, reconnectCount.current - 1), 10000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            setSocket(null); // Forzar reconexión en el próximo ciclo del efecto
            reconnectTimeoutRef.current = null;
          }, delay);
        } else if (reconnectCount.current >= maxReconnectAttempts) {
          setConnectionStatus('max_attempts_reached');
          console.log('⚠️ Máximo de intentos alcanzado. No se intentará reconectar automáticamente.');
        }
      };
    } catch (error) {
      console.error('Error al crear conexión WebSocket:', error);
      setConnectionStatus('error');
    }
  }, [authenticate, refreshCallback]);
  
  // Iniciar conexión cuando el componente se monta
  useEffect(() => {
    // Si no hay socket o está cerrado/cerrándose, intentar conectar
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      connectWebSocket();
    }
    
    // Limpiar conexión al desmontar
    return () => {
      console.log('🔌 Cerrando conexión WebSocket (cleanup)');
      
      // Limpiar timeouts pendientes
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Cerrar socket si existe y está abierto
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.close(1000, 'Componente desmontado');
        } catch (e) {
          // Ignorar errores al cerrar socket ya cerrado
        }
      }
      
      // Limpiar estado
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [socket, connectWebSocket]);
  
  // Función pública para intentar reconectar manualmente
  const reconnect = useCallback(() => {
    console.log('🔄 Reconexión manual iniciada...');
    reconnectCount.current = 0; // Resetear contador para intentos manuales
    setConnectionStatus('connecting');
    connectWebSocket();
  }, [connectWebSocket]);

  return {
    isConnected,
    lastMessage,
    connectionStatus,
    reconnect // Exponer función para reconectar manualmente
  };
}