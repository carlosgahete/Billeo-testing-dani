import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Hook personalizado que hace scroll al inicio de la página
 * cuando se navega a una nueva ruta utilizando wouter
 */
export function useScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Solo hacer scroll al principio de la página cuando la ruta cambia
    if (location) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 0);
    }
  }, [location]);
}