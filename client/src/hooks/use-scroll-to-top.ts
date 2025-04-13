import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook personalizado que hace scroll al inicio de la página
 * cada vez que la ruta cambia o cuando se monta el componente
 */
export function useScrollToTop() {
  const [location] = useLocation();
  const prevLocationRef = useRef<string | null>(null);

  useEffect(() => {
    // Si la ruta ha cambiado o es la carga inicial
    if (prevLocationRef.current !== location) {
      // Hacer scroll al inicio de la página
      window.scrollTo({
        top: 0,
        behavior: 'auto' // 'auto' es más rápido que 'smooth'
      });

      // Forzar el reflow del DOM para asegurar que el scroll se aplique inmediatamente
      document.body.getBoundingClientRect();
      
      // Actualizar la referencia de la ubicación anterior
      prevLocationRef.current = location;
    }
  }, [location]);
}