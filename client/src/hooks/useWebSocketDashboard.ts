import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';

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
 * Versión mejorada con autenticación basada en userId y reconexión más estable
 * 
 * @param refreshCallback - Función a llamar cuando se reciba una notificación de actualización
 * @returns Object con el estado de la conexión y funciones para controlarla
 */
export function useWebSocketDashboard(refreshCallback: () => void) {
  // Obtener información del usuario para la autenticación
  const auth = useAuth();
  
  // Referencias para mantener información a través de re-renders
  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectInProgressRef = useRef<boolean>(false);
  
  // Estados para UI y lógica
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Limpieza de intervalos y timeouts
  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.close();
      } catch (err) {
        console.error('Error al cerrar socket:', err);
      }
    }
    
    socketRef.current = null;
    reconnectInProgressRef.current = false;
  }, []);

  // Función para crear una nueva conexión WebSocket
  const createWebSocketConnection = useCallback(() => {
    // Evitar múltiples intentos simultáneos
    if (reconnectInProgressRef.current) {
      console.log('Ya hay una reconexión en progreso, ignorando solicitud');
      return;
    }
    
    // Si ya hay un socket activo, no creamos otro
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Socket ya está abierto, no es necesario reconectar');
      return;
    }
    
    // Verificar si hay un usuario autenticado
    if (!auth.user || !auth.user.id) {
      console.log('⚠️ No hay usuario autenticado, postergando conexión WebSocket');
      setConnectionState(ConnectionState.FAILED);
      setErrorMessage("Es necesario iniciar sesión para actualizaciones en tiempo real");
      return;
    }
    
    // Limpiar recursos existentes
    cleanup();
    
    // Iniciar reconexión
    reconnectInProgressRef.current = true;
    
    // Determinar el protocolo correcto (ws o wss) basado en HTTPS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log(`🔌 Intentando conectar al WebSocket: ${wsUrl}`);
    
    setConnectionState(ConnectionState.CONNECTING);
    setErrorMessage(null);

    try {
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;

      // Eventos del socket
      newSocket.onopen = () => {
        console.log('✅ Conexión WebSocket establecida');
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionAttempts(0); // Reiniciar contador al conectar
        setErrorMessage(null);
        reconnectInProgressRef.current = false;
        
        // Autenticar usando el ID del usuario
        if (auth.user && auth.user.id) {
          try {
            newSocket.send(JSON.stringify({
              type: 'auth',
              userId: auth.user.id,
              timestamp: new Date().toISOString()
            }));
            console.log(`🔐 Enviando autenticación para usuario ${auth.user.id}`);
          } catch (err) {
            console.error('Error enviando autenticación:', err);
          }
        }
        
        // Configurar ping periódico
        pingIntervalRef.current = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            try {
              newSocket.send(JSON.stringify({ 
                type: 'ping', 
                timestamp: new Date().toISOString() 
              }));
            } catch (err) {
              console.error('Error enviando ping:', err);
            }
          }
        }, 30000); // Ping cada 30 segundos
      };

      // Manejar mensajes recibidos
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Filtrar logs de ping/pong para reducir ruido
          if (data.type !== 'ping' && data.type !== 'pong') {
            console.log('📝 Mensaje WebSocket recibido:', data);
          }
          
          setLastMessage(data);

          // Manejar diferentes tipos de mensajes
          if (data.type === 'auth_success') {
            console.log('✅ Autenticación WebSocket exitosa');
          } else if (data.type === 'auth_error') {
            console.error('❌ Error autenticando WebSocket:', data.message);
            setErrorMessage(`Error de autenticación: ${data.message}`);
          } else if (data.type === 'auth_required') {
            // El servidor requiere autenticación, enviamos credenciales
            if (auth.user && auth.user.id) {
              try {
                newSocket.send(JSON.stringify({
                  type: 'auth',
                  userId: auth.user.id,
                  timestamp: new Date().toISOString()
                }));
                console.log(`🔐 Enviando autenticación para usuario ${auth.user.id}`);
              } catch (err) {
                console.error('Error enviando autenticación:', err);
              }
            }
          }
          // Mensajes que requieren actualización de datos
          else if (
            data.type === 'transaction-created' || 
            data.type === 'transaction-updated' ||
            data.type === 'invoice-created' ||
            data.type === 'invoice-updated' ||
            data.type === 'invoice-paid' ||
            data.type === 'dashboard-refresh-required'
          ) {
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

      // Manejar cierre de conexión
      newSocket.onclose = (event) => {
        console.log(`🔌 Conexión WebSocket cerrada: ${event.code} - ${event.reason || 'Sin razón'}`);
        setConnectionState(ConnectionState.DISCONNECTED);
        
        // Limpiar recursos
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        socketRef.current = null;
        reconnectInProgressRef.current = false;
        
        // Intentar reconectar si no fue un cierre normal y hay usuario autenticado
        if (event.code !== 1000 && auth.user) {
          const nextAttempt = connectionAttempts + 1;
          setConnectionAttempts(nextAttempt);
          
          // Establecer un tiempo de espera progresivo antes de reconectar
          setConnectionState(ConnectionState.RECONNECTING);
          
          // Calculamos el tiempo de espera con backoff exponencial 
          // con un máximo de 20 segundos entre intentos
          const delay = Math.min(2000 * Math.pow(1.5, Math.min(nextAttempt - 1, 6)), 20000);
          console.log(`🔄 Programando reconexión en ${delay}ms (intento ${nextAttempt})`);
          
          // Esperar un tiempo antes de intentar reconectar
          connectTimeoutRef.current = setTimeout(() => {
            createWebSocketConnection();
          }, delay);
        } else if (!auth.user) {
          // Si no hay usuario, establecer estado fallido
          setConnectionState(ConnectionState.FAILED);
          setErrorMessage("Es necesario iniciar sesión para actualizaciones en tiempo real");
        }
      };
    } catch (error) {
      console.error('❌ Error al crear conexión WebSocket:', error);
      setConnectionAttempts(prev => prev + 1);
      setConnectionState(ConnectionState.FAILED);
      setErrorMessage('No se pudo establecer la conexión');
      reconnectInProgressRef.current = false;
    }
  }, [auth.user, connectionAttempts, cleanup, refreshCallback]);

  // Función para reconectar manualmente
  const reconnect = useCallback(() => {
    console.log('🔄 Reconectando manualmente...');
    
    // Limpiar recursos existentes
    cleanup();
    
    // Reiniciar contadores
    setConnectionAttempts(0);
    setErrorMessage(null);
    
    // Reconectar después de un pequeño retraso
    setTimeout(() => {
      createWebSocketConnection();
    }, 500);
  }, [cleanup, createWebSocketConnection]);

  // Establecer conexión inicial
  useEffect(() => {
    // Iniciar conexión solo si hay usuario autenticado y no estamos ya conectados
    if (auth.user && !isInitialized) {
      setIsInitialized(true);
      createWebSocketConnection();
    } else if (!auth.user && connectionState !== ConnectionState.FAILED) {
      // Si no hay usuario, establecer estado fallido
      setConnectionState(ConnectionState.FAILED);
      setErrorMessage("Es necesario iniciar sesión para actualizaciones en tiempo real");
    }
    
    // Limpiar recursos al desmontar
    return cleanup;
  }, [auth.user, connectionState, createWebSocketConnection, isInitialized, cleanup]);

  // Reconectar si el usuario cambia (login/logout)
  useEffect(() => {
    if (isInitialized) {
      if (auth.user) {
        // Si hay un nuevo usuario, reconectar
        reconnect();
      } else {
        // Si no hay usuario, limpiar y establecer estado fallido
        cleanup();
        setConnectionState(ConnectionState.FAILED);
        setErrorMessage("Es necesario iniciar sesión para actualizaciones en tiempo real");
      }
    }
  }, [auth.user?.id, isInitialized, reconnect, cleanup]);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isConnecting: connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING,
    isFailed: connectionState === ConnectionState.FAILED,
    lastMessage,
    connectionAttempts,
    errorMessage,
    reconnect
  };
}