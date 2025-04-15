import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Box } from "@/components/ui/box";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendTestEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor, introduce un correo electrónico válido",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Correo enviado",
          description: "El correo de prueba ha sido enviado correctamente",
        });
        // Si hay una URL de vista previa, mostrarla
        if (data.previewUrl) {
          window.open(data.previewUrl, "_blank");
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo enviar el correo de prueba",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al enviar el correo de prueba:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar el correo de prueba",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box className="container py-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Prueba de Correo Electrónico</CardTitle>
          <CardDescription>
            Envía un correo electrónico de prueba para verificar el formato y la configuración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email">Correo Electrónico</label>
              <Input
                id="email"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSendTestEmail} 
            disabled={isSending}
            className="w-full"
          >
            {isSending ? "Enviando..." : "Enviar Correo de Prueba"}
          </Button>
        </CardFooter>
      </Card>
      <Toaster />
    </Box>
  );
}