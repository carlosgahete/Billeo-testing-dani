import { useEffect, useState } from "react";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { AddItemButton } from "@/components/ui/add-item-button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { InvoiceItemRow } from "./InvoiceItemRow";
import { InvoiceStatus } from "./InvoiceStatus";
import { AdditionalTaxField } from "./AdditionalTaxField";
import { FileUploader } from "../shared/FileUploader";
import { invoiceSchema } from "@/schemas/invoiceFormSchema";
import { apiRequest } from "../../lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ClientModal } from "../clients/ClientModal";

// Función para convertir valores a números de manera segura
function toNumber(value: any, defaultValue = 0): number {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  
  // Si ya es un número, lo devolvemos
  if (typeof value === "number") {
    return value;
  }
  
  // Si es string, intentamos convertirlo
  const num = Number(value.toString().replace(/[^0-9.-]+/g, ""));
  
  // Verificamos si es un número válido
  return isNaN(num) ? defaultValue : num;
}

// Función para calcular totales de factura
function calculateInvoiceTotals(form: any) {
  console.log("Calculando totales...");
  const items = form.getValues("items") || [];
  const additionalTaxes = form.getValues("additionalTaxes") || [];
  
  try {
    // Cálculo de subtotal (suma de items.subtotal)
    let subtotal = 0;
    if (items.length > 0) {
      subtotal = items.reduce((acc: number, item: any) => {
        const itemSubtotal = toNumber(item.subtotal, 0);
        return acc + itemSubtotal;
      }, 0);
    }
    
    // Cálculo del IVA estándar (21% del subtotal por defecto)
    const standardTaxRate = 21; // Porcentaje de IVA estándar en España
    const tax = subtotal * (standardTaxRate / 100);
    
    // Cálculo de impuestos adicionales
    let additionalTaxesTotal = 0;
    let additionalFixedTotal = 0;
    
    // Suma de impuestos adicionales (porcentajes y valores fijos)
    if (additionalTaxes.length > 0) {
      additionalTaxes.forEach((taxItem: any) => {
        const taxAmount = toNumber(taxItem.amount, 0);
        
        if (taxItem.isPercentage) {
          // Si es porcentaje, se calcula sobre el subtotal
          const percentageAmount = subtotal * (taxAmount / 100);
          additionalTaxesTotal += percentageAmount;
        } else {
          // Si es valor fijo, se suma directamente
          additionalFixedTotal += taxAmount;
        }
      });
    }
    
    // Total = Subtotal + IVA estándar + Suma de impuestos adicionales
    const total = subtotal + tax + additionalTaxesTotal + additionalFixedTotal;
    
    console.log("Totales calculados:", {
      subtotal,
      tax,
      additionalTaxesTotal,
      additionalFixedTotal,
      total
    });
    
    // Actualizamos los campos en el formulario
    form.setValue("subtotal", subtotal);
    form.setValue("tax", tax);
    form.setValue("total", total);
    
    return { subtotal, tax, additionalTaxesTotal, additionalFixedTotal, total };
    
  } catch (error) {
    console.error("Error al calcular totales:", error);
    return { subtotal: 0, tax: 0, additionalTaxesTotal: 0, additionalFixedTotal: 0, total: 0 };
  }
}

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
  initialData?: any; // Datos iniciales para el formulario
}

