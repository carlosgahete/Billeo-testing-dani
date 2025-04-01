import { useState, useEffect } from "react";
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
import { Trash2, Plus, FileText, Minus, CalendarIcon, Pencil } from "lucide-react";
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

// Función auxiliar para calcular totales (definida globalmente para evitar referencias circulares)
export function calculateInvoiceTotals(form: any) {
  const items = form.getValues("items") || [];
  const additionalTaxes = form.getValues("additionalTaxes") || [];
  
  // Calculate subtotal for each item
  const updatedItems = items.map((item: any) => {
    const quantity = toNumber(item.quantity, 0);
    const unitPrice = toNumber(item.unitPrice, 0);
    const subtotal = quantity * unitPrice;
    
    return {
      ...item,
      quantity: quantity,
      unitPrice: unitPrice,
      subtotal: subtotal
    };
  });
  
  form.setValue("items", updatedItems);
  
  // Calculate invoice totals
  const subtotal = updatedItems.reduce((sum: number, item: any) => sum + toNumber(item.subtotal, 0), 0);
  const tax = updatedItems.reduce((sum: number, item: any) => {
    const itemTax = toNumber(item.subtotal, 0) * (toNumber(item.taxRate, 0) / 100);
    return sum + itemTax;
  }, 0);
  
  // Calcular el importe total de impuestos adicionales
  let additionalTaxesTotal = 0;
  
  additionalTaxes.forEach((taxItem: any) => {
    if (taxItem.isPercentage) {
      const percentageTax = subtotal * (toNumber(taxItem.amount, 0) / 100);
      additionalTaxesTotal += percentageTax;
    } else {
      additionalTaxesTotal += toNumber(taxItem.amount, 0);
    }
  });
  
  const total = subtotal + tax + additionalTaxesTotal;
  const safeTotal = Math.max(0, total);
  
  form.setValue("subtotal", subtotal);
  form.setValue("tax", tax);
  form.setValue("total", safeTotal);
  
  console.log("💰 Cálculo de totales:", {
    subtotal,
    tax,
    additionalTaxesTotal,
    total: safeTotal,
    desglose: additionalTaxes.map((tax: any) => ({
      nombre: tax.name,
      valor: tax.isPercentage ? 
        `${tax.amount}% = ${(subtotal * (toNumber(tax.amount, 0) / 100)).toFixed(2)}€` : 
        `${tax.amount}€`
    }))
  });
  
  return { subtotal, tax, additionalTaxesTotal, total: safeTotal };
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
  initialData?: { 
    invoice: {
      id: number;
      invoiceNumber: string;
      clientId: number;
      issueDate: string;
      dueDate: string;
      status: string;
      notes?: string;
      subtotal: number | string;
      tax: number | string;
      total: number | string;
      additionalTaxes?: any;
      attachments?: string[];
    };
    items: Array<{
      id?: number;
      description: string;
      quantity: number | string;
      unitPrice: number | string;
      taxRate: number | string;
      subtotal: number | string;
    }>;
  }; 
}

