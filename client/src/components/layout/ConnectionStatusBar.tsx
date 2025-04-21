import React from 'react';
import { ConnectionState, useWebSocketDashboard } from '@/hooks/useWebSocketDashboard';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Barra de estado de conexión global para toda la aplicación
 */
export const ConnectionStatusBar: React.FC = () => {
  // Usamos este dummy callback porque en este componente solo nos importa
  // el estado de la conexión, no los mensajes
  const dummyRefreshCallback = () => {};
  
  const { 
    connectionState, 
    reconnect,
    errorMessage
  } = useWebSocketDashboard(dummyRefreshCallback);
  
  // Solo mostramos la barra cuando hay un problema de conexión
  const shouldShow = connectionState === ConnectionState.FAILED || 
                     connectionState === ConnectionState.CONNECTING || 
                     connectionState === ConnectionState.RECONNECTING;
  
  if (!shouldShow) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-2 text-sm
          ${connectionState === ConnectionState.FAILED ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'}`}
      >
        <div className="flex items-center">
          {connectionState === ConnectionState.CONNECTING && (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          )}
          
          {connectionState === ConnectionState.RECONNECTING && (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          )}
          
          <span>
            {connectionState === ConnectionState.CONNECTING && "Conectando al servidor..."}
            {connectionState === ConnectionState.RECONNECTING && "Reconectando al servidor..."}
            {connectionState === ConnectionState.FAILED && (errorMessage || "Error de conexión con el servidor")}
          </span>
          
          {connectionState === ConnectionState.FAILED && (
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-3 bg-white h-7 border-red-300"
              onClick={reconnect}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reconectar
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};