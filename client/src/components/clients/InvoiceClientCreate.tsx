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
  
  // Mutación para crear cliente
  const mutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      try {
        const response = await apiRequest("POST", "/api/clients", data);
        const jsonData = await response.json();
        return jsonData;
      } catch (error) {
        console.error("Error creando cliente:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Mostrar toast de éxito
      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente"
      });
      
      // Actualizar la lista de clientes
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Limpiar y cerrar formulario
      form.reset();
      
      // Primero cerrar el formulario, luego seleccionar el cliente
      console.log("Cliente creado exitosamente con ID:", data.id);
      
      // Disparar evento para prevenir envío automático
      window.dispatchEvent(new CustomEvent('prevent-invoice-submit'));
      
      // Cerrar primero el formulario
      onClose();
      
      // Después de un tiempo, seleccionar el cliente (pero sin que se envíe el formulario)
      setTimeout(() => {
        console.log("Seleccionando nuevo cliente:", data.id);
        onClientSelect(data.id);
        
        // Notificar que el cliente ha sido seleccionado pero que no se debe enviar el formulario
        window.dispatchEvent(new CustomEvent('client-selected-do-not-submit'));
      }, 500);
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <Button variant="outline" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}