const InvoiceForm = ({ invoiceId, initialData }: InvoiceFormProps) => {
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
  const [formInitialized, setFormInitialized] = useState(false);
  
  const isEditMode = !!invoiceId;
  
  // Mutation para eliminar clientes
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      return await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      // Invalidar consultas de clientes para actualizar la lista
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      });
    },
    onError: (error) => {
      console.error("Error al eliminar cliente:", error);
      toast({
        title: "Error",
        description: `No se pudo eliminar el cliente: ${error.message}`,
        variant: "destructive",
      });
    }
  });
  
  // Función para eliminar un cliente
  const deleteClient = (clientId: number) => {
    deleteClientMutation.mutate(clientId);
  };
  
  // Función para editar un cliente
  const editClient = (client: any) => {
    setClientToEdit(client);
    setShowClientForm(true);
  };

  // Fetch clients for dropdown
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch invoice data if in edit mode with minimal options
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    enabled: isEditMode,
    staleTime: 0, // Siempre obtener los datos más recientes
    refetchOnWindowFocus: false, // Evitar refetch automático al volver a enfocar la ventana
  });

  const defaultFormValues = {
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

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultFormValues,
  });

  // Función para formatear fechas
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return new Date().toISOString().split("T")[0];  // Valor por defecto seguro
    }
  };

  // Función para procesar impuestos adicionales
  const procesarImpuestosAdicionales = (impuestos: any) => {
    if (!impuestos) return [];
    
    // Si es una cadena JSON, intentamos parsearlo
    if (typeof impuestos === 'string') {
      try {
        return JSON.parse(impuestos);
      } catch (e) {
        console.error("Error al parsear additionalTaxes como JSON:", e);
        return [];
      }
    } 
    // Si ya es un array, lo usamos directamente
    else if (Array.isArray(impuestos)) {
      return impuestos;
    }
    
    return [];
  };

  // ⚠️ PROBLEMA CORREGIDO: Gestión mejorada de la inicialización del formulario
  useEffect(() => {
    if (formInitialized) return; // Evitamos múltiples inicializaciones

    // Registro de diagnóstico para debugging
    console.log("⚠️ Estado de inicialización:", { 
      isEditMode, 
      initialDataPresente: !!initialData, 
      invoicePresente: initialData?.invoice ? true : false,
      itemsPresentes: initialData?.items ? initialData.items.length : 0,
      invoiceDataPresente: !!invoiceData
    });

    // CASO 1: Datos directos proporcionados por initialData
    if (initialData && initialData.invoice) {
      console.log("⚡ Usando datos directamente proporcionados:", initialData);
      
      const { invoice, items } = initialData;
      
      // Aseguramos que existan los campos necesarios
      if (!invoice || !items) {
        console.error("❌ Datos iniciales incompletos");
        return;
      }
      
      const additionalTaxesArray = procesarImpuestosAdicionales(invoice.additionalTaxes);
      
      // Transformar los datos para el formulario
      const formattedInvoice = {
        ...invoice,
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || "",
        clientId: invoice.clientId || 0,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        status: invoice.status || "pending",
        notes: invoice.notes || "",
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        total: Number(invoice.total || 0),
        // Mapeamos los items asegurando valores correctos
        items: (items || []).map((item: any) => ({
          id: item.id, // Incluir ID si existe
          description: item.description || "",
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          taxRate: Number(item.taxRate) || 21,
          subtotal: Number(item.subtotal) || 0,
        })),
        // Formateamos los impuestos adicionales
        additionalTaxes: additionalTaxesArray.map((tax: any) => ({
          name: tax.name || "",
          amount: Number(tax.amount || 0),
          isPercentage: tax.isPercentage !== undefined ? tax.isPercentage : false
        }))
      };
      
      console.log("🔄 Datos formateados para el formulario:", formattedInvoice);
      
      // ⚠️ SOLUCIÓN: Primero hacer reset al formulario, luego recalcular totales
      form.reset(formattedInvoice);
      
      // Si hay archivos adjuntos, actualizamos el estado
      if (invoice.attachments) {
        setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
      }
      
      // Recalcular totales después de que el formulario se haya actualizado
      setTimeout(() => {
        calculateInvoiceTotals(form);
        setFormInitialized(true);
        console.log("✅ Formulario inicializado correctamente con initialData");
      }, 100);
    }
    // CASO 2: Datos desde consulta API
    else if (isEditMode && invoiceData && typeof invoiceData === 'object' && 'invoice' in invoiceData) {
      console.log("⚡ Usando datos de factura de la API:", invoiceData);
      
      const { invoice, items } = invoiceData;
      
      // Aseguramos que existan los campos necesarios
      if (!invoice) {
        console.error("❌ Datos de invoice incompletos en API");
        return;
      }
      
      const additionalTaxesArray = procesarImpuestosAdicionales(invoice.additionalTaxes);
      
      // Transformar los datos para el formulario
      const formattedInvoice = {
        ...invoice,
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber || "",
        clientId: invoice.clientId || 0,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        status: invoice.status || "pending",
        notes: invoice.notes || "",
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        total: Number(invoice.total || 0),
        // Mapeamos los items asegurando valores correctos
        items: (items || []).map((item: any) => ({
          id: item.id, // Incluir ID si existe
          description: item.description || "",
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          taxRate: Number(item.taxRate) || 21,
          subtotal: Number(item.subtotal) || 0,
        })),
        // Formateamos los impuestos adicionales
        additionalTaxes: additionalTaxesArray.map((tax: any) => ({
          name: tax.name || "",
          amount: Number(tax.amount || 0),
          isPercentage: tax.isPercentage !== undefined ? tax.isPercentage : false
        }))
      };
      
      console.log("🔄 Datos formateados para el formulario:", formattedInvoice);
      
      // ⚠️ SOLUCIÓN: Primero hacer reset al formulario, luego recalcular totales
      form.reset(formattedInvoice);
      
      // Si hay archivos adjuntos, actualizamos el estado
      if (invoice.attachments) {
        setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
      }
      
      // Recalcular totales después de que el formulario se haya actualizado
      setTimeout(() => {
        calculateInvoiceTotals(form);
        setFormInitialized(true);
        console.log("✅ Formulario inicializado correctamente con API data");
      }, 100);
    }
  }, [invoiceData, initialData, isEditMode, form, formInitialized]);

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
      console.log("✅ Enviando datos del formulario:", data);
      
      if (isEditMode && invoiceId) {
        return await apiRequest("PUT", `/api/invoices/${invoiceId}`, data);
      } else {
        return await apiRequest("POST", "/api/invoices", data);
      }
    },
    onSuccess: (response) => {
      // Show success toast
      toast({
        title: isEditMode ? "Factura actualizada" : "Factura creada",
        description: `La factura ha sido ${
          isEditMode ? "actualizada" : "creada"
        } correctamente`,
      });
      
      // Invalidate queries to refresh invoice list
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      
      // Navigate to invoice list
      navigate("/invoices");
    },
    onError: (error) => {
      console.error("Error al guardar factura:", error);
      toast({
        title: "Error",
        description: `No se pudo guardar la factura: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: InvoiceFormValues) => {
    // Convertir de nuevo el campo attachments
    const formData = {
      ...data,
      attachments: attachments,
    };
    
    console.log("📤 Enviando datos finales:", formData);
    mutation.mutate(formData);
  };

  // Add a new blank line item
  const addItem = () => {
    append({
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 21,
      subtotal: 0,
    });
  };

  // Calculate subtotals when item data changes
  const updateSubtotals = () => {
    calculateInvoiceTotals(form);
  };

  // Handle file uploads
  const handleFileUpload = (fileURL: string) => {
    setAttachments((prev) => [...prev, fileURL]);
  };

  // Remove an attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Agregar un nuevo impuesto
  const handleAddNewTax = () => {
    if (!newTaxData.name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes especificar un nombre para el impuesto",
        variant: "destructive",
      });
      return;
    }
    
    appendTax(newTaxData);
    setNewTaxData({ name: '', amount: 0, isPercentage: true });
    setShowTaxDialog(false);
    // Recalcular totales después de agregar impuesto
    setTimeout(() => {
      calculateInvoiceTotals(form);
    }, 100);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SECCIÓN: Datos básicos de la factura */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-800 mb-4">Datos de la factura</h2>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Número de factura */}
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de factura</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: F-2025/001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Estado */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un estado" />
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
                    
                    {/* Fecha de emisión */}
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de emisión</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`pl-3 text-left font-normal ${
                                    !field.value ? "text-muted-foreground" : ""
                                  }`}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(format(date, "yyyy-MM-dd"));
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Fecha de vencimiento */}
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de vencimiento</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`pl-3 text-left font-normal ${
                                    !field.value ? "text-muted-foreground" : ""
                                  }`}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(format(date, "yyyy-MM-dd"));
                                  }
                                }}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* SECCIÓN: Datos del cliente */}
              <h2 className="text-xl font-semibold text-neutral-800 mt-6 mb-4">Cliente</h2>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-end mb-4 gap-2">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cliente</FormLabel>
                            <Select
                              value={field.value ? String(field.value) : ""}
                              onValueChange={(value) => field.onChange(Number(value))}
                              disabled={clientsLoading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client) => (
                                  <SelectItem key={client.id} value={String(client.id)}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Botón para agregar nuevo cliente */}
                    <Button 
                      type="button" 
                      onClick={() => {
                        setClientToEdit(null);
                        setShowClientForm(true);
                      }}
                      className="mb-1"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Nuevo
                    </Button>
                  </div>
                  
                  {/* Mostrar datos del cliente seleccionado */}
                  {form.watch('clientId') > 0 && (
                    <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                      {clients.filter(c => c.id === form.watch('clientId')).map(client => (
                        <div key={client.id} className="text-sm">
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">{client.name}</span>
                            <div className="space-x-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => editClient(client)}
                                className="h-8 px-2"
                              >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                            </div>
                          </div>
                          <p>{client.taxId}</p>
                          <p>{client.address}</p>
                          <p>{client.city}, {client.postalCode}</p>
                          {client.email && <p className="mt-1">{client.email}</p>}
                          {client.phone && <p>{client.phone}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* SECCIÓN: Notas y archivos adjuntos */}
              <h2 className="text-xl font-semibold text-neutral-800 mt-6 mb-4">Notas y archivos</h2>
              
              <Card>
                <CardContent className="pt-6">
                  {/* Notas */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Añade notas adicionales para el cliente..."
                            {...field}
                            value={field.value || ''}
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Archivos adjuntos */}
                  <div className="mt-4">
                    <FormLabel>Archivos adjuntos</FormLabel>
                    <div className="mt-2">
                      <FileUpload onFileUploaded={handleFileUpload} />
                      
                      {/* Lista de archivos adjuntos */}
                      {attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {attachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 border rounded-md"
                            >
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-sm truncate max-w-[200px]">
                                  {file.split('/').pop()}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(index)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* SECCIÓN: Líneas de factura y totales */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-800 mb-4">Conceptos</h2>
              
              <Card>
                <CardContent className="pt-6">
                  {/* Líneas de factura */}
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-sm">
                            {form.watch(`items.${index}.description`) || `Concepto ${index + 1}`}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (fields.length > 1) {
                                remove(index);
                                setTimeout(() => updateSubtotals(), 100);
                              } else {
                                toast({
                                  title: "No se puede eliminar",
                                  description: "La factura debe tener al menos un concepto",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          {/* Descripción */}
                          <div className="md:col-span-6">
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descripción</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Cantidad */}
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
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setTimeout(() => updateSubtotals(), 100);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Precio unitario */}
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Precio</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setTimeout(() => updateSubtotals(), 100);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Tasa de IVA */}
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.taxRate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>IVA %</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setTimeout(() => updateSubtotals(), 100);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Subtotal calculado */}
                          <div className="md:col-span-12">
                            <div className="text-right mt-2">
                              <span className="text-sm text-muted-foreground mr-2">
                                Subtotal:
                              </span>
                              <span className="font-medium">
                                {new Intl.NumberFormat('es-ES', {
                                  style: 'currency',
                                  currency: 'EUR'
                                }).format(form.watch(`items.${index}.subtotal`) || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Botón para agregar nuevo concepto */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={addItem}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir concepto
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* SECCIÓN: Impuestos y totales */}
              <h2 className="text-xl font-semibold text-neutral-800 mt-6 mb-4">Impuestos y resumen</h2>
              
              <Card>
                <CardContent className="pt-6">
                  {/* Impuestos adicionales */}
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Impuestos adicionales</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTaxDialog(true)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Añadir impuesto
                      </Button>
                    </div>
                    
                    {taxFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground mt-2">
                        No hay impuestos adicionales. Añade IRPF u otros impuestos si es necesario.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {taxFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between border p-3 rounded-md"
                          >
                            <div>
                              <span className="font-medium text-sm">
                                {form.getValues(`additionalTaxes.${index}.name`) || "Impuesto"}: 
                              </span>
                              <span className="ml-2 text-sm">
                                {form.getValues(`additionalTaxes.${index}.isPercentage`) 
                                  ? `${Number(form.getValues(`additionalTaxes.${index}.amount`)).toFixed(2)}% (${(form.getValues("subtotal") * Number(form.getValues(`additionalTaxes.${index}.amount`)) / 100).toFixed(2)} €)`
                                  : `${Number(form.getValues(`additionalTaxes.${index}.amount`)).toFixed(2)} €`
                                }
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removeTax(index);
                                setTimeout(() => updateSubtotals(), 100);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Totales */}
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(form.watch("subtotal") || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA:</span>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(form.watch("tax") || 0)}
                      </span>
                    </div>
                    
                    {/* Mostrar impuestos adicionales en el resumen */}
                    {taxFields.length > 0 && (
                      <div className="border-t pt-2 mt-2">
                        {taxFields.map((field, index) => (
                          <div key={field.id} className="flex justify-between text-sm">
                            <span className={`${form.watch(`additionalTaxes.${index}.amount`) < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {form.watch(`additionalTaxes.${index}.name`)}:
                            </span>
                            <span className={form.watch(`additionalTaxes.${index}.amount`) < 0 ? 'text-red-500' : ''}>
                              {form.watch(`additionalTaxes.${index}.isPercentage`)
                                ? `${form.watch(`additionalTaxes.${index}.amount`)}% (${new Intl.NumberFormat('es-ES', {
                                    style: 'currency',
                                    currency: 'EUR'
                                  }).format((form.watch("subtotal") * form.watch(`additionalTaxes.${index}.amount`)) / 100)})`
                                : new Intl.NumberFormat('es-ES', {
                                    style: 'currency',
                                    currency: 'EUR'
                                  }).format(form.watch(`additionalTaxes.${index}.amount`))
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-2 mt-2 border-t font-semibold text-lg">
                      <span>Total:</span>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(form.watch("total") || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Botones de acción */}
              <div className="flex justify-end gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/invoices")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar" : "Crear factura"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
      
      {/* Diálogo para crear/editar cliente */}
      <Dialog open={showClientForm} onOpenChange={setShowClientForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{clientToEdit ? "Editar cliente" : "Crear nuevo cliente"}</DialogTitle>
            <DialogDescription>
              Completa los datos del cliente para utilizarlo en tus facturas
            </DialogDescription>
          </DialogHeader>
          <ClientForm 
            onSaved={() => setShowClientForm(false)} 
            initialData={clientToEdit}
          />
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para añadir impuesto adicional */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir impuesto</DialogTitle>
            <DialogDescription>
              Puedes añadir retenciones (como IRPF) usando valores negativos
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <FormLabel htmlFor="taxName">Nombre del impuesto</FormLabel>
              <Input
                id="taxName"
                placeholder="Ej: IRPF, Retención..."
                value={newTaxData.name}
                onChange={(e) => setNewTaxData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <FormLabel htmlFor="taxAmount">Importe</FormLabel>
              <Input
                id="taxAmount"
                type="number"
                step="0.01"
                value={newTaxData.amount}
                onChange={(e) => setNewTaxData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
              <p className="text-sm text-muted-foreground">
                Para retenciones como el IRPF, usa valores negativos (ej: -15)
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                id="isPercentage"
                type="checkbox"
                checked={newTaxData.isPercentage}
                onChange={(e) => setNewTaxData(prev => ({ ...prev, isPercentage: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <FormLabel htmlFor="isPercentage" className="!m-0">
                Es un porcentaje
              </FormLabel>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTaxDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddNewTax}>
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceForm;