import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

import { Building, CalendarIcon, FileText, Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import FileUpload from "@/components/common/FileUpload";
import { ClientForm } from "@/components/clients/ClientForm";

// Esquema de validación para facturas
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, { message: "El número de factura es obligatorio" }),
  clientId: z.number().min(1, { message: "Debes seleccionar un cliente" }),
  issueDate: z.string().min(1, { message: "La fecha de emisión es obligatoria" }),
  dueDate: z.string().min(1, { message: "La fecha de vencimiento es obligatoria" }),
  status: z.string().min(1, { message: "El estado es obligatorio" }),
  items: z.array(
    z.object({
      description: z.string().min(1, { message: "La descripción es obligatoria" }),
      quantity: z.number().min(0.01, { message: "La cantidad debe ser mayor que 0" }),
      unitPrice: z.number().min(0.01, { message: "El precio unitario debe ser mayor que 0" }),
      taxRate: z.number().min(0, { message: "El IVA no puede ser negativo" }),
      subtotal: z.number().optional(),
    })
  ).min(1, { message: "Debes añadir al menos un concepto" }),
  notes: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  additionalTaxes: z.array(
    z.object({
      name: z.string().min(1, { message: "El nombre del impuesto es obligatorio" }),
      amount: z.number(),
      isPercentage: z.boolean(),
    })
  ).optional(),
});

// Helper para convertir valores a número
function toNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined || value === "") return defaultValue;
  
  // Si ya es un número, devolverlo directamente
  if (typeof value === "number") return value;
  
  // Si es string, intentar convertirlo
  if (typeof value === "string") {
    // Reemplazar comas por puntos para manejar formato europeo
    value = value.replace(",", ".");
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  
  return defaultValue;
}

