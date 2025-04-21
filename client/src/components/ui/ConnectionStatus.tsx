import React from 'react';
import { ConnectionState } from '@/hooks/useWebSocketDashboard';
import { AlertCircle, ArrowRightCircle, RefreshCw, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
  className?: string;
  errorMessage?: string | null;
}

/**
 * Componente para mostrar el estado de conexión y permitir reconectar
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionState,
  onReconnect,
  className,
  errorMessage
}) => {
  // Definir el color y el texto según el estado
  let statusColor = 'bg-gray-400';
  let statusText = 'Desconectado';
  
  switch (connectionState) {
    case ConnectionState.CONNECTED:
      statusColor = 'bg-green-500 animate-pulse';
      statusText = 'Tiempo real';
      break;
    case ConnectionState.CONNECTING:
      statusColor = 'bg-yellow-500 animate-pulse';
      statusText = 'Conectando...';
      break;
    case ConnectionState.RECONNECTING:
      statusColor = 'bg-yellow-500 animate-pulse';
      statusText = 'Reconectando...';
      break;
    case ConnectionState.FAILED:
      statusColor = 'bg-red-500';
      statusText = 'Error de conexión';
      break;
    default:
      statusColor = 'bg-gray-400';
      statusText = 'Desconectado';
  }

  // Versión móvil - sólo icono
  const MobileVersion = () => (
    <div className="flex md:hidden items-center">
      <div className={`w-2 h-2 rounded-full ${statusColor}`} title={statusText} />
      
      {/* Botón de reconexión solo visible cuando la conexión falla */}
      {connectionState === ConnectionState.FAILED && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-1"
          onClick={onReconnect}
          title="Reconectar"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // Versión desktop - con texto
  const DesktopVersion = () => (
    <div className={cn("hidden md:flex items-center text-xs text-gray-600", className)}>
      <div className={`w-2 h-2 rounded-full mr-1 ${statusColor}`} />
      <span className="text-xs">{statusText}</span>
      
      {/* Botón de reconexión solo visible cuando la conexión falla */}
      {connectionState === ConnectionState.FAILED && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-2"
        >
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 py-0 ml-1 text-xs"
            onClick={onReconnect}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconectar
          </Button>
        </motion.div>
      )}
    </div>
  );

  return (
    <>
      <MobileVersion />
      <DesktopVersion />
    </>
  );
};