import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import billeoLogo from '../assets/billeo-logo.png';
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, loginMutation } = useAuth();
  const { toast } = useToast();

  // Redirect to appropriate page if already logged in
  useEffect(() => {
    console.log("AuthPage useEffect - Estado de user:", user ? "Autenticado" : "No autenticado");
    
    if (user) {
      console.log("AuthPage - Usuario autenticado, preparando redirección al dashboard");
      
      // Use a minimal timeout to improve UX and avoid flicker
      const timer = setTimeout(() => {
        // Todos los usuarios se redirigen primero al dashboard
        console.log("AuthPage - Redirigiendo al dashboard");
        navigate("/"); // Esta ruta "/" va al dashboard completo
      }, 100); // Aumentado a 100ms para dar tiempo a la actualización del estado
      
      return () => {
        console.log("AuthPage - Limpiando timer de redirección");
        clearTimeout(timer);
      };
    }
  }, [user, navigate]);

  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: "",
  });
  
  // Password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Handle login form changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle login form submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Intentando iniciar sesión con:", loginFormData);
    
    try {
      // Mostrar mensaje informativo
      toast({
        title: "Iniciando sesión...",
        description: "Verificando tus credenciales",
      });
      
      // Usar el método estándar de inicio de sesión
      console.log("Utilizando el método normal de login");
      loginMutation.mutate(loginFormData);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      toast({
        title: "Error de conexión",
        description: "Hubo un problema al conectar con el servidor",
        variant: "destructive",
      });
    }
  };

  const isPending = loginMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-100/40 to-blue-200/30 blur-3xl"></div>
        <div className="absolute top-1/4 -left-20 w-60 h-60 rounded-full bg-gradient-to-tr from-indigo-100/30 to-indigo-200/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-screen h-1/3 bg-gradient-to-t from-blue-50/50 to-transparent"></div>
      </div>
      
      {/* Mensaje de estado de conexión */}
      {isLoading && (
        <Card className="fixed top-4 left-1/2 transform -translate-x-1/2 p-2 px-3 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-2 text-xs text-yellow-700">
            <svg className="animate-spin h-3 w-3 text-yellow-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verificando estado de sesión...
          </div>
        </Card>
      )}
      
      {loginMutation.isError && (
        <Card className="fixed top-4 left-1/2 transform -translate-x-1/2 p-2 px-3 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="h-3 w-3" />
            Error de conexión. Intente nuevamente.
          </div>
        </Card>
      )}
      
      {/* Logo y cabecera central */}
      <div className="text-center mb-10 relative z-10 animate-fadeIn">
        <div className="flex justify-center mb-2">
          <img 
            src={billeoLogo} 
            alt="Billeo Logo" 
            className="h-10 animate-scaleIn"
            loading="eager"
          />
        </div>
        <p className="text-gray-500 mt-2 max-w-sm">
          Gestión financiera simplificada
        </p>
      </div>
      
      {/* Panel de autenticación simplificado - Sin registro */}
      <div className="w-full max-w-sm relative z-10 animate-fadeSlideUp">
        <div className="mb-8 p-1 bg-white/80 backdrop-blur-md rounded-xl flex justify-center w-full shadow-lg border border-blue-100/50">
          <div className="rounded-lg flex-1 bg-gradient-to-b from-blue-50 to-blue-100/50 shadow-sm text-blue-700 px-4 py-2 text-sm font-medium text-center">
            Iniciar Sesión
          </div>
        </div>
        
        {/* Login Form */}
        <div className="p-6 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-blue-100/50">
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <Label htmlFor="login-username" className="text-gray-700 font-medium text-sm block mb-2">
                Usuario o Email
              </Label>
              <Input
                id="login-username"
                name="username"
                placeholder="usuario o correo@ejemplo.com"
                value={loginFormData.username}
                onChange={handleLoginChange}
                required
                className="h-10 rounded-lg border-blue-100 bg-white/90 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm w-full transition-all"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="login-password" className="text-gray-700 font-medium text-sm">
                  Contraseña
                </Label>
                <Link to="/forgot-password" className="text-xs text-blue-500 hover:text-blue-700">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={loginFormData.password}
                  onChange={handleLoginChange}
                  required
                  className="h-10 rounded-lg border-blue-100 bg-white/90 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm w-full transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <Button
              className="w-full shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-4 py-2 h-12 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              type="submit"
              disabled={isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
            
            {/* Credenciales demo para facilitar pruebas */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-blue-700">Usuario demo</span>
              </div>
              <p className="text-xs text-blue-600 mb-1">Usuario: <span className="font-medium">demo</span></p>
              <p className="text-xs text-blue-600">Contraseña: <span className="font-medium">demobilleo</span></p>
              <p className="text-xs mt-2 text-blue-500 italic">Estas credenciales solo son para mostrar la funcionalidad</p>
            </div>
          </form>
        </div>
      </div>
      
      {/* Footer solo visible en pantallas medianas y grandes */}
      <div className="hidden sm:block absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-blue-400/60">© {new Date().getFullYear()} Billeo · Tu gestión financiera</p>
      </div>
    </div>
  );
}