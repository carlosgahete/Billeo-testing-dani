import { createContext, ReactNode, useContext, useCallback, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isSuperAdmin } from "@/lib/is-superadmin";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  name: string;
  email: string;
  role?: string;
};

// Tipo para información del administrador original
type OriginalAdmin = {
  id: number;
  username: string;
  role: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
};

type AuthContextType = {
  user: SelectUser | null;
  originalAdmin: OriginalAdmin | null; // Información del admin original
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>;
  refreshUser: () => void;
  // Función para verificar si el usuario tiene privilegios administrativos
  hasAdminPrivileges: () => boolean;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Usamos una consulta personalizada para obtener tanto el usuario como la información de admin original
  const {
    data: authData,
    error,
    isLoading,
    refetch
  } = useQuery<{ user: SelectUser | null, originalAdmin: OriginalAdmin | null }, Error>({
    queryKey: ["/api/auth/session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session", {
        credentials: "include"
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          return { user: null, originalAdmin: null };
        }
        throw new Error("Error al obtener información de sesión");
      }
      
      const data = await res.json();
      
      if (!data.authenticated) {
        return { user: null, originalAdmin: null };
      }
      
      return { 
        user: data.user || null, 
        originalAdmin: data.originalAdmin || null 
      };
    }
  });
  
  // Extraer usuario y admin original del resultado de la consulta
  const user = authData?.user || null;
  const originalAdmin = authData?.originalAdmin || null;
  
  // Efecto para sincronizar la información del usuario en sessionStorage
  useEffect(() => {
    if (user) {
      console.log("Sincronizando información del usuario con sessionStorage...");
      try {
        // Guardar información del usuario en sessionStorage para que esté disponible para el dashboard
        sessionStorage.setItem('user_info', JSON.stringify({
          id: user.id,
          username: user.username,
          role: user.role || 'user',
          name: user.name,
          email: user.email
        }));
        console.log("✅ Información de usuario actualizada en sessionStorage al cargar");
      } catch (err) {
        console.error("❌ Error actualizando información de usuario en sessionStorage:", err);
      }
    } else {
      // Si no hay usuario, asegurarse de limpiar los datos
      try {
        sessionStorage.removeItem('user_info');
      } catch (err) {
        console.error("Error limpiando sessionStorage:", err);
      }
    }
  }, [user]);
  
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
    queryClient.invalidateQueries({queryKey: ["/api/auth/session"]});
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
        
        // Usamos fetch directamente para tener más control sobre las cookies
        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include" // Muy importante para las cookies
        });
        
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
        
        // Guardar userId en cookie para que sea accesible por el servidor
        document.cookie = `username=${data.username}; path=/; max-age=86400`;
        
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      console.log("Login mutation onSuccess - Actualizando query cache");
      
      // Almacenar en localStorage para respaldo
      localStorage.setItem('user_authenticated', 'true');
      localStorage.setItem('user_id', userData.id.toString());
      localStorage.setItem('username', userData.username);
      
      // Guardar información completa del usuario en sessionStorage para ser accesible por el dashboard
      try {
        sessionStorage.setItem('user_info', JSON.stringify({
          id: userData.id,
          username: userData.username,
          role: userData.role || 'user',
          name: userData.name,
          email: userData.email
        }));
        console.log("✅ Información de usuario guardada en sessionStorage para dashboard");
      } catch (err) {
        console.error("❌ Error guardando información de usuario en sessionStorage:", err);
      }
      
      // También almacenar en cookie para acceso del servidor
      document.cookie = `userId=${userData.id}; path=/; max-age=86400`;
      document.cookie = `username=${userData.username}; path=/; max-age=86400`;
      
      // Actualizar caché de forma inmediata
      queryClient.setQueryData(["/api/user"], userData);
      
      // Actualizar también la caché de la sesión
      queryClient.setQueryData(["/api/auth/session"], {
        authenticated: true,
        user: userData,
        originalAdmin: null
      });
      
      // Configurar el header global para todas las solicitudes fetch
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        init = init || {};
        init.headers = init.headers || {};
        
        // Añadir el header con el ID de usuario
        const headers = new Headers(init.headers);
        headers.append('X-User-ID', userData.id.toString());
        
        // Asegurarse de incluir las cookies
        init.credentials = 'include';
        init.headers = headers;
        
        return originalFetch(input, init);
      };
      
      // Refrescar todos los datos relacionados
      queryClient.invalidateQueries();
      
      // Cargar los datos de la empresa y guardarlos en sessionStorage para los PDFs
      fetch('/api/company?userId=' + userData.id, {
        credentials: "include", // Asegurarse de enviar cookies
        headers: {
          'X-User-ID': userData.id.toString()
        }
      })
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
      // Limpiar toda la información de sesión
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/auth/session"], {
        authenticated: false,
        user: null,
        originalAdmin: null
      });
      
      // Limpiar datos del sessionStorage al cerrar sesión
      try {
        // Limpiar datos de empresa
        sessionStorage.removeItem('companyData');
        // Limpiar información del usuario
        sessionStorage.removeItem('user_info');
        // Limpiar caché del dashboard
        sessionStorage.removeItem('current_dashboard_cache_key');
        // Limpiar estado de admin viendo como usuario
        sessionStorage.removeItem('admin_viewing_as_user');
        
        // También limpiar cualquier clave de caché del dashboard
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('dashboard_cache_')) {
            sessionStorage.removeItem(key);
          }
        });
        
        console.log("✅ Datos de usuario eliminados correctamente de sessionStorage");
      } catch (err) {
        console.error("Error limpiando sessionStorage:", err);
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

  // Función para verificar si el usuario tiene privilegios administrativos
  const hasAdminPrivileges = useCallback(() => {
    // Usar directamente la función centralizada importada al inicio del archivo
    const result = isSuperAdmin(user, originalAdmin);
    
    if (result) {
      console.log("Usuario tiene privilegios de administrador", 
        originalAdmin ? "por ser admin original" : 
        user?.role === 'superadmin' ? "por su rol" : 
        "por su username");
    }
    
    return result;
  }, [user, originalAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        originalAdmin: originalAdmin ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        refreshUser,
        hasAdminPrivileges
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