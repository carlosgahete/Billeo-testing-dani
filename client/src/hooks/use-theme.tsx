import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Siempre usamos el tema claro, eliminamos el modo oscuro
  const [theme, setTheme] = useState<Theme>("light");

  // Actualiza el DOM para asegurar que siempre estamos en modo claro
  useEffect(() => {
    // Forzar tema claro en localStorage
    localStorage.setItem("theme", "light");
    
    // Actualiza el elemento html para usar siempre el tema claro
    const root = window.document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    
    // Asegurar que color-scheme es light
    root.style.colorScheme = "light";
  }, []);

  // Función que no hace nada efectivamente, solo mantiene la compatibilidad de la API
  const toggleTheme = () => {
    // No hacemos nada, siempre permanecemos en tema claro
    setTheme("light");
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}