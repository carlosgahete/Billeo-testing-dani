import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import billeoLogo from '../assets/billeo-logo.png';
import { FingerprintIcon, LockIcon, ArrowRightIcon } from "lucide-react";

interface SessionData {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

const LoginPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  // Check if the user is already authenticated
  const { data: sessionData, isLoading: isSessionLoading } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
    retry: false,
    refetchOnWindowFocus: false
  });
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (sessionData?.authenticated) {
      navigate("/");
    }
  }, [sessionData, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a demo user if one doesn't exist yet
      if (username === "demo" && password === "demo") {
        try {
          // Try to register the demo user first (will fail if it already exists, which is fine)
          await apiRequest("/api/users", "POST", {
            name: "Ana García",
            username: "demo",
            password: "demo",
            email: "anagarcia@example.com",
            role: "Autonomo"
          });
        } catch (error) {
          // Ignore error if user already exists
          console.log("Demo user already exists");
        }
      }

      // Attempt to login
      await apiRequest("/api/auth/login", "POST", { 
        username, 
        password 
      });
      
      // Invalidate auth session cache immediately
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      
      // Show success message
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema de gestión financiera",
      });
      
      // Redirect to dashboard
      navigate("/");
    } catch (error) {
      toast({
        title: "Error de inicio de sesión",
        description: "Usuario o contraseña incorrectos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Versión móvil estilo Apple
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full bg-gray-50">
        {/* Header con logo y título */}
        <div className="flex-none pt-12 pb-8 flex flex-col items-center">
          <div className="mb-6 flex justify-center">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-14"
            />
          </div>
          <h1 className="text-2xl font-semibold text-center text-gray-800">
            Bienvenido
          </h1>
          <p className="text-center text-gray-500 mt-2 px-6">
            Inicia sesión para gestionar tus finanzas
          </p>
        </div>
        
        {/* Formulario de login estilo iOS */}
        <div className="flex-grow px-6 pb-8 pt-2">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Campo de usuario estilo iOS */}
            <div className="space-y-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center px-4 py-3">
                  <FingerprintIcon className="h-5 w-5 text-blue-500 mr-3" />
                  <input
                    type="text"
                    className="w-full bg-transparent border-none focus:outline-none text-base text-gray-700"
                    placeholder="Usuario (demo)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Campo de contraseña estilo iOS */}
            <div className="space-y-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center px-4 py-3">
                  <LockIcon className="h-5 w-5 text-blue-500 mr-3" />
                  <input
                    type="password"
                    className="w-full bg-transparent border-none focus:outline-none text-base text-gray-700"
                    placeholder="Contraseña (demo)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
            {/* Botón de inicio de sesión estilo iOS */}
            <div className="pt-4">
              <button
                type="submit"
                className="button-apple-primary w-full py-3.5 flex items-center justify-center text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Iniciando sesión..."
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            
            {/* Info de demo */}
            <div className="text-center text-sm mt-6">
              <p className="text-gray-500">
                Puedes usar la cuenta demo:<br/>
                <span className="font-semibold">demo</span> / <span className="font-semibold">demo</span>
              </p>
            </div>
          </form>
        </div>
        
        {/* Footer con copyright */}
        <div className="flex-none pb-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Billeo - Gestión financiera
        </div>
      </div>
    );
  }

  // Versión desktop (mantiene el diseño original)
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-11"
            />
          </div>
          <p className="text-sm text-neutral-500">
            Introduce tus credenciales para acceder a la cuenta
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                placeholder="demo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="demo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
            <div className="text-center text-sm">
              <p className="text-neutral-500 mt-2">
                Cuenta demo: usuario <span className="font-semibold">demo</span> / contraseña <span className="font-semibold">demo</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;