const InvoiceForm = ({ invoiceId, initialData }: InvoiceFormProps) => {
  const [, setLocation] = useLocation();
  const isEditMode = Boolean(invoiceId);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [currentIban, setCurrentIban] = useState('');
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [newTaxData, setNewTaxData] = useState({ name: "", amount: 0, isPercentage: false });
  const [showClientModal, setShowClientModal] = useState(false);
  const queryClient = useQueryClient();
  
  // Consultar datos de la factura si estamos en modo edición
  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    queryFn: () => apiRequest("GET", `/api/invoices/${invoiceId}`),
    enabled: isEditMode && !initialData, // No ejecutar si tenemos datos iniciales proporcionados
    staleTime: 0, // No cache
  });
  
  // Consultar datos de clientes para el selector
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients"),
    staleTime: 0, // Siempre obtener los datos más recientes de clientes
  });
  
  // Consultar datos de la empresa para obtener el IBAN
  const { data: companyData } = useQuery({
    queryKey: ["/api/company"],
    queryFn: () => apiRequest("GET", "/api/company"),
    staleTime: 0, // Siempre obtener los datos más recientes
    refetchOnWindowFocus: false, // Evitar refetch automático al volver a enfocar la ventana
  });

  // Actualizar el estado del IBAN cuando los datos de la empresa estén disponibles
  useEffect(() => {
    if (companyData && typeof companyData === 'object' && 'bankAccount' in companyData) {
      const bankAccount = companyData.bankAccount;
      if (typeof bankAccount === 'string') {
        setCurrentIban(bankAccount);
        console.log("IBAN actualizado:", bankAccount);
      }
    }
  }, [companyData]);
  
  // Creamos los valores por defecto utilizando el IBAN actual
  const getDefaultNotes = () => {
    return `Forma de pago: Transferencia bancaria\nNúmero de cuenta: ${currentIban || ""}`;
  };

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
    notes: getDefaultNotes(),
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

  // Initialize form with invoice data when loaded - either from API or passed in
  useEffect(() => {
    // Primero intentar usar datos proporcionados directamente
    if (initialData && isEditMode && initialData.invoice && initialData.items) {
      console.log("⚡ Usando datos iniciales proporcionados directamente:", initialData);
      
      const { invoice, items } = initialData;
      
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
      let additionalTaxesArray = [];
      
      if (invoice.additionalTaxes) {
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
      
      // Transformar los datos para el formulario
      const formattedInvoice = {
        ...invoice,
        invoiceNumber: invoice.invoiceNumber || "",
        clientId: invoice.clientId || 0,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        status: invoice.status || "pending",
        notes: invoice.notes || getDefaultNotes(),
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        total: Number(invoice.total || 0),
        // Mapeamos los items asegurando valores correctos
        items: (items || []).map((item: any) => ({
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
      
      console.log("🔄 Datos formateados para el formulario (initialData):", formattedInvoice);
      
      // Actualizar el formulario con los datos formateados
      form.reset(formattedInvoice);
      
      // Si hay archivos adjuntos, actualizamos el estado
      if (invoice.attachments) {
        setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
      }
      
      // Recalcular totales después de que el formulario se haya actualizado completamente
      setTimeout(() => {
        // Función calculateInvoiceTotals(form) reemplazada con código inline
      }, 200);
    }
    // Si no, usar datos de la API
    else if (isEditMode && invoiceData && typeof invoiceData === 'object' && 'invoice' in invoiceData && 'items' in invoiceData) {
      console.log("⚡ Cargando datos de factura para edición desde API:", invoiceData);
      
      // @ts-ignore - Aseguramos el acceso a las propiedades mediante comprobación previa
      const { invoice, items } = invoiceData;
      
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
      let additionalTaxesArray = [];
      
      if (invoice.additionalTaxes) {
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
      
      // Transformar los datos para el formulario
      const formattedInvoice = {
        ...invoice,
        invoiceNumber: invoice.invoiceNumber || "",
        clientId: invoice.clientId || 0,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        status: invoice.status || "pending",
        notes: invoice.notes || getDefaultNotes(),
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        total: Number(invoice.total || 0),
        // Mapeamos los items asegurando valores correctos
        items: (items || []).map((item: any) => ({
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
      
      // Actualizar el formulario con los datos formateados
      form.reset(formattedInvoice);
      
      // Si hay archivos adjuntos, actualizamos el estado
      if (invoice.attachments) {
        setAttachments(Array.isArray(invoice.attachments) ? invoice.attachments : []);
      }
      
      // Recalcular totales después de que el formulario se haya actualizado completamente
      setTimeout(() => {
        // Función calculateInvoiceTotals(form) reemplazada con código inline
      }, 200);
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
        // @ts-ignore - Ya verificamos en el useEffect que datos existe
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
      setLocation("/invoices");
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
      // Función calculateInvoiceTotals(form) reemplazada con código inline
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
    
    // Seleccionar automáticamente el nuevo cliente en el formulario
    form.setValue("clientId", newClient.id);
    
    // Cerrar el modal de creación de cliente
    setShowClientModal(false);
  };

  // Recalcular totales cuando cambia el valor de los items
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name?.startsWith("items") || name?.startsWith("additionalTaxes")) {
        calculateInvoiceTotals(form);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Loading state
  if (isEditMode && isLoading && !initialData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader className="h-6 w-6 animate-spin mx-auto" />
          <p className="mt-2">Cargando factura...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <FormProvider {...form}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primera columna - Datos generales */}
              <Card className="md:col-span-1 bg-card border border-border/40 shadow-md">
                <CardContent className="pt-6 space-y-4">
                  <h3 className="text-lg font-medium">Información general</h3>
                  
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de factura</FormLabel>
                        <FormControl>
                          <Input placeholder="FRA-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-end space-x-2">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Cliente</FormLabel>
                          <Select
                            value={field.value.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client: any) => (
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
                    
                    <Button
                      type="button"
                      variant="ghost"
                      className="mb-2 ml-2 border border-border/60 px-3 shrink-0"
                      onClick={() => setShowClientModal(true)}
                    >
                      Nuevo
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de emisión</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                            />
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
                            <Input
                              type="date"
                              {...field}
                            />
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
                        <InvoiceStatus field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Forma de pago, IBAN, condiciones especiales..."
                            className="resize-none min-h-[100px]"
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
                      <FileUploader onFileUploaded={handleFileUpload} />
                    </div>
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {attachments.map((path, index) => (
                          <div
                            key={index}
                            className="text-sm text-muted-foreground flex items-center"
                          >
                            <span className="truncate flex-1">
                              {path.split("/").pop()}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-destructive"
                              onClick={() =>
                                setAttachments(
                                  attachments.filter((_, i) => i !== index)
                                )
                              }
                            >
                              Eliminar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Segunda y tercera columna - Detalles de la factura */}
              <Card className="md:col-span-2 bg-card border border-border/40 shadow-md">
                <CardContent className="pt-6 space-y-4">
                  <h3 className="text-lg font-medium">Detalle de factura</h3>
                  
                  {/* Tabla de líneas de factura */}
                  <div className="border border-border/40 rounded-md">
                    <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium rounded-t-md border-b border-border/40">
                      <div className="col-span-5">Descripción</div>
                      <div className="col-span-2 text-center">Cantidad</div>
                      <div className="col-span-2 text-center">Precio</div>
                      <div className="col-span-1 text-center">IVA %</div>
                      <div className="col-span-1 text-center">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    <div className="p-2 space-y-2">
                      {fields.map((field, index) => (
                        <InvoiceItemRow
                          key={field.id}
                          index={index}
                          remove={remove}
                          onBlur={() => calculateInvoiceTotals(form)}
                        />
                      ))}
                      
                      <div className="pt-2">
                        <AddItemButton
                          onClick={() =>
                            append({
                              description: "",
                              quantity: 1,
                              unitPrice: 0,
                              taxRate: 21,
                              subtotal: 0,
                            })
                          }
                          className="w-full"
                        >
                          Añadir línea
                        </AddItemButton>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sección de impuestos adicionales */}
                  <div className="border border-border/40 rounded-md mt-6">
                    <div className="p-3 bg-muted/50 text-sm font-medium rounded-t-md border-b border-border/40">
                      Impuestos adicionales
                    </div>
                    
                    <div className="p-2 space-y-2">
                      {taxFields.length > 0 ? (
                        <div className="grid grid-cols-12 gap-2 px-3 py-1 bg-muted/30 text-xs font-medium">
                          <div className="col-span-5">Nombre</div>
                          <div className="col-span-3 text-center">Importe/Porcentaje</div>
                          <div className="col-span-3 text-center">Tipo</div>
                          <div className="col-span-1"></div>
                        </div>
                      ) : null}
                      
                      {taxFields.map((field, index) => (
                        <AdditionalTaxField
                          key={field.id}
                          index={index}
                          remove={removeTax}
                          onBlur={() => calculateInvoiceTotals(form)}
                        />
                      ))}
                      
                      <div className="pt-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTax('irpf')}
                          className="flex-1 text-sm"
                        >
                          + Añadir IRPF
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTax('iva')}
                          className="flex-1 text-sm"
                        >
                          + Añadir IVA adicional
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTax()}
                          className="flex-1 text-sm"
                        >
                          + Añadir impuesto personalizado
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Resumen de totales */}
                  <div className="flex justify-end pt-4">
                    <div className="w-full max-w-md space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <FormField
                          control={form.control}
                          name="subtotal"
                          render={({ field }) => (
                            <span className="font-medium">
                              {new Intl.NumberFormat("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(toNumber(field.value))}
                            </span>
                          )}
                        />
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IVA (21%):</span>
                        <FormField
                          control={form.control}
                          name="tax"
                          render={({ field }) => (
                            <span className="font-medium">
                              {new Intl.NumberFormat("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(toNumber(field.value))}
                            </span>
                          )}
                        />
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="flex justify-between">
                        <span className="font-bold">Total:</span>
                        <FormField
                          control={form.control}
                          name="total"
                          render={({ field }) => (
                            <span className="font-bold">
                              {new Intl.NumberFormat("es-ES", {
                                style: "currency",
                                currency: "EUR",
                              }).format(toNumber(field.value))}
                            </span>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/invoices")}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                disabled={mutation.isPending}
                className={cn(
                  "flex gap-2",
                  mutation.isPending && "opacity-80"
                )}
              >
                {mutation.isPending && (
                  <Loader className="h-4 w-4 animate-spin" />
                )}
                {isEditMode ? "Actualizar factura" : "Crear factura"}
              </Button>
            </div>
          </form>
        </Form>
      </FormProvider>

      {/* Modal para impuesto adicional */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir impuesto adicional</DialogTitle>
            <DialogDescription>
              Introduce los datos del impuesto que deseas añadir a la factura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taxName">Nombre del impuesto</Label>
              <Input
                id="taxName"
                placeholder="Ej: IRPF, Retención, etc."
                value={newTaxData.name}
                onChange={e => setNewTaxData({...newTaxData, name: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="taxAmount">Importe o porcentaje</Label>
              <Input
                id="taxAmount"
                type="number"
                placeholder="Ej: 15, -15, 100, etc."
                value={newTaxData.amount}
                onChange={e => setNewTaxData({...newTaxData, amount: Number(e.target.value)})}
              />
              <p className="text-sm text-muted-foreground">
                Usa valores negativos para retenciones o descuentos.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="tax-percentage"
                checked={newTaxData.isPercentage}
                onCheckedChange={checked => setNewTaxData({...newTaxData, isPercentage: checked})}
              />
              <Label htmlFor="tax-percentage">Es un porcentaje</Label>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleAddTaxFromDialog}>Añadir impuesto</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para crear cliente */}
      <ClientModal 
        open={showClientModal} 
        onOpenChange={setShowClientModal}
        onClientCreated={handleClientCreated} 
      />
    </>
  );
};

import { Label } from "@/components/ui/label";

export default InvoiceForm;
