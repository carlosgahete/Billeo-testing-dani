// client/src/components/invoices/InvoiceFormFixed2.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, FileText, FileCheck, Check, Plus, X, UserPlus, AlertCircle, Search, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Implementación en línea del componente de líneas de factura
const InvoiceLineItems = ({ control, name, formState }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name,
  });

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <div className="text-center py-6 bg-white border rounded-md">
          <p className="text-gray-500">No hay conceptos añadidos. Pulsa "Añadir concepto" para comenzar.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IVA %
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th scope="col" className="relative px-3 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, index) => {
                // Calcular subtotal para este item
                const quantity = control._formValues[name]?.[index]?.quantity || 0;
                const unitPrice = control._formValues[name]?.[index]?.unitPrice || 0;
                const subtotal = quantity * unitPrice;
                
                return (
                  <tr key={field.id}>
                    {/* Descripción */}
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`${name}.${index}.description`}
                        render={({ field }) => (
                          <div>
                            <Input {...field} className="w-full" placeholder="Descripción del producto o servicio" />
                            {formState.errors?.[name]?.[index]?.description && (
                              <p className="text-xs text-red-500 mt-1">
                                {formState.errors[name][index].description.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </td>
                    
                    {/* Cantidad */}
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`${name}.${index}.quantity`}
                        render={({ field }) => (
                          <div>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="1"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-20"
                            />
                            {formState.errors?.[name]?.[index]?.quantity && (
                              <p className="text-xs text-red-500 mt-1">
                                {formState.errors[name][index].quantity.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </td>
                    
                    {/* Precio */}
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`${name}.${index}.unitPrice`}
                        render={({ field }) => (
                          <div>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              step="0.01"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-24"
                            />
                            {formState.errors?.[name]?.[index]?.unitPrice && (
                              <p className="text-xs text-red-500 mt-1">
                                {formState.errors[name][index].unitPrice.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </td>
                    
                    {/* IVA % */}
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`${name}.${index}.taxRate`}
                        render={({ field }) => (
                          <div>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="IVA" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="4">4%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="21">21%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      />
                    </td>
                    
                    {/* Subtotal */}
                    <td className="px-3 py-2 text-gray-900 font-medium">
                      {formatCurrency(subtotal)}
                    </td>
                    
                    {/* Botón de eliminar */}
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxRate: 21 })}
        className="mt-2"
      >
        <Plus className="h-4 w-4 mr-2" />
        Añadir concepto
      </Button>
    </div>
  );
};

// Función para formatear moneda
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Importamos el diálogo de validación directamente
import InvoiceValidationAlert from "./InvoiceValidationAlert";

// Tipo para los impuestos adicionales
interface AdditionalTax {
  name: string;
  amount: number;
  isPercentage?: boolean;
}

// Interfaz para las propiedades del formulario
interface InvoiceFormProps {
  invoiceId?: number;
  initialData?: any;
}

const InvoiceFormFixed2 = ({ invoiceId, initialData }: InvoiceFormProps) => {
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
      return new Date().toISOString().split("T")[0];
    }
  };

  // Función para procesar items
  const processItems = (items: any[] | null | undefined) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return [];
    }
    
    console.log(`✅ Procesando ${items.length} items para la factura`);
    
    return items.map((item: any) => {
      return {
        id: item.id,
        invoiceId: item.invoiceId,
        description: item.description || "",
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 21,
        subtotal: Number(item.subtotal) || 0,
      };
    });
  };

  // Schema para validación del formulario de factura
  const invoiceFormSchema = z.object({
    invoiceNumber: z.string().min(1, "El número de factura es obligatorio"),
    clientId: z.string().or(z.number()).refine(val => val !== "" && val !== 0, { 
      message: "Selecciona un cliente" 
    }),
    issueDate: z.string().min(1, "La fecha de emisión es obligatoria"),
    dueDate: z.string().min(1, "La fecha de vencimiento es obligatoria"),
    notes: z.string().optional(),
    // Campos calculados que se actualizan automáticamente
    subtotal: z.number().nonnegative().optional(),
    tax: z.number().nonnegative().optional(),
    total: z.number().nonnegative().optional(),
    paymentMethod: z.string().optional(),
    status: z.string().optional(),
    items: z.array(
      z.object({
        id: z.number().optional(),
        invoiceId: z.number().optional(),
        description: z.string().min(1, "La descripción es obligatoria"),
        quantity: z.number().positive("La cantidad debe ser mayor que cero"),
        unitPrice: z.number().nonnegative("El precio no puede ser negativo"),
        taxRate: z.number(),
        subtotal: z.number().optional(),
      })
    ).optional(),
    additionalTaxes: z.array(
      z.object({
        name: z.string(),
        amount: z.number(),
        isPercentage: z.boolean().optional()
      })
    ).optional(),
  });

  // Inicializar el formulario con valores por defecto
  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceNumber: "F-" + new Date().getFullYear() + "-" + Math.floor(Math.random() * 1000),
      clientId: "",
      issueDate: formatDateForInput(new Date().toISOString()),
      dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
      notes: "",
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: "Transferencia",
      status: "pending",
      items: [],
      additionalTaxes: []
    }
  });

  // Efecto para inicializar el formulario con datos de edición si los hay
  useEffect(() => {
    // Si estamos en modo edición y tenemos datos
    if (isEditMode && initialData) {
      const invoice = initialData.invoice;
      const items = initialData.items;
      
      // Procesar items para asegurarnos de que tienen el formato correcto
      const processedItems = processItems(items);
      
      // Actualizar el formulario con los datos existentes
      form.reset({
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId,
        issueDate: formatDateForInput(invoice.issueDate),
        dueDate: formatDateForInput(invoice.dueDate),
        notes: invoice.notes || "",
        subtotal: Number(invoice.subtotal) || 0,
        tax: Number(invoice.tax) || 0,
        total: Number(invoice.total) || 0,
        paymentMethod: invoice.paymentMethod || "Transferencia",
        status: invoice.status || "pending",
        items: processedItems.length > 0 ? processedItems : [],
        additionalTaxes: invoice.additionalTaxes || []
      });
      
      // Si hay adjuntos, actualizamos el estado
      if (invoice.attachments && Array.isArray(invoice.attachments)) {
        setAttachments(invoice.attachments);
      }
    } else {
      // Si no estamos en modo edición, intentar obtener el siguiente número de factura
      fetchNextInvoiceNumber();
      
      // Verificar si hay un cliente seleccionado en sessionStorage
      try {
        const selectedClientJSON = sessionStorage.getItem('selectedClient');
        if (selectedClientJSON) {
          const selectedClient = JSON.parse(selectedClientJSON);
          console.log("🔍 Cliente encontrado en sessionStorage:", selectedClient);
          
          // Si el cliente tiene un ID válido, lo establecemos en el formulario
          if (selectedClient && selectedClient.id) {
            form.setValue("clientId", selectedClient.id);
            setSelectedClientInfo(selectedClient);
            console.log(`✅ Cliente ${selectedClient.name} seleccionado automáticamente`);
            
            // Limpiar sessionStorage para no volver a cargar este cliente
            sessionStorage.removeItem('selectedClient');
          }
        }
      } catch (error) {
        console.error("Error al cargar cliente desde sessionStorage:", error);
      }
    }
  }, [isEditMode, initialData, form]);

  // Efecto para cargar la información del cliente seleccionado
  useEffect(() => {
    const clientId = form.getValues().clientId;
    if (clientId && clientList && Array.isArray(clientList)) {
      const selectedClient = clientList.find((client: any) => client.id === Number(clientId));
      setSelectedClientInfo(selectedClient || null);
    } else {
      setSelectedClientInfo(null);
    }
  }, [form.watch("clientId"), clientList]);

  // Función para obtener el siguiente número de factura
  const fetchNextInvoiceNumber = async () => {
    try {
      console.log("Solicitando número de factura al servidor...");
      const response = await apiRequest("GET", "/api/invoices/next-number");
      const data = await response.json();
      console.log("Respuesta del servidor:", data);
      
      // Asegurarse de usar el nombre de campo correcto según la respuesta del API
      if (data.invoiceNumber) {
        console.log(`Estableciendo número de factura: ${data.invoiceNumber}`);
        form.setValue("invoiceNumber", data.invoiceNumber);
      } else if (data.nextNumber) {
        console.log(`Estableciendo número de factura: ${data.nextNumber}`);
        form.setValue("invoiceNumber", data.nextNumber);
      } else {
        console.error("La respuesta del servidor no contiene un número de factura válido:", data);
      }
    } catch (error) {
      console.error("Error al obtener número de factura:", error);
    }
  };

  // Calcula sólo la base imponible basado en los conceptos (para evitar que cambie)
  const calculateBaseAmount = (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };
  
  // Calcula el IVA de los conceptos
  const calculateItemsTax = (items: any[]) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;
      const itemSubtotal = quantity * unitPrice;
      return total + (itemSubtotal * (taxRate / 100));
    }, 0);
  };
  
  // Calcula los impuestos adicionales (incluido el IRPF)
  const calculateAdditionalTaxes = (taxes: any[], baseAmount: number) => {
    if (!Array.isArray(taxes) || taxes.length === 0) return { additionalTax: 0, negativeAdjustments: 0 };
    
    return taxes.reduce((result, tax) => {
      const taxAmount = tax.isPercentage 
        ? baseAmount * (tax.amount / 100) 
        : tax.amount;
      
      // Verificar si es IRPF para aplicarlo como deducción (negativo)
      const isIRPF = tax.name?.toLowerCase().includes('irpf') || tax.name?.toLowerCase().includes('retención');
      
      if (isIRPF) {
        // IRPF es una deducción, va como negativo
        return {
          additionalTax: result.additionalTax + taxAmount, // suma a impuestos para reportes
          negativeAdjustments: result.negativeAdjustments + taxAmount // pero lo guardamos como negativo
        };
      } else {
        // Otros impuestos son positivos
        return {
          additionalTax: result.additionalTax + taxAmount,
          negativeAdjustments: result.negativeAdjustments
        };
      }
    }, { additionalTax: 0, negativeAdjustments: 0 });
  };
  
  // Vigilar cambios en elementos y aplicar cálculos
  const items = form.watch("items") || [];
  const additionalTaxes = form.watch("additionalTaxes") || [];
  
  // Calcular base imponible (nunca debe cambiar excepto al modificar conceptos)
  const baseAmount = calculateBaseAmount(items);
  
  // Calcular IVA de los conceptos
  const itemsTax = calculateItemsTax(items);
  
  // Calcular impuestos adicionales (incluido el IRPF que va como negativo)
  const { additionalTax, negativeAdjustments } = calculateAdditionalTaxes(additionalTaxes, baseAmount);
  
  // Calcular totales
  const calculatedTotals = {
    subtotal: baseAmount,
    tax: itemsTax + additionalTax,
    total: baseAmount + itemsTax + additionalTax - negativeAdjustments
  };

  // Actualizar campos calculados en el formulario
  useEffect(() => {
    form.setValue("subtotal", calculatedTotals.subtotal);
    form.setValue("tax", calculatedTotals.tax);
    form.setValue("total", calculatedTotals.total);
  }, [calculatedTotals, form]);

  // Función para agregar un impuesto adicional desde el diálogo
  const handleAddTaxFromDialog = () => {
    const currentTaxes = form.getValues("additionalTaxes") || [];
    
    // Verificar si ya existe un impuesto con el mismo nombre para actualizar en lugar de duplicar
    const existingTaxIndex = currentTaxes.findIndex(tax => 
      tax.name.toLowerCase() === newTaxData.name.toLowerCase()
    );
    
    let newTaxes;
    
    if (existingTaxIndex >= 0) {
      // Si existe, actualizar en lugar de agregar uno nuevo
      newTaxes = [...currentTaxes];
      newTaxes[existingTaxIndex] = newTaxData;
      
      toast({
        title: 'Impuesto actualizado',
        description: `El impuesto ${newTaxData.name} ha sido actualizado.`,
      });
    } else {
      // Si no existe, agregar nuevo
      newTaxes = [...currentTaxes, newTaxData];
      
      toast({
        title: 'Impuesto añadido',
        description: `Se ha añadido ${newTaxData.name} a esta factura.`,
      });
    }
    
    form.setValue("additionalTaxes", newTaxes);
    
    // Resetear el diálogo y cerrarlo
    setNewTaxData({
      name: '',
      amount: 0,
      isPercentage: true
    });
    setShowTaxDialog(false);
  };

  // Función para eliminar un impuesto adicional
  const handleRemoveTax = (index: number) => {
    const currentTaxes = form.getValues("additionalTaxes") || [];
    const newTaxes = currentTaxes.filter((_, i) => i !== index);
    
    form.setValue("additionalTaxes", newTaxes);
  };

  // Función para agregar retención (IRPF)
  const handleAddIRPF = () => {
    const currentTaxes = form.getValues("additionalTaxes") || [];
    
    // Verificar si ya existe un impuesto con nombre IRPF
    const existingIRPFIndex = currentTaxes.findIndex(tax => 
      tax.name.toLowerCase().includes('irpf') || 
      tax.name.toLowerCase().includes('retención')
    );
    
    if (existingIRPFIndex >= 0) {
      // Reemplazar el IRPF existente
      const newTaxes = [...currentTaxes];
      newTaxes[existingIRPFIndex] = {
        name: "IRPF",
        amount: 15, // El valor se muestra como negativo en la UI pero se guarda como positivo
        isPercentage: true
      };
      form.setValue("additionalTaxes", newTaxes);
      
      toast({
        title: 'IRPF actualizado',
        description: 'Se ha aplicado una retención de IRPF del -15% a esta factura.',
      });
    } else {
      // Agregar nuevo IRPF
      form.setValue("additionalTaxes", [
        ...currentTaxes,
        {
          name: "IRPF",
          amount: 15, // El valor se muestra como negativo en la UI pero se guarda como positivo
          isPercentage: true
        }
      ]);
      
      toast({
        title: 'IRPF añadido',
        description: 'Se ha aplicado una retención de IRPF del -15% a esta factura.',
      });
    }
  };

  // Función para agregar IVA
  const handleAddIVA = () => {
    // Verificar si hay items y si tienen taxRate
    const items = form.getValues("items") || [];
    if (items.length > 0) {
      const updatedItems = items.map(item => ({
        ...item,
        taxRate: 21 // Establecer 21% de IVA
      }));
      form.setValue("items", updatedItems);
      
      toast({
        title: 'IVA añadido',
        description: 'Se ha aplicado un IVA del 21% a todos los conceptos.',
      });
    } else {
      toast({
        title: 'No hay conceptos',
        description: 'Agrega al menos un concepto a la factura antes de aplicar IVA.',
        variant: 'destructive'
      });
    }
  };

  // Función para marcar todos los items como exentos de IVA
  const handleExemptIVA = () => {
    // Verificar si hay items y establecer taxRate a 0
    const items = form.getValues("items") || [];
    if (items.length > 0) {
      const updatedItems = items.map(item => ({
        ...item,
        taxRate: 0 // Exento de IVA
      }));
      form.setValue("items", updatedItems);
      
      toast({
        title: 'IVA Exento',
        description: 'Se ha marcado la factura como exenta de IVA. Recuerda incluir la referencia legal en las notas.',
      });
    } else {
      toast({
        title: 'No hay conceptos',
        description: 'Agrega al menos un concepto a la factura antes de aplicar la exención de IVA.',
        variant: 'destructive'
      });
    }
  };

  // Mutación para enviar el formulario
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Importante: Estructurar correctamente el cuerpo de la petición para que coincida con
      // lo que espera el servidor (invoice + items)
      const requestBody = {
        invoice: {
          ...data,
          // Asegurar que los impuestos adicionales se envíen correctamente
          additionalTaxes: data.additionalTaxes || [],
          // Convertir campos monetarios a strings (requisito del servidor)
          subtotal: data.subtotal?.toString() || "0",
          tax: data.tax?.toString() || "0",
          total: data.total?.toString() || "0",
          // Asegurar que las fechas estén en formato correcto
          issueDate: data.issueDate,
          dueDate: data.dueDate
        },
        items: data.items || []
      };
      
      console.log("📦 Cuerpo de la petición estructurado:", requestBody);
      
      const response = await apiRequest("POST", "/api/invoices", requestBody);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear factura");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Factura creada",
        description: "La factura se ha creado correctamente",
        variant: "default",
      });
      navigate("/invoices");
    },
    onError: (error: Error) => {
      console.error("Error en la mutación de creación:", error);
      toast({
        title: "Error al crear factura",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutación para actualizar el formulario si estamos en modo edición
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!invoiceId) throw new Error("No se especificó ID de factura para actualizar");
      
      // Estructurar de la misma forma que createMutation para consistencia
      const requestBody = {
        invoice: {
          ...data,
          // Asegurar que los impuestos adicionales se envíen correctamente
          additionalTaxes: data.additionalTaxes || [],
          // Convertir campos monetarios a strings (requisito del servidor)
          subtotal: data.subtotal?.toString() || "0",
          tax: data.tax?.toString() || "0",
          total: data.total?.toString() || "0",
          // Asegurar que las fechas estén en formato correcto
          issueDate: data.issueDate,
          dueDate: data.dueDate
        },
        items: data.items || []
      };
      
      console.log("📦 Cuerpo de actualización estructurado:", requestBody);
      
      // Usar PUT en lugar de PATCH ya que parece que el endpoint PATCH no está implementado
      const response = await apiRequest("PUT", `/api/invoices/${invoiceId}`, requestBody);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar factura");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      toast({
        title: "Factura actualizada",
        description: "La factura se ha actualizado correctamente",
        variant: "default",
      });
      navigate("/invoices");
    },
    onError: (error: Error) => {
      console.error("Error en la mutación de actualización:", error);
      toast({
        title: "Error al actualizar factura",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Función para manejar el envío del formulario
  const onSubmit = async (data: z.infer<typeof invoiceFormSchema>) => {
    // Validar que el formulario tenga al menos un ítem
    const items = data.items || [];
    
    if (items.length === 0) {
      toast({
        title: "Faltan datos",
        description: "Debes añadir al menos un concepto a la factura",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar si el usuario está intentando actualizar o crear
    if (isEditMode) {
      // Actualizar factura existente
      updateMutation.mutate(data);
    } else {
      // Crear nueva factura
      createMutation.mutate(data);
    }
  };

  // Función para navegar a la creación de clientes
  const navigateToClientCreation = () => {
    // Guardar el estado actual de la factura en sessionStorage
    sessionStorage.setItem('invoiceFormState', JSON.stringify(form.getValues()));
    // Navegar a la creación de clientes
    navigate('/clients/create?from=invoice');
  };

  // Verificar si hay cliente seleccionado para mostrar info
  const hasSelectedClient = !!selectedClientInfo;

  return (
    <div className="container mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Sección superior: Cliente y datos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sección Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <span>Cliente y datos básicos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(value)}
                            disabled={isLoadingClients}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingClients ? (
                                <SelectItem value="loading">Cargando clientes...</SelectItem>
                              ) : clientList && Array.isArray(clientList) && clientList.length > 0 ? (
                                clientList.map((client: any) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name} - {client.taxId}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="empty">No hay clientes disponibles</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={navigateToClientCreation}
                          className="min-w-[40px] w-auto"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">Nuevo</span>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {hasSelectedClient && (
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                    <h3 className="font-medium text-gray-700 mb-2">{selectedClientInfo.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div><span className="font-medium">NIF/CIF:</span> {selectedClientInfo.taxId}</div>
                      <div><span className="font-medium">Email:</span> {selectedClientInfo.email || "No especificado"}</div>
                      <div className="sm:col-span-2"><span className="font-medium">Dirección:</span> {selectedClientInfo.address}, {selectedClientInfo.city} {selectedClientInfo.postalCode}, {selectedClientInfo.country}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de factura *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="2023-001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  Pendiente
                                </span>
                              </SelectItem>
                              <SelectItem value="paid">
                                <span className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-green-500" />
                                  Pagada
                                </span>
                              </SelectItem>
                              <SelectItem value="draft">
                                <span className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  Borrador
                                </span>
                              </SelectItem>
                              <SelectItem value="sent">
                                <span className="flex items-center gap-2">
                                  <FileCheck className="h-4 w-4 text-blue-500" />
                                  Enviada
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de emisión *</FormLabel>
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
                        <FormLabel>Fecha de vencimiento *</FormLabel>
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
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de pago</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col sm:flex-row gap-3"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Transferencia" id="Transferencia" />
                            <Label htmlFor="Transferencia">Transferencia</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Tarjeta" id="Tarjeta" />
                            <Label htmlFor="Tarjeta">Tarjeta</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Efectivo" id="Efectivo" />
                            <Label htmlFor="Efectivo">Efectivo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Otro" id="Otro" />
                            <Label htmlFor="Otro">Otro</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas o comentarios</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Añade información adicional, términos, condiciones, etc."
                          {...field}
                          className="h-20 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Panel derecho: Impuestos y Conceptos */}
            <div className="flex flex-col space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>Conceptos e impuestos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Impuestos:</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddIVA}
                        className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
                      >
                        IVA <span className="ml-1 font-bold">21%</span>
                      </Button>
                      
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddIRPF}
                        className="border-red-200 bg-red-50 hover:bg-red-100 text-red-700"
                      >
                        IRPF <span className="ml-1 font-bold">-15%</span>
                      </Button>
                      
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleExemptIVA}
                        className="border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
                      >
                        Exento <span className="ml-1 font-bold">0%</span>
                      </Button>
                      
                      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Otro
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Añadir impuesto personalizado</DialogTitle>
                            <DialogDescription>
                              Añade impuestos o retenciones específicas para esta factura.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="tax-name">Nombre del impuesto</Label>
                              <Input
                                id="tax-name"
                                placeholder="Ej. IVA, IRPF, etc."
                                value={newTaxData.name}
                                onChange={(e) => setNewTaxData({...newTaxData, name: e.target.value})}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="tax-amount">Valor</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  id="tax-amount"
                                  type="number"
                                  placeholder="Importe o porcentaje"
                                  min="0"
                                  step="0.01"
                                  value={newTaxData.amount}
                                  onChange={(e) => setNewTaxData({...newTaxData, amount: parseFloat(e.target.value) || 0})}
                                />
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id="tax-is-percentage"
                                    checked={newTaxData.isPercentage}
                                    onCheckedChange={(checked) => setNewTaxData({...newTaxData, isPercentage: checked})}
                                  />
                                  <Label htmlFor="tax-is-percentage">%</Label>
                                </div>
                              </div>
                            </div>
                          </div>

                          <DialogFooter className="sm:justify-end">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setShowTaxDialog(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              onClick={handleAddTaxFromDialog}
                              disabled={!newTaxData.name || newTaxData.amount <= 0}
                            >
                              Añadir
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Lista de impuestos adicionales aplicados */}
                    {additionalTaxes.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <h5 className="text-xs text-gray-500">Impuestos aplicados:</h5>
                        {additionalTaxes.map((tax, index) => {
                          // Determinar si es IRPF para aplicar estilo especial
                          const isIRPF = tax.name?.toLowerCase().includes('irpf') || 
                                        tax.name?.toLowerCase().includes('retención');
                          
                          // Calcular el importe del impuesto
                          const taxAmount = tax.isPercentage 
                            ? baseAmount * (tax.amount / 100) 
                            : tax.amount;
                          
                          return (
                            <div key={index} className="flex justify-between items-center text-sm p-2 border border-gray-100 bg-gray-50 rounded">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-600">
                                  {tax.name} {tax.isPercentage ? `(${isIRPF ? '-' : ''}${tax.amount}%)` : ''}
                                </span>
                              </div>
                              <span className={`font-medium ${isIRPF ? 'text-red-600' : 'text-gray-700'}`}>
                                {formatCurrency(taxAmount)}
                              </span>
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTax(index)}
                                className="h-6 w-6 p-0 ml-1 text-gray-400 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <Tabs defaultValue="items" className="w-full">
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="items">Conceptos</TabsTrigger>
                    </TabsList>
                    <TabsContent value="items" className="pt-4">
                      <FormField
                        control={form.control}
                        name="items"
                        render={({ field }) => (
                          <FormItem>
                            <InvoiceLineItems
                              control={form.control}
                              name="items"
                              formState={form.formState}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Resumen de factura */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl text-blue-600">
                    Resumen de la factura
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Base imponible</span>
                      <span className="font-medium">{formatCurrency(calculatedTotals.subtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        IVA ({items.length > 0 ? (items[0].taxRate + '%') : '0%'})
                      </span>
                      <span className="font-medium">{formatCurrency(itemsTax)}</span>
                    </div>
                    
                    {/* Mostrar impuestos adicionales en el resumen */}
                    {additionalTaxes.length > 0 && (
                      <>
                        {additionalTaxes.map((tax, index) => {
                          // Calcular el importe del impuesto
                          const taxAmount = tax.isPercentage 
                            ? baseAmount * (tax.amount / 100) 
                            : tax.amount;
                          
                          // Verificar si es IRPF para mostrarlo como negativo
                          const isIRPF = tax.name?.toLowerCase().includes('irpf') || tax.name?.toLowerCase().includes('retención');
                          
                          return (
                            <div key={index} className="flex justify-between items-center">
                              <div className="text-gray-600">
                                <span className="text-gray-600">
                                  {tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}
                                </span>
                              </div>
                              <span className={`font-medium ${isIRPF ? 'text-red-600' : 'text-gray-700'}`}>
                                {formatCurrency(taxAmount)}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                    
                    <div className="flex justify-between pt-3 font-bold">
                      <span>Total a pagar</span>
                      <span className="text-blue-600">{formatCurrency(calculatedTotals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botones de acción simplificados */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={createMutation.isPending || updateMutation.isPending || blockAllSubmits}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{isEditMode ? "Actualizando factura..." : "Creando factura..."}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <FileCheck className="mr-2 h-5 w-5" />
                  <span>{isEditMode ? "Actualizar factura" : "Crear factura"}</span>
                </div>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/invoices")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Diálogo de validación (para mostrar errores o confirmar envío) */}
      <InvoiceValidationAlert 
        show={showValidation}
        onClose={() => setShowValidation(false)}
        onSubmit={() => {
          setShowValidation(false);
          setUserInitiatedSubmit(true);
          form.handleSubmit(onSubmit)();
        }}
        hasClient={!!form.getValues().clientId}
        hasAmount={form.getValues().subtotal > 0}
        hasTaxes={form.getValues().tax > 0}
        hasExemptionReason={form.getValues().notes?.toLowerCase().includes('exento') || false}
      />
    </div>
  );
};

export default InvoiceFormFixed2;