// Función para calcular los totales de la factura basados en el formulario
function calculateInvoiceTotals(form: any) {
  const items = form.getValues("items") || [];
  const additionalTaxes = form.getValues("additionalTaxes") || [];
  
  // Calculate subtotal for each item
  const updatedItems = items.map((item: any) => {
    // Asegurarnos que tenemos números válidos usando nuestra función toNumber
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
  
  // Update form with calculated subtotals
  form.setValue("items", updatedItems);
  
  // Calculate invoice totals
  const subtotal = updatedItems.reduce((sum: number, item: any) => sum + toNumber(item.subtotal, 0), 0);
  const tax = updatedItems.reduce((sum: number, item: any) => {
    const itemTax = toNumber(item.subtotal, 0) * (toNumber(item.taxRate, 0) / 100);
    return sum + itemTax;
  }, 0);
  
  // Calcular el importe total de impuestos adicionales (incluye impuestos tanto positivos como negativos)
  let additionalTaxesTotal = 0;
  
  // Procesamos cada impuesto adicional según su tipo
  additionalTaxes.forEach((taxItem: any) => {
    if (taxItem.isPercentage) {
      // Si es un porcentaje, calculamos en base al subtotal
      // El signo del importe determina si es un cargo (+) o un descuento (-)
      const percentageTax = subtotal * (toNumber(taxItem.amount, 0) / 100);
      additionalTaxesTotal += percentageTax;
    } else {
      // Si es un valor monetario, lo añadimos directamente manteniendo su signo
      additionalTaxesTotal += toNumber(taxItem.amount, 0);
    }
  });
  
  // Calcular el total correctamente: base + IVA líneas + impuestos adicionales
  // Los impuestos negativos (como IRPF) ya tienen signo negativo en additionalTaxesTotal
  const total = subtotal + tax + additionalTaxesTotal;
  
  // Asegurarnos que los valores nunca sean negativos
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

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
  initialData?: any; // Datos iniciales para el formulario
}

const InvoiceForm = ({ invoiceId, initialData }: InvoiceFormProps) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Modal de creación/edición de clientes
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  
  // Gestión de impuestos adicionales
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [newTaxData, setNewTaxData] = useState<any>({ name: "", amount: 0, isPercentage: false });
  
  // Archivos adjuntos
  const [attachments, setAttachments] = useState<string[]>([]);
  
  // Modo edición si hay ID
  const isEditMode = !!invoiceId;
  
  // Editar un cliente existente
  const editClient = (client: any) => {
    setClientToEdit(client);
    setShowClientForm(true);
  };
  
  // Eliminar un cliente
  const deleteClient = async (clientId: number) => {
    try {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar el cliente: ${error.message}`,
        variant: "destructive",
      });
    }
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
    status: "pending",
    items: [
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 21,
        subtotal: 0,
      },
    ],
    notes: "",
    subtotal: 0,
    tax: 0,
    total: 0,
    additionalTaxes: [],
  };

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultFormValues,
  });

  // Initialize form with invoice data when loaded - either from API or passed in
  useEffect(() => {
    if (!isEditMode) return;
    
    // Determinar la fuente de datos a utilizar (initialData o invoiceData)
    let sourceData = null;
    
    if (initialData?.invoice && initialData?.items) {
      console.log("⚡ Usando datos iniciales proporcionados directamente:", initialData);
      sourceData = initialData;
    } 
    else if (invoiceData && 'invoice' in invoiceData && 'items' in invoiceData) {
      console.log("⚡ Cargando datos de factura para edición desde API:", invoiceData);
      sourceData = invoiceData;
    }
    
    // Si no tenemos datos válidos, salir
    if (!sourceData) {
      console.log("⚠️ No se encontraron datos válidos para la factura en modo edición");
      return;
    }
    
    try {
      const { invoice, items } = sourceData;
      
      // Aseguramos que las fechas estén en formato YYYY-MM-DD
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
      
      // Verificar si los impuestos adicionales existen y convertirlos a un formato adecuado
      let additionalTaxesArray: any[] = [];
      
      if (invoice?.additionalTaxes) {
        // Si es una cadena JSON, intentamos parsearlo
        if (typeof invoice.additionalTaxes === 'string') {
          try {
            additionalTaxesArray = JSON.parse(invoice.additionalTaxes);
          } catch (e) {
            console.error("Error al parsear additionalTaxes como JSON:", e);
            additionalTaxesArray = [];
          }
        } 
        // Si ya es un array, lo usamos directamente
        else if (Array.isArray(invoice.additionalTaxes)) {
          additionalTaxesArray = invoice.additionalTaxes;
        }
      }
      
      // Transformar los datos para el formulario, con valores por defecto seguros
      const formattedInvoice = {
        invoiceNumber: invoice?.invoiceNumber || "",
        clientId: invoice?.clientId || 0,
        issueDate: formatDateForInput(invoice?.issueDate || ""),
        dueDate: formatDateForInput(invoice?.dueDate || ""),
        status: invoice?.status || "pending",
        notes: invoice?.notes || "",
        subtotal: Number(invoice?.subtotal || 0),
        tax: Number(invoice?.tax || 0),
        total: Number(invoice?.total || 0),
        // Mapeamos los items asegurando valores correctos
        items: (items || []).map((item: any) => ({
          description: item?.description || "",
          quantity: Number(item?.quantity || 0),
          unitPrice: Number(item?.unitPrice || 0),
          taxRate: Number(item?.taxRate || 21),
          subtotal: Number(item?.subtotal || 0),
        })),
        // Formateamos los impuestos adicionales
        additionalTaxes: additionalTaxesArray.map((tax: any) => ({
          name: tax?.name || "",
          amount: Number(tax?.amount || 0),
          isPercentage: tax?.isPercentage !== undefined ? tax.isPercentage : false
        }))
      };
      
      console.log("🔄 Datos formateados para el formulario:", formattedInvoice);
      
      // Actualizar el formulario con los datos formateados
      form.reset(formattedInvoice);
      
      // Si hay archivos adjuntos, actualizamos el estado
      if (invoice?.attachments) {
        setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
      }
      
      // Recalcular totales después de que el formulario se haya actualizado completamente
      setTimeout(() => {
        calculateInvoiceTotals(form);
      }, 200);
    } catch (error) {
      console.error("❌ Error al cargar los datos de la factura:", error);
      toast({
        title: "Error al cargar factura",
        description: "No se pudieron cargar los datos de la factura correctamente",
        variant: "destructive",
      });
    }
  }, [invoiceData, initialData, isEditMode, form, toast]);

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
      
      // Transformamos las fechas y aseguramos valores correctos
      const formattedData = {
        invoiceNumber: data.invoiceNumber,
        clientId: data.clientId,
        issueDate: formatDate(data.issueDate),
        dueDate: formatDate(data.dueDate),
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
      
      console.log("🔄 Datos formateados para API:", { 
        invoice: formattedData, 
        items: formattedItems 
      });
      
      if (isEditMode) {
        // En modo edición, necesitamos asegurarnos de enviar todos los datos importantes
        // y no perder información existente
        console.log("🔄 Modo edición - ID:", invoiceId);
        
        // Incorporar datos originales si están disponibles
        const originalInvoice = (invoiceData && typeof invoiceData === 'object' && 'invoice' in invoiceData) ? invoiceData.invoice : {};
        
        // Asegurar que los impuestos adicionales estén en el formato correcto
        // Convertir a JSON si no lo está, para que la API lo guarde consistentemente
        let processedAdditionalTaxes = formattedData.additionalTaxes;
        
        console.log("📊 Impuestos antes de procesar:", processedAdditionalTaxes);
        
        // Si es un array vacío, asegurarnos de que siga siendo un array
        if (Array.isArray(processedAdditionalTaxes) && processedAdditionalTaxes.length === 0) {
          processedAdditionalTaxes = [];
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
        return apiRequest("POST", "/api/invoices", {
          invoice: formattedData,
          items: formattedItems,
        });
      }
    },
    onSuccess: (data) => {
      console.log("✅ Factura guardada:", data);
      
      // Invalidar la lista de facturas para que se actualice automáticamente
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Invalidar también las estadísticas del dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      
      // Invalidar las facturas recientes (si existe esa consulta)
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/recent"] });
      
      toast({
        title: isEditMode ? "Factura actualizada" : "Factura creada",
        description: isEditMode
          ? "La factura se ha actualizado correctamente"
          : "La factura se ha creado correctamente",
      });
      navigate("/invoices");
    },
    onError: (error: any) => {
      console.error("❌ Error al guardar factura:", error);
      toast({
        title: "Error",
        description: `Ha ocurrido un error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InvoiceFormValues) => {
    // Recalculate totals before submission
    const { subtotal, tax, additionalTaxesTotal, total } = calculateInvoiceTotals(form);
    data.subtotal = subtotal;
    data.tax = tax;
    data.total = total;
    
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
      calculateInvoiceTotals(form);
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
      // Recalcular totales después de agregar impuesto
      setTimeout(() => calculateInvoiceTotals(form), 0);
    } else if (taxType === 'iva') {
      // IVA adicional (21%)
      appendTax({ 
        name: "IVA adicional", 
        amount: 21, 
        isPercentage: true 
      });
      // Recalcular totales después de agregar impuesto
      setTimeout(() => calculateInvoiceTotals(form), 0);
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
    // Recalcular totales después de agregar impuesto
    setTimeout(() => calculateInvoiceTotals(form), 0);
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
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-white">
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
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
                        <FormLabel className="flex items-center text-blue-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Número de factura
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="F-2023-001" {...field} className="border-blue-200 focus:border-blue-400" />
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

            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-400 p-4 text-white">
                <h3 className="text-lg font-medium flex items-center">
                  <Plus className="mr-2 h-5 w-5" />
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
                        <FormLabel className="flex items-center text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-2"></span>
                          Notas o condiciones
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Añade notas o condiciones específicas a esta factura..."
                            {...field}
                            className="min-h-[120px] border-green-200 focus:border-green-400"
                          />
                        </FormControl>
                        <FormDescription>
                          Estas notas aparecerán en la factura impresa
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <Label>Archivos adjuntos</Label>
                    <div className="mt-2">
                      <div className="w-full border-dashed border-2 border-green-200 hover:border-green-400 p-4 flex flex-col items-center justify-center">
                        <Upload className="h-8 w-8 text-green-500 mb-2" />
                        <span className="text-sm font-medium">Adjuntar un archivo</span>
                        <span className="text-xs text-muted-foreground mt-1 mb-2">
                          Seleccione un archivo para subir
                        </span>
                        <FileUpload 
                          onUpload={handleFileUpload} 
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        />
                      </div>

                      {attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {attachments.map((file, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
                            >
                              <span className="text-sm truncate max-w-[250px]">
                                {file.split('/').pop()}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAttachments(attachments.filter((_, i) => i !== index));
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-white">
              <h3 className="text-lg font-medium flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Conceptos
              </h3>
            </div>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="rounded-lg border overflow-hidden">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider w-5/12">
                          Descripción
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider w-2/12">
                          Cantidad
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider w-2/12">
                          Precio unitario
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider w-1/12">
                          IVA %
                        </th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider w-2/12">
                          Subtotal
                        </th>
                        <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider w-1/12">
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                      {fields.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? "bg-neutral-50" : "bg-white"}>
                          <td className="px-3 py-2">
                            <Input
                              {...form.register(`items.${index}.description` as const)}
                              placeholder="Descripción del producto o servicio"
                              className="border-neutral-200"
                            />
                            {form.formState.errors.items?.[index]?.description && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.items[index]?.description?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              {...form.register(`items.${index}.quantity` as const, {
                                valueAsNumber: true,
                                onBlur: (e) => handleNumericBlur(form.getValues(`items.${index}`).quantity)(e),
                              })}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="1"
                              className="border-neutral-200 text-center"
                              onChange={(e) => {
                                form.setValue(
                                  `items.${index}.quantity` as const,
                                  toNumber(e.target.value, 0)
                                );
                                calculateInvoiceTotals(form);
                              }}
                            />
                            {form.formState.errors.items?.[index]?.quantity && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.items[index]?.quantity?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              {...form.register(`items.${index}.unitPrice` as const, {
                                valueAsNumber: true,
                                onBlur: (e) => handleNumericBlur(form.getValues(`items.${index}`).unitPrice)(e),
                              })}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="border-neutral-200 text-center"
                              onChange={(e) => {
                                form.setValue(
                                  `items.${index}.unitPrice` as const,
                                  toNumber(e.target.value, 0)
                                );
                                calculateInvoiceTotals(form);
                              }}
                            />
                            {form.formState.errors.items?.[index]?.unitPrice && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.items[index]?.unitPrice?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              {...form.register(`items.${index}.taxRate` as const, {
                                valueAsNumber: true,
                                onBlur: (e) => handleNumericBlur(form.getValues(`items.${index}`).taxRate, 21)(e),
                              })}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="21"
                              className="border-neutral-200 text-center"
                              onChange={(e) => {
                                form.setValue(
                                  `items.${index}.taxRate` as const,
                                  toNumber(e.target.value, 21)
                                );
                                calculateInvoiceTotals(form);
                              }}
                            />
                            {form.formState.errors.items?.[index]?.taxRate && (
                              <p className="text-xs text-red-500 mt-1">
                                {form.formState.errors.items[index]?.taxRate?.message}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            <div className="font-medium">
                              {new Intl.NumberFormat("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(
                                toNumber(form.getValues(`items.${index}.quantity`), 0) *
                                  toNumber(form.getValues(`items.${index}.unitPrice`), 0)
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                remove(index);
                                // Recalcular totales después de eliminar el item
                                setTimeout(() => calculateInvoiceTotals(form), 0);
                              }}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    append({
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      taxRate: 21,
                      subtotal: 0,
                    });
                  }}
                  className="w-full border-dashed border-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir concepto
                </Button>

                {form.formState.errors.items?.message && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.items.message as string}
                  </p>
                )}

                <div className="mt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t pt-4">
                    <div>
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">Impuestos adicionales</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddTax('irpf')}
                          className="h-8 text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                        >
                          + IRPF (-15%)
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddTax('iva')}
                          className="h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        >
                          + IVA (21%)
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleAddTax()}
                          className="h-8 text-xs"
                        >
                          + Personalizado
                        </Button>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-neutral-500 mr-8">Subtotal:</span>
                          <span className="text-sm font-medium">
                            {new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            }).format(form.getValues("subtotal") || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-neutral-500 mr-8">IVA:</span>
                          <span className="text-sm font-medium">
                            {new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            }).format(form.getValues("tax") || 0)}
                          </span>
                        </div>

                        {/* Mostramos los impuestos adicionales si existen */}
                        {taxFields.length > 0 && (
                          <div className="pt-1 border-t border-dashed border-neutral-200">
                            {taxFields.map((tax, idx) => {
                              const taxValue = form.getValues(`additionalTaxes.${idx}`);
                              const taxAmount = taxValue.isPercentage
                                ? (form.getValues("subtotal") * taxValue.amount) / 100
                                : taxValue.amount;
                              
                              return (
                                <div key={tax.id} className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <span className={`text-sm font-medium ${taxValue.amount < 0 ? 'text-red-500' : 'text-neutral-500'} mr-2`}>
                                      {taxValue.name}:
                                    </span>
                                    <span className="text-xs text-neutral-400">
                                      {taxValue.isPercentage 
                                        ? `(${taxValue.amount}%)` 
                                        : ''}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        removeTax(idx);
                                        // Recalcular totales después de eliminar el impuesto
                                        setTimeout(() => calculateInvoiceTotals(form), 0);
                                      }}
                                      className="ml-1 h-6 w-6 p-0 text-neutral-400 hover:text-red-500"
                                    >
                                      <X className="h-3 w-3" />
                                      <span className="sr-only">Eliminar</span>
                                    </Button>
                                  </div>
                                  <span className={`text-sm font-medium ${taxAmount < 0 ? 'text-red-500' : 'text-neutral-700'}`}>
                                    {new Intl.NumberFormat("es-ES", {
                                      style: "currency",
                                      currency: "EUR",
                                      signDisplay: 'always'
                                    }).format(taxAmount)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="pt-2 border-t border-neutral-200">
                          <div className="flex justify-between">
                            <span className="text-lg font-bold text-neutral-800">Total:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {new Intl.NumberFormat("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(form.getValues("total") || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/invoices")}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={form.formState.isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {form.formState.isSubmitting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isEditMode ? "Actualizar factura" : "Crear factura"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Modal para crear/editar clientes */}
      <Dialog open={showClientForm} onOpenChange={handleClientModalClose}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh] p-0">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-white sticky top-0 z-10">
            <DialogTitle className="flex items-center text-lg">
              <Building className="h-5 w-5 mr-2" />
              {clientToEdit ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              {clientToEdit ? "Modifica los datos del cliente existente" : "Añade un nuevo cliente a tu lista"}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <ClientForm 
              clientData={clientToEdit} 
              onClientCreated={handleClientCreated} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para añadir impuesto personalizado */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="max-w-md overflow-y-auto p-0">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-white">
            <DialogTitle className="flex items-center text-lg">
              <Plus className="h-5 w-5 mr-2" />
              Añadir impuesto personalizado
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Configura un cargo o descuento adicional
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-name">Nombre del impuesto</Label>
              <Input 
                id="tax-name" 
                value={newTaxData.name} 
                onChange={(e) => setNewTaxData({...newTaxData, name: e.target.value})}
                placeholder="Ej: Descuento, Recargo, IGIC, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tax-amount">Valor</Label>
              <Input 
                id="tax-amount" 
                type="number" 
                value={newTaxData.amount} 
                onChange={(e) => setNewTaxData({...newTaxData, amount: parseFloat(e.target.value)})}
                placeholder="Introduce el valor"
              />
              <p className="text-xs text-muted-foreground">
                Para descuentos, usa un valor negativo (ej: -10)
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="is-percentage" 
                checked={newTaxData.isPercentage} 
                onCheckedChange={(checked) => setNewTaxData({...newTaxData, isPercentage: checked})}
              />
              <Label htmlFor="is-percentage">Es un porcentaje</Label>
            </div>
            
            <DialogFooter className="pt-4">
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
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              >
                Añadir
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceForm;