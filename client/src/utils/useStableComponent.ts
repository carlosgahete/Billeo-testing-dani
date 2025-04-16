import { useState, useEffect, useRef } from 'react';

/**
 * Opciones para el hook useStableComponent
 */
interface UseStableComponentOptions {
  /** Tiempo en ms que debe pasar sin renderizados para considerar el componente estable */
  stabilityDelay?: number;
  /** Si es true, bloquea interacciones hasta que el componente sea estable */
  blockInteractions?: boolean;
  /** Si es true, muestra logs de depuración en consola */
  debug?: boolean;
}

/**
 * Hook que permite controlar la estabilidad de un componente
 * Un componente es "estable" cuando ha pasado un tiempo definido sin
 * renderizados adicionales.
 */
export function useStableComponent({
  stabilityDelay = 1000, // 1 segundo por defecto
  blockInteractions = true,
  debug = false,
}: UseStableComponentOptions = {}) {
  // Estado para controlar si el componente está estable
  const [isStable, setIsStable] = useState(false);
  // Contador de renderizados
  const renderCount = useRef(0);
  // Referencia al timer para estabilidad
  const stabilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Logs de depuración cuando se monta y desmonta el componente
  useEffect(() => {
    if (debug) {
      console.log(`🔧 [useStableComponent] Componente montado`);
    }
    
    // Limpiar el temporizador cuando se desmonta
    return () => {
      if (stabilityTimer.current) {
        clearTimeout(stabilityTimer.current);
      }
      if (debug) {
        console.log(`🔧 [useStableComponent] Componente desmontado después de ${renderCount.current} renderizados`);
      }
    };
  }, [debug]);

  // Este efecto se ejecuta en cada render
  useEffect(() => {
    // Incrementar el contador de renderizados
    renderCount.current += 1;
    
    if (debug) {
      console.log(`🔄 [useStableComponent] Renderizado #${renderCount.current}`);
    }

    // Si hay un timer activo, limpiarlo
    if (stabilityTimer.current) {
      clearTimeout(stabilityTimer.current);
    }

    // Configurar un nuevo timer para marcar como estable
    stabilityTimer.current = setTimeout(() => {
      setIsStable(true);
      if (debug) {
        console.log(`✅ [useStableComponent] Componente estable después de ${renderCount.current} renderizados`);
      }
    }, stabilityDelay);

    // Si queremos bloquear interacciones, añadir un listener global
    if (blockInteractions && !isStable) {
      const blockEvent = (e: Event) => {
        // Solo bloqueamos eventos del usuario (no eventos programáticos)
        if (e.isTrusted) {
          e.preventDefault();
          e.stopPropagation();
          if (debug) {
            console.log(`🛑 [useStableComponent] Evento bloqueado: ${e.type}`);
          }
        }
      };

      // Eventos a bloquear
      const eventTypes = [
        'click', 'mousedown', 'mouseup', 'mousemove', 
        'touchstart', 'touchend', 'touchmove',
        'keydown', 'keyup', 'keypress',
        'input', 'change', 'submit'
      ];

      // Registramos los listeners
      eventTypes.forEach(type => {
        document.addEventListener(type, blockEvent, { capture: true });
      });

      // Limpieza
      return () => {
        eventTypes.forEach(type => {
          document.removeEventListener(type, blockEvent, { capture: true });
        });
      };
    }
  });

  return {
    isStable,
    renderCount: renderCount.current,
  };
}