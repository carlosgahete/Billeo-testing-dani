import { createContext, ReactNode, useContext, useCallback } from "react";
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
    queryFn: async () => {
      try {
        return await apiRequest<SelectUser>("/api/user", "GET");
      } catch (error: any) {
        if (error.message && error.message.includes('401')) {
          console.log('Usuario no autenticado');
          return null;
        }
        throw error;
      }
    },
  });
  
  // Función para refrescar manualmente los datos del usuario
  const refreshUser = useCallback(() => {
    console.log('Refrescando datos del usuario...');
    queryClient.invalidateQueries({queryKey: ["/api/user"]});
    refetch();
  }, [refetch]);

  const loginMutation = useMutation<Omit<SelectUser, "password">, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log('Iniciando sesión con:', credentials);
        return await apiRequest<Omit<SelectUser, "password">>("/api/login", "POST", credentials);
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      console.log('Login exitoso, datos de usuario:', userData);
      queryClient.setQueryData(["/api/user"], userData);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema de gestión financiera",
      });
      
      // Navegamos a la página principal después de iniciar sesión
      window.location.href = "/";
    },
    onError: (error: Error) => {
      console.error('Error en login mutation:', error);
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
        console.log('Registrando usuario:', userData);
        return await apiRequest<Omit<SelectUser, "password">>("/api/register", "POST", userData);
      } catch (error) {
        console.error("Register error:", error);
        throw error;
      }
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      console.log('Registro exitoso:', userData);
      queryClient.setQueryData(["/api/user"], userData);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente",
      });
    },
    onError: (error: Error) => {
      console.error('Error en registro:', error);
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
        console.log('Cerrando sesión...');
        await apiRequest<void>("/api/logout", "POST");
        return;
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Sesión cerrada correctamente');
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    },
    onError: (error: Error) => {
      console.error('Error en cierre de sesión:', error);
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