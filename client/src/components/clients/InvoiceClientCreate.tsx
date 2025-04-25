import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validación para el formulario de cliente
const clientSchema = z.object({
  name: z.string().min(2, { message: "El nombre es obligatorio" }),
  taxId: z.string().min(1, { message: "El NIF/CIF es obligatorio" }),
  email: z.string().email({ message: "Email inválido" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().min(1, { message: "La dirección es obligatoria" }),
  city: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface InvoiceClientCreateProps {
  open: boolean;
  onClose: () => void;
  onClientSelect: (clientId: number) => void;
}

export function InvoiceClientCreate({ open, onClose, onClientSelect }: InvoiceClientCreateProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  // Formulario React Hook Form
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      taxId: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "España",
      notes: "",
    }
  });
  
  // Mutación para crear cliente implementada con fetch directamente para evitar interferencias
  const mutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      console.log("🔄 Iniciando creación de cliente con fetch directo (sin apiRequest)");
      try {
        // Usamos fetch directamente en lugar de apiRequest para tener más control
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          credentials: 'same-origin' // Importante para mantener la sesión
        });
        
        if (!response.ok) {
          throw new Error(`Error en la creación del cliente: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        console.log("✅ Cliente creado correctamente:", jsonData);
        return jsonData;
      } catch (error) {
        console.error("❌ Error en la creación del cliente:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Mostrar toast de éxito
      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente y ha sido seleccionado"
      });
      
      // Prevenir cualquier envío automático con evento global
      window.dispatchEvent(new CustomEvent('block-all-submissions', { 
        detail: { duration: 3000, source: 'client-create' }
      }));
      
      // Actualizar la lista de clientes
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Limpiar y cerrar formulario
      form.reset();
      
      // Cerrar primero el formulario antes de hacer nada más
      onClose();
      
      // Esperar a que todo se estabilice antes de seleccionar al cliente
      setTimeout(() => {
        console.log("🔍 Seleccionando cliente con ID:", data.id);
        onClientSelect(data.id);
        
        // Enviar evento para notificar selección pero evitar envío
        window.dispatchEvent(new CustomEvent('client-selected-do-not-submit'));
        window.dispatchEvent(new CustomEvent('prevent-invoice-submit'));
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Ha ocurrido un error: ${error.message}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const onSubmit = (data: ClientFormValues) => {
    // Prevenir múltiples envíos
    if (isSubmitting) return;
    
    // Marcar como en proceso de envío
    setIsSubmitting(true);
    
    console.log("🔄 Enviando datos del nuevo cliente (formulario independiente)");
    
    // Realizar la mutación
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) onClose();
    }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
          <DialogTitle>Crear nuevo cliente para la factura</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={(e) => {
            // Detener explícitamente la propagación de eventos
            e.stopPropagation();
            
            // Ahora procesamos el formulario con react-hook-form
            form.handleSubmit(onSubmit)(e);
            
            // Esa fue una doble prevención por si acaso
            return false;
          }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIF/CIF *</FormLabel>
                    <FormControl>
                      <Input placeholder="B12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="cliente@ejemplo.com" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+34 600 000 000" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección *</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, piso..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="28001" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Madrid" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="España" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={(e) => {
                // Prevenir cualquier propagación para evitar que afecte al formulario principal
                e.stopPropagation();
                onClose();
              }}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                disabled={isSubmitting}
                onClick={(e) => {
                  // Prevenir cualquier propagación
                  e.stopPropagation();
                  e.preventDefault();
                  
                  // En lugar de enviar el formulario (que podría causar efectos secundarios),
                  // procesamos el formulario manualmente
                  console.log("🔄 Procesando formulario de cliente mediante botón (no submit)");
                  
                  // Verificar validez del formulario
                  form.trigger().then(isValid => {
                    if (isValid) {
                      // Obtener los datos validados
                      const formData = form.getValues();
                      
                      // Ejecutar la mutación directamente
                      mutation.mutate(formData);
                    } else {
                      console.log("❌ Formulario de cliente con errores, no se envía");
                    }
                  });
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? "Guardando..." : "Guardar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}