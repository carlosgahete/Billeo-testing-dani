import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: any) => void;
  clientToEdit?: any; // Cliente a editar (opcional)
}

export function ClientForm({ open, onOpenChange, onClientCreated, clientToEdit }: ClientFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!clientToEdit;

  // Configuración del formulario
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: clientToEdit?.name || "",
      taxId: clientToEdit?.taxId || "",
      email: clientToEdit?.email || "",
      phone: clientToEdit?.phone || "",
      address: clientToEdit?.address || "",
      city: clientToEdit?.city || "",
      postalCode: clientToEdit?.postalCode || "",
      country: clientToEdit?.country || "España",
      notes: clientToEdit?.notes || "",
    },
  });
  
  // Efecto para actualizar el formulario cuando cambia el cliente a editar
  useEffect(() => {
    if (clientToEdit) {
      form.reset({
        name: clientToEdit.name || "",
        taxId: clientToEdit.taxId || "",
        email: clientToEdit.email || "",
        phone: clientToEdit.phone || "",
        address: clientToEdit.address || "",
        city: clientToEdit.city || "",
        postalCode: clientToEdit.postalCode || "",
        country: clientToEdit.country || "España",
        notes: clientToEdit.notes || "",
      });
    }
  }, [clientToEdit]);

  // Mutación para crear o actualizar un cliente
  const mutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (isEditMode) {
        return apiRequest("PUT", `/api/clients/${clientToEdit.id}`, data);
      } else {
        return apiRequest("POST", "/api/clients", data);
      }
    },
    onSuccess: (data) => {
      toast({
        title: isEditMode ? "Cliente actualizado" : "Cliente creado",
        description: isEditMode 
          ? "El cliente se ha actualizado correctamente" 
          : "El cliente se ha creado correctamente",
      });
      
      // Primero notificamos al componente padre sobre el cliente creado
      onClientCreated(data);
      
      // Después cerramos el modal y limpiamos el formulario
      onOpenChange(false);
      form.reset();
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
    setIsSubmitting(true);
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto mobile-client-form">
        <DialogHeader className="sticky top-0 bg-white z-10 pb-2">
          <DialogTitle>{isEditMode ? "Editar cliente" : "Añadir nuevo cliente"}</DialogTitle>
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
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar cliente" : "Guardar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}