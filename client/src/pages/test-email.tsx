import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

// Definir tipo de correo para tipado
interface EmailType {
  id: string;
  name: string;
  description?: string;
}

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [emailType, setEmailType] = useState("general");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [emailTypes, setEmailTypes] = useState<EmailType[]>([]);
  const { toast } = useToast();

  // Cargar tipos de correos disponibles
  useEffect(() => {
    const fetchEmailTypes = async () => {
      try {
        const response = await fetch("/api/test-email-types");
        const data = await response.json();
        
        if (data.success && data.types) {
          setEmailTypes(data.types);
        } else {
          setEmailTypes([{ id: "general", name: "Correo General" }]);
        }
      } catch (error) {
        console.error("Error al obtener tipos de correos:", error);
        setEmailTypes([{ id: "general", name: "Correo General" }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmailTypes();
  }, []);

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
        body: JSON.stringify({ 
          email,
          type: emailType
        }),
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

  // Obtener descripción del tipo de correo seleccionado
  const getEmailTypeDescription = () => {
    switch (emailType) {
      case 'factura_vencida':
        return "Esta plantilla simula una alerta enviada cuando una factura ha vencido y sigue pendiente de pago.";
      case 'proxima_vencer':
        return "Esta plantilla simula un recordatorio enviado cuando una factura está próxima a vencer en los próximos días.";
      case 'tarea_pendiente':
        return "Esta plantilla simula un recordatorio de una tarea importante que debe completarse próximamente.";
      default:
        return "Una plantilla general para probar la configuración básica del correo electrónico.";
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prueba de Correos Electrónicos</h1>
        <p className="text-gray-500">
          Utiliza esta herramienta para probar el envío de correos electrónicos y verificar su formato y diseño.
        </p>
      </div>
      
      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Información</AlertTitle>
        <AlertDescription>
          Los correos enviados desde esta interfaz son solo para pruebas. Asegúrate de usar una dirección de correo válida donde puedas verificar la recepción.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="send">Enviar prueba</TabsTrigger>
          <TabsTrigger value="about">Acerca de</TabsTrigger>
        </TabsList>
        
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Correo de Prueba</CardTitle>
              <CardDescription>
                Selecciona el tipo de correo y la dirección a la que quieres enviarlo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div>
                  <label htmlFor="email-type" className="block text-sm font-medium mb-2">
                    Tipo de Correo
                  </label>
                  <Select 
                    disabled={isLoading} 
                    value={emailType} 
                    onValueChange={setEmailType}
                  >
                    <SelectTrigger id="email-type">
                      <SelectValue placeholder="Selecciona un tipo de correo" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-2">
                    {getEmailTypeDescription()}
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Correo Electrónico
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    El correo se enviará a esta dirección para su verificación.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                onClick={handleSendTestEmail} 
                disabled={isSending || isLoading}
                className="w-full"
              >
                {isSending ? "Enviando..." : "Enviar Correo de Prueba"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>Acerca de las pruebas de correo</CardTitle>
              <CardDescription>
                Información sobre el sistema de correo electrónico de Billeo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Plantillas disponibles</h3>
                <p className="text-sm text-gray-500">
                  Billeo utiliza diferentes plantillas para enviar notificaciones a los usuarios según el contexto:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li><strong>Correo General</strong> - Mensaje básico para probar la configuración.</li>
                  <li><strong>Factura Vencida</strong> - Alerta cuando una factura ha superado su fecha de vencimiento.</li>
                  <li><strong>Factura Próxima a Vencer</strong> - Recordatorio anticipado de facturas por vencer.</li>
                  <li><strong>Tarea Pendiente</strong> - Aviso de tareas programadas próximas a su fecha límite.</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Diseño responsivo</h3>
                <p className="text-sm text-gray-500">
                  Todas las plantillas de correo están diseñadas para verse correctamente en dispositivos móviles y de escritorio.
                  Utilizamos elementos HTML y CSS compatibles con la mayoría de clientes de correo.
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium">Logo y marca</h3>
                <p className="text-sm text-gray-500">
                  Para garantizar la compatibilidad con todos los clientes de correo, utilizamos un emoji (📊) en lugar de una imagen
                  para el logo de Billeo, lo que evita problemas con filtros de seguridad o bloqueo de imágenes.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Toaster />
    </div>
  );
}