import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, InfoIcon, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const securityQuestionSchema = z.object({
  question: z.string().min(1, "Debes seleccionar una pregunta de seguridad"),
  answer: z.string().min(3, "La respuesta debe tener al menos 3 caracteres"),
});

type SecurityQuestionFormData = z.infer<typeof securityQuestionSchema>;

// Lista de preguntas de seguridad predefinidas
const securityQuestions = [
  "¿Cuál es el nombre de tu primera mascota?",
  "¿En qué ciudad naciste?",
  "¿Cuál es el nombre de tu escuela primaria?",
  "¿Cuál es el segundo nombre de tu madre?",
  "¿Cuál es el modelo de tu primer coche?",
  "¿Cuál es tu película favorita de la infancia?",
  "¿Cuál es el nombre de tu mejor amigo/a de la infancia?",
  "¿Cuál es tu comida favorita?",
  "¿Cuál es el nombre de tu profesor favorito?",
  "¿Cuál es tu lugar de vacaciones favorito?",
];

export function SecurityQuestionForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [customQuestion, setCustomQuestion] = useState(false);
  const [isChangingQuestion, setIsChangingQuestion] = useState(false);

  // Consultar la pregunta de seguridad actual
  const { data: currentSecurityQuestion, isLoading, error, isError } = useQuery({
    queryKey: ["/api/security-question/current"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/security-question/current", undefined);
        return response.json();
      } catch (err) {
        // Si el error es 404, significa que no hay pregunta configurada
        console.log("Error al obtener pregunta de seguridad:", err);
        return { question: null };
      }
    },
    retry: false, // No reintentamos si falla
    enabled: !!user
  });

  const form = useForm<SecurityQuestionFormData>({
    resolver: zodResolver(securityQuestionSchema),
    defaultValues: {
      question: "",
      answer: "",
    },
  });

  // Actualizar el formulario cuando se carga la pregunta actual
  useEffect(() => {
    if (currentSecurityQuestion?.question && !isChangingQuestion) {
      // Si la pregunta actual no está en nuestra lista, considerarla personalizada
      const isCustom = !securityQuestions.includes(currentSecurityQuestion.question);
      setCustomQuestion(isCustom);
      form.setValue("question", currentSecurityQuestion.question);
    }
  }, [currentSecurityQuestion, form, isChangingQuestion]);

  const securityQuestionMutation = useMutation({
    mutationFn: async (data: SecurityQuestionFormData) => {
      const response = await apiRequest("POST", "/api/security-question/set", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pregunta de seguridad actualizada",
        description: "Tu pregunta de seguridad ha sido configurada correctamente.",
      });
      // Reiniciar el estado del formulario
      setIsChangingQuestion(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la pregunta de seguridad",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SecurityQuestionFormData) => {
    securityQuestionMutation.mutate(data);
  };

  const handleResetForm = () => {
    setIsChangingQuestion(true);
    form.reset({ question: "", answer: "" });
    setCustomQuestion(false);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex justify-center items-center py-10">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Si hay una pregunta configurada y no estamos en modo cambio
  if (currentSecurityQuestion?.question && currentSecurityQuestion.question !== null && !isChangingQuestion) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl">Pregunta de seguridad</CardTitle>
          </div>
          <CardDescription>
            Ya tienes configurada una pregunta de seguridad para recuperar tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-secondary">
              <div className="font-semibold flex items-center gap-2 mb-1">
                <InfoIcon className="h-4 w-4 text-primary" />
                <span>Tu pregunta de seguridad actual</span>
              </div>
              <p className="text-sm italic">"{currentSecurityQuestion.question}"</p>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Cambiar pregunta de seguridad</AlertTitle>
              <AlertDescription>
                Si deseas cambiar tu pregunta de seguridad, necesitarás proporcionar una nueva respuesta.
                La respuesta anterior será reemplazada.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end">
              <Button onClick={handleResetForm}>
                Cambiar pregunta de seguridad
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">
            {currentSecurityQuestion?.question ? "Cambiar pregunta de seguridad" : "Configurar pregunta de seguridad"}
          </CardTitle>
        </div>
        <CardDescription>
          {currentSecurityQuestion?.question 
            ? "Actualiza tu pregunta y respuesta de seguridad para recuperar tu cuenta." 
            : "Configura una pregunta y respuesta de seguridad para recuperar tu cuenta en caso de olvidar tu contraseña."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Importante</AlertTitle>
          <AlertDescription>
            Esta información se utilizará para verificar tu identidad si necesitas recuperar tu contraseña. 
            Asegúrate de recordar la respuesta exacta.
          </AlertDescription>
        </Alert>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pregunta de seguridad</FormLabel>
                  <div className="space-y-4">
                    <Select
                      value={customQuestion ? "custom" : field.value}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          setCustomQuestion(true);
                          field.onChange("");
                        } else {
                          setCustomQuestion(false);
                          field.onChange(value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una pregunta" />
                      </SelectTrigger>
                      <SelectContent>
                        {securityQuestions.map((question) => (
                          <SelectItem key={question} value={question}>
                            {question}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Escribir mi propia pregunta</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {customQuestion && (
                      <div className="pt-2">
                        <Label htmlFor="customQuestion">Tu pregunta personalizada</Label>
                        <Input
                          id="customQuestion"
                          placeholder="Escribe tu pregunta personalizada"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {currentSecurityQuestion?.question ? "Nueva respuesta" : "Respuesta"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tu respuesta"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between">
              {isChangingQuestion && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsChangingQuestion(false)}
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={securityQuestionMutation.isPending}
                className={isChangingQuestion ? "" : "w-full"}
              >
                {securityQuestionMutation.isPending 
                  ? "Guardando..." 
                  : currentSecurityQuestion?.question 
                    ? "Actualizar pregunta de seguridad" 
                    : "Guardar pregunta de seguridad"
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>La respuesta no distingue entre mayúsculas y minúsculas para mayor facilidad al recuperar tu cuenta.</p>
      </CardFooter>
    </Card>
  );
}