import { createContext, ReactNode, useContext, useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  name: string;
  email: string;
  role?: string;
};

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>;
  refreshUser: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Efecto para cargar los datos de la empresa al iniciar la app si el usuario está autenticado
  useEffect(() => {
    if (user) {
      console.log("Usuario autenticado al iniciar, cargando datos de empresa para PDFs");
      fetch('/api/company')
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(companyData => {
          if (companyData) {
            sessionStorage.setItem('companyData', JSON.stringify(companyData));
            console.log("Datos de empresa iniciales guardados en sessionStorage");
          }
        })
        .catch(err => {
          console.error("Error cargando datos iniciales de empresa:", err);
        });
    }
  }, [user]);
  
  // Función para refrescar manualmente los datos del usuario
  const refreshUser = useCallback(() => {
    console.log('Refrescando datos del usuario...');
    queryClient.invalidateQueries({queryKey: ["/api/user"]});
    refetch();
    
    // También cargar datos de la empresa si el usuario está autenticado
    if (user) {
      fetch('/api/company')
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(companyData => {
          if (companyData) {
            sessionStorage.setItem('companyData', JSON.stringify(companyData));
            console.log("Datos de empresa actualizados en sessionStorage en refreshUser");
          }
        })
        .catch(err => {
          console.error("Error actualizando datos de empresa:", err);
        });
    }
  }, [refetch, user]);

  const loginMutation = useMutation<Omit<SelectUser, "password">, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Iniciando proceso de login - Antes de la petición API");
        const res = await apiRequest("POST", "/api/login", credentials);
        console.log("Login API respuesta status:", res.status);
        
        if (!res.ok) {
          if (res.status === 401) {
            console.error("Login fallido: Credenciales inválidas");
            throw new Error("Usuario o contraseña incorrectos");
          } else {
            const errorData = await res.text();
            console.error(`Login fallido con status ${res.status}:`, errorData);
            throw new Error(errorData || "Error al iniciar sesión");
          }
        }
        
        const data = await res.json();
        console.log("Login exitoso - Datos de usuario recibidos:", { ...data, password: "[OCULTO]" });
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      console.log("Login mutation onSuccess - Actualizando query cache");
      queryClient.setQueryData(["/api/user"], userData);
      
      // Invalidar la query para forzar una recarga fresca
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      
      // Guardar los datos del usuario autenticado en sessionStorage y localStorage
      try {
        // Persistir datos en sessionStorage (para la sesión actual)
        sessionStorage.setItem('userData', JSON.stringify(userData));
        
        // Persistir datos en localStorage (para recuperar sesión después)
        localStorage.setItem('userData', JSON.stringify(userData));
        
        console.log("Datos de usuario guardados correctamente en storage");
      } catch (err) {
        console.error("Error guardando datos de usuario en storage:", err);
      }
      
      // Cargar los datos de la empresa y guardarlos en sessionStorage para los PDFs
      fetch('/api/company')
        .then(res => {
          if (res.ok) return res.json();
          return null;
        })
        .then(companyData => {
          if (companyData) {
            // Guardar en sessionStorage para uso en generación de PDFs
            sessionStorage.setItem('companyData', JSON.stringify(companyData));
            console.log("Datos de empresa guardados en sessionStorage:", companyData);
          }
        })
        .catch(err => {
          console.error("Error cargando datos de empresa:", err);
        });
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema de gestión financiera",
      });
      
      // Verificar si los datos están actualizados en la caché
      setTimeout(() => {
        console.log("Estado de usuario en caché después de login:", 
          queryClient.getQueryData(["/api/user"]));
      }, 100);
    },
    onError: (error: Error) => {
      console.error("Login mutation onError:", error.message);
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Usuario o contraseña incorrectos",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<Omit<SelectUser, "password">, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      try {
        const res = await apiRequest("POST", "/api/register", userData);
        
        if (!res.ok) {
          const errorData = await res.text();
          throw new Error(errorData || "Error al crear cuenta");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Register error:", error);
        throw error;
      }
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message || "No se pudo crear la cuenta",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      try {
        const res = await apiRequest("POST", "/api/logout");
        
        if (!res.ok) {
          const errorData = await res.text();
          throw new Error(errorData || "Error al cerrar sesión");
        }
        
        return;
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      
      // Limpiar todos los datos del usuario y empresa en sessionStorage y localStorage
      try {
        // Limpiar datos de sessionStorage
        sessionStorage.removeItem('companyData');
        sessionStorage.removeItem('userData');
        
        // Limpiar datos de localStorage
        localStorage.removeItem('userData');
        
        console.log("Datos de usuario y empresa eliminados correctamente de Storage");
      } catch (err) {
        console.error("Error limpiando Storage:", err);
      }
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}