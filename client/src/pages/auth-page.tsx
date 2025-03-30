import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    role: "Autonomo", // Default role
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-secondary-50 p-4">
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="space-y-3">
            <div className="flex justify-center">
              <img 
                src={billeoLogo} 
                alt="Billeo Logo" 
                className="h-11"
              />
            </div>
            <CardDescription className="text-center font-medium">
              Menos papeleo, más Billeo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>
              
              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Usuario</Label>
                      <Input
                        id="login-username"
                        name="username"
                        placeholder="demo"
                        value={loginFormData.username}
                        onChange={handleLoginChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Contraseña</Label>
                      <Input
                        id="login-password"
                        name="password"
                        type="password"
                        placeholder="demo"
                        value={loginFormData.password}
                        onChange={handleLoginChange}
                        required
                      />
                    </div>
                    <div className="flex justify-center mt-2">
                      <Button
                        className="w-2/3"
                        type="submit"
                        disabled={isPending}
                      >
                        {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
                      </Button>
                    </div>
                    
                    <div className="text-center mt-3">
                      <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    
                    <div className="text-center text-sm mt-3">
                      <p className="text-neutral-500">
                        Cuenta demo: usuario <span className="font-semibold">demo</span> / contraseña <span className="font-semibold">demo</span>
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
                      <Label htmlFor="register-name">Nombre completo</Label>
                      <Input
                        id="register-name"
                        name="name"
                        placeholder="Ana García"
                        value={registerFormData.name}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={registerFormData.email}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-username">Usuario</Label>
                      <Input
                        id="register-username"
                        name="username"
                        placeholder="minombre"
                        value={registerFormData.username}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Contraseña</Label>
                      <Input
                        id="register-password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={registerFormData.password}
                        onChange={handleRegisterChange}
                        required
                      />
                    </div>
                    <div className="flex justify-center mt-2">
                      <Button
                        className="w-2/3"
                        type="submit"
                        disabled={isPending}
                      >
                        {registerMutation.isPending ? "Creando cuenta..." : "Crear cuenta"}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}