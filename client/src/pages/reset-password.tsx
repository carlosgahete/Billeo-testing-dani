import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import billeoLogo from '../assets/billeo-logo.png';

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState("");

  // Verificar validez del token
  const tokenQuery = useQuery({
    queryKey: ['/api/reset-password', token],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/reset-password/${token}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Token inválido o expirado");
      }
      return await res.json();
    },
    enabled: !!token,
    retry: false
  });

  // Mutation para resetear la contraseña
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string, newPassword: string }) => {
      const res = await apiRequest("POST", "/api/reset-password", { token, newPassword });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al resetear contraseña");
      }
      return await res.json();
    },
    onSuccess: () => {
      setResetComplete(true);
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al resetear tu contraseña",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    
    resetPasswordMutation.mutate({ token, newPassword });
  };

  // Mostrar error si el token es inválido
  if (tokenQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-secondary-50 p-4">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader className="space-y-3">
              <div className="flex justify-center">
                <img 
                  src={billeoLogo} 
                  alt="Billeo Logo" 
                  className="h-8"
                  loading="eager"
                />
              </div>
              <CardTitle className="text-xl text-center">Enlace inválido</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  El enlace para restablecer la contraseña es inválido o ha expirado. Por favor, solicita un nuevo enlace.
                </AlertDescription>
              </Alert>
              <div className="flex justify-center mt-4">
                <Link to="/forgot-password">
                  <Button>Solicitar nuevo enlace</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Estado de carga
  if (tokenQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-secondary-50 p-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
          <p className="mt-4">Verificando enlace...</p>
        </div>
      </div>
    );
  }

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
            <CardTitle className="text-xl text-center">Crear nueva contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingresa tu nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!resetComplete ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nueva contraseña</Label>
                    <Input
                      id="new-password"
                      name="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="flex justify-center mt-4">
                    <Button
                      className="w-2/3"
                      type="submit"
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? "Actualizando..." : "Cambiar contraseña"}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <p className="text-emerald-600 font-medium text-lg">
                  ¡Contraseña actualizada exitosamente!
                </p>
                <p>
                  Ya puedes iniciar sesión con tu nueva contraseña.
                </p>
                <div className="mt-4">
                  <Link to="/auth">
                    <Button>Iniciar sesión</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
          {!resetComplete && (
            <CardFooter className="flex justify-center">
              <Link to="/auth">
                <Button variant="link" className="mt-2">
                  Volver a inicio de sesión
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}