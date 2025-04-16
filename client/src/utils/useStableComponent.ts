/**
 * useStableComponent
 * 
 * Este hook proporciona una manera de garantizar que un componente esté
 * completamente estable antes de permitir interacciones con él. Espera a que
 * todas las actualizaciones de estado hayan terminado y luego permite la interacción.
 * 
 * Útil para componentes que sufren de "eventos fantasma" debido a renderizados
 * muy rápidos o condiciones de carrera.
 */

import { useState, useEffect, useRef } from 'react';

interface StableComponentOptions {
  /** Tiempo mínimo (ms) de estabilidad antes de permitir interacciones */
  stabilityDelay?: number;
  /** Si debería bloquear interacciones mientras el componente no esté estable */
  blockInteractions?: boolean;
  /** Log de depuración */
  debug?: boolean;
}

export function useStableComponent(options: StableComponentOptions = {}) {
  const {
    stabilityDelay = 1500, // Por defecto, medio segundo para estabilizarse
    blockInteractions = true,
    debug = true,
  } = options;

  // Estado que indica si el componente está estable
  const [isStable, setIsStable] = useState(false);
  
  // Contador de renderizados para detectar estabilidad
  const renderCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const componentMountedAtRef = useRef(Date.now());

  // Incrementamos el contador de renderizados en cada render
  renderCountRef.current += 1;

  // Efecto para marcar el componente como estable después del delay
  useEffect(() => {
    // Reiniciamos cualquier timeout previo
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (debug) {
      console.log(`🧩 [useStableComponent] Componente renderizado #${renderCountRef.current}, esperando ${stabilityDelay}ms para estabilidad...`);
    }

    // Configuramos el nuevo timeout para marcar como estable
    timeoutRef.current = setTimeout(() => {
      setIsStable(true);
      if (debug) {
        const timeElapsed = Date.now() - componentMountedAtRef.current;
        console.log(`✅ [useStableComponent] Componente estable después de ${timeElapsed}ms y ${renderCountRef.current} renderizados.`);
      }
    }, stabilityDelay);

    // Limpieza al desmontar
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Solo en el montaje inicial

  // Función para comprobar si se debe permitir una interacción
  const shouldAllowInteraction = () => {
    // Si no estamos bloqueando interacciones, siempre permitir
    if (!blockInteractions) return true;
    
    // En caso contrario, permitir solo si el componente está estable
    return isStable;
  };

  // Función para envolver manejadores de eventos
  const withStability = <T extends any[]>(
    handler: (...args: T) => void
  ) => {
    return (...args: T) => {
      // Verificar si debemos permitir la interacción
      if (shouldAllowInteraction()) {
        if (debug && !isStable) {
          console.warn(`⚠️ [useStableComponent] Permitiendo interacción en componente inestable (${renderCountRef.current} renderizados)`);
        }
        // Ejecutar el manejador original si está permitido
        handler(...args);
      } else {
        if (debug) {
          console.log(`🛡️ [useStableComponent] Bloqueando interacción, componente aún no estable (${renderCountRef.current} renderizados)`);
        }
      }
    };
  };

  return {
    isStable,
    withStability,
    renderCount: renderCountRef.current,
  };
}