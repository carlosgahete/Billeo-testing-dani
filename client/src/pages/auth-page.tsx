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
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* Left side - Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary to-primary-800 text-white p-8 flex-col justify-center items-center">
        <div className="max-w-lg mx-auto">
          <div className="mb-8 text-center">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-16 inline-block mb-4"
            />
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Billeo</h1>
            <p className="text-xl opacity-90 font-light">La solución financiera para autónomos</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Gestión simplificada</h3>
                <p className="opacity-80">Facturas y presupuestos con un solo clic</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Control total</h3>
                <p className="opacity-80">Visualiza tus impuestos y obligaciones fiscales</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white bg-opacity-20 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Escaneo inteligente</h3>
                <p className="opacity-80">Reconocimiento automático de facturas y gastos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Authentication form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-4 md:p-8 overflow-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="md:hidden flex justify-center mb-6">
            <img 
              src={billeoLogo} 
              alt="Billeo Logo" 
              className="h-14"
            />
          </div>
          
          <Card className="w-full border-0 shadow-lg">
            <CardHeader className="pb-2">
              <h2 className="text-2xl font-medium text-center text-gray-800">
                {activeTab === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </h2>
              <p className="text-gray-500 text-center mt-1 text-sm">
                {activeTab === "login" 
                  ? "Accede a tu cuenta para gestionar tus finanzas" 
                  : "Regístrate y empieza a simplificar tu gestión"
                }
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 rounded-xl">
                  <TabsTrigger value="login" className="rounded-xl">Iniciar Sesión</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-xl">Registrarse</TabsTrigger>
                </TabsList>
                
                {/* Login Form */}
                <TabsContent value="login">
                  <form onSubmit={handleLoginSubmit}>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="login-username" className="text-gray-700">Usuario</Label>
                        <Input
                          id="login-username"
                          name="username"
                          placeholder="demo"
                          value={loginFormData.username}
                          onChange={handleLoginChange}
                          required
                          className="rounded-xl h-12 px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-gray-700">Contraseña</Label>
                        <Input
                          id="login-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={loginFormData.password}
                          onChange={handleLoginChange}
                          required
                          className="rounded-xl h-12 px-4"
                        />
                      </div>
                      
                      <div className="text-right">
                        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      
                      <Button
                        className="w-full rounded-xl h-12 bg-gradient-to-br from-primary to-primary-800 hover:shadow-md transition-all duration-200"
                        type="submit"
                        disabled={isPending}
                      >
                        {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
                      </Button>
                      
                      <div className="text-center text-sm text-gray-500 mt-2">
                        <p>
                          Cuenta demo: usuario <span className="font-medium">demo</span> / contraseña <span className="font-medium">demo</span>
                        </p>
                      </div>
                    </div>
                  </form>
                </TabsContent>
                
                {/* Register Form */}
                <TabsContent value="register">
                  <form onSubmit={handleRegisterSubmit}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-name" className="text-gray-700">Nombre completo</Label>
                        <Input
                          id="register-name"
                          name="name"
                          placeholder="Ana García"
                          value={registerFormData.name}
                          onChange={handleRegisterChange}
                          required
                          className="rounded-xl h-12 px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-gray-700">Email</Label>
                        <Input
                          id="register-email"
                          name="email"
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          value={registerFormData.email}
                          onChange={handleRegisterChange}
                          required
                          className="rounded-xl h-12 px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-username" className="text-gray-700">Usuario</Label>
                        <Input
                          id="register-username"
                          name="username"
                          placeholder="minombre"
                          value={registerFormData.username}
                          onChange={handleRegisterChange}
                          required
                          className="rounded-xl h-12 px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-gray-700">Contraseña</Label>
                        <Input
                          id="register-password"
                          name="password"
                          type="password"
                          placeholder="••••••••"
                          value={registerFormData.password}
                          onChange={handleRegisterChange}
                          required
                          className="rounded-xl h-12 px-4"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-gray-700">Tipo de negocio</Label>
                        <div className="p-1 bg-gray-100 rounded-xl grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            onClick={() => handleBusinessTypeChange("autonomo")}
                            className={`rounded-lg h-12 ${
                              registerFormData.businessType === "autonomo"
                                ? "bg-white shadow-sm text-primary"
                                : "bg-transparent text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Autónomo
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleBusinessTypeChange("empresa")}
                            className={`rounded-lg h-12 ${
                              registerFormData.businessType === "empresa"
                                ? "bg-white shadow-sm text-primary"
                                : "bg-transparent text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            Empresa
                          </Button>
                        </div>
                      </div>
                      
                      <Button
                        className="w-full rounded-xl h-12 bg-gradient-to-br from-primary to-primary-800 hover:shadow-md transition-all duration-200 mt-6"
                        type="submit"
                        disabled={isPending}
                      >
                        {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}