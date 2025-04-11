import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import billeoLogo from '../assets/billeo-logo.png';
import { Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Redirect to appropriate page if already logged in
  useEffect(() => {
    if (user) {
      // Use a minimal timeout to improve UX and avoid flicker
      const timer = setTimeout(() => {
        // Si es billeo_admin o tiene rol de admin, redirigir a página de administración
        if (user.role === 'admin' || user.role === 'superadmin' || 
            user.username === 'Superadmin' || user.username === 'billeo_admin') {
          navigate("/admin/libro-simple/1");
        } else {
          navigate("/");
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: "",
  });
  
  // Password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Register form state
  const [registerFormData, setRegisterFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "user", // Default role
    businessType: "autonomo", // Default: autónomo
  });

  // Handle login form changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle register form changes
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle business type change
  const handleBusinessTypeChange = (value: string) => {
    setRegisterFormData((prev) => ({ ...prev, businessType: value }));
  };

  // Handle login form submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Intentando iniciar sesión con:", loginFormData);
    
    // Proceed with login
    loginMutation.mutate(loginFormData);
  };

  // Handle register form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(registerFormData);
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-blue-100/40 to-blue-200/30 blur-3xl"></div>
        <div className="absolute top-1/4 -left-20 w-60 h-60 rounded-full bg-gradient-to-tr from-indigo-100/30 to-indigo-200/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-screen h-1/3 bg-gradient-to-t from-blue-50/50 to-transparent"></div>
      </div>
      
      {/* Logo y cabecera central */}
      <div className="text-center mb-10 relative z-10 animate-fadeIn">
        <div className="flex justify-center mb-2">
          <img 
            src={billeoLogo} 
            alt="Billeo Logo" 
            className="h-16 animate-scaleIn"
          />
        </div>
        <p className="text-gray-500 mt-2 max-w-sm">
          Gestión financiera simplificada
        </p>
      </div>
      
      {/* Panel de autenticación */}
      <div className="w-full max-w-sm relative z-10 animate-fadeSlideUp">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-8 p-1 bg-white/80 backdrop-blur-md rounded-xl flex space-x-1 w-full shadow-lg border border-blue-100/50">
            <TabsTrigger 
              className="rounded-lg flex-1 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50 data-[state=active]:to-blue-100/50 data-[state=active]:shadow-sm data-[state=active]:text-blue-700 px-4 py-2 text-sm font-medium transition-all" 
              value="login"
            >
              Iniciar Sesión
            </TabsTrigger>
            <TabsTrigger 
              className="rounded-lg flex-1 data-[state=active]:bg-gradient-to-b data-[state=active]:from-blue-50 data-[state=active]:to-blue-100/50 data-[state=active]:shadow-sm data-[state=active]:text-blue-700 px-4 py-2 text-sm font-medium transition-all" 
              value="register"
            >
              Registrarse
            </TabsTrigger>
          </TabsList>
          
          {/* Login Form */}
          <TabsContent value="login">
            <div className="p-6 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-blue-100/50">
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="login-username" className="text-gray-700 font-medium text-sm block mb-2">
                    Usuario o Email
                  </Label>
                  <Input
                    id="login-username"
                    name="username"
                    placeholder="demo o usuario@ejemplo.com"
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
                
                <div className="text-center text-xs text-gray-500 mt-6 bg-blue-50/80 py-3 px-2 rounded-lg border border-blue-100/50 shadow-sm">
                  Prueba con: <span className="font-medium">demo</span> / <span className="font-medium">demo</span>
                  <br />O para acceso admin: <span className="font-medium">billeo_admin</span> / <span className="font-medium">superadmin</span>
                </div>
              </form>
            </div>
          </TabsContent>
          
          {/* Register Form */}
          <TabsContent value="register">
            <div className="p-6 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-blue-100/50">
              <form onSubmit={handleRegisterSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="register-name" className="text-gray-700 font-medium text-sm block mb-2">
                    Nombre completo
                  </Label>
                  <Input
                    id="register-name"
                    name="name"
                    placeholder="Ana García"
                    value={registerFormData.name}
                    onChange={handleRegisterChange}
                    required
                    className="h-10 rounded-lg border-blue-100 bg-white/90 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm w-full transition-all"
                  />
                </div>
                
                <div>
                  <Label htmlFor="register-email" className="text-gray-700 font-medium text-sm block mb-2">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={registerFormData.email}
                    onChange={handleRegisterChange}
                    required
                    className="h-10 rounded-lg border-blue-100 bg-white/90 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm w-full transition-all"
                  />
                </div>
                
                <div>
                  <Label htmlFor="register-username" className="text-gray-700 font-medium text-sm block mb-2">
                    Usuario
                  </Label>
                  <Input
                    id="register-username"
                    name="username"
                    placeholder="minombre"
                    value={registerFormData.username}
                    onChange={handleRegisterChange}
                    required
                    className="h-10 rounded-lg border-blue-100 bg-white/90 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm w-full transition-all"
                  />
                </div>
                
                <div>
                  <Label htmlFor="register-password" className="text-gray-700 font-medium text-sm block mb-2">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      name="password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={registerFormData.password}
                      onChange={handleRegisterChange}
                      required
                      className="h-10 rounded-lg border-blue-100 bg-white/90 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm w-full transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showRegisterPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <Label className="text-gray-700 font-medium text-sm block mb-2">
                    Tipo de negocio
                  </Label>
                  <div className="p-2 bg-blue-50/80 rounded-lg grid grid-cols-2 gap-3 border border-blue-100/50 shadow-sm">
                    <Button
                      type="button"
                      onClick={() => handleBusinessTypeChange("autonomo")}
                      className={`rounded-lg h-auto py-2.5 transition-all duration-200 ${
                        registerFormData.businessType === "autonomo"
                          ? "bg-white shadow-md text-blue-600 border border-blue-200/50"
                          : "bg-transparent text-gray-600 hover:bg-white/50 hover:text-blue-500"
                      }`}
                    >
                      Autónomo
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleBusinessTypeChange("empresa")}
                      className={`rounded-lg h-auto py-2.5 transition-all duration-200 ${
                        registerFormData.businessType === "empresa"
                          ? "bg-white shadow-md text-blue-600 border border-blue-200/50"
                          : "bg-transparent text-gray-600 hover:bg-white/50 hover:text-blue-500"
                      }`}
                    >
                      Empresa
                    </Button>
                  </div>
                </div>
                
                <Button
                  className="w-full shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium px-4 py-2 h-12 rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-4"
                  type="submit"
                  disabled={isPending}
                >
                  {registerMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creando cuenta...
                    </span>
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Decoración adicional */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-blue-400/60">
        © {new Date().getFullYear()} Billeo · Tu gestión financiera
      </div>
    </div>
  );
}