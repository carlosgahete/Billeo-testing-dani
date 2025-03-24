import { useState, useEffect } from "react";
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
import { Trash2, Plus, FileText, Minus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import FileUpload from "../common/FileUpload";
import { ClientForm } from "../clients/ClientForm";

// Define schema for additional tax
const additionalTaxSchema = z.object({
  name: z.string().min(1, "El nombre del impuesto es obligatorio"),
  amount: z.coerce.number(), // Permitimos valores negativos para representar retenciones (como el IRPF)
  isPercentage: z.boolean().default(false) // Indica si es un porcentaje o un valor fijo
});

// Define schema for line items
const invoiceItemSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor que cero"),
  unitPrice: z.coerce.number().min(0.01, "El precio debe ser mayor que cero"),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo"),
  subtotal: z.coerce.number().min(0).optional(),
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
  additionalTaxes: z.array(additionalTaxSchema).optional().default([]),
  status: z.string().min(1, "El estado es obligatorio"),
  notes: z.string().nullable().optional(),
  attachments: z.array(z.string()).nullable().optional(),
  items: z.array(invoiceItemSchema).min(1, "Agrega al menos un ítem a la factura"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
}

const InvoiceForm = ({ invoiceId }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const isEditMode = !!invoiceId;

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Fetch invoice data if in edit mode
  const { data: invoiceData = { invoice: null, items: [] }, isLoading: invoiceLoading } = useQuery({
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
      additionalTaxes: [],
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
  useEffect(() => {
    if (invoiceData && !invoiceLoading && invoiceData.invoice) {
      const { invoice, items } = invoiceData;
      
      form.reset({
        ...invoice,
        issueDate: new Date(invoice.issueDate).toISOString().split("T")[0],
        dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
        items: (items || []).map((item: any) => ({
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

  const {
    fields: taxFields,
    append: appendTax,
    remove: removeTax
  } = useFieldArray({
    control: form.control,
    name: "additionalTaxes",
  });

  // Create or update invoice mutation
  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      console.log("Datos originales:", data);
      
      // Transformamos las fechas a objetos Date y aseguramos valores correctos
      const formattedData = {
        invoiceNumber: data.invoiceNumber,
        clientId: data.clientId,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        // Convertimos los números a strings para que coincidan con lo que espera el servidor
        subtotal: data.subtotal.toString(),
        tax: data.tax.toString(),
        total: data.total.toString(),
        additionalTaxes: data.additionalTaxes || [],
        status: data.status,
        notes: data.notes || null,
        attachments: attachments.length > 0 ? attachments : null,
      };
      
      // Transformamos los items de la factura
      const formattedItems = data.items.map(item => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        taxRate: item.taxRate.toString(),
        subtotal: (item.subtotal || 0).toString(),
      }));
      
      console.log("Datos formateados:", { invoice: formattedData, items: formattedItems });
      
      if (isEditMode) {
        return apiRequest(`/api/invoices/${invoiceId}`, "PUT", {
          invoice: formattedData,
          items: formattedItems,
        });
      } else {
        return apiRequest("/api/invoices", "POST", {
          invoice: formattedData,
          items: formattedItems,
        });
      }
    },
    onSuccess: (data) => {
      console.log("Factura guardada:", data);
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
    const additionalTaxes = form.getValues("additionalTaxes") || [];
    
    // Calculate subtotal for each item
    const updatedItems = items.map(item => {
      // Asegurarnos que tenemos números válidos
      const quantity = handleNumericField(item.quantity, 0);
      const unitPrice = handleNumericField(item.unitPrice, 0);
      const subtotal = quantity * unitPrice;
      
      return {
        ...item,
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal
      };
    });
    
    // Update form with calculated subtotals
    form.setValue("items", updatedItems);
    
    // Calculate invoice totals
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const tax = updatedItems.reduce((sum, item) => {
      const itemTax = (item.subtotal || 0) * (parseFloat(String(item.taxRate)) / 100);
      return sum + itemTax;
    }, 0);
    
    // Calcular el importe total de impuestos adicionales
    let additionalTaxesTotal = 0;
    
    // Procesamos cada impuesto adicional según su tipo
    additionalTaxes.forEach(taxItem => {
      if (taxItem.isPercentage) {
        // Si es un porcentaje, calculamos en base al subtotal
        const percentageTax = subtotal * (parseFloat(String(taxItem.amount)) / 100);
        additionalTaxesTotal += percentageTax;
      } else {
        // Si es un valor monetario, lo añadimos directamente
        additionalTaxesTotal += parseFloat(String(taxItem.amount)) || 0;
      }
    });
    
    // Calcular el total incluyendo todos los impuestos
    const total = subtotal + tax + additionalTaxesTotal;
    
    form.setValue("subtotal", subtotal);
    form.setValue("tax", tax);
    form.setValue("total", total);
    
    return { subtotal, tax, additionalTaxesTotal, total };
  };

  const handleSubmit = (data: InvoiceFormValues) => {
    // Recalculate totals before submission
    const { subtotal, tax, additionalTaxesTotal, total } = calculateTotals();
    data.subtotal = subtotal;
    data.tax = tax;
    data.total = total;
    
    mutation.mutate(data);
  };

  const handleFileUpload = (path: string) => {
    setAttachments([...attachments, path]);
  };

  // Función para manejar entradas numéricas
  const handleNumericField = (value: any, defaultValue: number = 0): number => {
    if (typeof value === 'number') return value;
    
    const stringValue = String(value || "");
    if (stringValue === "") return defaultValue;
    
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? defaultValue : parsed;
  };
  
  // Función para agregar un nuevo impuesto adicional
  const handleAddTax = (taxType?: string) => {
    // Si se especifica un tipo de impuesto, lo añadimos preconfigurado
    if (taxType === 'irpf') {
      // IRPF predeterminado (-15%)
      appendTax({ 
        name: "IRPF", 
        amount: -15, 
        isPercentage: true 
      });
    } else if (taxType === 'iva') {
      // IVA adicional (21%)
      appendTax({ 
        name: "IVA adicional", 
        amount: 21, 
        isPercentage: true 
      });
    } else {
      // Impuesto genérico (valor monetario)
      appendTax({ 
        name: "", 
        amount: 0,
        isPercentage: false 
      });
    }
    // Recalcular totales después de agregar impuesto
    setTimeout(() => calculateTotals(), 0);
  };

  // Función que maneja la creación de un nuevo cliente
  const handleClientCreated = (newClient: any) => {
    // Actualizar la caché de react-query para incluir el nuevo cliente
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    
    // Seleccionar automáticamente el nuevo cliente en el formulario
    form.setValue("clientId", newClient.id);
    
    toast({
      title: "Cliente creado",
      description: `El cliente ${newClient.name} ha sido creado correctamente`,
    });
  };

  if ((isEditMode && invoiceLoading) || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <>
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
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
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
                                {clients?.length === 0 && (
                                  <div className="px-2 py-3 text-sm text-muted-foreground">
                                    No hay clientes disponibles
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setShowClientForm(true)}
                            className="shrink-0"
                          >
                            Nuevo
                          </Button>
                        </div>
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
                            value={field.value || ""}
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
                                type="text"
                                placeholder="Cantidad"
                                {...field}
                                onChange={(e) => {
                                  // Permitir entrada de cualquier carácter de número y puntos/comas
                                  const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                  field.onChange(value);
                                  calculateTotals();
                                }}
                                onBlur={(e) => {
                                  // Al perder el foco, aseguramos que sea un número válido
                                  let value = field.value;
                                  if (value !== "" && !isNaN(parseFloat(value))) {
                                    const numericValue = parseFloat(value);
                                    field.onChange(numericValue.toString());
                                  }
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
                                type="text"
                                placeholder="Precio"
                                {...field}
                                onChange={(e) => {
                                  // Permitir entrada de cualquier carácter de número y puntos/comas
                                  const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                  field.onChange(value);
                                  calculateTotals();
                                }}
                                onBlur={(e) => {
                                  // Al perder el foco, aseguramos que sea un número válido
                                  let value = field.value;
                                  if (value !== "" && !isNaN(parseFloat(value))) {
                                    const numericValue = parseFloat(value);
                                    field.onChange(numericValue.toString());
                                  }
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
                
                {/* Sección de impuestos adicionales */}
                {taxFields.length > 0 && (
                  <div className="w-full md:w-80 mt-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Impuestos adicionales:</span>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => { 
                            e.preventDefault(); 
                            handleAddTax('irpf');
                          }}
                          className="h-7 px-2"
                          title="Añadir retención de IRPF (-15%)"
                        >
                          <span className="text-xs">+ IRPF</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { 
                            e.preventDefault(); 
                            handleAddTax();
                          }}
                          className="h-7 px-2"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="text-xs">Añadir</span>
                        </Button>
                      </div>
                    </div>
                    
                    {taxFields.map((field, index) => (
                      <div key={field.id} className="mb-4 pl-2 border-l-2 border-muted">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <FormField
                              control={form.control}
                              name={`additionalTaxes.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="sr-only">Nombre</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Nombre" 
                                      {...field} 
                                      className="h-8 text-sm"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-5">
                            <FormField
                              control={form.control}
                              name={`additionalTaxes.${index}.amount`}
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="sr-only">Importe</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <Input 
                                        type="number" 
                                        placeholder="Importe"
                                        step="0.01"
                                        {...field} 
                                        onChange={(e) => {
                                          field.onChange(parseFloat(e.target.value));
                                          calculateTotals();
                                        }}
                                        className="h-8 text-sm"
                                      />
                                      
                                      {/* Indicador de porcentaje o euros */}
                                      <div className="ml-1">
                                        <FormField
                                          control={form.control}
                                          name={`additionalTaxes.${index}.isPercentage`}
                                          render={({ field }) => (
                                            <FormItem className="space-y-0">
                                              <FormLabel className="sr-only">Tipo</FormLabel>
                                              <FormControl>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    field.onChange(!field.value);
                                                    calculateTotals();
                                                  }}
                                                  className="h-8 px-2 text-xs font-normal"
                                                >
                                                  {field.value ? '%' : '€'}
                                                </Button>
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="col-span-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removeTax(index);
                                calculateTotals();
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="sr-only">Eliminar impuesto</span>
                            </Button>
                          </div>
                          
                          {/* Mostrar el valor calculado después del campo */}
                          <div className="col-span-12 pl-5 -mt-1">
                            <span className="text-xs text-muted-foreground">
                              {form.getValues(`additionalTaxes.${index}.name`) || "Impuesto"}: 
                              <span className="font-medium ml-1">
                                {form.getValues(`additionalTaxes.${index}.isPercentage`) 
                                  ? `${Number(form.getValues(`additionalTaxes.${index}.amount`)).toFixed(2)}% (${(form.getValues("subtotal") * Number(form.getValues(`additionalTaxes.${index}.amount`)) / 100).toFixed(2)} €)`
                                  : `${Number(form.getValues(`additionalTaxes.${index}.amount`)).toFixed(2)} €`
                                }
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Botones para añadir impuestos cuando no hay ninguno */}
                {taxFields.length === 0 && (
                  <div className="w-full md:w-80 my-2 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        handleAddTax('irpf');
                      }}
                      className="text-xs"
                      title="Añadir retención de IRPF (-15%)"
                    >
                      <Minus className="h-3 w-3 mr-1" />
                      Añadir IRPF
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        handleAddTax();
                      }}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Otro impuesto
                    </Button>
                  </div>
                )}
                
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
            <Button type="submit" variant="default" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar factura" : "Crear factura"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Formulario de clientes como modal */}
      <ClientForm 
        open={showClientForm} 
        onOpenChange={setShowClientForm} 
        onClientCreated={handleClientCreated} 
      />
    </>
  );
};

export default InvoiceForm;