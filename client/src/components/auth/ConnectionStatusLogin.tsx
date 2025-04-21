import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente para mostrar el estado de conexión en la página de login
 * con funcionalidad de reconexión
 */
export const ConnectionStatusLogin: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [attemptCount, setAttemptCount] = useState(0);
  const [showReconnectButton, setShowReconnectButton] = useState(false);
  
  // Verificar conexión al servidor
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Intentar hacer una petición simple al servidor
        const response = await fetch('/api/health', { 
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          console.log('✅ Conexión al servidor establecida');
          setConnectionStatus('connected');
          setShowReconnectButton(false);
        } else {
          console.error('❌ Error en la conexión al servidor:', response.status);
          setConnectionStatus('error');
          setShowReconnectButton(true);
        }
      } catch (error) {
        console.error('❌ Error al verificar la conexión:', error);
        setConnectionStatus('error');
        setShowReconnectButton(true);
      }
    };
    
    // Verificar conexión inmediatamente
    checkConnection();
    
    // Configurar verificación periódica
    const intervalId = setInterval(() => {
      if (connectionStatus === 'error' && attemptCount < 3) {
        checkConnection();
        setAttemptCount(prev => prev + 1);
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [connectionStatus, attemptCount]);
  
  // Manejar reconexión manual
  const handleReconnect = () => {
    setAttemptCount(0);
    setShowReconnectButton(false);
    
    // Intentar reconectar
    fetch('/api/health', { 
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ Reconexión exitosa');
        setConnectionStatus('connected');
      } else {
        console.error('❌ Error en la reconexión:', response.status);
        setConnectionStatus('error');
        setShowReconnectButton(true);
      }
    })
    .catch(error => {
      console.error('❌ Error al reconectar:', error);
      setConnectionStatus('error');
      setShowReconnectButton(true);
    });
  };
  
  // No mostrar nada si la conexión está bien
  if (connectionStatus === 'connected') {
    return null;
  }
  
  return (
    <AnimatePresence>
      {(connectionStatus === 'connecting' || connectionStatus === 'error') && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`flex items-center justify-center p-2 rounded-lg mb-5 ${
            connectionStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
          }`}
        >
          <div className="flex items-center">
            {connectionStatus === 'connecting' && (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            )}
            
            <span className="text-sm">
              {connectionStatus === 'connecting' && "Conectando al servidor..."}
              {connectionStatus === 'error' && "Error de conexión con el servidor"}
            </span>
            
            {showReconnectButton && (
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-3 h-7 text-xs"
                onClick={handleReconnect}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reconectar
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};