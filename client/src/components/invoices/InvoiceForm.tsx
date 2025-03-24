import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, FileText } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import FileUpload from "../common/FileUpload";

// Define schema for line items
const invoiceItemSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor que cero"),
  unitPrice: z.coerce.number().min(0.01, "El precio debe ser mayor que cero"),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo"),
  subtotal: z.coerce.number().optional(),
});

// Define schema for the whole invoice
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio"),
  clientId: z.coerce.number({
    required_error: "El cliente es obligatorio",
  }),
  issueDate: z.string().min(1, "La fecha de emisión es obligatoria"),
  dueDate: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  total: z.coerce.number().min(0),
  status: z.string().min(1, "El estado es obligatorio"),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  items: z.array(invoiceItemSchema).min(1, "Agrega al menos un ítem a la factura"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
}

const InvoiceForm = ({ invoiceId }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [location, navigate] = useLocation();
  
  const isEditMode = !!invoiceId;

  // Fetch clients for dropdown
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Fetch invoice data if in edit mode
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    enabled: isEditMode,
  });

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      clientId: 0,
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      subtotal: 0,
      tax: 0,
      total: 0,
      status: "pending",
      notes: "",
      attachments: [],
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 21,
          subtotal: 0,
        },
      ],
    },
  });

  // Initialize form with invoice data when loaded
  useState(() => {
    if (invoiceData && !invoiceLoading) {
      const { invoice, items } = invoiceData;
      
      form.reset({
        ...invoice,
        issueDate: new Date(invoice.issueDate).toISOString().split("T")[0],
        dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
        items: items.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          subtotal: Number(item.subtotal),
        })),
      });
      
      if (invoice.attachments) {
        setAttachments(invoice.attachments);
      }
    }
  }, [invoiceData, invoiceLoading, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Create or update invoice mutation
  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      if (isEditMode) {
        return apiRequest("PUT", `/api/invoices/${invoiceId}`, {
          invoice: { ...data, attachments },
          items: data.items,
        });
      } else {
        return apiRequest("POST", "/api/invoices", {
          invoice: { ...data, attachments },
          items: data.items,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Factura actualizada" : "Factura creada",
        description: isEditMode
          ? "La factura se ha actualizado correctamente"
          : "La factura se ha creado correctamente",
      });
      navigate("/invoices");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Ha ocurrido un error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Calculate totals when items change
  const calculateTotals = () => {
    const items = form.getValues("items");
    
    // Calculate subtotal for each item
    const updatedItems = items.map(item => {
      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      return {
        ...item,
        subtotal
      };
    });
    
    // Update form with calculated subtotals
    form.setValue("items", updatedItems);
    
    // Calculate invoice totals
    const subtotal = updatedItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const tax = updatedItems.reduce((sum, item) => {
      const itemTax = Number(item.subtotal) * (Number(item.taxRate) / 100);
      return sum + itemTax;
    }, 0);
    const total = subtotal + tax;
    
    form.setValue("subtotal", subtotal);
    form.setValue("tax", tax);
    form.setValue("total", total);
    
    return { subtotal, tax, total };
  };

  const handleSubmit = (data: InvoiceFormValues) => {
    // Recalculate totals before submission
    const { subtotal, tax, total } = calculateTotals();
    data.subtotal = subtotal;
    data.tax = tax;
    data.total = total;
    
    mutation.mutate(data);
  };

  const handleFileUpload = (path: string) => {
    setAttachments([...attachments, path]);
  };

  if ((isEditMode && invoiceLoading) || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de factura</FormLabel>
                      <FormControl>
                        <Input placeholder="F-2023-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        defaultValue={
                          field.value ? field.value.toString() : undefined
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client: any) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de emisión</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de vencimiento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="paid">Pagada</SelectItem>
                          <SelectItem value="overdue">Vencida</SelectItem>
                          <SelectItem value="canceled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Información adicional para la factura..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Archivos adjuntos</FormLabel>
                  <div className="mt-2">
                    <FileUpload onUpload={handleFileUpload} />
                    
                    <div className="mt-3 space-y-2">
                      {attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span className="flex-1 truncate">
                            {attachment.split('/').pop()}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newAttachments = [...attachments];
                              newAttachments.splice(index, 1);
                              setAttachments(newAttachments);
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium mb-4">Detalles de la factura</h3>
            
            <div className="mb-4 space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-4 items-start"
                >
                  <div className="col-span-12 md:col-span-5">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Descripción
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Descripción" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Cantidad
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Cant."
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                                calculateTotals();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Precio
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Precio"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                                calculateTotals();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.taxRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            IVA %
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="IVA %"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                                calculateTotals();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.subtotal`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Subtotal
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              disabled
                              value={
                                form.getValues(`items.${index}.quantity`) *
                                form.getValues(`items.${index}.unitPrice`)
                              }
                              placeholder="Subtotal"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        remove(index);
                        calculateTotals();
                      }}
                      disabled={fields.length === 1}
                      className="h-10 w-10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar ítem</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                  taxRate: 21,
                  subtotal: 0,
                });
              }}
              className="mb-6"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir ítem
            </Button>

            <div className="border-t pt-4 flex flex-col items-end space-y-2">
              <div className="flex justify-between w-full md:w-80">
                <span className="text-sm text-muted-foreground">Subtotal:</span>
                <span className="font-medium">
                  {form.getValues("subtotal").toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between w-full md:w-80">
                <span className="text-sm text-muted-foreground">IVA:</span>
                <span className="font-medium">
                  {form.getValues("tax").toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between w-full md:w-80 text-lg font-bold">
                <span>Total:</span>
                <span>{form.getValues("total").toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/invoices")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar factura" : "Crear factura"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default InvoiceForm;
