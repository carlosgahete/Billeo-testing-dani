import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    isLoading: boolean;
  }>({
    isAuthenticated: false,
    isLoading: true
  });

  // Comprobación de sesión simple
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error("No autenticado");
        }
        
        const data = await response.json();
        console.log("Datos de sesión:", data);
        
        setAuthState({
          isAuthenticated: data.authenticated,
          isLoading: false
        });
      } catch (error) {
        console.error("Error al comprobar autenticación:", error);
        setAuthState({
          isAuthenticated: false,
          isLoading: false
        });
      }
    };
    
    checkAuth();
  }, []);

  // Asegúrate de que esto sea visible en la consola para depuración
  console.log("ProtectedRoute - path:", path, "autenticado:", authState.isAuthenticated, "isLoading:", authState.isLoading);

  if (authState.isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!authState.isAuthenticated) {
    console.log("Redirigiendo a /auth desde", path);
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path}><Component /></Route>
}