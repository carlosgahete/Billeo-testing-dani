/**
 * ComponentStabilizer
 * 
 * Este componente envuelve a otros componentes y bloquea cualquier interacción
 * con ellos hasta que se hayan estabilizado (completado todos los renderizados iniciales).
 * 
 * Útil para prevenir "eventos fantasma" en componentes complejos que sufren
 * de múltiples re-renderizados durante la inicialización.
 */

import React, { ReactNode } from 'react';
import { useStableComponent } from '@/utils/useStableComponent';

interface ComponentStabilizerProps {
  children: ReactNode;
  stabilityDelay?: number;
  blockVisually?: boolean;
  showDebugInfo?: boolean;
  className?: string;
}

export function ComponentStabilizer({
  children,
  stabilityDelay = 1500, // 1.5 segundos por defecto
  blockVisually = true,
  showDebugInfo = false,
  className = '',
}: ComponentStabilizerProps) {
  // Usar el hook de estabilidad
  const { isStable, renderCount } = useStableComponent({
    stabilityDelay,
    blockInteractions: true,
    debug: showDebugInfo,
  });

  return (
    <div className={`component-stabilizer relative ${className}`}>
      {/* Contenido del componente */}
      <div 
        className={`component-content ${isStable ? 'stable' : 'unstable'}`}
        style={{ pointerEvents: isStable ? 'auto' : 'none' }}
      >
        {children}
      </div>

      {/* Bloqueo visual que se muestra mientras el componente se estabiliza */}
      {blockVisually && !isStable && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity">
          <div className="rounded-lg bg-white/90 p-4 shadow-md text-center max-w-xs">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-700 font-medium">Cargando componente...</p>
            {showDebugInfo && (
              <p className="text-xs text-gray-500 mt-1">
                Renderizado {renderCount} {renderCount === 1 ? 'vez' : 'veces'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Indicador de depuración cuando el componente está estable pero con debug activado */}
      {showDebugInfo && isStable && (
        <div className="absolute top-1 right-1 bg-green-100 text-green-800 text-xs py-0.5 px-2 rounded-full opacity-70">
          Estable ({renderCount} renders)
        </div>
      )}
    </div>
  );
}