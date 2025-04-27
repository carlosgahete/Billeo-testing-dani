import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import billeoLogo from '../assets/billeo-logo.png';
import { Eye, EyeOff, User, Mail, Lock, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
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
  
  // Registration form state
  const [registerFormData, setRegisterFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    businessType: "freelance",
  });
  
  // Password visibility state
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Handle login form changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Handle registration form changes
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterFormData((prev) => ({ ...prev, [name]: value }));
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
  
  // Handle registration form submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Intentando registrar usuario:", registerFormData);
    
    try {
      // Mostrar mensaje informativo
      toast({
        title: "Creando cuenta...",
        description: "Configurando tu nuevo perfil",
      });
      
      // Usar el método de registro
      registerMutation.mutate(registerFormData);
    } catch (error) {
      console.error("Error al registrar:", error);
      toast({
        title: "Error de registro",
        description: "Hubo un problema al crear la cuenta",
        variant: "destructive",
      });
    }
  };

  const isLoginPending = loginMutation.isPending;
  const isRegisterPending = registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch">
      {/* Hero Section - Right Side on Desktop */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12 flex-col justify-between">
        <div className="mb-auto">
          <img 
            src={billeoLogo} 
            alt="Billeo Logo" 
            className="h-10 mb-8 invert"
            loading="eager"
          />
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">Gestión financiera para profesionales</h1>
          <p className="text-lg text-blue-100 max-w-md">
            Billeo simplifica la gestión financiera para autónomos y pequeñas empresas en España.
          </p>
          <div className="space-y-4 pt-4">
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Facturación y presupuestos</h3>
                <p className="text-sm text-blue-100">Crea facturas y presupuestos profesionales en segundos</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Gestión de impuestos</h3>
                <p className="text-sm text-blue-100">Calcula automáticamente IVA e IRPF para tus declaraciones</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Analítica financiera</h3>
                <p className="text-sm text-blue-100">Visualiza y entiende tu situación financiera con claridad</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-12 text-sm text-blue-100">
          <p>© {new Date().getFullYear()} Billeo • Todos los derechos reservados</p>
        </div>
      </div>
      
      {/* Form Section - Left Side on Desktop */}
      <div className="flex flex-col justify-center p-6 md:p-12 md:w-1/2 bg-gray-50">
        <div className="w-full max-w-md mx-auto">
          <div className="md:hidden mb-8">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-8 mb-4"
              loading="eager"
            />
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Billeo</h1>
            <p className="text-gray-600">Tu plataforma de gestión financiera</p>
          </div>
          
          <div className="bg-white shadow-md rounded-xl p-6 md:p-8">
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-6">
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="login-username" className="text-gray-700 font-medium text-sm block mb-2">
                        Usuario o Email
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-username"
                          name="username"
                          placeholder="usuario o correo@ejemplo.com"
                          value={loginFormData.username}
                          onChange={handleLoginChange}
                          required
                          className="pl-10 h-11"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
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
                          className="pl-10 pr-10 h-11"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  </div>
                  
                  <Button
                    className="w-full h-11"
                    type="submit"
                    disabled={isLoginPending}
                  >
                    {isLoginPending ? (
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
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-6">
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="register-name" className="text-gray-700 font-medium text-sm block mb-2">
                        Nombre completo
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-name"
                          name="name"
                          placeholder="Nombre y apellidos"
                          value={registerFormData.name}
                          onChange={handleRegisterChange}
                          required
                          className="pl-10 h-11"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="register-email" className="text-gray-700 font-medium text-sm block mb-2">
                        Email
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={registerFormData.email}
                          onChange={handleRegisterChange}
                          required
                          className="pl-10 h-11"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="register-username" className="text-gray-700 font-medium text-sm block mb-2">
                        Nombre de usuario
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-username"
                          name="username"
                          placeholder="username"
                          value={registerFormData.username}
                          onChange={handleRegisterChange}
                          required
                          className="pl-10 h-11"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="register-business-type" className="text-gray-700 font-medium text-sm block mb-2">
                        Tipo de actividad
                      </Label>
                      <div className="relative">
                        <select
                          id="register-business-type"
                          name="businessType"
                          value={registerFormData.businessType}
                          onChange={handleRegisterChange}
                          className="pl-10 h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="freelance">Autónomo / Freelance</option>
                          <option value="small_business">Pequeña Empresa</option>
                          <option value="agency">Agencia</option>
                          <option value="other">Otro</option>
                        </select>
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
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
                          className="pl-10 pr-10 h-11"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  </div>
                  
                  <Button
                    className="w-full h-11"
                    type="submit"
                    disabled={isRegisterPending}
                  >
                    {isRegisterPending ? (
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
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="md:hidden mt-6 text-center text-xs text-gray-500">
            <p>© {new Date().getFullYear()} Billeo • Todos los derechos reservados</p>
          </div>
        </div>
      </div>
    </div>
  );
}