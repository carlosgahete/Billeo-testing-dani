import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Trash2, Plus, FileText, Minus, CalendarIcon, Pencil, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { forceDashboardRefresh, notifyDashboardUpdate } from "@/lib/dashboard-helpers";
import { useLocation } from "wouter";
import FileUpload from "../common/FileUpload";
import { ClientForm } from "../clients/ClientForm";
import { calculateInvoice } from "@/utils/invoiceEngine";
import { getReturnPath } from "@/lib/transactionUtils";

// Función auxiliar para convertir texto a número
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
  // Ya no forzamos valores positivos: const safeTotal = Math.max(0, total);
  
  // Si la opción executeUpdate está activada, actualizamos el formulario
  // Esto permite calcular sin actualizar cuando solo necesitamos los valores
  if (options.executeUpdate && formInstance) {
    try {
      // Actualizamos los items con los nuevos subtotales calculados - con captura de errores
      formInstance.setValue("items", updatedItems, { shouldValidate: false });
      
      // Actualizamos los totales de la factura sin validar para evitar pérdida de foco
      formInstance.setValue("subtotal", subtotal, { shouldValidate: false });
      formInstance.setValue("tax", tax, { shouldValidate: false });
      formInstance.setValue("total", total, { shouldValidate: false }); // Permitimos valores negativos
      
      // Log para debug solo si no estamos en modo silencioso
      if (!options.silentMode) {
        console.log("💰 Cálculo de totales:", {
          subtotal,
          tax,
          additionalTaxesTotal,
          total, // Mostramos el total real sin forzar valores positivos
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
  return { subtotal, tax, additionalTaxesTotal, total }; // Permitimos valores negativos
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
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
  initialData?: any; // Datos iniciales para el formulario
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
  
  const isEditMode = !!invoiceId;
  
  // 🔥 FUNCIÓN MEJORADA: Detectar página de origen para el botón "volver"
  const getReturnRoute = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = urlParams.get('returnTo');
    
    if (returnTo) {
      return getReturnPath(returnTo);
    }
    return '/invoices'; // Por defecto
  };
  
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
  // Este efecto es innecesario y podría causar renderizados infinitos al modificar form
  // Ya que utilizamos el formulario para mostrar datos iniciales, no necesitamos modificarlo automáticamente
  /*
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
  }, [companyData, isEditMode]); // Quitamos 'form' para evitar renderizados infinitos
  */

  // Initialize form with invoice data when loaded - either from API or passed in
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
  
  // Inicializa el formulario con los datos solo una vez
  // Utilizamos un enfoque más simple que no depende de useRef
  // y que no actualizará el formulario automáticamente después de la carga inicial
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // Si ya inicializamos el formulario, no lo hacemos de nuevo
    if (hasInitialized) {
      return;
    }
    
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
        
        // Solo reseteamos el formulario si los datos han cambiado
        form.reset(formattedInvoice);
        
        // Si hay archivos adjuntos, actualizamos el estado
        if (invoice.attachments) {
          setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
        }
        
        // Marcamos que ya inicializamos el formulario para no hacerlo de nuevo
        setHasInitialized(true);
      }
    }
  }, [invoiceData, initialData, isEditMode, hasInitialized]); // No incluimos form en las dependencias

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
      
      // Asegurarnos que las fechas están en formato YYYY-MM-DD
      const formatDate = (dateString: string) => {
        // Si ya está en formato ISO o yyyy-mm-dd, lo devolvemos directamente
        if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
          return dateString.split('T')[0]; // Eliminar parte de tiempo si existe
        }
        // Si no, intentamos convertirlo a formato ISO
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.error("Error al formatear fecha:", e);
          return dateString; // Devolver original si hay error
        }
      };
      
      // Asegurarnos que los valores numéricos son strings con 2 decimales
      const formatNumber = (num: number): string => {
        if (typeof num !== 'number') return '0.00';
        return num.toFixed(2);
      };
      
      // Transformamos las fechas y aseguramos valores correctos
      const formattedData = {
        invoiceNumber: data.invoiceNumber,
        clientId: data.clientId,
        issueDate: formatDate(data.issueDate),
        dueDate: formatDate(data.dueDate),
        // Convertimos los números a strings con formato correcto para que coincidan con lo que espera el servidor
        subtotal: formatNumber(data.subtotal),
        tax: formatNumber(data.tax),
        total: formatNumber(data.total),
        additionalTaxes: data.additionalTaxes || [],
        status: data.status,
        notes: data.notes || null,
        attachments: attachments.length > 0 ? attachments : null,
      };
      
      // Transformamos los items de la factura con formato correcto
      const formattedItems = data.items.map(item => ({
        description: item.description,
        quantity: formatNumber(item.quantity),
        unitPrice: formatNumber(item.unitPrice),
        taxRate: formatNumber(item.taxRate),
        subtotal: formatNumber(item.subtotal || 0),
      }));
      
      console.log("🔄 Datos formateados para API:", { 
        invoice: formattedData, 
        items: formattedItems 
      });
      
      if (isEditMode) {
        // En modo edición, necesitamos asegurarnos de enviar todos los datos importantes
        // y no perder información existente
        console.log("🔄 Modo edición - ID:", invoiceId);
        
        // Incorporar datos originales si están disponibles
        // Ya verificamos en el useEffect que datos existe
        const originalInvoice = (
          invoiceData && 
          typeof invoiceData === 'object' && 
          invoiceData !== null && 
          'invoice' in invoiceData
        ) ? invoiceData.invoice as Record<string, any> : {} as Record<string, any>;
        
        // Asegurar que los impuestos adicionales estén en el formato correcto
        // Convertir a JSON si no lo está, para que la API lo guarde consistentemente
        let processedAdditionalTaxes = formattedData.additionalTaxes;
        
        console.log("📊 Impuestos antes de procesar:", processedAdditionalTaxes);
        
        // Si es un array vacío, asegurarnos de que siga siendo un array
        if (Array.isArray(processedAdditionalTaxes) && processedAdditionalTaxes.length === 0) {
          processedAdditionalTaxes = [];
        } else if (Array.isArray(processedAdditionalTaxes)) {
          // Formatear los valores numéricos en los impuestos adicionales
          const typedAdditionalTaxes: { name: string; amount: number; isPercentage: boolean }[] = [];
          processedAdditionalTaxes.forEach(tax => {
            if (typeof tax === 'object' && tax !== null) {
              typedAdditionalTaxes.push({
                name: tax.name || "",
                isPercentage: Boolean(tax.isPercentage),
                amount: typeof tax.amount === 'number' ? tax.amount : Number(tax.amount || 0)
              });
            }
          });
          processedAdditionalTaxes = typedAdditionalTaxes;
        }
        
        // Mantener los campos originales si no se proporcionan nuevos valores
        const completeInvoiceData = {
          ...originalInvoice,
          ...formattedData,
          // Asegurar campos críticos
          id: invoiceId,  // Importante incluir el ID explícitamente
          invoiceNumber: formattedData.invoiceNumber,
          clientId: formattedData.clientId,
          issueDate: formattedData.issueDate,
          dueDate: formattedData.dueDate,
          subtotal: formattedData.subtotal,
          tax: formattedData.tax,
          total: formattedData.total,
          status: formattedData.status,
          // Campos opcionales
          notes: formattedData.notes !== null ? formattedData.notes : originalInvoice.notes,
          additionalTaxes: processedAdditionalTaxes,
          attachments: formattedData.attachments || originalInvoice.attachments
        };
        
        console.log("📤 Enviando actualización completa:", {
          invoice: completeInvoiceData,
          items: formattedItems
        });
        
        return apiRequest("PUT", `/api/invoices/${invoiceId}`, {
          invoice: completeInvoiceData,
          items: formattedItems,
        });
      } else {
        // Añadir una bandera explícita para crear transacción si la factura está pagada
        const createTransaction = formattedData.status === 'paid';
        return apiRequest("POST", "/api/invoices", {
          invoice: {
            ...formattedData,
            createTransaction // Agregar flag explícito para el backend
          },
          items: formattedItems,
        });
      }
    },
    onSuccess: (data) => {
      console.log("✅ Factura guardada:", data);
      
      // Disparar evento personalizado para notificar a los componentes sobre el cambio
      const eventName = isEditMode ? 'invoice-updated' : 'invoice-created';
      window.dispatchEvent(new CustomEvent(eventName, { 
        detail: { invoiceId: isEditMode ? invoiceId : (data as any)?.id || 'new' }
      }));
      
      // Disparar el evento específico que el componente InvoiceList escucha
      window.dispatchEvent(new CustomEvent('updateInvoices'));
      
      console.log(`🔔 Eventos disparados: ${eventName} y updateInvoices`);
      
      // Eliminar completamente las consultas relevantes para forzar una recarga completa 
      console.log("🧹 Limpiando caché de consultas...");
      queryClient.removeQueries({ queryKey: ["/api/invoices"] }); // Corregir formato de queryKey
      queryClient.removeQueries({ queryKey: ["/api/stats/dashboard"] }); // Corregir formato de queryKey
      queryClient.removeQueries({ queryKey: ["invoices", "recent"] });
      
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
        // Refrescar explícitamente todas las consultas con claves consistentes
        console.log("⚡ Refrescando todas las consultas relevantes");
        queryClient.refetchQueries({ queryKey: ["dashboard"] });
        queryClient.refetchQueries({ queryKey: ["invoices"] });
        queryClient.refetchQueries({ queryKey: ["invoices", "recent"] });
        
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
      navigate(getReturnRoute());
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

  // Ya tenemos calculateInvoiceTotals definida globalmente

  // Usamos useMemo para memorizar los cálculos y prevenir bucles de renderizado
  // FIX: Esta línea causaba re-renders porque se ejecutaba en cada renderización
  // Movemos esta línea al interior del useMemo para que sólo se ejecute cuando las dependencias cambian
  const calculatedTotals = useMemo(() => {
    // Obtenemos los valores dentro del useMemo para evitar re-renders
    const { items = [], additionalTaxes = [] } = form.getValues();
    
    // Calculamos subtotales
    const updatedItems = (items || []).map((item: any) => {
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
    
    // Calculamos totales de factura
    const subtotal = updatedItems.reduce((sum: number, item: any) => sum + toNumber(item.subtotal, 0), 0);
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
    
    const total = subtotal + tax + additionalTaxesTotal;
    const safeTotal = Math.max(0, total);
    
    return { 
      updatedItems, 
      subtotal, 
      tax, 
      additionalTaxesTotal, 
      total: safeTotal 
    };
  // Dependencia del form para recalcular cuando cambie y no causar bucles infinitos
  }, [form]);
  
  const handleSubmit = (data: InvoiceFormValues) => {
    // Las notas no necesitan incluir información bancaria, ya que aparece en otra parte del PDF
    // Dejamos las notas como están si el usuario las ha introducido manualmente
    
    // Actualizamos los datos antes de enviar usando los valores memoizados
    data.subtotal = calculatedTotals.subtotal;
    data.tax = calculatedTotals.tax;
    data.total = calculatedTotals.total;
    
    console.log("🚀 Enviando factura con totales calculados:", {
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total
    });
    
    // Enviamos los datos
    mutation.mutate(data);
  };

  const handleFileUpload = (path: string) => {
    setAttachments([...attachments, path]);
  };

  // Función para manejar el evento onBlur en campos numéricos
  const handleNumericBlur = (field: any, defaultValue: number = 0) => {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      const numericValue = toNumber(field.value, defaultValue);
      if (numericValue > 0 || field.value !== "") {
        field.onChange(numericValue.toString());
      }
      // Ya no necesitamos recalcular aquí, se hace en useMemo con la dependencia del form
    };
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
      // No necesitamos recalcular - useMemo con dependencia form se encargará
    } else if (taxType === 'iva') {
      // IVA adicional (21%)
      appendTax({ 
        name: "IVA adicional", 
        amount: 21, 
        isPercentage: true 
      });
      // No necesitamos recalcular - useMemo con dependencia form se encargará
    } else {
      // Mostrar diálogo para impuesto personalizado
      setNewTaxData({ name: "", amount: 0, isPercentage: false });
      setShowTaxDialog(true);
    }
  };
  
  // Función para agregar el impuesto desde el diálogo
  const handleAddTaxFromDialog = () => {
    appendTax(newTaxData);
    setShowTaxDialog(false);
    // No necesitamos recalcular - useMemo con dependencia form se encargará
  };

  // Función que maneja la creación o actualización de un cliente
  const handleClientCreated = (newClient: any) => {
    // Actualizar la caché de react-query para incluir el nuevo cliente
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    
    // Seleccionar automáticamente el nuevo cliente en el formulario si es uno nuevo
    if (!clientToEdit) {
      form.setValue("clientId", newClient.id);
    }
    
    // Limpiar el cliente a editar
    setClientToEdit(null);
    
    toast({
      title: clientToEdit ? "Cliente actualizado" : "Cliente creado",
      description: clientToEdit 
        ? `El cliente ${newClient.name} ha sido actualizado correctamente`
        : `El cliente ${newClient.name} ha sido creado correctamente`,
    });
  };
  
  // Función para manejar el cierre del modal de cliente sin guardar
  const handleClientModalClose = (open: boolean) => {
    if (!open) {
      // Si se cierra el modal, reseteamos el cliente a editar
      setClientToEdit(null);
    }
    setShowClientForm(open);
  };

  if ((isEditMode && invoiceLoading && !initialData) || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

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
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm overflow-hidden bg-white/95 backdrop-blur-sm rounded-xl">
            <div className="bg-[#f5f5f7] border-b border-gray-200 p-4 text-gray-900">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="mr-2 h-5 w-5 text-purple-500" />
                Detalles de la factura
              </h3>
            </div>
            <CardContent className="pt-6">
              
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
                                defaultValue={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                  field.onChange(value);
                                  // Calcular totales inmediatamente al cambiar el valor con referencia segura
                                  const formRef = form; // Capturar referencia en variable local
                                  window.setTimeout(() => { 
                                    if (formRef) calculateInvoiceTotals(formRef); 
                                  }, 10);
                                }}
                                onBlur={(e) => {
                                  // Calcular totales al salir del campo
                                  { const formRef = form; if (formRef) calculateInvoiceTotals(formRef); }
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
                                defaultValue={field.value || ''}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                  field.onChange(value);
                                }}
                                onBlur={(e) => {
                                  // Calcular totales al salir del campo
                                  { const formRef = form; if (formRef) calculateInvoiceTotals(formRef); }
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
                                }}
                                onBlur={() => { const formRef = form; if (formRef) calculateInvoiceTotals(formRef); }}
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
                          // Calcular totales inmediatamente al eliminar un ítem con referencia segura
                          const formRef = form; // Capturar referencia en variable local
                          window.setTimeout(() => { 
                            if (formRef) calculateInvoiceTotals(formRef); 
                          }, 10);
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
                
                {/* Esta es la fila con los botones de impuestos, alineados como en la imagen */}
                <div className="grid grid-cols-12 gap-4 items-center mb-4">
                  <div className="col-span-8 sm:col-span-9 flex">
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
                        // Calcular totales inmediatamente después de añadir un nuevo ítem con referencia segura
                        const formRef = form; // Capturar referencia en variable local
                        window.setTimeout(() => { 
                          if (formRef) calculateInvoiceTotals(formRef); 
                        }, 10);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir ítem
                    </Button>
                  </div>
                  <div className="col-span-4 sm:col-span-3 flex justify-start gap-2">
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
                </div>
              </div>
              
              
              {/* Sección de impuestos adicionales - ahora directamente bajo los botones */}
              {taxFields.length > 0 && (
                <div className="w-full mt-4 mb-6 border-t border-b py-4">
                  <div className="mb-2">
                    <span className="text-sm font-medium">Impuestos adicionales:</span>
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
                                      }}
                                      onBlur={() => { const formRef = form; if (formRef) calculateInvoiceTotals(formRef); }}
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
                                                  { const formRef = form; if (formRef) calculateInvoiceTotals(formRef); }
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
                              { const formRef = form; if (formRef) calculateInvoiceTotals(formRef); }
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
                                ? `${Number(form.getValues(`additionalTaxes.${index}.amount`)).toFixed(2)}% (${(calculatedTotals.subtotal * Number(form.getValues(`additionalTaxes.${index}.amount`)) / 100).toFixed(2)} €)`
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
              
              <div className="border-t pt-6 flex flex-col items-end">
                <div className="bg-slate-50 rounded-lg p-4 w-full md:w-96 shadow-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">Subtotal:</span>
                    <span className="font-medium">
                      {calculatedTotals.subtotal.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">IVA:</span>
                    <span className="font-medium">
                      {calculatedTotals.tax.toFixed(2)} €
                    </span>
                  </div>
                  
                  {/* Mostrar impuestos adicionales */}
                  {taxFields.map((field, index) => {
                    const taxName = form.getValues(`additionalTaxes.${index}.name`);
                    const taxAmount = form.getValues(`additionalTaxes.${index}.amount`);
                    const isPercentage = form.getValues(`additionalTaxes.${index}.isPercentage`);
                    // Usar el subtotal calculado y memoizado
                    const calculatedAmount = isPercentage ? (calculatedTotals.subtotal * taxAmount / 100) : taxAmount;
                    const isNegative = calculatedAmount < 0;
                    
                    return (
                      <div key={field.id} className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">
                          {taxName || "Impuesto"}{isPercentage ? ` (${taxAmount}%)` : ''}:
                        </span>
                        <span className={`font-medium ${isNegative ? "text-red-600" : ""}`}>
                          {calculatedAmount.toFixed(2)} €
                        </span>
                      </div>
                    );
                  })}
                  
                  <div className="flex justify-between mt-3 pt-3 border-t">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg text-blue-700">{calculatedTotals.total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(getReturnRoute())}
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
        onOpenChange={handleClientModalClose} 
        onClientCreated={handleClientCreated}
        clientToEdit={clientToEdit}
      />

      {/* Diálogo para agregar impuestos adicionales */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nuevo impuesto</DialogTitle>
            <DialogDescription>
              Ingresa los datos del impuesto que deseas agregar a la factura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-4">
              <div>
                <label htmlFor="taxName" className="text-sm font-medium">
                  Nombre del impuesto
                </label>
                <input
                  id="taxName"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                  placeholder="Ej: IRPF, tasa municipal, etc."
                  value={newTaxData.name}
                  onChange={(e) => setNewTaxData({...newTaxData, name: e.target.value})}
                />
              </div>
              
              <div>
                <label htmlFor="taxAmount" className="text-sm font-medium">
                  Importe
                </label>
                <div className="flex items-center mt-1">
                  <input
                    id="taxAmount"
                    type="number"
                    step="0.01"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Importe o porcentaje"
                    value={newTaxData.amount}
                    onChange={(e) => setNewTaxData({...newTaxData, amount: parseFloat(e.target.value)})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="ml-2 px-3"
                    onClick={() => setNewTaxData({...newTaxData, isPercentage: !newTaxData.isPercentage})}
                  >
                    {newTaxData.isPercentage ? '%' : '€'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaxDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddTaxFromDialog}>Agregar impuesto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(InvoiceForm);