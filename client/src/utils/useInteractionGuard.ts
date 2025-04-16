/**
 * useInteractionGuard
 * 
 * Este hook proporciona una solución global para evitar los eventos fantasma
 * que ocurren cuando React renderiza en condiciones de alta carga.
 * 
 * Permite envolver cualquier manejador de eventos con una protección que garantiza que:
 * 1. El documento tiene foco
 * 2. Ha pasado un tiempo mínimo desde el último evento del mismo tipo
 * 3. El componente está montado
 */

import { useRef, useEffect, useCallback } from 'react';

interface InteractionGuardOptions {
  /** Tiempo mínimo (ms) entre eventos del mismo tipo */
  throttleTime?: number;
  /** Función para ejecutar antes de procesar el evento (opcional) */
  beforeEvent?: () => void;
  /** Función para ejecutar después de procesar el evento (opcional) */
  afterEvent?: () => void;
  /** Habilitar logs de depuración */
  debug?: boolean;
}

export function useInteractionGuard(options: InteractionGuardOptions = {}) {
  const {
    throttleTime = 300,
    beforeEvent,
    afterEvent,
    debug = false
  } = options;

  // Ref para rastrear si el componente está montado
  const isMountedRef = useRef(true);
  
  // Ref para almacenar los tiempos del último evento por tipo
  const lastEventTimeRef = useRef<Record<string, number>>({});
  
  // Contador de eventos bloqueados para estadísticas
  const blockedEventsRef = useRef<Record<string, number>>({});

  // Efecto para establecer el estado de montaje
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Función que envuelve cualquier manejador de eventos con protección
  const guard = useCallback(<T extends any[]>(
    eventType: string,
    handler: (...args: T) => void
  ) => {
    return (...args: T) => {
      // Verificar que el documento tiene foco
      if (typeof document === 'undefined' || !document.hasFocus()) {
        if (debug) console.log(`🛡️ [InteractionGuard] Evento ${eventType} bloqueado - Sin foco en documento`);
        blockedEventsRef.current[eventType] = (blockedEventsRef.current[eventType] || 0) + 1;
        return;
      }

      // Verificar que el componente está montado
      if (!isMountedRef.current) {
        if (debug) console.log(`🛡️ [InteractionGuard] Evento ${eventType} bloqueado - Componente desmontado`);
        blockedEventsRef.current[eventType] = (blockedEventsRef.current[eventType] || 0) + 1;
        return;
      }

      // Verificar el throttle para evitar eventos duplicados
      const now = Date.now();
      const lastTime = lastEventTimeRef.current[eventType] || 0;
      
      if (now - lastTime < throttleTime) {
        if (debug) console.log(`🛡️ [InteractionGuard] Evento ${eventType} bloqueado - Muy rápido (${now - lastTime}ms < ${throttleTime}ms)`);
        blockedEventsRef.current[eventType] = (blockedEventsRef.current[eventType] || 0) + 1;
        return;
      }

      // Ejecutar beforeEvent si existe
      if (beforeEvent) beforeEvent();

      // Actualizar el tiempo del último evento
      lastEventTimeRef.current[eventType] = now;

      // Ejecutar handler original
      if (debug) console.log(`✅ [InteractionGuard] Evento ${eventType} permitido`);
      handler(...args);

      // Ejecutar afterEvent si existe
      if (afterEvent) afterEvent();
    };
  }, [throttleTime, beforeEvent, afterEvent, debug]);

  // Obtener estadísticas de eventos bloqueados
  const getBlockedStats = useCallback(() => {
    return { ...blockedEventsRef.current };
  }, []);

  return { guard, getBlockedStats };
}