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
import { 
  MobileAccordion, 
  MobileAccordionContent, 
  MobileAccordionItem, 
  MobileAccordionTrigger 
} from "@/components/ui/accordion";
import { Trash2, Plus, FileText, Minus, CalendarIcon, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import FileUpload from "../common/FileUpload";
import { ClientForm } from "../clients/ClientForm";

// Importamos la lógica de cálculo y schemas desde InvoiceForm
function toNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'number') return value;
  // Asegurar que las comas se convierten a puntos para operaciones matemáticas
  const numericValue = parseFloat(String(value).replace(',', '.'));
  return isNaN(numericValue) ? defaultValue : numericValue;
}

// Función segura para calcular totales sin causar renderizados infinitos
function calculateInvoiceTotals(
  formInstance: any, 
  options: { executeUpdate?: boolean, silentMode?: boolean } = { executeUpdate: true, silentMode: false }
) {
  // Verificar que tenemos una instancia de formulario válida
  if (!formInstance || typeof formInstance.getValues !== 'function') {
    console.warn("⚠️ Se intentó calcular totales sin una instancia de formulario válida");
    return;
  }
  
  // Obtenemos los datos actuales usando la instancia pasada como parámetro
  const items = formInstance.getValues("items") || [];
  const additionalTaxes = formInstance.getValues("additionalTaxes") || [];
  
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
  
  // Si la opción executeUpdate está activada, actualizamos el formulario
  // Esto permite calcular sin actualizar cuando solo necesitamos los valores
  if (options.executeUpdate && formInstance) {
    try {
      // Actualizamos los items con los nuevos subtotales calculados - con captura de errores
      formInstance.setValue("items", updatedItems, { shouldValidate: false });
      
      // Actualizamos los totales de la factura sin validar para evitar pérdida de foco
      formInstance.setValue("subtotal", subtotal, { shouldValidate: false });
      formInstance.setValue("tax", tax, { shouldValidate: false });
      formInstance.setValue("total", safeTotal, { shouldValidate: false });
      
      // Log para debug solo si no estamos en modo silencioso
      if (!options.silentMode) {
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
      }
    } catch (error) {
      console.error("Error al actualizar valores del formulario:", error);
    }
  }
  
  // Devolvemos los valores calculados para uso inmediato si es necesario
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

interface MobileInvoiceFormProps {
  invoiceId?: number;
  initialData?: any; // Datos iniciales para el formulario
}

const MobileInvoiceForm = ({ invoiceId, initialData }: MobileInvoiceFormProps) => {
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
    onError: (error: any) => {
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

  // Fetch company data to get bank account info
  const { data: companyData, isLoading: companyLoading } = useQuery<any>({
    queryKey: ["/api/company"],
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

  // Efecto para añadir automáticamente el número de cuenta en las notas
  useEffect(() => {
    // Solo aplicar cuando obtengamos los datos de la empresa y no estemos en modo edición
    if (companyData && !isEditMode) {
      const bankAccount = companyData.bankAccount;
      
      if (bankAccount) {
        // Dejamos las notas vacías y usaremos la información bancaria en otra sección del PDF
        form.setValue("notes", "");
        console.log("✅ Notas vacías para evitar duplicación con información bancaria");
      }
    }
  }, [companyData, form, isEditMode]);

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
      // Registrar cada item para debug
      console.log(`   Item: ${item.description || 'Sin descripción'} (${item.quantity || 0} x €${item.unitPrice || 0})`);
      
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
  
  // Inicializa el formulario con los datos
  useEffect(() => {
    // Si estamos en modo edición y tenemos datos
    if (isEditMode) {
      let dataSource = null;
      let sourceType = "";
      
      // Determinar la fuente de datos a utilizar
      if (initialData && typeof initialData === 'object' && initialData !== null && 'invoice' in initialData && 'items' in initialData) {
        dataSource = initialData;
        sourceType = "initialData";
      } else if (invoiceData && typeof invoiceData === 'object' && invoiceData !== null && 'invoice' in invoiceData && 'items' in invoiceData) {
        dataSource = invoiceData;
        sourceType = "invoiceData";
      }
      
      // Si tenemos datos para procesar
      if (dataSource) {
        console.log(`⚡ Usando datos de ${sourceType} para la factura:`, dataSource);
        
        const { invoice, items } = dataSource;
        
        // Procesar los items (importante para el problema de los items que desaparecen)
        const processedItems = processInvoiceItems(items);
        
        // Transformar los datos para el formulario
        const formattedInvoice = {
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
          // Usar los items procesados
          items: processedItems,
          // Procesar impuestos adicionales
          additionalTaxes: processAdditionalTaxes(invoice.additionalTaxes)
        };
        
        console.log("🔄 Datos formateados para el formulario:", {
          ...formattedInvoice,
          items: `${processedItems.length} items`
        });
        
        // Actualizar el formulario con los datos formateados
        form.reset(formattedInvoice);
        
        // Si hay archivos adjuntos, actualizamos el estado
        if (invoice.attachments) {
          setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
        }
        
        // Recalcular totales después de que el formulario se haya actualizado completamente
        // Usamos un callback independiente para evitar renderizados infinitos
        // Usamos setTimeout con una referencia segura al formulario
        const formRef = form; // Capturamos la referencia en una constante estable
        window.setTimeout(() => {
          if (formRef) calculateInvoiceTotals(formRef);
        }, 200);
      }
    }
  }, [invoiceData, initialData, isEditMode, form]);

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
      // Calculamos primero para asegurar que los totales sean correctos
      calculateInvoiceTotals(form);
      
      // Combinar datos del formulario con archivos adjuntos
      const dataToSubmit = {
        ...data,
        attachments: attachments,
      };
      
      if (isEditMode) {
        return await apiRequest("PATCH", `/api/invoices/${invoiceId}`, dataToSubmit);
      } else {
        return await apiRequest("POST", "/api/invoices", dataToSubmit);
      }
    },
    onSuccess: (response: any) => {
      const messageAction = isEditMode ? "actualizada" : "creada";
      
      toast({
        title: `Factura ${messageAction}`,
        description: `La factura se ha ${messageAction} correctamente`,
      });
      
      // Invalidar las consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/stats/dashboard"] });
      
      // Redirigir a la página de detalles o lista según la acción
      if (!isEditMode) {
        const newId = response?.id;
        newId ? navigate(`/invoices/${newId}`) : navigate("/invoices");
      } else {
        // En modo edición, quedarse en la misma página y mostrar el mensaje de éxito
        // o navegar a la vista de detalle para ver los cambios
        navigate(`/invoices/${invoiceId}`);
      }
    },
    onError: (error: any) => {
      console.error("Error al guardar factura:", error);
      toast({
        title: "Error",
        description: `No se pudo guardar la factura: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InvoiceFormValues) => {
    // Asegurarnos de que los totales están calculados antes de enviar
    calculateInvoiceTotals(form);
    mutation.mutate(data);
  };

  const handleAddItem = () => {
    append({
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 21,
      subtotal: 0,
    });
  };

  const handleAddTax = () => {
    // Abrir el diálogo para agregar un impuesto personalizado
    setShowTaxDialog(true);
  };
  
  const handleAddTaxFromDialog = () => {
    // Validar que el nombre no esté vacío
    if (!newTaxData.name.trim()) {
      toast({
        title: "Nombre obligatorio",
        description: "Debes ingresar un nombre para el impuesto",
        variant: "destructive",
      });
      return;
    }
    
    // Agregar el impuesto al formulario
    appendTax({
      name: newTaxData.name,
      amount: newTaxData.amount,
      isPercentage: newTaxData.isPercentage
    });
    
    // Limpiar y cerrar el diálogo
    setNewTaxData({
      name: '',
      amount: 0,
      isPercentage: true
    });
    setShowTaxDialog(false);
    
    // Recalcular totales
    setTimeout(() => calculateInvoiceTotals(form), 100);
  };

  const handleFileUpload = (filePath: string) => {
    setAttachments((prev) => [...prev, filePath]);
  };

  // Effect for recalculating totals when values change
  useEffect(() => {
    // Suscribirse a los cambios en items para recalcular subtotales
    const { unsubscribe } = form.watch((value, { name, type }) => {
      // Solo recalcular si el cambio fue en un item o los impuestos
      if (name && (name.startsWith('items.') || name.startsWith('additionalTaxes.'))) {
        calculateInvoiceTotals(form, { silentMode: true });
      }
    });

    // Limpiar suscripción al desmontar
    return () => unsubscribe();
  }, [form]);

  if ((isEditMode && invoiceLoading && !initialData) || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mobile-invoice-form-wrapper">
          {/* MobileAccordion para datos de la factura */}
          <MobileAccordion type="single" defaultValue="invoice-data" collapsible className="MobileAccordion">
            <MobileAccordionItem value="invoice-data">
              <MobileAccordionTrigger 
                title="Datos de la factura" 
                icon={<FileText className="mr-2 h-5 w-5 text-blue-500" />} 
              />
              <MobileAccordionContent>
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
                                          if (confirm(`¿Estás seguro de que deseas eliminar el cliente ${client.name}?`)) {
                                            deleteClient(client.id);
                                          }
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
                          <button 
                            type="button"
                            onClick={() => setShowClientForm(true)}
                            className="button-apple-secondary button-apple-sm shrink-0"
                          >
                            Nuevo
                          </button>
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
                                        const formattedDate = format(date, "yyyy-MM-dd");
                                        console.log("Cambiando fecha de emisión a:", formattedDate);
                                        field.onChange(formattedDate);
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
                                        const formattedDate = format(date, "yyyy-MM-dd");
                                        console.log("Cambiando fecha de vencimiento a:", formattedDate);
                                        field.onChange(formattedDate);
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
              </MobileAccordionContent>
            </MobileAccordionItem>
          </MobileAccordion>

          {/* MobileAccordion para información adicional - inicialmente cerrado */}
          <MobileAccordion type="single" collapsible className="MobileAccordion">
            <MobileAccordionItem value="additional-info">
              <MobileAccordionTrigger 
                title="Información adicional" 
                icon={<Plus className="mr-2 h-5 w-5 text-green-500" />} 
              />
              <MobileAccordionContent>
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
                        {companyData?.bankAccount && 
                          <p className="text-sm text-gray-500 mt-1.5 italic">
                            *Se incluirá automáticamente el número de cuenta bancaria si el campo está vacío
                          </p>
                        }
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
              </MobileAccordionContent>
            </MobileAccordionItem>
          </MobileAccordion>

          {/* MobileAccordion para detalles de la factura - inicialmente cerrado */}
          <MobileAccordion type="single" collapsible className="MobileAccordion">
            <MobileAccordionItem value="invoice-details">
              <MobileAccordionTrigger 
                title="Detalles de la factura" 
                icon={<FileText className="mr-2 h-5 w-5 text-purple-500" />} 
              />
              <MobileAccordionContent>
                <div className="mb-4 space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-4 items-start"
                    >
                      <div className="col-span-12">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Desarrollo web, consultoría, etc."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Calculamos subtotal al cambiar la cantidad
                                    setTimeout(() => calculateInvoiceTotals(form), 100);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio (€)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Calculamos subtotal al cambiar el precio
                                    setTimeout(() => calculateInvoiceTotals(form), 100);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.taxRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IVA (%)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="1"
                                  min="0"
                                  onChange={(e) => {
                                    field.onChange(e);
                                    // Calculamos subtotal al cambiar el IVA
                                    setTimeout(() => calculateInvoiceTotals(form), 100);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-11">
                        <FormField
                          control={form.control}
                          name={`items.${index}.subtotal`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subtotal</FormLabel>
                              <div className="flex items-center bg-gray-50 rounded h-10 px-3 text-base">
                                {Number(field.value || 0).toFixed(2)}€
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1 flex justify-center items-end">
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              remove(index);
                              // Recalculamos tras eliminar
                              setTimeout(() => calculateInvoiceTotals(form), 100);
                            }}
                            className="h-8 w-8 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <Minus className="h-4 w-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="button-apple-secondary w-full flex items-center justify-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Añadir ítem
                  </button>
                  
                  {/* Sección de impuestos adicionales */}
                  <div className="mt-6 mb-3">
                    <div className="mb-3 flex items-center justify-between">
                      <FormLabel className="mb-0">Impuestos adicionales</FormLabel>
                      <button
                        type="button"
                        onClick={handleAddTax}
                        className="button-apple-secondary button-apple-sm text-xs h-8 flex items-center"
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Añadir impuesto
                      </button>
                    </div>
                    
                    {taxFields.length > 0 ? (
                      <div className="space-y-2">
                        {taxFields.map((taxField, index) => (
                          <div 
                            key={taxField.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-700">
                                {form.getValues(`additionalTaxes.${index}.name`)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {form.getValues(`additionalTaxes.${index}.isPercentage`) 
                                  ? `${form.getValues(`additionalTaxes.${index}.amount`)}%` 
                                  : `${form.getValues(`additionalTaxes.${index}.amount`)}€`
                                }
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTax(index)}
                              className="h-8 w-8 p-0 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No hay impuestos adicionales configurados
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg mt-3" style={{backgroundColor: 'rgba(250, 250, 252, 0.95)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)', backdropFilter: 'blur(10px)'}}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Subtotal sin IVA:
                        </span>
                        <span className="font-semibold">
                          {Number(form.getValues("subtotal") || 0).toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          IVA:
                        </span>
                        <span className="font-semibold">
                          {Number(form.getValues("tax") || 0).toFixed(2)}€
                        </span>
                      </div>
                      
                      {/* Impuestos adicionales en el resumen */}
                      {taxFields.map((field, index) => {
                        const taxName = form.getValues(`additionalTaxes.${index}.name`);
                        const taxAmount = form.getValues(`additionalTaxes.${index}.amount`);
                        const isPercentage = form.getValues(`additionalTaxes.${index}.isPercentage`);
                        const subtotal = form.getValues("subtotal") || 0;
                        
                        let displayAmount = 0;
                        if (isPercentage) {
                          displayAmount = subtotal * (taxAmount / 100);
                        } else {
                          displayAmount = taxAmount;
                        }
                        
                        return (
                          <div key={field.id} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {taxName}:
                            </span>
                            <span className="font-semibold">
                              {displayAmount.toFixed(2)}€ {isPercentage && `(${taxAmount}%)`}
                            </span>
                          </div>
                        );
                      })}
                      
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-semibold">
                          Total:
                        </span>
                        <span className="text-lg font-bold">
                          {Number(form.getValues("total") || 0).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </MobileAccordionContent>
            </MobileAccordionItem>
          </MobileAccordion>

          <div className="flex justify-between space-x-3 mt-8">
            <button
              type="button"
              className="button-apple-secondary flex-1"
              onClick={() => navigate("/invoices")}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={mutation.isPending}
              className="button-apple-primary flex-1"
            >
              {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar factura" : "Crear factura"}
            </button>
          </div>
        </form>
      </Form>

      {/* Form for adding or editing clients */}
      <ClientForm 
        open={showClientForm}
        onOpenChange={setShowClientForm}
        clientToEdit={clientToEdit}
        onClientCreated={(newClient) => {
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
          setShowClientForm(false);
          setClientToEdit(null);
          
          // Establecer el cliente recién creado como seleccionado
          if (newClient && newClient.id) {
            form.setValue("clientId", newClient.id);
          }
        }}
      />

      {/* Dialog for adding custom taxes */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Agregar impuesto o retención</DialogTitle>
            <DialogDescription>
              Especifica un nombre y un valor para el impuesto o retención
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input 
                placeholder="Ej: IRPF, Retención, etc." 
                value={newTaxData.name}
                onChange={(e) => setNewTaxData({...newTaxData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor</label>
              <div className="flex items-center">
                <Input 
                  type="number"
                  step="0.01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Importe o porcentaje"
                  value={newTaxData.amount}
                  onChange={(e) => setNewTaxData({...newTaxData, amount: parseFloat(e.target.value)})}
                />
                <button
                  type="button"
                  className="button-apple-secondary button-apple-sm ml-2 px-3 h-10 min-w-10"
                  onClick={() => setNewTaxData({...newTaxData, isPercentage: !newTaxData.isPercentage})}
                >
                  {newTaxData.isPercentage ? '%' : '€'}
                </button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <button 
              type="button" 
              className="button-apple-secondary"
              onClick={() => setShowTaxDialog(false)}
            >
              Cancelar
            </button>
            <button 
              type="button" 
              className="button-apple-primary"
              onClick={handleAddTaxFromDialog}
            >
              Agregar impuesto
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MobileInvoiceForm;