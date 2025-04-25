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
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { forceDashboardRefresh, notifyDashboardUpdate } from "@/lib/dashboard-helpers";
import { useLocation } from "wouter";
import { InvoiceValidationAlert } from "./InvoiceValidationAlert";
import FileUpload from "../common/FileUpload";
import { 
  Trash2, 
  Plus, 
  FileText, 
  Minus, 
  CalendarIcon, 
  Pencil, 
  ChevronDown, 
  Loader2, 
  User, 
  AlertTriangle,
  UserPlus, 
  UserX,
  Check 
} from "lucide-react";

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

const InvoiceFormFixed = ({ invoiceId, initialData }: InvoiceFormProps) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [newTaxData, setNewTaxData] = useState<{ name: string; amount: number; isPercentage: boolean }>({
    name: '',
    amount: 0,
    isPercentage: true
  });
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
  
  // Bandera adicional para bloquear envíos de formulario
  const [blockAllSubmits, setBlockAllSubmits] = useState(false);
  
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
    const { items = [], additionalTaxes = [], subtotal: userSubmittedSubtotal } = form.getValues();
    
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
    
    // Calculamos subtotal de la factura solo si no hay un valor específico ingresado por el usuario
    // Esto permite al usuario sobrescribir el subtotal calculado si lo desea
    let subtotal;
    if (userSubmittedSubtotal !== undefined && userSubmittedSubtotal !== null && userSubmittedSubtotal !== 0) {
      // Usamos el subtotal ingresado por el usuario
      subtotal = toNumber(userSubmittedSubtotal);
      console.log("✅ Respetando valor de base imponible ingresado por el usuario:", subtotal);
    } else {
      // Calculamos el subtotal a partir de los ítems
      subtotal = updatedItems.reduce(
        (sum: number, item: any) => sum + toNumber(item.subtotal, 0),
        0
      );
    }
    
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
      total // Permitimos valores negativos para el total
    };
  };
  
  // Usamos useMemo para memorizar los totales calculados (solo se recalcula cuando form cambia)
  const calculatedTotals = useMemo(() => {
    return calculateTotals();
  }, [form.watch()]);
  
  // Actualizar valores calculados en el formulario
  useEffect(() => {
    form.setValue("subtotal", calculatedTotals.subtotal);
    form.setValue("tax", calculatedTotals.tax);
    form.setValue("total", calculatedTotals.total);
    
    // Actualizar subtotales de items individuales
    calculatedTotals.updatedItems.forEach((item, index) => {
      form.setValue(`items.${index}.subtotal`, item.subtotal);
    });
  }, [calculatedTotals, form]);
  
  // =============== EFECTOS Y SINCRONIZACIONES =================
  
  // Si el usuario selecciona un cliente, cargar sus datos
  useEffect(() => {
    const clientId = form.getValues().clientId;
    if (clientId && Array.isArray(clientList)) {
      const client = clientList.find((c: any) => c.id === clientId);
      if (client) {
        setSelectedClientInfo(client);
      }
    }
  }, [clientList]);
  
  // Efecto para manejar números de factura automáticos si no viene indicado
  useEffect(() => {
    if (!isEditMode && (!form.getValues().invoiceNumber || form.getValues().invoiceNumber === "")) {
      // Si es una nueva factura y no tiene número asignado, intentamos obtener uno automático
      const fetchNextInvoiceNumber = async () => {
        try {
          const response = await fetch('/api/invoices/next-number');
          const data = await response.json();
          
          if (data && data.nextNumber) {
            form.setValue("invoiceNumber", data.nextNumber);
          }
        } catch (error) {
          console.error("Error al obtener número de factura:", error);
        }
      };
      
      fetchNextInvoiceNumber();
    }
  }, [form, isEditMode]);
  
  // =============== FUNCIONES PARA MANEJAR EVENTOS ================= 
  
  // Función para manejar la selección de cliente del desplegable
  const handleClientSelection = (clientId: string) => {    
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
    const hasExemptionReason = data.notes?.toLowerCase().includes('exención') || 
                              data.notes?.toLowerCase().includes('exento') ||
                              data.notes?.toLowerCase().includes('no sujeto');
    
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
    // Verificamos los datos de la factura
    const validity = verifyInvoiceValidity();
    
    // Si el formulario es válido, procedemos con el envío
    if (validity.hasClient && validity.hasAmount && (validity.hasTaxes || validity.hasExemptionReason) && validity.hasDate) {
      setUserInitiatedSubmit(true);
      form.handleSubmit(handleSubmit)();
    } else {
      // Mostramos diálogo de validación
      setShowValidation(true);
    }
  };
  
  // Manejar submit del formulario
  const handleSubmit = (data: InvoiceFormValues) => {
    // Verificamos si hay un bloqueo activo
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
    
    // Verificamos si el envío fue iniciado explícitamente por el usuario o es un envío automático
    if (!userInitiatedSubmit) {
      console.log("⚠️ Detectado envío automático del formulario, bloqueando...");
      
      // Prevenimos el envío automático, pero guardamos los datos actuales para referencia
      const currentFormData = form.getValues();
      console.log("ℹ️ Datos del formulario en el momento del envío automático:", currentFormData);
      
      // Notificar al usuario
      toast({
        title: "Acción bloqueada",
        description: "Por favor, complete todos los datos de la factura y después pulse 'Crear Factura'",
      });
      
      return;
    }
    
    // Si todo está bien, procedemos con el envío real
    console.log("✅ Preparando envío válido de factura");
    mutation.mutate(data);
  };
  
  // Función para guardar borrador sin validación completa
  const handleDraftSave = () => {
    const currentData = form.getValues();
    
    // Validamos solo lo mínimo para un borrador
    const isValid = !!currentData.clientId && !!currentData.issueDate;
    
    if (!isValid) {
      toast({
        title: "No se puede guardar el borrador",
        description: "Debes seleccionar al menos un cliente y una fecha de emisión",
        variant: "destructive",
      });
      return;
    }
    
    // Forzamos el estado a borrador
    form.setValue("status", "draft");
    
    // Activamos bandera de envío de usuario
    setUserInitiatedSubmit(true);
    
    // Enviamos el formulario
    const data = form.getValues();
    mutation.mutate(data);
  };
  
  // Función para manejar la adición de un impuesto desde el diálogo
  const handleAddTaxFromDialog = () => {
    // Solo añadir si hay nombre
    if (!newTaxData.name) return;
    
    // Añadir el nuevo impuesto a la lista
    appendTax(newTaxData);
    
    // Cerrar el diálogo y resetear datos
    setShowTaxDialog(false);
    setNewTaxData({
      name: '',
      amount: 0,
      isPercentage: true
    });
  };
  
  // Función para añadir botones de impuestos comunes
  const handleAddCommonTax = (type: 'iva' | 'irpf') => {
    if (type === 'iva') {
      // Añadir IVA 21%
      appendTax({
        name: 'IVA',
        amount: 21,
        isPercentage: true
      });
      
      toast({
        title: "IVA 21% añadido",
        description: "Se ha añadido IVA al 21% a la factura"
      });
    } else if (type === 'irpf') {
      // Añadir IRPF -15%
      appendTax({
        name: 'IRPF',
        amount: -15,
        isPercentage: true
      });
      
      toast({
        title: "IRPF -15% añadido",
        description: "Se ha añadido retención de IRPF del 15% a la factura"
      });
    }
  };
  
  // =============== RENDERIZADO DE COMPONENTES =================
  
  // Renderizado de los botones de impuestos comunes
  const renderCommonTaxButtons = () => (
    <div className="grid grid-cols-2 gap-2 mt-4 mb-2">
      <Button
        type="button"
        onClick={() => handleAddCommonTax('iva')}
        className="bg-blue-500 hover:bg-blue-600 text-sm h-12 gap-1"
      >
        <Plus className="h-4 w-4" />
        Añadir IVA (21%)
      </Button>
      <Button
        type="button"
        onClick={() => handleAddCommonTax('irpf')}
        className="bg-red-500 hover:bg-red-600 text-sm h-12 gap-1"
      >
        <Plus className="h-4 w-4" />
        Añadir IRPF (-15%)
      </Button>
    </div>
  );
  
  // Renderizado de la tabla de impuestos adicionales
  const renderAdditionalTaxes = () => (
    <div>
      <div className="space-y-2 mt-4">
        {taxFields.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impuesto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importe / Porcentaje
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {taxFields.map((field, index) => (
                  <tr key={field.id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {form.getValues(`additionalTaxes.${index}.name`)}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {form.getValues(`additionalTaxes.${index}.amount`)}
                        {form.getValues(`additionalTaxes.${index}.isPercentage`) ? '%' : '€'}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTax(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
  
  // Renderizado del formulario completo
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="grid grid-cols-1 gap-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h3 className="text-xl font-semibold">
                  {isEditMode ? "Editar factura" : "Crear nueva factura"}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de factura</FormLabel>
                        <FormControl>
                          <Input placeholder="Número de factura" {...field} className="h-12" />
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
                            <div className="mb-2 p-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                              <p className="flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                <strong>Recomendación:</strong> Crea primero tus clientes en la sección &quot;Clientes&quot; antes de hacer facturas.
                              </p>
                            </div>
                            
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

                <div className="border-t pt-6 md:border-t-0 md:pt-0">
                  <h4 className="font-medium text-gray-700 mb-4">Ítems de la factura</h4>
                  
                  {/* Items */}
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="text-sm font-medium text-gray-700">
                            Ítem #{index + 1}
                          </h5>
                          
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="h-8 w-8 p-0 text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Eliminar ítem</span>
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Descripción</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Descripción del ítem" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Cantidad</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="0" 
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Precio unitario</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="0.00" 
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`items.${index}.taxRate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Tasa IVA (%)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      placeholder="21" 
                                      onChange={(e) => {
                                        field.onChange(parseFloat(e.target.value) || 0);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="font-medium text-sm flex justify-end">
                            Subtotal: {calculatedTotals.updatedItems[index]?.subtotal?.toFixed(2) ?? 0.00} €
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      taxRate: 21,
                      subtotal: 0,
                    })}
                    className="w-full mt-3 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir ítem
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notas o comentarios adicionales" 
                            className="resize-y min-h-24" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Adjuntos</label>
                    <FileUpload 
                      files={attachments} 
                      onFilesChange={setAttachments} 
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" 
                      endpoint="invoiceAttachments"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Impuestos adicionales</h4>
                  
                  {/* Botones rápidos para impuestos comunes */}
                  {renderCommonTaxButtons()}
                  
                  {/* Tabla de impuestos adicionales */}
                  {renderAdditionalTaxes()}
                  
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowTaxDialog(true)}
                    className="text-xs mt-2 h-9 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Añadir otro impuesto
                  </Button>
                  
                  <div className="rounded-md border px-4 py-3 space-y-2">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">Base imponible:</span>
                      <span>{calculatedTotals.subtotal?.toFixed(2) ?? 0.00} €</span>
                    </div>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium">IVA ({fields[0]?.taxRate}%):</span>
                      <span>{calculatedTotals.tax?.toFixed(2) ?? 0.00} €</span>
                    </div>
                    
                    {/* Mostrar impuestos adicionales si existen */}
                    {taxFields.length > 0 && (
                      <div className="border-b pb-2">
                        {taxFields.map((field, index) => {
                          const tax = form.getValues(`additionalTaxes.${index}`);
                          let amount;
                          
                          if (tax.isPercentage) {
                            amount = calculatedTotals.subtotal * (toNumber(tax.amount) / 100);
                          } else {
                            amount = toNumber(tax.amount);
                          }
                          
                          return (
                            <div key={field.id} className="flex justify-between items-center py-1">
                              <span className="font-medium">
                                {tax.name} ({tax.amount}{tax.isPercentage ? '%' : '€'}):
                              </span>
                              <span>{amount.toFixed(2)} €</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-bold text-lg">Total:</span>
                      <span className="font-bold text-lg">
                        {calculatedTotals.total?.toFixed(2) ?? 0.00} €
                      </span>
                    </div>
                  </div>
                  
                  {/* Mensaje adicional alertando sobre la ausencia de cliente */}
                  {!form.getValues().clientId && (
                    <div className="mb-6 p-4 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm">
                      <p className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                        <strong>Importante:</strong> No se puede crear una factura sin un cliente.
                      </p>
                      <ul className="list-disc pl-10 space-y-1 text-red-700">
                        <li>Primero cree un cliente en la sección &quot;Clientes&quot;</li>
                        <li>Luego vuelva a esta página para crear su factura</li>
                        <li>Seleccione su cliente del desplegable</li>
                      </ul>
                    </div>
                  )}
                  
                  <div className="modal-buttons grid grid-cols-2 gap-4 mt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        handleDraftSave();
                      }}
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Guardar como borrador
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleSubmitButtonClick}
                      className="gap-2"
                      disabled={!form.getValues().clientId}
                    >
                      <Check className="h-4 w-4" />
                      {isEditMode ? "Actualizar factura" : "Crear factura"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </Form>
      
      {/* Diálogo para añadir impuesto personalizado */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir impuesto</DialogTitle>
            <DialogDescription>
              Introduce los datos del impuesto a añadir (IVA, IRPF, etc.).
              Para impuestos negativos como el IRPF (retenciones), usa valores negativos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <FormLabel htmlFor="tax-name">Nombre del impuesto</FormLabel>
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
        hasTaxes={calculatedTotals.tax > 0 || (form.getValues().additionalTaxes?.length > 0)}
        hasExemptionReason={
          form.getValues().notes?.toLowerCase().includes('exención') || 
          form.getValues().notes?.toLowerCase().includes('exento') ||
          form.getValues().notes?.toLowerCase().includes('no sujeto')
        }
        hasDate={!!form.getValues().issueDate}
        inProgress={mutation.isPending}
      />
    </>
  );
};

export default InvoiceFormFixed;