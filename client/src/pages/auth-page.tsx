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
        if (user.role === 'admin') {
          navigate("/admin/select-user");
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
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Contenedor principal centrado - Estilo Apple */}
      <div className="w-full max-w-5xl mx-auto my-auto flex flex-col md:flex-row items-center md:items-stretch shadow-xl rounded-3xl overflow-hidden bg-white">
        {/* Lado izquierdo - Logo y branding */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-blue-50 to-blue-100 p-6 md:p-10 flex flex-col justify-center">
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center md:text-left">
              <img 
                src={billeoLogo} 
                alt="Billeo Logo" 
                className="h-10 md:h-12 mb-6 inline-block"
              />
              <h1 className="text-3xl font-medium text-gray-900 mb-3">Billeo</h1>
              <p className="text-gray-600 text-lg font-light">La gestión financiera para autónomos, simplificada.</p>
            </div>
            
            <div className="space-y-6 hidden md:block">
              <div className="flex items-center bg-white/60 p-4 rounded-xl backdrop-blur-sm shadow-sm">
                <div className="bg-blue-100 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900">Gestión simplificada</h3>
                  <p className="text-sm text-gray-600">Facturas y presupuestos con un solo clic</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Lado derecho - Formulario de autenticación */}
        <div className="w-full md:w-1/2 flex flex-col justify-center p-6 md:p-10">
          <div className="w-full max-w-md mx-auto">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl flex space-x-1 w-fit">
                <TabsTrigger 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 px-4 py-2 text-sm font-medium" 
                  value="login"
                >
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 px-4 py-2 text-sm font-medium" 
                  value="register"
                >
                  Registrarse
                </TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="login-username" className="text-gray-700 font-medium text-sm block mb-2">
                      Usuario
                    </Label>
                    <Input
                      id="login-username"
                      name="username"
                      placeholder="demo"
                      value={loginFormData.username}
                      onChange={handleLoginChange}
                      required
                      className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm w-full"
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
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginFormData.password}
                      onChange={handleLoginChange}
                      required
                      className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm w-full"
                    />
                  </div>
                  
                  <Button
                    className="w-full shadow-sm bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-4 py-2 h-10 rounded-lg transition-all"
                    type="submit"
                    disabled={isPending}
                  >
                    {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
                  </Button>
                  
                  <div className="text-center text-xs text-gray-500 mt-6 bg-gray-50 py-2 rounded-lg">
                    Prueba con: <span className="font-medium">demo</span> / <span className="font-medium">demo</span>
                  </div>
                </form>
              </TabsContent>
              
              {/* Register Form */}
              <TabsContent value="register">
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
                      className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm w-full"
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
                      className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm w-full"
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
                      className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="register-password" className="text-gray-700 font-medium text-sm block mb-2">
                      Contraseña
                    </Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={registerFormData.password}
                      onChange={handleRegisterChange}
                      required
                      className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm w-full"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-700 font-medium text-sm block mb-2">
                      Tipo de negocio
                    </Label>
                    <div className="p-1 bg-gray-100 rounded-lg grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => handleBusinessTypeChange("autonomo")}
                        className={`rounded-lg h-auto py-2 ${
                          registerFormData.businessType === "autonomo"
                            ? "bg-white shadow-sm text-blue-600"
                            : "bg-transparent text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Autónomo
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleBusinessTypeChange("empresa")}
                        className={`rounded-lg h-auto py-2 ${
                          registerFormData.businessType === "empresa"
                            ? "bg-white shadow-sm text-blue-600"
                            : "bg-transparent text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        Empresa
                      </Button>
                    </div>
                  </div>
                  
                  <Button
                    className="w-full shadow-sm bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-4 py-2 h-10 rounded-lg transition-all mt-4"
                    type="submit"
                    disabled={isPending}
                  >
                    {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}