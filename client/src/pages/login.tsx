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

  // Versión móvil estilo Apple iOS
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full bg-gradient-to-b from-[#f8f8fa] to-[#f0f0f3] overflow-hidden">
        {/* Área de estado (simula barra de iOS) */}
        <div className="h-10 bg-transparent"></div>
        
        {/* Header con logo y título */}
        <div className="flex-none pt-8 pb-6 flex flex-col items-center">
          <div className="mb-7 flex justify-center">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-16 drop-shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-medium text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#1d1d1f' }}>
            Iniciar sesión
          </h1>
        </div>
        
        {/* Formulario de login estilo iOS */}
        <div className="flex-grow px-6 pb-10 pt-8">
          <form onSubmit={handleLogin} className="space-y-3">
            {/* Grupo de campos estilo iOS */}
            <div 
              className="overflow-hidden rounded-2xl shadow-sm" 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(10px)', 
                WebkitBackdropFilter: 'blur(10px)', 
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Campo de usuario estilo iOS */}
              <div className="flex items-center px-4 py-3.5 border-b border-gray-100">
                <FingerprintIcon className="h-5 w-5 text-[#007AFF] mr-3 flex-shrink-0" />
                <input
                  type="text"
                  className="w-full bg-transparent border-none focus:outline-none text-base font-normal"
                  style={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', 
                    color: '#1d1d1f',
                    caretColor: '#007AFF'
                  }}
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              
              {/* Campo de contraseña estilo iOS */}
              <div className="flex items-center px-4 py-3.5">
                <LockIcon className="h-5 w-5 text-[#007AFF] mr-3 flex-shrink-0" />
                <input
                  type="password"
                  className="w-full bg-transparent border-none focus:outline-none text-base font-normal"
                  style={{ 
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', 
                    color: '#1d1d1f',
                    caretColor: '#007AFF'
                  }}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            
            {/* Botón de inicio de sesión estilo iOS */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full rounded-2xl py-3.5 flex items-center justify-center"
                style={{ 
                  background: '#007AFF', 
                  color: 'white',
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  boxShadow: isLoading ? 'none' : '0 4px 12px rgba(0, 122, 255, 0.3)'
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  "Iniciando sesión..."
                ) : (
                  <>
                    Continuar
                  </>
                )}
              </button>
            </div>
            
            {/* Info de recuperación de contraseña estilo iOS */}
            <div className="text-center mt-3">
              <a 
                href="#" 
                className="text-sm"
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  color: '#007AFF',
                  fontWeight: 400
                }}
                onClick={(e) => e.preventDefault()}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            
            {/* Línea separadora estilo iOS */}
            <div className="flex items-center py-6">
              <div className="flex-grow h-px bg-gray-200"></div>
              <span 
                className="px-3 text-xs"
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  color: '#86868b' 
                }}
              >
                o
              </span>
              <div className="flex-grow h-px bg-gray-200"></div>
            </div>
            
            {/* Info de demo */}
            <div className="text-center">
              <p 
                className="text-sm mb-2"
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  color: '#86868b' 
                }}
              >
                Puedes usar la cuenta demo
              </p>
              <p
                className="text-sm font-semibold"
                style={{ 
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  color: '#1d1d1f'
                }}
              >
                Usuario: <span style={{ color: '#007AFF' }}>demo</span> · Contraseña: <span style={{ color: '#007AFF' }}>demo</span>
              </p>
            </div>
          </form>
        </div>
        
        {/* Footer con copyright */}
        <div 
          className="flex-none pb-10 text-center text-xs"
          style={{ 
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            color: '#86868b' 
          }}
        >
          © {new Date().getFullYear()} Billeo · Gestión financiera
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