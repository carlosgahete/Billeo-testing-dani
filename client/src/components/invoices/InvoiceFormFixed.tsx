// client/src/components/invoices/InvoiceFormFixed.tsx
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
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
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
      items: [{
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 21
      }],
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
        items: processedItems.length > 0 ? processedItems : [{
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 21
        }],
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
    if (clientId && clientList) {
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
  const calculateBaseAmount = (items) => {
    if (!Array.isArray(items) || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };
  
  // Calcula el IVA de los conceptos
  const calculateItemsTax = (items) => {
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
  const calculateAdditionalTaxes = (taxes, baseAmount) => {
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
      console.error("Error en la mutación:", error);
      toast({
        title: "Error al crear factura",
        description: error.message,
        variant: "destructive",
      });
      setBlockAllSubmits(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Estructurar de la misma forma que createMutation para consistencia
      const requestBody = {
        invoice: {
          ...data,
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
      setBlockAllSubmits(false);
    }
  });

  // Función principal de envío del formulario
  const handleSubmit = async (data: z.infer<typeof invoiceFormSchema>) => {
    // Si el formulario está bloqueado, no permitir el envío
    if (blockAllSubmits) {
      console.log("⛔ Envío bloqueado - ya se está procesando una solicitud");
      return;
    }
    
    // Bloquear futuros envíos hasta que termine este
    setBlockAllSubmits(true);
    
    try {
      // Comprobar si hay validación manual necesaria
      if (!userInitiatedSubmit) {
        // Verificar condiciones para mostrar diálogo de validación
        const hasClient = !!data.clientId;
        const hasAmount = calculatedTotals.subtotal > 0;
        const hasTaxes = calculatedTotals.tax > 0 || (data.additionalTaxes?.length || 0) > 0;
        const hasExemptionReason = 
          data.notes?.toLowerCase().includes('exención') || 
          data.notes?.toLowerCase().includes('exento') ||
          data.notes?.toLowerCase().includes('exenta') ||
          data.notes?.toLowerCase().includes('exencion');
        
        // Si falta algún dato crítico, mostrar diálogo de validación
        if (!hasClient || !hasAmount || (!hasTaxes && !hasExemptionReason)) {
          console.log("⚠️ Se requiere validación manual para la factura");
          setShowValidation(true);
          setBlockAllSubmits(false);
          return;
        }
      }
      
      // Resetear la bandera de envío iniciado por usuario
      setUserInitiatedSubmit(false);
      
      // Procesar los datos para el envío
      const formData = {
        ...data,
        clientId: Number(data.clientId),
        // Asegurar que todos los valores numéricos sean números
        subtotal: Number(data.subtotal) || 0,
        tax: Number(data.tax) || 0,
        total: Number(data.total) || 0,
        // Asegurar que las fechas existan y tengan formato correcto
        issueDate: data.issueDate || formatDateForInput(new Date().toISOString()),
        dueDate: data.dueDate || formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
        // Procesar los items para asegurar que todos los campos son números
        items: data.items?.map(item => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          subtotal: Number(item.quantity) * Number(item.unitPrice)
        })) || []
      };
      
      console.log("📤 Enviando datos de factura:", formData);
      
      // Enviar la solicitud según sea crear o actualizar
      if (isEditMode) {
        await updateMutation.mutateAsync(formData);
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch (error) {
      console.error("Error en el envío del formulario:", error);
      setBlockAllSubmits(false);
    }
  };

  // Mostrar spinner mientras se cargan los clientes
  if (isLoadingClients) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ margin: "0 auto", width: "100%"}}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-medium text-gray-900">Nueva Factura</h1>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/invoices")}
              className="text-gray-600"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
          
          <div className="grid grid-cols-1 2xl:grid-cols-14 xl:grid-cols-14 lg:grid-cols-14 md:grid-cols-12 sm:grid-cols-1 gap-4">
            {/* Sección 1: Datos de la factura - ocupa 4 columnas en pantallas grandes */}
            <Card className="shadow-sm 2xl:col-span-3 xl:col-span-3 lg:col-span-3 md:col-span-12">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <CardTitle className="text-base flex items-center">
                  <FileText className="mr-2 h-5 w-5 text-blue-500" />
                  Datos de la factura
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {/* Alerta simple */}
                <div className="mb-4">
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-700 text-sm font-medium">Recuerda</AlertTitle>
                    <AlertDescription className="text-amber-700 text-xs">
                      Crea tus clientes primero en la 
                      sección de <Button variant="link" className="p-0 h-auto text-amber-800 underline font-medium" 
                      onClick={() => navigate("/clients")}>Clientes</Button> y luego selecciónalos aquí.
                    </AlertDescription>
                  </Alert>
                </div>

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
                          <Input placeholder="F-2023-001" {...field} className="border-gray-200 focus-visible:ring-blue-500" />
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
                        <FormLabel className="flex items-center text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Cliente <span className="text-red-500 ml-1">*</span>
                        </FormLabel>
                        <div className="flex flex-col space-y-2">
                          <div className="relative">
                            <FormControl>
                              <Select
                                value={field.value?.toString()}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="border-gray-200 focus:ring-blue-500 pr-16">
                                  <SelectValue placeholder="Selecciona un cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* Añadir campo de búsqueda al principio del menú */}
                                  <div className="p-2 sticky top-0 bg-white border-b border-gray-100 z-10">
                                    <div className="relative">
                                      <Input 
                                        placeholder="Buscar cliente..." 
                                        className="pl-8 border-gray-200 focus-visible:ring-blue-500"
                                        onChange={(e) => {
                                          // Esto es solo visual, la búsqueda real la manejamos en el componente de clientes
                                          // Ya que este solo es un selector
                                        }}
                                      />
                                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    </div>
                                  </div>
                                  {clientList?.map((client: any) => (
                                    <SelectItem key={client.id} value={client.id.toString()}>
                                      {client.name} - {client.taxId}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            
                            {/* Botón de búsqueda de clientes */}
                            <Button
                              type="button"
                              variant="outline"
                              className="absolute right-1 top-0 h-full px-3 py-2 rounded-l-none text-blue-600 border-l"
                              onClick={() => navigate("/clients?from=invoice")}
                            >
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Botón para ir a la sección de clientes */}
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => navigate("/clients")}
                            className="w-full flex items-center justify-center border-dashed border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Ir a crear nuevo cliente
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Mostrar información del cliente seleccionado */}
                  {selectedClientInfo && (
                    <div className="mt-2 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center mb-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                          <span className="text-sm font-semibold">{selectedClientInfo.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <h4 className="font-medium text-gray-900">{selectedClientInfo.name}</h4>
                      </div>
                      <div className="ml-11 text-sm text-gray-600 grid grid-cols-2 gap-x-4 gap-y-2">
                        <p className="flex items-center"><span className="text-gray-500 mr-1">NIF/CIF:</span> <span className="font-medium">{selectedClientInfo.taxId}</span></p>
                        <p className="flex items-center"><span className="text-gray-500 mr-1">Email:</span> <span className="font-medium">{selectedClientInfo.email || 'No especificado'}</span></p>
                        <p className="col-span-2 flex items-center"><span className="text-gray-500 mr-1">Dirección:</span> <span className="font-medium">{selectedClientInfo.address}</span></p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center text-gray-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                            Fecha de emisión
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="border-gray-200 focus-visible:ring-blue-500" />
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
                          <FormLabel className="flex items-center text-gray-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                            Fecha de vencimiento
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="border-gray-200 focus-visible:ring-blue-500" />
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
                        <FormLabel className="flex items-center text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Método de pago
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="border-gray-200 focus:ring-blue-500">
                              <SelectValue placeholder="Selecciona un método de pago" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Transferencia">Transferencia bancaria</SelectItem>
                              <SelectItem value="Efectivo">Efectivo</SelectItem>
                              <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                              <SelectItem value="Bizum">Bizum</SelectItem>
                              <SelectItem value="Paypal">PayPal</SelectItem>
                              <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
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
                        <FormLabel className="flex items-center text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Estado de la factura
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="pending" id="pending" />
                              <FormLabel htmlFor="pending" className="text-gray-700 font-normal cursor-pointer">Pendiente</FormLabel>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="paid" id="paid" />
                              <FormLabel htmlFor="paid" className="text-gray-700 font-normal cursor-pointer">Pagada</FormLabel>
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
                        <FormLabel className="flex items-center text-gray-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Notas (incluir motivo de exención si aplica)
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notas adicionales o términos especiales..." 
                            className="min-h-[100px] border-gray-200 focus-visible:ring-blue-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sección 2: Líneas de factura e impuestos - ocupa más columnas en pantallas grandes */}
            <Card className="shadow-sm 2xl:col-span-11 xl:col-span-11 lg:col-span-11 md:col-span-12" style={{ maxWidth: "none" }}>
              <CardHeader className="bg-gray-50 border-b pb-3">
                <CardTitle className="text-base flex items-center">
                  <FileCheck className="mr-2 h-5 w-5 text-blue-500" />
                  Conceptos e impuestos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-6">
                  {/* Botones de impuestos estilo minimalista */}
                  <div className="space-y-3">
                    <div className="text-gray-600 text-sm mb-1">
                      Impuestos:
                    </div>
                    
                    {/* Botones de impuestos principales en estilo Apple */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddIVA}
                        className="flex items-center py-2 px-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-md"
                      >
                        <span className="font-medium">IVA</span>
                        <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">21%</span>
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddIRPF}
                        className="flex items-center py-2 px-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-md"
                      >
                        <span className="font-medium">IRPF</span>
                        <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">-15%</span>
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={handleExemptIVA}
                        variant="outline"
                        className="flex items-center py-2 px-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-md"
                      >
                        <span className="font-medium">Exento</span>
                        <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">0%</span>
                      </Button>
                      
                      <Button
                        type="button"
                        onClick={() => setShowTaxDialog(true)}
                        variant="outline"
                        className="flex items-center py-2 px-3 border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-md"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        <span className="font-medium">Otro</span>
                      </Button>
                    </div>
                  </div>

                  {/* Sección de líneas de factura */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b">
                      <h3 className="text-sm font-medium text-gray-700">
                        Conceptos
                      </h3>
                    </div>
                    
                    <div className="p-4">
                      <InvoiceLineItems
                        control={form.control}
                        name="items"
                        formState={form.formState}
                      />
                    </div>
                  </div>

                  {/* Mostrar impuestos adicionales si existen */}
                  {form.watch("additionalTaxes")?.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-gray-50 p-3 border-b">
                        <h3 className="text-sm font-medium text-gray-700">
                          Impuestos adicionales
                        </h3>
                      </div>
                      
                      <div className="p-4 space-y-2">
                        {form.watch("additionalTaxes")?.map((tax, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center">
                              <div className={`rounded px-2 py-1 text-xs font-medium mr-2 ${
                                tax.name.toLowerCase().includes('irpf') 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {tax.isPercentage ? 
                                 `${tax.name.toLowerCase().includes('irpf') ? '-' : ''}${tax.amount}%` 
                                 : '€'}
                              </div>
                              <span>{tax.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTax(index)}
                              className="h-8 w-8 p-0 text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resumen de totales */}
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-blue-600 p-3 text-white">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Resumen de la factura</h3>
                        <div className="font-bold">{formatCurrency(calculatedTotals.total)}</div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* Base imponible */}
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Base imponible</span>
                        <span className="font-medium">{formatCurrency(calculatedTotals.subtotal)}</span>
                      </div>
                      
                      {/* IVA de los conceptos */}
                      {itemsTax > 0 && (
                        <div className="flex justify-between py-2 pl-4 text-sm">
                          <span className="text-gray-500">IVA (conceptos)</span>
                          <span className="text-gray-700">
                            {formatCurrency(itemsTax)}
                          </span>
                        </div>
                      )}
                      
                      {/* Desglose de impuestos adicionales */}
                      {additionalTaxes.length > 0 && (
                        <>
                          <div className="flex justify-between py-2 border-b font-medium">
                            <span className="text-gray-600">Impuestos adicionales</span>
                          </div>
                          
                          {additionalTaxes.map((tax, index) => {
                            // Determinar si es IRPF u otro impuesto con retención
                            const isIRPF = tax.name.toLowerCase().includes('irpf') || 
                                          tax.name.toLowerCase().includes('retención');
                            
                            // Calcular el monto del impuesto
                            const taxAmount = tax.isPercentage 
                              ? baseAmount * (tax.amount / 100)
                              : tax.amount;
                            
                            return (
                              <div key={index} className="flex justify-between py-1 pl-4 text-sm">
                                <div className="flex items-center">
                                  <span className={`${isIRPF ? 'text-red-600' : 'text-blue-600'} mr-1`}>
                                    {isIRPF ? '(-)' : ''} 
                                  </span>
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
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  <Check className="mr-2 h-4 w-4" />
                  <span>{isEditMode ? "Actualizar factura" : "Crear factura"}</span>
                </div>
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/invoices")}
              className="w-full border-gray-300"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Form>

      {/* Diálogo para añadir impuestos adicionales */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir impuesto o cargo adicional</DialogTitle>
            <DialogDescription>
              Introduce los detalles del impuesto o cargo adicional a aplicar a esta factura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="taxName" className="text-sm font-medium">
                Nombre del impuesto o cargo
              </label>
              <Input
                id="taxName"
                placeholder="Ej: IRPF, Tasa municipal, etc."
                value={newTaxData.name}
                onChange={(e) => setNewTaxData({...newTaxData, name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="taxAmount" className="text-sm font-medium">
                Importe o porcentaje
              </label>
              <Input
                id="taxAmount"
                type="number"
                step="0.01"
                placeholder="Importe o porcentaje"
                value={newTaxData.amount}
                onChange={(e) => setNewTaxData({...newTaxData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de importe</label>
              <RadioGroup 
                value={newTaxData.isPercentage ? "percentage" : "fixed"}
                onValueChange={(value) => setNewTaxData({
                  ...newTaxData, 
                  isPercentage: value === "percentage"
                })}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <label htmlFor="percentage" className="text-sm cursor-pointer">Porcentaje (%)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <label htmlFor="fixed" className="text-sm cursor-pointer">Importe fijo (€)</label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowTaxDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="default"
              onClick={handleAddTaxFromDialog}
              disabled={!newTaxData.name}
            >
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de validación de factura */}
      {showValidation && (
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
            !!(form.getValues().notes?.toLowerCase().includes('exención') || 
            form.getValues().notes?.toLowerCase().includes('exento') ||
            form.getValues().notes?.toLowerCase().includes('exenta') ||
            form.getValues().notes?.toLowerCase().includes('exencion'))
          }
        />
      )}
    </div>
  );
};

export default InvoiceFormFixed;