import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const getMatches = (query: string): boolean => {
    // Comprobación para SSR
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Definir un callback para manejar cambios
    const handleChange = (): void => setMatches(mediaQuery.matches);
    
    // Registrar listener para cambios en la media query
    mediaQuery.addEventListener("change", handleChange);
    
    // Actualizar al montar para capturar el estado inicial
    handleChange();
    
    // Cleanup: eliminar el listener al desmontar
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

// Hooks específicos para breakpoints comunes
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}