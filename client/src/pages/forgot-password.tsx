import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import billeoLogo from '../assets/billeo-logo.png';

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [securityEmail, setSecurityEmail] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<string>("email");

  // Consulta para obtener la pregunta de seguridad
  const securityQuestionQuery = useQuery({
    queryKey: ['/api/security-question', securityEmail],
    queryFn: async () => {
      if (!securityEmail) return null;
      const res = await apiRequest("GET", `/api/security-question?email=${encodeURIComponent(securityEmail)}`);
      if (res.status === 404) {
        return { notFound: true };
      }
      return await res.json();
    },
    enabled: showSecurityAnswer && !!securityEmail,
  });

  // Mutación para enviar email de recuperación
  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/forgot-password", { email });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Solicitud de recuperación exitosa", data);
      setSubmitted(true);
      
      // Guardar URL de vista previa si está disponible (modo desarrollo)
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
      }
      
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

  // Mutación para verificar respuesta de seguridad
  const verifySecurityAnswerMutation = useMutation({
    mutationFn: async (data: { email: string; answer: string }) => {
      const res = await apiRequest("POST", "/api/security-question/check", data);
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.valid && data.token) {
        toast({
          title: "Respuesta correcta",
          description: "Redirigiendo a la página de restablecimiento de contraseña",
        });
        navigate(`/reset-password/${data.token}`);
      } else {
        toast({
          title: "Error",
          description: "La respuesta es incorrecta o ha ocurrido un error",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al verificar la respuesta",
        variant: "destructive",
      });
    },
  });

  // Manejar el envío del formulario de email
  const handleSubmitEmail = (e: React.FormEvent) => {
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

  // Manejar el envío del formulario de seguridad
  const handleSubmitSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showSecurityAnswer) {
      // Mostrar el campo de respuesta si la pregunta existe
      setShowSecurityAnswer(true);
      return;
    }
    
    if (!securityEmail || !securityAnswer) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    
    verifySecurityAnswerMutation.mutate({
      email: securityEmail,
      answer: securityAnswer
    });
  };

  // Limpiar estado cuando se cambia de pestaña
  useEffect(() => {
    setSubmitted(false);
    setEmail("");
    setSecurityEmail("");
    setSecurityAnswer("");
    setShowSecurityAnswer(false);
    setPreviewUrl(null);
  }, [recoveryMethod]);

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
            <CardTitle className="text-xl text-center">Recuperación de contraseña</CardTitle>
            <CardDescription className="text-center">
              Selecciona un método para recuperar tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full" onValueChange={setRecoveryMethod}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email">Por email</TabsTrigger>
                <TabsTrigger value="security">Pregunta de seguridad</TabsTrigger>
              </TabsList>
              
              {/* Recuperación por email */}
              <TabsContent value="email">
                {!submitted ? (
                  <form onSubmit={handleSubmitEmail}>
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
                    {previewUrl && (
                      <div className="mt-4 p-3 border rounded border-blue-200 bg-blue-50">
                        <p className="text-sm font-medium mb-2">Vista previa del email (solo en desarrollo):</p>
                        <a 
                          href={previewUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm inline-block"
                        >
                          Abrir vista previa
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              {/* Recuperación por pregunta de seguridad */}
              <TabsContent value="security">
                <form onSubmit={handleSubmitSecurity}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="securityEmail">Email</Label>
                      <Input
                        id="securityEmail"
                        name="securityEmail"
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={securityEmail}
                        onChange={(e) => {
                          setSecurityEmail(e.target.value);
                          setShowSecurityAnswer(false);
                        }}
                        disabled={showSecurityAnswer && securityQuestionQuery.isSuccess}
                        required
                      />
                    </div>
                    
                    {showSecurityAnswer && (
                      <div className="mt-4">
                        {securityQuestionQuery.isLoading && (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        )}
                        
                        {securityQuestionQuery.isError && (
                          <div className="text-center text-red-500 py-2">
                            Error al obtener la pregunta de seguridad
                          </div>
                        )}
                        
                        {securityQuestionQuery.isSuccess && securityQuestionQuery.data?.notFound && (
                          <div className="text-center text-amber-600 py-2">
                            Este email no tiene configurada una pregunta de seguridad o no existe
                          </div>
                        )}
                        
                        {securityQuestionQuery.isSuccess && securityQuestionQuery.data?.question && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="securityQuestion">Pregunta de seguridad:</Label>
                              <p className="text-sm font-medium p-2 bg-muted rounded">
                                {securityQuestionQuery.data.question}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="securityAnswer">Respuesta</Label>
                              <Input
                                id="securityAnswer"
                                name="securityAnswer"
                                type="text"
                                value={securityAnswer}
                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-center mt-4">
                      <Button
                        className="w-2/3"
                        type="submit"
                        disabled={
                          verifySecurityAnswerMutation.isPending ||
                          securityQuestionQuery.isLoading ||
                          (showSecurityAnswer && (!securityQuestionQuery.data?.question || !!securityQuestionQuery.data?.notFound))
                        }
                      >
                        {verifySecurityAnswerMutation.isPending 
                          ? "Verificando..." 
                          : showSecurityAnswer 
                            ? "Verificar respuesta" 
                            : "Buscar pregunta"}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
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