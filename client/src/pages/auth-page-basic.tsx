import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import billeoLogo from '../assets/billeo-logo.png';

export default function AuthPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Error al iniciar sesión");
      }
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de nuevo"
      });
      
      // Invalidar la sesión actual
      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include"
      });
      
      console.log("Sesión actualizada después del login:", await sessionResponse.json());
      
      // Redirección manual al dashboard
      setTimeout(() => {
        console.log("Redirigiendo a / después del login exitoso");
        window.location.href = "/";
      }, 500);
      
    } catch (error) {
      console.error("Error de inicio de sesión:", error);
      toast({
        title: "Error de inicio de sesión",
        description: "Usuario o contraseña incorrectos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="text-center">
          <img 
            src={billeoLogo} 
            alt="Billeo Logo" 
            className="mx-auto h-14 mb-2" 
          />
          <h2 className="text-2xl font-bold">Iniciar sesión</h2>
          <p className="text-gray-500 text-sm">Accede a tu cuenta de Billeo</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="username"
                name="username"
                placeholder="demo"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="demo"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
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
            
            <div className="text-center text-sm mt-4">
              <p className="text-gray-500">
                Usuario demo: <span className="font-semibold">demo</span> / Contraseña: <span className="font-semibold">demo</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}