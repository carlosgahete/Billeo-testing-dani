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
import { Trash2, Plus, FileText, Minus, CalendarIcon, Pencil, ChevronDown, Loader2, User, AlertTriangle, UserPlus, UserX } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { forceDashboardRefresh, notifyDashboardUpdate } from "@/lib/dashboard-helpers";
import { useLocation } from "wouter";
import InvoiceValidationAlert from "./InvoiceValidationAlert";
import FileUpload from "../common/FileUpload";
import { ClientForm } from "../clients/ClientForm";
import { ClientFormNoSubmit } from "../clients/ClientFormNoSubmit";

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
  taxRate: z.coerce.number(), // Permitimos valores negativos para impuestos (como IRPF -21%)
  subtotal: z.coerce.number().optional(), // Permitimos cualquier valor incluido negativo
});

// Define schema for the whole invoice
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio"),
  clientId: z.coerce.number({
    required_error: "El cliente es obligatorio",
  }),
  issueDate: z.string().min(1, "La fecha de emisión es obligatoria"),
  dueDate: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  subtotal: z.coerce.number(), // Permitimos cualquier valor de base imponible, incluyendo negativos
  tax: z.coerce.number(), // Permitimos valores negativos para impuestos
  total: z.coerce.number(), // Permitimos cualquier valor total
  additionalTaxes: z.array(additionalTaxSchema).optional().default([]),
  status: z.string().min(1, "El estado es obligatorio"),
  notes: z.string().nullable().optional(),
  attachments: z.array(z.string()).nullable().optional(),
  items: z.array(invoiceItemSchema).min(1, "Agrega al menos un ítem a la factura"),
}).refine((data) => {
  // Aseguramos que la fecha de vencimiento no sea anterior a la fecha de emisión
  const issueDate = new Date(data.issueDate);
  const dueDate = new Date(data.dueDate);
  return dueDate >= issueDate;
}, {
  message: "La fecha de vencimiento no puede ser anterior a la fecha de emisión",
  path: ["dueDate"] // Este campo mostrará el error
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
  const [selectedClientInfo, setSelectedClientInfo] = useState<any>(null);
  
  // Obtener la lista de clientes
  const { data: clientList, isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Estado para controlar si el usuario quiere enviar el formulario
  const [userInitiatedSubmit, setUserInitiatedSubmit] = useState(false);
  
  // Estado para mostrar el diálogo de validación
  const [showValidation, setShowValidation] = useState(false);
  
  const isEditMode = !!invoiceId;
  
  // Bandera adicional para bloquear completamente envíos de formulario durante un periodo
  const [blockAllSubmits, setBlockAllSubmits] = useState(false);
  
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
    console.log("🔍 Procesando impuestos adicionales:", additionalTaxes);
    
    let result: any[] = [];
    
    if (!additionalTaxes) {
      console.log("❌ No hay impuestos adicionales");
      return [];
    }
    
    // Si es una cadena JSON, intentamos parsearlo
    if (typeof additionalTaxes === 'string') {
      try {
        result = JSON.parse(additionalTaxes);
        console.log("✅ Impuestos parseados desde JSON:", result);
      } catch (e) {
        console.error("❌ Error al parsear additionalTaxes como JSON:", e);
        result = [];
      }
    } 
    // Si ya es un array, lo usamos directamente
    else if (Array.isArray(additionalTaxes)) {
      result = additionalTaxes;
      console.log("✅ Impuestos como array directo:", result);
    }
    // Si es un objeto simple, intentamos convertirlo
    else if (typeof additionalTaxes === 'object') {
      result = [additionalTaxes];
      console.log("✅ Impuesto como objeto individual:", result);
    }
    
    const processed = result.map((tax: any) => {
      let amount = Number(tax.amount || 0);
      const name = tax.name || "";
      const isPercentage = tax.isPercentage !== undefined ? tax.isPercentage : false;
      
      // IMPORTANTE: Si es IRPF y el valor es positivo, convertirlo a negativo
      if (name.toLowerCase().includes('irpf') && amount > 0) {
        amount = -Math.abs(amount);
        console.log(`🔧 Corrigiendo IRPF: ${tax.amount} → ${amount}`);
      }
      
      const processedTax = {
        name,
        amount,
        isPercentage
      };
      
      console.log(`🏷️ Procesado impuesto: ${processedTax.name} = ${processedTax.amount}${processedTax.isPercentage ? '%' : '€'}`);
      return processedTax;
    });
    
    console.log("✅ Impuestos procesados finalmente:", processed);
    return processed;
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
      
      console.log("📝 Preparando datos para edición de factura:", invoice.id);
      
      return {
        ...invoice,
        invoiceNumber: invoice.invoiceNumber || "",
        clientId: invoice.clientId || 0,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        status: invoice.status || "pending",
        notes: invoice.notes || "",
        // NO usar los totales precalculados de la BD, dejar que el formulario los calcule
        subtotal: 0, // Se calculará automáticamente
        tax: 0, // Se calculará automáticamente
        total: 0, // Se calculará automáticamente
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
    
    // SIEMPRE calculamos el subtotal a partir de los ítems para que sea reactivo
    // Esto permite que los totales se recalculen automáticamente cuando cambian cantidades/precios
    const subtotal = updatedItems.reduce(
      (sum: number, item: any) => sum + toNumber(item.subtotal, 0),
      0
    );
    
    console.log("📐 Subtotal calculado desde items:", subtotal);
    
    // Calculamos IVA basado en la tasa de cada item
    const tax = updatedItems.reduce((sum: number, item: any) => {
      const itemTax = toNumber(item.subtotal, 0) * (toNumber(item.taxRate, 0) / 100);
      return sum + itemTax;
    }, 0);
    
    // Calculamos impuestos adicionales correctamente
    let additionalTaxesTotal = 0;
    (additionalTaxes || []).forEach((taxItem: any) => {
      let taxAmount;
      if (taxItem.isPercentage) {
        // Para porcentajes, usar el valor exacto del amount (que puede ser negativo)
        taxAmount = subtotal * (taxItem.amount / 100);
      } else {
        // Para valores fijos, usar el valor directamente
        taxAmount = Number(taxItem.amount);
      }
      
      additionalTaxesTotal += taxAmount;
      
      // Debug log para ver qué está pasando
      console.log(`💰 Impuesto ${taxItem.name}: ${taxItem.amount}${taxItem.isPercentage ? '%' : '€'} = ${taxAmount.toFixed(2)}€`);
    });
    
    // Total final con todos los impuestos
    const total = subtotal + tax + additionalTaxesTotal;
    
    console.log(`📊 Cálculo final: ${subtotal} + ${tax.toFixed(2)} + ${additionalTaxesTotal.toFixed(2)} = ${total.toFixed(2)}`);
    
    return {
      updatedItems,
      subtotal,
      tax,
      additionalTaxesTotal,
      total
    };
  };
  
  // Usamos useMemo para memorizar los totales calculados y watch para detectar TODOS los cambios
  const allFormValues = form.watch(); // Observa TODOS los cambios del formulario
  
  const calculatedTotals = useMemo(() => {
    const result = calculateTotals();
    console.log("🔄 Recalculando totales:", result);
    return result;
  }, [allFormValues]); // Dependemos de todos los valores del formulario

  // Efecto para recalcular totales cuando cambian los datos relevantes
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log("👀 Detectado cambio en:", name, "tipo:", type);
      
      // Solo recalcular para cambios relevantes
      if (name?.includes("items") || name?.includes("additionalTaxes") || name?.includes("quantity") || name?.includes("unitPrice")) {
        console.log("🔄 Forzando recálculo por cambio relevante");
        // Forzar recálculo actualizando los valores calculados en el formulario
        setTimeout(() => {
          const newTotals = calculateTotals();
          form.setValue("subtotal", newTotals.subtotal, { shouldValidate: false });
          form.setValue("tax", newTotals.tax, { shouldValidate: false });
          form.setValue("total", newTotals.total, { shouldValidate: false });
        }, 10);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // =============== MANEJADORES DE EVENTOS =================
  
  // Función para agregar un nuevo impuesto adicional
  const handleAddTax = (taxType?: string) => {
    // Primero verificamos si ya existe un impuesto del mismo tipo
    const formValues = form.getValues();
    const currentTaxes = formValues.additionalTaxes || [];
    
    if (taxType === 'irpf') {
      // Verificar si ya existe un impuesto IRPF
      const hasIrpf = currentTaxes.some(tax => tax.name === "IRPF");
      if (!hasIrpf) {
        appendTax({ 
          name: "IRPF", 
          amount: -15, 
          isPercentage: true 
        });
        console.log("➕ Añadido IRPF -15%");
      }
    } else if (taxType === 'iva') {
      // Verificar si ya existe un impuesto IVA adicional
      const hasIva = currentTaxes.some(tax => tax.name === "IVA adicional");
      if (!hasIva) {
        appendTax({ 
          name: "IVA adicional", 
          amount: 21, 
          isPercentage: true 
        });
        console.log("➕ Añadido IVA adicional 21%");
      }
    } else {
      setNewTaxData({ name: "", amount: 0, isPercentage: false });
      setShowTaxDialog(true);
    }
    
    // Forzar recálculo inmediato
    setTimeout(() => {
      const newTotals = calculateTotals();
      form.setValue("subtotal", newTotals.subtotal, { shouldValidate: false });
      form.setValue("tax", newTotals.tax, { shouldValidate: false });
      form.setValue("total", newTotals.total, { shouldValidate: false });
      console.log("🔄 Totales recalculados después de añadir impuesto");
    }, 100);
  };
  
  // Función para agregar impuesto desde el diálogo
  const handleAddTaxFromDialog = () => {
    const formValues = form.getValues();
    const currentTaxes = formValues.additionalTaxes || [];
    
    // Verificar si ya existe un impuesto con el mismo nombre
    const existingTaxIndex = currentTaxes.findIndex(tax => tax.name === newTaxData.name);
    
    if (existingTaxIndex >= 0) {
      // Si ya existe, simplemente actualizamos su valor
      const updatedTaxes = [...currentTaxes];
      updatedTaxes[existingTaxIndex] = newTaxData;
      form.setValue('additionalTaxes', updatedTaxes);
    } else {
      // Si no existe, lo añadimos
      appendTax(newTaxData);
    }
    
    setShowTaxDialog(false);
    
    // Forzar recálculo inmediato
    setTimeout(() => {
      const newTotals = calculateTotals();
      form.setValue("subtotal", newTotals.subtotal, { shouldValidate: false });
      form.setValue("tax", newTotals.tax, { shouldValidate: false });
      form.setValue("total", newTotals.total, { shouldValidate: false });
      console.log("🔄 Totales recalculados después de añadir impuesto personalizado");
    }, 100);
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
  
  // Función para eliminar un impuesto y recalcular
  const handleRemoveTax = (index: number) => {
    removeTax(index);
    console.log(`➖ Eliminado impuesto en índice ${index}`);
    
    // Forzar recálculo inmediato
    setTimeout(() => {
      const newTotals = calculateTotals();
      form.setValue("subtotal", newTotals.subtotal, { shouldValidate: false });
      form.setValue("tax", newTotals.tax, { shouldValidate: false });
      form.setValue("total", newTotals.total, { shouldValidate: false });
      console.log("🔄 Totales recalculados después de eliminar impuesto");
    }, 100);
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
    console.log("🔄 Cliente creado/actualizado", data.id);
    
    // Explícitamente desactivamos cualquier envío de formulario
    setUserInitiatedSubmit(false);
    
    // Actualizamos la lista de clientes para asegurarnos de que está actualizada
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    
    // Guardamos una copia de los datos actuales por si acaso
    const currentValues = form.getValues();
    
    // Si es un nuevo cliente (no edición)
    if (!clientToEdit) {
      console.log("✅ Seleccionando nuevo cliente en el formulario:", data.id);
      
      // Actualizamos el clientId en el formulario
      form.setValue("clientId", data.id, {
        shouldDirty: true, 
        shouldTouch: true,
        shouldValidate: false
      });
      
      // Guardamos la información del cliente para mostrarla
      setSelectedClientInfo(data);
    }
    
    // Limpiamos los estados relacionados con el modal de cliente
    setClientToEdit(null);
    
    // Y mostramos un mensaje al usuario
    toast({
      title: clientToEdit ? "Cliente actualizado" : "Cliente creado",
      description: `El cliente ${data.name} ha sido ${clientToEdit ? 'actualizado' : 'creado'} correctamente`,
    });
    
    // Prevenimos explícitamente cualquier envío automático del formulario
    setTimeout(() => {
      console.log("🛡️ Manteniendo estado de envío inactivo");
      setUserInitiatedSubmit(false);
    }, 500);
  };
  
  // Función para manejar el cierre del modal de cliente
  const handleClientModalClose = (open: boolean) => {
    if (!open) {
      setClientToEdit(null);
      
      // Asegurarnos de que no se envíe el formulario automáticamente al cerrar el modal
      setUserInitiatedSubmit(false);
      console.log("🛡️ Bandera de envío automático desactivada al cerrar modal cliente");
      
      // Verificar y restaurar datos si fuera necesario
      const currentFormData = form.getValues();
      if (!currentFormData.clientId && selectedClientInfo) {
        console.log("🔄 Restaurando datos de cliente seleccionado tras cierre de modal");
        form.setValue("clientId", selectedClientInfo.id);
      }
    }
    setShowClientForm(open);
  };
  
  // Función para manejar la selección de cliente del desplegable
  const handleClientSelection = (clientId: string) => {
    // Prevenir que esta selección de cliente cause un envío automático
    if (blockAllSubmits) {
      console.log("⚠️ Selección de cliente durante periodo de bloqueo, evitando posible envío");
      setUserInitiatedSubmit(false);
    }
    
    if (clientList && Array.isArray(clientList)) {
      // Buscamos el cliente seleccionado en la lista de clientes
      const selectedClient = clientList.find((client: any) => client.id.toString() === clientId);
      
      if (selectedClient) {
        // Guardamos toda la información del cliente seleccionado en el estado
        setSelectedClientInfo(selectedClient);
        console.log("✅ Cliente seleccionado manualmente:", selectedClient.name);
      }
    } else {
      console.warn("⚠️ Lista de clientes no disponible o no es un array");
    }
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
      
      // Notificar al servidor sobre el cambio utilizando el nuevo sistema de polling
      // Esto actualiza el estado del dashboard para todos los clientes conectados
      notifyDashboardUpdate(isEditMode ? 'invoice-updated' : 'invoice-created')
        .then(success => {
          if (success) {
            console.log("✅ Notificación de actualización del dashboard enviada correctamente");
          } else {
            console.warn("⚠️ No se pudo enviar la notificación de actualización");
          }
        });
      
      // Forzar actualización local de los datos del dashboard
      forceDashboardRefresh({
        dispatchEvents: true,
        silentMode: false
      }).then(() => {
        // Refrescar explícitamente todas las consultas relevantes
        console.log("⚡ Refrescando todas las consultas relevantes");
        queryClient.refetchQueries({ queryKey: ["dashboard"] });
        queryClient.refetchQueries({ queryKey: ["invoices"] });
        
        // Realizar una segunda actualización después de un breve retraso
        setTimeout(() => {
          console.log("🔄 Segunda actualización del dashboard");
          forceDashboardRefresh({ silentMode: true });
        }, 800);
      })
      .catch(err => console.error("❌ Error al recargar dashboard:", err));
      
      toast({
        title: isEditMode ? "Factura actualizada" : "Factura creada",
        description: isEditMode
          ? "La factura se ha actualizado correctamente"
          : "La factura se ha creado correctamente",
      });
      
      // Solo redirigir si NO estamos en el modal de cliente
      if (!showClientForm) {
        console.log("Redirigiendo a /invoices");
        navigate("/invoices");
      } else {
        console.log("No redirigiendo porque el modal de cliente está abierto");
      }
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
  
  // Escuchar eventos personalizados de prevención de envío automático
  useEffect(() => {
    const preventFormSubmitHandler = () => {
      console.log("🛑 Recibida solicitud para bloquear envíos de formulario de factura");
      setUserInitiatedSubmit(false);
      setBlockAllSubmits(true);
      
      // Liberar el bloqueo después de un tiempo
      setTimeout(() => {
        setBlockAllSubmits(false);
        console.log("✅ Liberado bloqueo de envío de formulario de factura");
      }, 1000);
    };
    
    // Manejador específico para cuando se selecciona un cliente después de crearlo
    const clientSelectedHandler = () => {
      console.log("📢 Cliente seleccionado después de crearlo, evitando envío automático");
      setUserInitiatedSubmit(false);
      setBlockAllSubmits(true);
      
      // Mostrar toast informativo
      toast({
        title: "Cliente seleccionado",
        description: "Ya puede continuar completando la factura y enviarla cuando esté lista",
      });
      
      // Liberar el bloqueo después de un tiempo más largo para asegurar que no haya envío automático
      setTimeout(() => {
        setBlockAllSubmits(false);
        console.log("✅ Liberado bloqueo especial tras selección de cliente");
      }, 2000);
    };
    
    // Nuevo manejador para el bloqueo total de envíos por tiempo extendido
    const blockAllSubmissionsHandler = (e: any) => {
      console.log("🚫 Bloqueando TODOS los envíos de formulario por tiempo extendido:", e.detail);
      
      // Desactivar completamente la posibilidad de enviar el formulario
      setUserInitiatedSubmit(false);
      setBlockAllSubmits(true);
      
      // Mostrar mensaje al usuario
      toast({
        title: "Cliente creado con éxito",
        description: "El cliente ha sido creado. Ahora complete los datos de la factura y haga clic en Crear Factura cuando esté listo.",
      });
      
      // Mantener el bloqueo por un tiempo prolongado (3 segundos)
      setTimeout(() => {
        setBlockAllSubmits(false);
        console.log("✅ Liberado bloqueo extendido de envíos");
      }, 3000);
    };
    
    window.addEventListener('prevent-invoice-submit', preventFormSubmitHandler);
    window.addEventListener('client-form-closing', preventFormSubmitHandler);
    window.addEventListener('client-selected-do-not-submit', clientSelectedHandler);
    window.addEventListener('block-all-submissions', blockAllSubmissionsHandler);
    
    return () => {
      window.removeEventListener('prevent-invoice-submit', preventFormSubmitHandler);
      window.removeEventListener('client-form-closing', preventFormSubmitHandler);
      window.removeEventListener('client-selected-do-not-submit', clientSelectedHandler);
      window.removeEventListener('block-all-submissions', blockAllSubmissionsHandler);
    };
  }, []);
  
  // Función para verificar la validez de los datos de la factura
  const verifyInvoiceValidity = () => {
    const data = form.getValues();
    
    // Verificamos si hay un cliente seleccionado
    const hasClient = !!data.clientId;
    
    // Verificamos si hay importe (base imponible)
    const hasAmount = calculatedTotals.subtotal > 0;
    
    // Verificamos si tiene impuestos (IVA/IRPF) o razón de exención
    const hasTaxes = calculatedTotals.tax > 0 || (data.additionalTaxes && data.additionalTaxes.length > 0);
    
    // Verificamos si tiene razón de exención fiscal
    const hasExemptionReason = (data.notes?.toLowerCase().includes('exención') === true) || 
                              (data.notes?.toLowerCase().includes('exento') === true) ||
                              (data.notes?.toLowerCase().includes('no sujeto') === true);
    
    // Verificamos si tiene fecha de factura válida
    const hasDate = !!data.issueDate;
    
    return {
      hasClient,
      hasAmount,
      hasTaxes,
      hasExemptionReason,
      hasDate
    };
  };
  
  // Función para manejar el botón de envío
  const handleSubmitButtonClick = () => {
    console.log("🔘 Click en botón de envío (modo:", isEditMode ? "edición" : "creación", ")");
    
    // Verificamos los datos de la factura
    const validity = verifyInvoiceValidity();
    console.log("📋 Validación:", validity);
    
    // Si el formulario es válido, procedemos con el envío
    if (validity.hasClient && validity.hasAmount && (validity.hasTaxes || validity.hasExemptionReason) && validity.hasDate) {
      console.log("✅ Validación pasada, enviando formulario");
      setUserInitiatedSubmit(true);
      
      // Llamar a handleSubmit directamente con los datos del formulario
      const formData = form.getValues();
      
      // En modo edición, llamamos inmediatamente
      if (isEditMode) {
        handleSubmit(formData);
      } else {
        // En modo creación, usamos un pequeño delay
        setTimeout(() => {
          handleSubmit(formData);
        }, 50);
      }
    } else {
      console.log("❌ Validación fallida, mostrando diálogo");
      // Mostramos diálogo de validación
      setShowValidation(true);
    }
  };
  
  // Manejar submit del formulario
  const handleSubmit = (data: InvoiceFormValues) => {
    console.log("🚀 handleSubmit ejecutado con datos:", data);
    console.log("🔍 Estado actual - userInitiatedSubmit:", userInitiatedSubmit, "blockAllSubmits:", blockAllSubmits);
    
    // Si el modal de cliente está abierto, evitamos enviar el formulario de factura
    if (showClientForm) {
      console.log("⚠️ Modal de cliente abierto, ignorando submit de factura");
      return;
    }
    
    // Verificamos si hay un bloqueo activo (especialmente después de crear un cliente)
    if (blockAllSubmits) {
      console.log("⚠️ Bloqueo activo, ignorando submit de factura");
      
      // Notificar al usuario
      toast({
        title: "Formulario en proceso",
        description: "Espere un momento antes de enviar la factura",
        variant: "destructive",
      });
      
      return;
    }
    
    // En modo edición, relajamos las validaciones de envío automático
    if (!isEditMode && !userInitiatedSubmit) {
      console.log("⚠️ Modo creación: Detectado envío automático del formulario, bloqueando...");
      console.log("userInitiatedSubmit actual:", userInitiatedSubmit);
      
      // Prevenimos el envío automático, pero guardamos los datos actuales para referencia
      const currentFormData = form.getValues();
      console.log("Datos actuales preservados:", currentFormData);
      
      // Notificar que se detectó un envío automático (posiblemente después de crear cliente)
      toast({
        title: "Acción bloqueada",
        description: "Por favor, complete todos los datos de la factura y después pulse 'Crear Factura'",
      });
      
      return;
    }
    
    console.log("✅ Verificaciones de seguridad pasadas (modo:", isEditMode ? "edición" : "creación", ")");
    
    // Verificamos que tengamos datos mínimos para crear una factura válida
    if (!data.clientId) {
      console.log("⚠️ No se puede procesar factura sin cliente");
      toast({
        title: "Cliente requerido",
        description: "Debes seleccionar un cliente para la factura",
        variant: "destructive",
      });
      setUserInitiatedSubmit(false);
      return;
    }
    
    if (!data.items || data.items.length === 0 || 
        !data.items.some(item => item.description && (item.quantity > 0 || item.unitPrice > 0))) {
      console.log("⚠️ No se puede procesar factura sin líneas de concepto válidas");
      toast({
        title: "Conceptos requeridos",
        description: "Añade al menos un concepto a la factura con descripción e importe",
        variant: "destructive",
      });
      setUserInitiatedSubmit(false);
      return;
    }
    
    // Actualizar los datos con los totales calculados
    data.subtotal = calculatedTotals.subtotal;
    data.tax = calculatedTotals.tax;
    data.total = calculatedTotals.total;
    
    console.log("✅ Enviando datos de factura (modo: " + (isEditMode ? "edición" : "creación") + ")", data);
    
    // Enviar datos
    mutation.mutate(data);
    
    // Resetear la bandera después de enviar SOLO si no estamos en modo edición
    if (!isEditMode) {
      setUserInitiatedSubmit(false);
    }
  };

  // =============== DATOS DE LA APLICACIÓN =================
  
  // Ya tenemos los datos de los clientes a través de clientList, evitamos la duplicación

  // Cargar datos de la empresa
  const { data: companyData, isLoading: companyLoading } = useQuery<any>({
    queryKey: ["/api/company"],
  });

  // Mostrar pantalla de carga mientras esperamos datos necesarios
  if ((isEditMode && !initialData) || isLoadingClients) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  // =============== RENDER DEL FORMULARIO =================
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={(e) => {
          // Siempre prevenimos el envío automático del formulario
          console.log("⛔ Interceptando envío de formulario");
          
          // Detener la propagación del evento
          e.stopPropagation();
          
          // Prevenir el comportamiento predeterminado
          e.preventDefault();
          
          // Verificar si hay un bloqueo activo
          if (blockAllSubmits) {
            console.log("🚫 Formulario bloqueado, ignorando completamente el envío");
            toast({
              title: "Formulario bloqueado",
              description: "Por favor, espere un momento antes de enviar la factura",
            });
            return false;
          }
          
          // El envío real se hace a través del botón y la validación
          console.log("⚠️ Envío interceptado, use el botón 'Crear Factura' para enviar cuando esté listo");
          return false;
        }} className="space-y-6">
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
                              onValueChange={(value) => {
                                field.onChange(Number(value));
                                handleClientSelection(value);
                              }}
                              value={field.value ? field.value.toString() : undefined}
                            >
                              <FormControl>
                                <SelectTrigger className="border-blue-200 focus:border-blue-300 h-12">
                                  <SelectValue placeholder="Seleccione un cliente existente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-72">
                                {Array.isArray(clientList) && clientList.length > 0 ? (
                                  clientList.map((client: any) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      <div className="flex flex-col py-1">
                                        <span className="font-medium">{client.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {client.taxId} - {client.city || client.address}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-2 py-4 text-sm text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                      <UserX className="h-5 w-5 text-gray-400" />
                                      <span>No hay clientes disponibles</span>
                                      <span className="text-xs">Cree sus clientes primero en la sección de Clientes</span>
                                    </div>
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              toast({
                                title: "Recomendación",
                                description: "Para evitar problemas, te recomendamos crear los clientes desde la sección 'Clientes'",
                                variant: "default"
                              });
                              navigate("/clients/create");
                            }}
                            className="shrink-0 flex items-center gap-1 h-12"
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Ir a crear cliente
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mostrar información del cliente seleccionado */}
                  {selectedClientInfo && (
                    <div className="mt-4 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-semibold mb-2 text-blue-700 flex items-center">
                        <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                        Datos del cliente seleccionado
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Nombre:</p>
                          <p className="font-medium">{selectedClientInfo.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">NIF/CIF:</p>
                          <p className="font-medium">{selectedClientInfo.taxId}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Dirección:</p>
                          <p className="font-medium">{selectedClientInfo.address}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Ciudad:</p>
                          <p className="font-medium">{selectedClientInfo.city}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Código Postal:</p>
                          <p className="font-medium">{selectedClientInfo.postalCode}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">País:</p>
                          <p className="font-medium">{selectedClientInfo.country}</p>
                        </div>
                        {selectedClientInfo.email && (
                          <div>
                            <p className="text-gray-500">Email:</p>
                            <p className="font-medium">{selectedClientInfo.email}</p>
                          </div>
                        )}
                        {selectedClientInfo.phone && (
                          <div>
                            <p className="text-gray-500">Teléfono:</p>
                            <p className="font-medium">{selectedClientInfo.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
                                <PopoverContent className="w-auto p-0 calendar-md">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(format(date, "yyyy-MM-dd"));
                                      }
                                    }}
                                    disabled={(date) => false}
                                    initialFocus
                                    className="rounded-md border shadow p-2 text-sm calendar-md"
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
                                <PopoverContent className="w-auto p-0 calendar-md">
                                  <Calendar
                                    mode="single"
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(format(date, "yyyy-MM-dd"));
                                      }
                                    }}
                                    disabled={(date) => false}
                                    initialFocus
                                    className="rounded-md border shadow p-2 text-sm calendar-md"
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
                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={() => handleAddTax('irpf')}
                    className="flex items-center justify-center px-6 py-8 text-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-2xl rounded-xl w-44 h-24"
                  >
                    <Minus className="mr-3 h-8 w-8" />
                    IRPF (15%)
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="lg"
                    onClick={() => handleAddTax('iva')}
                    className="flex items-center justify-center px-6 py-8 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xl rounded-xl w-44 h-24"
                  >
                    <Plus className="mr-3 h-8 w-8" />
                    IVA (21%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => handleAddTax()}
                    className="flex items-center justify-center px-6 py-8 text-xl font-semibold bg-gray-50 hover:bg-gray-100 border-gray-300 shadow-xl rounded-xl h-24"
                  >
                    <Plus className="mr-3 h-8 w-8" />
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
                          if (!taxItem) return null;
                          
                          const isPercentage = taxItem.isPercentage === true;
                          const amount = toNumber(taxItem.amount, 0);
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
                                  onClick={() => handleRemoveTax(index)}
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
                        
                        const isPercentage = taxItem.isPercentage === true;
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
                type="button" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={mutation.isPending}
                onClick={handleSubmitButtonClick}
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
              <label htmlFor="tax-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nombre</label>
              <Input 
                id="tax-name" 
                placeholder="IRPF, IVA, etc." 
                value={newTaxData.name}
                onChange={e => setNewTaxData({...newTaxData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tax-amount" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Importe</label>
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
                checked={newTaxData.isPercentage === true}
                onChange={e => setNewTaxData({...newTaxData, isPercentage: e.target.checked})}
              />
              <label htmlFor="is-percentage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Es un porcentaje</label>
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

      {/* Eliminado el modal de cliente - Ahora solo se usa la sección dedicada de Clientes */}
      {isEditMode ? (
        <ClientForm 
          open={false} // Mantenemos pero siempre cerrado para no romper funcionalidad
          onOpenChange={handleClientModalClose}
          onClientCreated={handleClientCreated}
          clientToEdit={clientToEdit}
        />
      ) : (
        <Dialog open={false}> {/* Dialog vacío para evitar errores */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redirección a sección de clientes</DialogTitle>
              <DialogDescription>
                Para evitar problemas, ahora debe crear los clientes en la sección de Clientes.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button type="button" onClick={() => navigate("/clients/create")}>
                Ir a Clientes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Alerta de validación de factura */}
      <InvoiceValidationAlert 
        show={showValidation}
        onClose={() => setShowValidation(false)}
        onSubmit={async () => {
          setShowValidation(false);
          
          // Activar la bandera de envío iniciado por usuario
          setUserInitiatedSubmit(true);
          
          // Obtener los datos del formulario
          const data = form.getValues();
          
          // Llamar directamente a handleSubmit con los datos del formulario
          console.log("✅ Validación aceptada desde el diálogo, procesando envío manual");
          handleSubmit(data);
        }}
        hasClient={!!form.getValues().clientId}
        hasAmount={calculatedTotals.subtotal > 0}
        hasTaxes={calculatedTotals.tax > 0 || (form.getValues().additionalTaxes?.length || 0) > 0}
        hasExemptionReason={
          (form.getValues().notes?.toLowerCase().includes('exención') === true) || 
          (form.getValues().notes?.toLowerCase().includes('exento') === true) ||
          (form.getValues().notes?.toLowerCase().includes('no sujeto') === true)
        }
      />
    </>
  );
};

export default InvoiceFormSimple;