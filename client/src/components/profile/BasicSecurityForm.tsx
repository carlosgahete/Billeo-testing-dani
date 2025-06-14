import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const securityQuestionSchema = z.object({
  question: z.string().min(1, "Debes seleccionar una pregunta de seguridad"),
  answer: z.string().min(3, "La respuesta debe tener al menos 3 caracteres"),
});

type SecurityQuestionFormData = z.infer<typeof securityQuestionSchema>;

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

export function BasicSecurityForm() {
  const { toast } = useToast();
  const [customQuestion, setCustomQuestion] = useState(false);
  
  const form = useForm<SecurityQuestionFormData>({
    resolver: zodResolver(securityQuestionSchema),
    defaultValues: {
      question: "",
      answer: "",
    },
  });

  const securityQuestionMutation = useMutation<any, Error, SecurityQuestionFormData>({
    mutationFn: async (data: SecurityQuestionFormData) => {
      const response = await apiRequest("POST", "/api/security-question/set", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pregunta de seguridad actualizada",
        description: "Tu pregunta de seguridad ha sido configurada correctamente.",
      });
      form.reset();
    },
    onError: (error) => {
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">
            Configurar pregunta de seguridad
          </CardTitle>
        </div>
        <CardDescription>
          Configura una pregunta y respuesta de seguridad para recuperar tu cuenta en caso de olvidar tu contraseña.
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
                    Respuesta
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
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={securityQuestionMutation.isPending}
                className="w-full"
              >
                {securityQuestionMutation.isPending 
                  ? "Guardando..." 
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