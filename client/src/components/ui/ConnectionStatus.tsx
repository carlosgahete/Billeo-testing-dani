import React, { useEffect, useState } from 'react';
import { ConnectionState } from '@/hooks/useWebSocketDashboard';
import { AlertCircle, ArrowRightCircle, RefreshCw, LogIn, Check, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'wouter';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  className?: string;
  errorMessage?: string | null;
  connectionAttempts?: number;
  lastMessage?: any;
}

/**
 * Componente para mostrar el estado de conexión y permitir reconectar
 * Versión mejorada con animaciones y mejor información visual
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionState,
  onReconnect,
  className,
  errorMessage,
  connectionAttempts = 0,
  lastMessage
}) => {
  // Estado local para indicar cuándo hubo un mensaje reciente
  const [recentMessage, setRecentMessage] = useState(false);
  
  // Efecto para mostrar animación cuando llega un nuevo mensaje
  useEffect(() => {
    if (lastMessage) {
      setRecentMessage(true);
      const timer = setTimeout(() => setRecentMessage(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastMessage]);
  
  // Definir el color y el texto según el estado
  let statusColor = 'bg-gray-400';
  let statusText = 'Desconectado';
  let statusIcon = <WifiOff className="h-3 w-3 mr-1" />;
  
  switch (connectionState) {
    case ConnectionState.CONNECTED:
      statusColor = recentMessage ? 'bg-blue-500' : 'bg-green-500';
      statusText = recentMessage ? 'Recibiendo datos...' : 'Conectado';
      statusIcon = recentMessage ? 
        <RefreshCw className="h-3 w-3 mr-1 text-blue-500 animate-spin" /> : 
        <Check className="h-3 w-3 mr-1 text-green-500" />;
      break;
    case ConnectionState.CONNECTING:
      statusColor = 'bg-amber-500 animate-pulse';
      statusText = 'Conectando...';
      statusIcon = <RefreshCw className="h-3 w-3 mr-1 text-amber-500 animate-spin" />;
      break;
    case ConnectionState.RECONNECTING:
      statusColor = 'bg-amber-500 animate-pulse';
      statusText = `Reconectando${connectionAttempts > 0 ? ` (${connectionAttempts})` : ''}...`;
      statusIcon = <RefreshCw className="h-3 w-3 mr-1 text-amber-500 animate-spin" />;
      break;
    case ConnectionState.FAILED:
      statusColor = 'bg-red-500';
      statusText = errorMessage ? 
        (errorMessage.length > 30 ? `${errorMessage.substring(0, 30)}...` : errorMessage) : 
        'Error de conexión';
      statusIcon = <AlertCircle className="h-3 w-3 mr-1 text-red-500" />;
      break;
    case ConnectionState.DISCONNECTED:
      statusColor = 'bg-gray-400';
      statusText = 'Desconectado';
      statusIcon = <WifiOff className="h-3 w-3 mr-1 text-gray-500" />;
      break;
    default:
      statusColor = 'bg-gray-400';
      statusText = 'Estado desconocido';
      statusIcon = <WifiOff className="h-3 w-3 mr-1 text-gray-500" />;
  }

  // Versión móvil - sólo icono con tooltip
  const MobileVersion = () => (
    <div className="flex md:hidden items-center">
      <div 
        className={`w-2 h-2 rounded-full ${statusColor}`} 
        title={`Estado: ${statusText}${errorMessage ? ` - ${errorMessage}` : ''}`} 
      />
      
      {/* Botón de reconexión visible cuando la conexión falla o está reconectando */}
      {(connectionState === ConnectionState.FAILED || 
        connectionState === ConnectionState.DISCONNECTED || 
        connectionState === ConnectionState.RECONNECTING) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1"
          onClick={onReconnect}
          title="Reconectar"
        >
          <RefreshCw className={`h-4 w-4 ${connectionState === ConnectionState.RECONNECTING ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );

  // Versión desktop - con texto y animación mejorada
  const DesktopVersion = () => (
    <div className={cn("hidden md:flex items-center text-xs text-gray-600", className)}>
      <div className="flex items-center">
        <div 
          className={`w-2 h-2 rounded-full mr-1 ${statusColor}`} 
          title={errorMessage || statusText}
        />
        <span className="text-xs mr-1">{statusText}</span>
        {statusIcon}
      </div>
      
      {/* Botón de reconexión visible cuando la conexión falla, está desconectada o reconectando */}
      {(connectionState === ConnectionState.FAILED || 
        connectionState === ConnectionState.RECONNECTING || 
        connectionState === ConnectionState.DISCONNECTED) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="ml-2"
        >
          <Button
            variant={connectionState === ConnectionState.FAILED ? "destructive" : "outline"}
            size="sm"
            className={`h-6 px-2 py-0 ml-1 text-xs ${connectionState === ConnectionState.RECONNECTING ? 'bg-amber-50' : ''}`}
            onClick={onReconnect}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${connectionState === ConnectionState.RECONNECTING ? 'animate-spin' : ''}`} />
            Reconectar
          </Button>
        </motion.div>
      )}
    </div>
  );

  // Mensaje de error por falta de autenticación
  // Ampliamos la detección del error de autenticación para hacerla más robusta
  const authenticationError = 
    (connectionState === ConnectionState.FAILED || connectionState === ConnectionState.DISCONNECTED) && 
    errorMessage && 
    (errorMessage.includes('iniciar sesión') || 
     errorMessage.includes('autenticación') || 
     errorMessage.includes('login') || 
     errorMessage.includes('auth'));
  
  // Componente de mensaje de autenticación
  const AuthenticationMessage = () => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("hidden md:flex items-center text-xs bg-red-50 border border-red-100 text-red-700 px-3 py-2 rounded-md ml-4", className)}
    >
      <AlertCircle className="h-3 w-3 mr-2" />
      <span>
        Es necesario {' '}
        <Link to="/auth" className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1">
          iniciar sesión
        </Link>
        {' '} para recibir actualizaciones en tiempo real
      </span>
    </motion.div>
  );
  
  // Componente para dispositivos móviles que muestra un botón para iniciar sesión
  const MobileAuthButton = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="md:hidden ml-1"
    >
      <Link to="/auth">
        <Button
          variant="ghost" 
          size="icon"
          className="h-6 w-6 text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:outline-none"
          title="Iniciar sesión para actualizaciones en tiempo real"
        >
          <LogIn className="h-4 w-4" />
        </Button>
      </Link>
    </motion.div>
  );

  return (
    <>
      <div className="flex items-center">
        <MobileVersion />
        <DesktopVersion />
        
        {/* Mostrar botón de login en móvil si hay error de autenticación */}
        {authenticationError && <MobileAuthButton />}
      </div>
      
      {/* Mostrar mensaje de error de autenticación en desktop */}
      {authenticationError && <AuthenticationMessage />}
    </>
  );
};