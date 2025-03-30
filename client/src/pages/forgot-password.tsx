import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import billeoLogo from '../assets/billeo-logo.png';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Solicitud de recuperación exitosa", data);
      setSubmitted(true);
      toast({
        title: "Email enviado",
        description: "Si el email está registrado, recibirás instrucciones para restablecer tu contraseña",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al procesar tu solicitud",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor, introduce tu email",
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate(email);
  };

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
            <CardTitle className="text-xl text-center">Recuperación de contraseña</CardTitle>
            <CardDescription className="text-center">
              Introduce tu email para recibir instrucciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!submitted ? (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="usuario@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-center mt-4">
                    <Button
                      className="w-2/3"
                      type="submit"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar instrucciones"}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="py-4 text-center space-y-4">
                <p className="text-emerald-600 font-medium">
                  ¡Solicitud enviada!
                </p>
                <p>
                  Si el email existe en nuestra base de datos, recibirás instrucciones para restablecer tu contraseña.
                </p>
                {/* En desarrollo, mostrar el token para pruebas */}
                {process.env.NODE_ENV === 'development' && forgotPasswordMutation.data?.token && (
                  <div className="mt-4 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    <p className="font-mono break-all">
                      <span className="font-semibold">Token:</span> {forgotPasswordMutation.data.token}
                    </p>
                    <p className="mt-2 text-orange-600 text-xs">
                      (Solo visible en desarrollo)
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link to="/auth">
              <Button variant="link" className="mt-2">
                Volver a inicio de sesión
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}