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
  loginMutation: UseMutationResult<Omit<SelectUser, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<Omit<SelectUser, "password">, Error, RegisterData>;
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
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation<Omit<SelectUser, "password">, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      try {
        console.log("Iniciando proceso de login con:", credentials.username);
        const res = await apiRequest("POST", "/api/login", credentials);
        
        if (!res.ok) {
          console.error(`Error de inicio de sesión: ${res.status}`);
          if (res.status === 401) {
            throw new Error("Usuario o contraseña incorrectos");
          } else {
            try {
              const errorData = await res.json();
              throw new Error(errorData.message || "Error al iniciar sesión");
            } catch {
              const errorText = await res.text();
              throw new Error(errorText || "Error al iniciar sesión");
            }
          }
        }
        
        const userData = await res.json();
        console.log("Inicio de sesión exitoso, ID de usuario:", userData.id);
        return userData;
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
        console.log("Iniciando registro de usuario:", userData.username);
        const res = await apiRequest("POST", "/api/register", userData);
        
        if (!res.ok) {
          console.error(`Error de registro: ${res.status}`);
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || "Error al crear cuenta");
          } catch {
            const errorText = await res.text();
            throw new Error(errorText || "Error al crear cuenta");
          }
        }
        
        const newUserData = await res.json();
        console.log("Registro exitoso, ID de usuario:", newUserData.id);
        return newUserData;
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
        console.log("Iniciando cierre de sesión");
        const res = await apiRequest("POST", "/api/logout");
        
        if (!res.ok) {
          console.error(`Error al cerrar sesión: ${res.status}`);
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || "Error al cerrar sesión");
          } catch {
            const errorText = await res.text();
            throw new Error(errorText || "Error al cerrar sesión");
          }
        }
        
        console.log("Cierre de sesión exitoso");
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