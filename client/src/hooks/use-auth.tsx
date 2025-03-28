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
    queryFn: getQueryFn({ on401: "returnNull" }),
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
        const res = await apiRequest("POST", "/api/login", credentials);
        
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Usuario o contraseña incorrectos");
          } else {
            const errorData = await res.text();
            throw new Error(errorData || "Error al iniciar sesión");
          }
        }
        
        return await res.json();
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData: Omit<SelectUser, "password">) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema de gestión financiera",
      });
    },
    onError: (error: Error) => {
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