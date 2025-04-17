import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Trash2, Plus, FileText, Minus, CalendarIcon, Pencil, ChevronDown, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import FileUpload from "../common/FileUpload";
import { ClientForm } from "../clients/ClientForm";

// Función auxiliar para convertir texto a número
function toNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'number') return value;
  // Asegurar que las comas se convierten a puntos para operaciones matemáticas
  const numericValue = parseFloat(String(value).replace(',', '.'));
  return isNaN(numericValue) ? defaultValue : numericValue;
}

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
  initialData?: any; // Datos iniciales para el formulario
}

const InvoiceFormSimple = ({ invoiceId, initialData }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [newTaxData, setNewTaxData] = useState<{ name: string; amount: number; isPercentage: boolean }>({
    name: '',
    amount: 0,
    isPercentage: true
  });
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const isEditMode = !!invoiceId;
  
  // =============== FORMATO Y PROCESAMIENTO DE DATOS =================
  
  // Función para formatear fechas al formato YYYY-MM-DD
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return dateString;
    }
  };
  
  // Función para procesar los impuestos adicionales
  const processAdditionalTaxes = (additionalTaxes: any): { name: string; amount: number; isPercentage: boolean }[] => {
    let result: any[] = [];
    
    if (!additionalTaxes) {
      return [];
    }
    
    // Si es una cadena JSON, intentamos parsearlo
    if (typeof additionalTaxes === 'string') {
      try {
        result = JSON.parse(additionalTaxes);
      } catch (e) {
        console.error("Error al parsear additionalTaxes como JSON:", e);
        result = [];
      }
    } 
    // Si ya es un array, lo usamos directamente
    else if (Array.isArray(additionalTaxes)) {
      result = additionalTaxes;
    }
    
    return result.map((tax: any) => ({
      name: tax.name || "",
      amount: Number(tax.amount || 0),
      isPercentage: tax.isPercentage !== undefined ? tax.isPercentage : false
    }));
  };
  
  // Función para procesar los items de la factura
  const processInvoiceItems = (items: any[]) => {
    if (!items || !Array.isArray(items)) {
      console.warn("⚠️ No se encontraron items o no es un array");
      return [];
    }
    
    console.log(`✅ Procesando ${items.length} items para la factura`);
    
    return items.map((item: any) => {
      return {
        id: item.id, // Mantener el ID si existe
        invoiceId: item.invoiceId, // Mantener la referencia a la factura
        description: item.description || "",
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 21,
        subtotal: Number(item.subtotal) || 0,
      };
    });
  };

  // =============== DATOS PARA INICIALIZAR FORMULARIO =================
  
  // Preparamos los datos iniciales basado en lo recibido por props o datos por defecto
  const prepareInitialFormData = () => {
    if (isEditMode && initialData && initialData.invoice && initialData.items) {
      const { invoice, items } = initialData;
      const processedItems = processInvoiceItems(items);
      
      return {
        ...invoice,
        invoiceNumber: invoice.invoiceNumber || "",
        clientId: invoice.clientId || 0,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        status: invoice.status || "pending",
        notes: invoice.notes || "",
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        total: Number(invoice.total || 0),
        items: processedItems,
        additionalTaxes: processAdditionalTaxes(invoice.additionalTaxes)
      };
    }
    
    // Valores por defecto para nuevo formulario
    return {
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
    };
  };
  
  // Inicializamos el formulario una sola vez con los datos procesados
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: prepareInitialFormData(),
  });

  // Inicializamos archivos adjuntos si existen
  useEffect(() => {
    if (isEditMode && initialData?.invoice?.attachments) {
      const attachmentsFromData = initialData.invoice.attachments;
      setAttachments(Array.isArray(attachmentsFromData) ? attachmentsFromData : []);
    }
  }, [initialData, isEditMode]);

  // =============== GESTIÓN DE CAMPOS DEL FORMULARIO =================
  
  // Hooks para manejar campos de array en el formulario (items y taxes)
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

  // =============== CÁLCULOS DE TOTALES =================
  
  // Función para calcular los totales del formulario (usando valores actuales)
  const calculateTotals = () => {
    const { items = [], additionalTaxes = [] } = form.getValues();
    
    // Calculamos subtotales de cada item
    const updatedItems = (items || []).map((item: any) => {
      const quantity = toNumber(item.quantity, 0);
      const unitPrice = toNumber(item.unitPrice, 0);
      const subtotal = quantity * unitPrice;
      return {
        ...item,
        quantity,
        unitPrice,
        subtotal
      };
    });
    
    // Calculamos subtotal de la factura
    const subtotal = updatedItems.reduce(
      (sum: number, item: any) => sum + toNumber(item.subtotal, 0),
      0
    );
    
    // Calculamos IVA basado en la tasa de cada item
    const tax = updatedItems.reduce((sum: number, item: any) => {
      const itemTax = toNumber(item.subtotal, 0) * (toNumber(item.taxRate, 0) / 100);
      return sum + itemTax;
    }, 0);
    
    // Calculamos impuestos adicionales
    let additionalTaxesTotal = 0;
    (additionalTaxes || []).forEach((taxItem: any) => {
      if (taxItem.isPercentage) {
        const percentageTax = subtotal * (toNumber(taxItem.amount, 0) / 100);
        additionalTaxesTotal += percentageTax;
      } else {
        additionalTaxesTotal += toNumber(taxItem.amount, 0);
      }
    });
    
    // Total final con todos los impuestos
    const total = subtotal + tax + additionalTaxesTotal;
    
    return {
      updatedItems,
      subtotal,
      tax,
      additionalTaxesTotal,
      total: Math.max(0, total) // Nunca permitir totales negativos
    };
  };
  
  // Usamos useMemo para memorizar los totales calculados (solo se recalcula cuando form cambia)
  const calculatedTotals = useMemo(calculateTotals, [form]);

  // =============== MANEJADORES DE EVENTOS =================
  
  // Función para agregar un nuevo impuesto adicional
  const handleAddTax = (taxType?: string) => {
    if (taxType === 'irpf') {
      appendTax({ 
        name: "IRPF", 
        amount: -15, 
        isPercentage: true 
      });
    } else if (taxType === 'iva') {
      appendTax({ 
        name: "IVA adicional", 
        amount: 21, 
        isPercentage: true 
      });
    } else {
      setNewTaxData({ name: "", amount: 0, isPercentage: false });
      setShowTaxDialog(true);
    }
  };
  
  // Función para agregar impuesto desde el diálogo
  const handleAddTaxFromDialog = () => {
    appendTax(newTaxData);
    setShowTaxDialog(false);
  };
  
  // Función para manejar el evento onBlur en campos numéricos
  const handleNumericBlur = (field: any, defaultValue: number = 0) => {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      const numericValue = toNumber(field.value, defaultValue);
      if (numericValue > 0 || field.value !== "") {
        field.onChange(numericValue.toString());
      }
    };
  };
  
  // Función para manejar la subida de archivos
  const handleFileUpload = (path: string) => {
    setAttachments(prev => [...prev, path]);
  };
  
  // Función para editar un cliente
  const editClient = (client: any) => {
    setClientToEdit(client);
    setShowClientForm(true);
  };
  
  // Función para eliminar un cliente
  const deleteClient = (clientId: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      apiRequest("DELETE", `/api/clients/${clientId}`)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
          toast({
            title: "Cliente eliminado",
            description: "El cliente ha sido eliminado correctamente",
          });
        })
        .catch(error => {
          console.error("Error al eliminar cliente:", error);
          toast({
            title: "Error",
            description: `No se pudo eliminar el cliente: ${error.message}`,
            variant: "destructive",
          });
        });
    }
  };
  
  // Función para manejar la creación o actualización de un cliente
  const handleClientCreated = (data: any) => {
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    
    if (!clientToEdit) {
      form.setValue("clientId", data.id);
    }
    
    setClientToEdit(null);
    setShowClientForm(false);
    
    toast({
      title: clientToEdit ? "Cliente actualizado" : "Cliente creado",
      description: clientToEdit 
        ? `El cliente ${data.name} ha sido actualizado correctamente`
        : `El cliente ${data.name} ha sido creado correctamente`,
    });
  };
  
  // Función para manejar el cierre del modal de cliente
  const handleClientModalClose = (open: boolean) => {
    if (!open) {
      setClientToEdit(null);
    }
    setShowClientForm(open);
  };

  // =============== SUBMIT DEL FORMULARIO =================
  
  // Mutación para crear o actualizar la factura
  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      console.log("✅ Enviando datos del formulario:", data);
      
      // Formatear fechas al formato YYYY-MM-DD
      const formatDate = (dateString: string) => {
        if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
          return dateString.split('T')[0];
        }
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.error("Error al formatear fecha:", e);
          return dateString;
        }
      };
      
      // Asegurar formato numérico correcto
      const formatNumber = (num: number): string => {
        if (typeof num !== 'number') return '0.00';
        return num.toFixed(2);
      };
      
      // Datos formateados de la factura
      const formattedData = {
        invoiceNumber: data.invoiceNumber,
        clientId: data.clientId,
        issueDate: formatDate(data.issueDate),
        dueDate: formatDate(data.dueDate),
        subtotal: formatNumber(data.subtotal),
        tax: formatNumber(data.tax),
        total: formatNumber(data.total),
        additionalTaxes: data.additionalTaxes || [],
        status: data.status,
        notes: data.notes || null,
        attachments: attachments.length > 0 ? attachments : null,
      };
      
      // Items formateados
      const formattedItems = data.items.map(item => ({
        description: item.description,
        quantity: formatNumber(item.quantity),
        unitPrice: formatNumber(item.unitPrice),
        taxRate: formatNumber(item.taxRate),
        subtotal: formatNumber(item.subtotal || 0),
      }));
      
      // Crear o actualizar la factura según el modo
      if (isEditMode) {
        return apiRequest("PUT", `/api/invoices/${invoiceId}`, {
          invoice: {
            ...formattedData,
            id: invoiceId, // Incluir ID explícitamente
          },
          items: formattedItems,
        });
      } else {
        const createTransaction = formattedData.status === 'paid';
        return apiRequest("POST", "/api/invoices", {
          invoice: {
            ...formattedData,
            createTransaction
          },
          items: formattedItems,
        });
      }
    },
    onSuccess: (data) => {
      console.log("✅ Factura guardada:", data);
      
      // Notificar a componentes del cambio
      window.dispatchEvent(new CustomEvent(isEditMode ? 'invoice-updated' : 'invoice-created'));
      window.dispatchEvent(new CustomEvent('updateInvoices'));
      
      // Forzar recarga de datos
      queryClient.removeQueries({ queryKey: ["/api/invoices"] });
      queryClient.removeQueries({ queryKey: ["/api/stats/dashboard"] });
      
      // Solicitar nueva carga de dashboard
      fetch("/api/stats/dashboard-fix?nocache=" + Date.now())
        .then(() => {
          queryClient.refetchQueries({ queryKey: ["dashboard"] });
          queryClient.refetchQueries({ queryKey: ["invoices"] });
          
          // Disparar evento de actualización
          window.dispatchEvent(new CustomEvent('dashboard-refresh-required'));
        })
        .catch(err => console.error("❌ Error al recargar dashboard:", err));
      
      toast({
        title: isEditMode ? "Factura actualizada" : "Factura creada",
        description: isEditMode
          ? "La factura se ha actualizado correctamente"
          : "La factura se ha creado correctamente",
      });
      
      navigate("/invoices");
    },
    onError: (error) => {
      console.error("❌ Error al guardar factura:", error);
      toast({
        title: "Error",
        description: `Ha ocurrido un error: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Manejar submit del formulario
  const handleSubmit = (data: InvoiceFormValues) => {
    // Actualizar los datos con los totales calculados
    data.subtotal = calculatedTotals.subtotal;
    data.tax = calculatedTotals.tax;
    data.total = calculatedTotals.total;
    
    // Enviar datos
    mutation.mutate(data);
  };

  // =============== DATOS DE LA APLICACIÓN =================
  
  // Cargar datos de clientes
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Cargar datos de la empresa
  const { data: companyData, isLoading: companyLoading } = useQuery<any>({
    queryKey: ["/api/company"],
  });

  // Mostrar pantalla de carga mientras esperamos datos necesarios
  if ((isEditMode && !initialData) || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  // =============== RENDER DEL FORMULARIO =================
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl">
              <div className="bg-[#f5f5f7] border-b border-gray-200 p-4 text-gray-900">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-500" />
                  Datos de la factura
                </h3>
              </div>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Número de factura
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="F-2023-001" {...field} className="border-gray-200 focus-visible:ring-blue-500 focus-visible:ring-opacity-30" />
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
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-60">
                                {clients?.map((client: any) => (
                                  <div key={client.id} className="flex items-center justify-between p-1 px-2 hover:bg-muted/50 rounded-sm group">
                                    <SelectItem value={client.id.toString()} className="flex-1 data-[highlighted]:bg-transparent">
                                      <div className="flex flex-col">
                                        <span>{client.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {client.taxId} - {client.city || client.address}
                                        </span>
                                      </div>
                                    </SelectItem>
                                    <div className="flex">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="p-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          editClient(client);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4 text-blue-500" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="ml-1 p-0 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteClient(client.id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
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
                            <div className="calendar-popup-wrapper">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="w-full justify-start text-left font-normal flex items-center h-12 text-base"
                                  >
                                    <CalendarIcon className="h-5 w-5 mr-2 opacity-70" />
                                    {field.value ? format(new Date(field.value), "dd/MM/yyyy") : 
                                    <span className="text-muted-foreground">Seleccionar fecha</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(format(date, "yyyy-MM-dd"));
                                      }
                                    }}
                                    disabled={(date) => date < new Date("1900-01-01")}
                                    initialFocus
                                    className="rounded-md border shadow p-4"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
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
                            <div className="calendar-popup-wrapper">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="w-full justify-start text-left font-normal flex items-center h-12 text-base"
                                  >
                                    <CalendarIcon className="h-5 w-5 mr-2 opacity-70" />
                                    {field.value ? format(new Date(field.value), "dd/MM/yyyy") : 
                                    <span className="text-muted-foreground">Seleccionar fecha</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(format(date, "yyyy-MM-dd"));
                                      }
                                    }}
                                    disabled={(date) => date < new Date("1900-01-01")}
                                    initialFocus
                                    className="rounded-md border shadow p-4"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
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
                          value={field.value}
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

            <Card className="border-0 shadow-sm overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl">
              <div className="bg-[#f5f5f7] border-b border-gray-200 p-4 text-gray-900">
                <h3 className="text-lg font-medium flex items-center">
                  <Plus className="mr-2 h-5 w-5 text-green-500" />
                  Información adicional
                </h3>
              </div>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></span>
                          Notas
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={
                              companyData?.bankAccount 
                                ? `Pago mediante transferencia bancaria a ${companyData.bankAccount}` 
                                : "Información adicional para la factura..."
                            }
                            {...field}
                            value={field.value || ""}
                            className="border-gray-200 focus-visible:ring-green-500 focus-visible:ring-opacity-30 min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <div className="flex flex-col space-y-2">
                      <h4 className="text-sm font-medium flex items-center text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></span>
                        Archivos adjuntos
                      </h4>
                      <FileUpload onUpload={handleFileUpload} />
                      {attachments.length > 0 && (
                        <div className="mt-2 border border-gray-200 rounded-md p-3">
                          <h5 className="text-sm font-medium mb-2">Archivos añadidos:</h5>
                          <ul className="space-y-1">
                            {attachments.map((path, index) => (
                              <li key={index} className="text-sm text-blue-600 flex items-center">
                                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                                <span className="truncate max-w-full">{path.split('/').pop()}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto p-0 h-6 w-6"
                                  onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl">
            <div className="bg-[#f5f5f7] border-b border-gray-200 p-4 text-gray-900">
              <h3 className="text-lg font-medium flex items-center">
                <Plus className="mr-2 h-5 w-5 text-purple-500" />
                Conceptos de la factura
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Añade los detalles de los productos o servicios facturados.
              </p>
            </div>
            <CardContent className="pt-6">
              <div>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col space-y-3 bg-gray-50 p-4 rounded-md relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 p-0 h-8 w-8"
                        onClick={() => {
                          if (fields.length > 1) remove(index);
                          else toast({
                            title: "Error",
                            description: "Debes tener al menos un concepto en la factura",
                            variant: "destructive",
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Descripción</FormLabel>
                                <FormControl>
                                  <Input placeholder="Consultoría" {...field} className="border-gray-200" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cantidad</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="1"
                                    {...field}
                                    onBlur={handleNumericBlur(field, 1)}
                                    className="border-gray-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Precio (€)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="100"
                                    {...field}
                                    onBlur={handleNumericBlur(field, 0)}
                                    className="border-gray-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.taxRate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IVA (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="21"
                                    {...field}
                                    onBlur={handleNumericBlur(field, 21)}
                                    className="border-gray-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <FormField
                            control={form.control}
                            name={`items.${index}.subtotal`}
                            render={({ field }) => {
                              const quantity = toNumber(form.getValues(`items.${index}.quantity`), 0);
                              const unitPrice = toNumber(form.getValues(`items.${index}.unitPrice`), 0);
                              const calculatedSubtotal = quantity * unitPrice;
                              return (
                                <FormItem>
                                  <FormLabel>Subtotal</FormLabel>
                                  <FormControl>
                                    <Input
                                      disabled
                                      value={calculatedSubtotal.toFixed(2)}
                                      className="border-gray-200 bg-gray-100"
                                    />
                                  </FormControl>
                                </FormItem>
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex w-full items-center justify-center"
                    onClick={() =>
                      append({
                        description: "",
                        quantity: 1,
                        unitPrice: 0,
                        taxRate: 21,
                        subtotal: 0,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir concepto
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl">
            <div className="bg-[#f5f5f7] border-b border-gray-200 p-4 text-gray-900">
              <h3 className="text-lg font-medium flex items-center">
                <Plus className="mr-2 h-5 w-5 text-indigo-500" />
                Impuestos adicionales
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Añade retenciones o impuestos adicionales a la factura.
              </p>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTax('irpf')}
                    className="flex items-center"
                  >
                    <Minus className="mr-1 h-3 w-3" />
                    IRPF (15%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTax('iva')}
                    className="flex items-center"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    IVA adicional (21%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTax()}
                    className="flex items-center"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Impuesto personalizado
                  </Button>
                </div>

                {taxFields.length > 0 && (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="min-w-full bg-white">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {taxFields.map((field, index) => {
                          const taxItem = form.getValues(`additionalTaxes.${index}`);
                          const isPercentage = taxItem?.isPercentage;
                          const amount = toNumber(taxItem?.amount, 0);
                          const subtotal = calculatedTotals.subtotal;
                          const taxValue = isPercentage ? (amount * subtotal / 100) : amount;
                          const sign = amount < 0 ? "-" : "+";
                          
                          return (
                            <tr key={field.id}>
                              <td className="py-2 px-3 text-sm text-gray-800">{taxItem?.name || "-"}</td>
                              <td className="py-2 px-3 text-sm text-gray-600">{isPercentage ? "Porcentaje" : "Valor fijo"}</td>
                              <td className="py-2 px-3 text-sm">
                                <span className={amount < 0 ? "text-red-600" : "text-green-600"}>
                                  {sign} {Math.abs(taxValue).toFixed(2)}€
                                  {isPercentage && ` (${Math.abs(amount)}%)`}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-7 w-7"
                                  onClick={() => removeTax(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden">
            <div className="bg-blue-600 p-4 text-white">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Resumen de la factura
              </h3>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-2">
                      <div className="flex justify-between pb-1 border-b border-dashed border-gray-200">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="font-medium">{calculatedTotals.subtotal.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between pb-1 border-b border-dashed border-gray-200">
                        <span className="text-sm text-gray-600">IVA ({fields.length > 0 ? 'según productos' : '0%'}):</span>
                        <span className="font-medium">{calculatedTotals.tax.toFixed(2)}€</span>
                      </div>
                      {taxFields.length > 0 && taxFields.map((field, index) => {
                        const taxItem = form.getValues(`additionalTaxes.${index}`);
                        if (!taxItem) return null;
                        
                        const isPercentage = taxItem.isPercentage;
                        const amount = toNumber(taxItem.amount, 0);
                        const subtotal = calculatedTotals.subtotal;
                        const taxValue = isPercentage ? (amount * subtotal / 100) : amount;
                        const sign = amount < 0 ? "-" : "+";
                        
                        return (
                          <div key={field.id} className="flex justify-between pb-1 border-b border-dashed border-gray-200">
                            <span className="text-sm text-gray-600">
                              {taxItem.name} {isPercentage ? `(${Math.abs(amount)}%)` : ''}:
                            </span>
                            <span className={amount < 0 ? "font-medium text-red-600" : "font-medium text-green-600"}>
                              {sign} {Math.abs(taxValue).toFixed(2)}€
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-blue-900">Total:</span>
                      <span className="text-xl font-bold text-blue-900">{calculatedTotals.total.toFixed(2)}€</span>
                    </div>
                    {form.getValues("status") === "paid" && (
                      <div className="mt-3 p-2 bg-green-100 rounded-md text-sm text-green-800 flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                        Esta factura se registrará como pagada y creará una transacción en tus ingresos.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <div className="p-4 bg-gray-50 flex justify-end">
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Actualizar factura" : "Crear factura"}
              </Button>
            </div>
          </Card>
        </form>
      </Form>

      {/* Modal de impuesto personalizado */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir impuesto o retención</DialogTitle>
            <DialogDescription>
              Introduce los detalles del impuesto o retención que deseas añadir.
              Para retenciones (como IRPF), usa valores negativos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <FormLabel htmlFor="tax-name">Nombre</FormLabel>
              <Input 
                id="tax-name" 
                placeholder="IRPF, IVA, etc." 
                value={newTaxData.name}
                onChange={e => setNewTaxData({...newTaxData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <FormLabel htmlFor="tax-amount">Importe</FormLabel>
              <Input 
                id="tax-amount" 
                type="number" 
                step="0.01" 
                value={newTaxData.amount}
                onChange={e => setNewTaxData({...newTaxData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-percentage"
                className="h-4 w-4"
                checked={newTaxData.isPercentage}
                onChange={e => setNewTaxData({...newTaxData, isPercentage: e.target.checked})}
              />
              <FormLabel htmlFor="is-percentage" className="!m-0">Es un porcentaje</FormLabel>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowTaxDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleAddTaxFromDialog}
              disabled={!newTaxData.name}
            >
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de cliente */}
      <Dialog open={showClientForm} onOpenChange={handleClientModalClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clientToEdit ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
            <DialogDescription>
              {clientToEdit ? "Modifica los datos del cliente seleccionado." : "Introduce los datos del nuevo cliente."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm 
            client={clientToEdit} 
            onCreated={handleClientCreated}
            onCancel={() => setShowClientForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceFormSimple;