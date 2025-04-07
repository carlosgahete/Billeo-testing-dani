import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import billeoLogo from '../assets/billeo-logo.png';

const LoginPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const { 
    user, 
    isLoading: isAuthLoading, 
    loginMutation,
    registerMutation
  } = useAuth();
  
  // Si el usuario ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (user?.id) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Si es el usuario demo, intentar registrarlo primero
      if (username === "demo" && password === "demo") {
        try {
          // Intentar registrar un usuario demo
          await registerMutation.mutateAsync({
            name: "Usuario Demo", 
            username: "demo", 
            password: "demo",
            email: "demo@example.com",
            role: "autonomo"
          });
          console.log("Demo user registered successfully");
        } catch (error) {
          // Ignorar error si el usuario ya existe
          console.log("Demo user already exists or couldn't be created:", error);
        }
      }

      // Intentar iniciar sesión usando el hook de auth
      await loginMutation.mutateAsync({ 
        username, 
        password 
      });
      
      // loginMutation ya maneja el éxito y el error con toast
      // y también actualiza el cache de autenticación
      
      // Redirigir al dashboard (esto debería ocurrir automáticamente 
      // cuando useEffect detecte que user?.id existe)
      navigate("/");
    } catch (error) {
      // El error ya es manejado por loginMutation.onError
      console.error("Error de inicio de sesión:", error);
    }
  };

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
              disabled={loginMutation.isPending || isAuthLoading}
            >
              {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
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