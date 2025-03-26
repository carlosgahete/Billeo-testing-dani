import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<any, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  name: string;
  email: string;
  role?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: sessionData,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/auth/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Extraer el usuario de la respuesta de la sesión
  const user = sessionData?.authenticated ? sessionData.user : null;

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Iniciando proceso de login con:", credentials.username);
        const res = await apiRequest("POST", "/api/login", credentials);
        
        if (!res.ok) {
          console.error(`Error de inicio de sesión: ${res.status}`);
          throw new Error("Usuario o contraseña incorrectos");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData: any) => {
      // Actualizar el estado de la sesión para reflejar que el usuario está autenticado
      queryClient.setQueryData(["/api/auth/session"], {
        authenticated: true,
        user: userData
      });
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

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Error al crear cuenta");
      }
      return await res.json();
    },
    onSuccess: (userData: any) => {
      queryClient.setQueryData(["/api/auth/session"], {
        authenticated: true,
        user: userData
      });
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

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || "Error al cerrar sesión");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/session"], {
        authenticated: false,
        user: null
      });
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