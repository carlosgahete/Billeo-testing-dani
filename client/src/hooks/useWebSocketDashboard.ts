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

// Predeclaración de tipos para evitar referencias circulares
type ReconnectFunction = () => void;
type CheckConnectionFunction = () => boolean;
type CreateWebSocketConnectionFunction = () => void;

// Variable para almacenar la función de reconexión (resuelve la referencia circular)
let reconnectFn: ReconnectFunction;

// Constantes para la lógica de reconexión
const PING_INTERVAL = 15000; // 15 segundos entre pings
const INITIAL_RECONNECT_DELAY = 1000; // 1 segundo
const MAX_RECONNECT_DELAY = 10000; // 10 segundos máximo
const RECONNECT_FACTOR = 1.3; // Factor de crecimiento

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
  const lastAuthTimeRef = useRef<number>(0);
  const heartbeatTimeRef = useRef<number>(Date.now());
  
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
    
    if (socketRef.current) {
      try {
        console.log('Cerrando socket existente...');
        // El código 1000 indica cierre normal
        socketRef.current.close(1000, 'Cierre controlado');
      } catch (err) {
        console.error('Error al cerrar socket:', err);
      }
    }
    
    socketRef.current = null;
    reconnectInProgressRef.current = false;
  }, []);

  // Tipo para resolver referencia circular
  type CheckConnectionFunction = () => boolean;
  
  // Función para verificar la salud del WebSocket
  const checkConnection: CheckConnectionFunction = useCallback(() => {
    // Si no hay socket o no está abierto, reconectar inmediatamente
    if (!socketRef.current) {
      console.log('Verificación de salud: Socket no existe, intentando reconectar...');
      if (typeof reconnectFn === 'function') {
        reconnectFn();
      } else {
        console.error('🔴 reconnectFn no disponible en checkConnection');
      }
      return false;
    }
    
    // Verificar el estado actual del socket y actuar según corresponda
    switch (socketRef.current.readyState) {
      case WebSocket.CONNECTING:
        // Si lleva mucho tiempo intentando conectar, cancelar y reintentar
        const connectingTime = Date.now() - heartbeatTimeRef.current;
        if (connectingTime > 10000) { // 10 segundos es demasiado tiempo para establecer conexión
          console.log('Socket atascado en estado CONNECTING por más de 10s, reiniciando...');
          reconnectFn();
          return false;
        }
        console.log('Socket en estado CONNECTING, esperando...');
        return false;
        
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        console.log(`Socket en estado ${socketRef.current.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED'}, reconectando...`);
        reconnectFn();
        return false;
        
      case WebSocket.OPEN:
        // Verificar si hemos recibido algo del servidor en el último tiempo
        const now = Date.now();
        const timeSinceLastHeartbeat = now - heartbeatTimeRef.current;
        
        // Si han pasado más de 30 segundos sin actividad, reconectar
        if (timeSinceLastHeartbeat > PING_INTERVAL * 2) {
          console.log(`Sin actividad por ${timeSinceLastHeartbeat}ms, reconectando...`);
          reconnectFn();
          return false;
        }
        
        // Realizar un ping manual para comprobar conexión
        try {
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ 
              type: 'ping', 
              timestamp: new Date().toISOString(),
              userId: auth?.user?.id,
              connectionCheck: true
            }));
          }
        } catch (err) {
          console.error('Error enviando ping de verificación:', err);
          reconnectFn();
          return false;
        }
        
        return true;
    }
    
    return false; // Por defecto, considerar que la conexión no es saludable
  }, [auth?.user?.id]);

  // Tipo para la función de creación de conexión
  type CreateWebSocketConnectionFunction = () => void;
  
  // Función para crear una nueva conexión WebSocket
  const createWebSocketConnection: CreateWebSocketConnectionFunction = useCallback(() => {
    // Evitar múltiples intentos simultáneos
    if (reconnectInProgressRef.current) {
      console.log('Ya hay una reconexión en progreso, ignorando solicitud');
      return;
    }
    
    // Si ya hay un socket activo y abierto, verificar que esté saludable
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('Socket ya está abierto, verificando estado...');
      if (checkConnection()) {
        console.log('Socket está saludable, manteniendo conexión actual');
        return;
      }
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
      // Crear nueva conexión WebSocket con manejo de timeout
      const newSocket = new WebSocket(wsUrl);
      socketRef.current = newSocket;
      
      // Actualizar timestamp de salud
      heartbeatTimeRef.current = Date.now();

      // Eventos del socket
      newSocket.onopen = () => {
        console.log('✅ Conexión WebSocket establecida');
        setConnectionState(ConnectionState.CONNECTED);
        setConnectionAttempts(0); // Reiniciar contador al conectar
        setErrorMessage(null);
        reconnectInProgressRef.current = false;
        
        // Actualizar timestamp de salud
        heartbeatTimeRef.current = Date.now();
        
        // Autenticar usando el ID del usuario
        if (auth.user && auth.user.id) {
          try {
            const authMessage = JSON.stringify({
              type: 'auth',
              userId: auth.user.id,
              timestamp: new Date().toISOString()
            });
            
            newSocket.send(authMessage);
            console.log(`🔐 Enviando autenticación para usuario ${auth.user.id}`);
            
            // Registrar el tiempo de autenticación
            lastAuthTimeRef.current = Date.now();
          } catch (err) {
            console.error('Error enviando autenticación:', err);
          }
        }
        
        // Configurar ping periódico - más frecuente para mantener conexión activa
        pingIntervalRef.current = setInterval(() => {
          if (newSocket.readyState === WebSocket.OPEN) {
            try {
              const pingMessage = JSON.stringify({ 
                type: 'ping', 
                timestamp: new Date().toISOString(),
                userId: auth.user?.id 
              });
              
              newSocket.send(pingMessage);
              
              // También verificamos que la conexión sea saludable
              checkConnection();
            } catch (err) {
              console.error('Error enviando ping:', err);
              // Si hay error al enviar ping, reconectar
              reconnect();
            }
          } else if (newSocket.readyState === WebSocket.CLOSED || newSocket.readyState === WebSocket.CLOSING) {
            console.log('Socket cerrado o cerrándose durante ping, reconectando...');
            reconnect();
          }
        }, PING_INTERVAL);
      };

      // Manejar mensajes recibidos
      newSocket.onmessage = (event) => {
        try {
          // Actualizar timestamp de salud al recibir cualquier mensaje
          heartbeatTimeRef.current = Date.now();
          
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
                const authMessage = JSON.stringify({
                  type: 'auth',
                  userId: auth.user.id,
                  timestamp: new Date().toISOString()
                });
                
                newSocket.send(authMessage);
                console.log(`🔐 Enviando autenticación para usuario ${auth.user.id}`);
                
                // Registrar el tiempo de autenticación
                lastAuthTimeRef.current = Date.now();
              } catch (err) {
                console.error('Error enviando autenticación:', err);
              }
            }
          } else if (data.type === 'pong') {
            // No es necesario hacer nada especial con los pongs, solo actualizar el heartbeat
            // que ya se hizo al inicio de esta función
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
        
        // No intentamos reconectar aquí, dejamos que onclose se encargue
      };

      // Manejar cierre de conexión
      newSocket.onclose = (event) => {
        console.log(`🔌 Conexión WebSocket cerrada: ${event.code} - ${event.reason || 'Sin razón'}`);
        setConnectionState(ConnectionState.DISCONNECTED);
        
        // Limpiar intervalos
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
          
          // Calculamos el tiempo de espera con backoff exponencial pero con límite
          const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(RECONNECT_FACTOR, Math.min(nextAttempt - 1, 5)), 
            MAX_RECONNECT_DELAY
          );
          
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
  }, [auth.user, connectionAttempts, cleanup, refreshCallback, checkConnection]);

  // Función para reconectar manualmente
  const reconnect: ReconnectFunction = useCallback(() => {
    console.log('🔄 Reconectando manualmente...');
    
    // Limpiar recursos existentes
    cleanup();
    
    // Reiniciar contadores
    setConnectionAttempts(0);
    setErrorMessage(null);
    
    // Reconectar inmediatamente
    setTimeout(() => {
      // Aquí usamos la función almacenada en la variable global
      // Esto evita problemas de referencia circular
      if (typeof createWebSocketConnection === 'function') {
        createWebSocketConnection();
      } else {
        console.error('createWebSocketConnection no está disponible durante la reconexión');
      }
    }, 100);
  }, [cleanup]);
  
  // Almacenar la función en la variable global para resolver referencia circular
  reconnectFn = reconnect;

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
  
  // Agregar un verificador periódico de salud para detectar problemas de conexión
  useEffect(() => {
    const healthCheck = setInterval(() => {
      if (auth.user && socketRef.current) {
        checkConnection();
      }
    }, PING_INTERVAL * 2);
    
    return () => clearInterval(healthCheck);
  }, [auth.user, checkConnection]);

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