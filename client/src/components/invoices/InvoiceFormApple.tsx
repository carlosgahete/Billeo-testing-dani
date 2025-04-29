// client/src/components/invoices/InvoiceFormApple.tsx
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
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Importamos el diálogo de validación directamente
import InvoiceValidationAlert from "./InvoiceValidationAlert";

// Implementación en línea del componente de líneas de factura
const InvoiceLineItems = ({ control, name, formState }: any) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name,
  });

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        // Si no hay campos, añadir uno vacío automáticamente
        <>
          {append({ description: "", quantity: 1, unitPrice: 0, taxRate: 21 })}
          <div className="rounded-md border overflow-x-auto">
            <p className="text-center py-3 text-gray-500">Cargando tabla de conceptos...</p>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-gray-100 overflow-x-auto shadow-sm">
          <table className="w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cant.
                </th>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IVA
                </th>
                <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th scope="col" className="relative px-2 sm:px-3 py-2 sm:py-3 w-10">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {fields.map((field, index) => {
                // Calcular subtotal para este item
                const quantity = control._formValues[name]?.[index]?.quantity || 0;
                const unitPrice = control._formValues[name]?.[index]?.unitPrice || 0;
                const subtotal = quantity * unitPrice;
                
                return (
                  <tr key={field.id}>
                    {/* Descripción */}
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <Controller
                        control={control}
                        name={`${name}.${index}.description`}
                        render={({ field }) => (
                          <div>
                            <Input 
                              {...field} 
                              className="w-full border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg text-sm py-1 px-2 sm:py-2 sm:px-3" 
                              placeholder="Descripción" 
                            />
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
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
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
                              className="w-16 sm:w-20 border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg text-sm py-1 px-2 sm:py-2 sm:px-3"
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
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
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
                              className="w-20 sm:w-24 border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg text-sm py-1 px-2 sm:py-2 sm:px-3"
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
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <Controller
                        control={control}
                        name={`${name}.${index}.taxRate`}
                        render={({ field }) => (
                          <div>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(Number(value))}
                            >
                              <SelectTrigger className="w-14 sm:w-[80px] border border-gray-200 hover:border-blue-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg text-sm py-1 px-2 sm:py-2 sm:px-3">
                                <SelectValue placeholder="IVA" />
                              </SelectTrigger>
                              <SelectContent className="bg-white rounded-lg border border-gray-200 shadow-md">
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
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-900 font-medium text-sm">
                      {formatCurrency(subtotal)}
                    </td>
                    
                    {/* Botón de eliminar */}
                    <td className="px-1 sm:px-3 py-2 sm:py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
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
        className="rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-600 flex items-center px-3 sm:px-4 py-1 sm:py-2 text-sm shadow-sm transition-all"
      >
        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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

const InvoiceFormApple = ({ invoiceId, initialData }: InvoiceFormProps) => {
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
      // Añadir un concepto inicial vacío por defecto
      items: [
        { 
          description: "", 
          quantity: 1, 
          unitPrice: 0, 
          taxRate: 21 
        }
      ],
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
          additionalTax: result.additionalTax, // No sumamos el IRPF a los impuestos, es una retención
          negativeAdjustments: result.negativeAdjustments + taxAmount // Guardamos como ajuste negativo
        };
      } else {
        // Otros impuestos son positivos
        return {
          additionalTax: result.additionalTax + taxAmount, // Solo sumamos impuestos positivos como IVA
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
        title: 'IVA exento',
        description: 'Se ha marcado todos los conceptos como exentos de IVA.',
      });
    } else {
      toast({
        title: 'No hay conceptos',
        description: 'Agrega al menos un concepto a la factura antes de aplicar exención de IVA.',
        variant: 'destructive'
      });
    }
  };

  // Navegación a crear cliente
  const navigateToClientCreation = () => {
    // Guardar el estado actual del formulario antes de navegar
    sessionStorage.setItem('invoiceFormData', JSON.stringify(form.getValues()));
    
    // Navegar a la creación de cliente
    navigate('/clients/create?returnToInvoice=true');
  };
  
  // Función para manejar el envío del formulario
  const onSubmit = async (data: z.infer<typeof invoiceFormSchema>) => {
    try {
      // Bloquear múltiples envíos
      if (blockAllSubmits) {
        console.log("Envío bloqueado: ya hay una solicitud en curso");
        return;
      }
      
      setBlockAllSubmits(true);
      
      // Validar elementos críticos
      const hasClient = !!data.clientId;
      const hasAmount = (data.subtotal || 0) > 0;
      const hasTaxes = (data.tax || 0) > 0;
      const hasExemptionReason = (data.notes || '').toLowerCase().includes('exento');
      
      // Solo validar si el usuario no ha iniciado el envío manualmente
      if (!userInitiatedSubmit && (!hasClient || !hasAmount || (!hasTaxes && !hasExemptionReason))) {
        // Mostrar el diálogo de validación en lugar de enviar
        setShowValidation(true);
        setBlockAllSubmits(false);
        return;
      }
      
      // Si llegamos aquí, el formulario pasó la validación o el usuario confirmó el envío
      
      // Preparar los datos para el envío
      const payload = {
        invoice: {
          ...data,
          // Asegurarse de que los valores monetarios sean strings para el servidor
          subtotal: String(data.subtotal || 0),
          tax: String(data.tax || 0),
          total: String(data.total || 0),
          // Si estamos en modo edición, incluir el ID
          ...(isEditMode ? { id: invoiceId } : {})
        },
        items: data.items || []
      };
      
      console.log("Enviando datos de la factura:", payload);
      
      if (isEditMode) {
        // Actualizar factura existente
        await updateMutation.mutateAsync(payload);
      } else {
        // Crear nueva factura
        await createMutation.mutateAsync(payload);
      }
      
      // Resetear banderas
      setUserInitiatedSubmit(false);
      setBlockAllSubmits(false);
      
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      
      toast({
        title: 'Error al guardar la factura',
        description: 'Hubo un problema al procesar tu solicitud. Por favor, inténtalo de nuevo.',
        variant: 'destructive',
      });
      
      // Resetear banderas de control
      setUserInitiatedSubmit(false);
      setBlockAllSubmits(false);
    }
  };
  
  // Mutación para crear facturas
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      if (!response.ok) {
        throw new Error(`Error al crear factura: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Factura creada',
        description: 'La factura se ha creado correctamente.',
      });
      
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Navegar a la lista de facturas
      navigate("/invoices");
    },
    onError: (error: Error) => {
      console.error("Error al crear factura:", error);
      toast({
        title: 'Error al crear factura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mutación para actualizar facturas
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/invoices/${invoiceId}`, data);
      if (!response.ok) {
        throw new Error(`Error al actualizar factura: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Factura actualizada',
        description: 'La factura se ha actualizado correctamente.',
      });
      
      // Invalidar consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      // Navegar a la lista de facturas
      navigate("/invoices");
    },
    onError: (error: Error) => {
      console.error("Error al actualizar factura:", error);
      toast({
        title: 'Error al actualizar factura',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verificar si hay cliente seleccionado para mostrar info
  const hasSelectedClient = !!selectedClientInfo;

  return (
    <div className="w-full px-2 sm:px-4 py-4 sm:py-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Sección superior: Cliente y datos básicos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Sección Cliente */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[auto]">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="flex items-center text-base sm:text-lg font-medium text-gray-800">
                  <UserPlus className="h-5 w-5 text-blue-500 mr-2" />
                  Cliente y datos básicos
                </h3>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 flex-grow">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Cliente *</FormLabel>
                      <div className="flex space-x-2">
                        <FormControl>
                          <Select
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(value)}
                            disabled={isLoadingClients}
                          >
                            <SelectTrigger className="w-full border border-gray-200 rounded-lg shadow-sm bg-white hover:border-blue-200 transition-colors focus:ring-2 focus:ring-blue-100 focus:border-blue-300">
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-lg border border-gray-200 shadow-lg">
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
                          className="min-w-[40px] w-auto bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-colors"
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
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
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
                        <FormLabel className="text-sm font-medium text-gray-700">Número de factura *</FormLabel>
                        <FormControl>
                          <Input {...field} className="border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg" placeholder="2023-001" />
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
                        <FormLabel className="text-sm font-medium text-gray-700">Estado</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg">
                              <SelectValue placeholder="Selecciona estado" />
                            </SelectTrigger>
                            <SelectContent className="bg-white rounded-lg border border-gray-200 shadow-lg">
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
                        <FormLabel className="text-sm font-medium text-gray-700">Fecha de emisión *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg" />
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
                        <FormLabel className="text-sm font-medium text-gray-700">Fecha de vencimiento *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg" />
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
                      <FormLabel className="text-sm font-medium text-gray-700">Método de pago</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col sm:flex-row sm:flex-wrap gap-3"
                        >
                          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <RadioGroupItem value="Transferencia" id="Transferencia" className="text-blue-500" />
                            <Label htmlFor="Transferencia" className="text-sm font-medium">Transferencia</Label>
                          </div>
                          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <RadioGroupItem value="Tarjeta" id="Tarjeta" className="text-blue-500" />
                            <Label htmlFor="Tarjeta" className="text-sm font-medium">Tarjeta</Label>
                          </div>
                          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <RadioGroupItem value="Efectivo" id="Efectivo" className="text-blue-500" />
                            <Label htmlFor="Efectivo" className="text-sm font-medium">Efectivo</Label>
                          </div>
                          <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <RadioGroupItem value="Otro" id="Otro" className="text-blue-500" />
                            <Label htmlFor="Otro" className="text-sm font-medium">Otro</Label>
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
                      <FormLabel className="text-sm font-medium text-gray-700">Notas o comentarios</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Añade información adicional, términos, condiciones, etc."
                          {...field}
                          className="h-20 resize-none border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sección conceptos e impuestos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[auto] lg:col-span-2">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h3 className="flex items-center text-base sm:text-lg font-medium text-gray-800">
                  <FileText className="h-5 w-5 text-blue-500 mr-2" />
                  Conceptos e impuestos
                </h3>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 flex-grow">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Impuestos:</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddIVA}
                      className="border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 rounded-full px-4 shadow-sm transition-all"
                    >
                      IVA <span className="ml-1 font-bold">21%</span>
                    </Button>
                    
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddIRPF}
                      className="border border-red-200 bg-white hover:bg-red-50 text-red-700 rounded-full px-4 shadow-sm transition-all"
                    >
                      IRPF <span className="ml-1 font-bold">-15%</span>
                    </Button>
                    
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleExemptIVA}
                      className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-full px-4 shadow-sm transition-all"
                    >
                      Exento IVA
                    </Button>
                    
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowTaxDialog(true)}
                      className="border border-green-200 bg-white hover:bg-green-50 text-green-700 rounded-full px-4 shadow-sm transition-all"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Impuesto personalizado
                    </Button>
                  </div>
                  
                  {/* Lista de impuestos adicionales ya aplicados */}
                  {additionalTaxes.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Impuestos aplicados:</h4>
                      <ul className="space-y-2">
                        {additionalTaxes.map((tax, index) => {
                          const isIRPF = tax.name?.toLowerCase().includes('irpf') || tax.name?.toLowerCase().includes('retención');
                          
                          return (
                            <li key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-gray-100">
                              <span>
                                <Badge variant={isIRPF ? "destructive" : "default"} className="mr-2 bg-opacity-90">
                                  {tax.name}
                                </Badge>
                                {tax.isPercentage ? `${tax.amount}%` : formatCurrency(tax.amount)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveTax(index)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="w-full">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Conceptos</h3>
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
                </div>
              </div>
            </div>

            {/* Resumen de factura */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[auto]">
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <h3 className="text-base sm:text-lg font-medium text-blue-700">
                  Resumen de la factura
                </h3>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5 flex-grow">
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm sm:text-base text-gray-700">Base imponible</span>
                    <span className="font-medium text-sm sm:text-base">{formatCurrency(calculatedTotals.subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-2 bg-blue-50 bg-opacity-50 rounded-lg">
                    <span className="text-sm sm:text-base text-gray-700">
                      IVA ({items.length > 0 ? (items[0].taxRate + '%') : '0%'})
                    </span>
                    <span className="font-medium text-sm sm:text-base">{formatCurrency(itemsTax)}</span>
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
                          <div key={index} className={`flex justify-between items-center p-2 rounded-lg ${isIRPF ? 'bg-red-50 bg-opacity-50' : 'bg-green-50 bg-opacity-50'}`}>
                            <div className="text-sm sm:text-base text-gray-700">
                              <span>
                                {tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}
                              </span>
                            </div>
                            <span className={`font-medium text-sm sm:text-base ${isIRPF ? 'text-red-600' : 'text-green-700'}`}>
                              {formatCurrency(taxAmount)}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  <div className="flex justify-between items-center p-3 mt-2 bg-gray-100 rounded-lg">
                    <span className="font-medium text-base sm:text-lg">Total a pagar</span>
                    <span className="font-bold text-base sm:text-lg text-blue-700">{formatCurrency(calculatedTotals.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción simplificados */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors py-2.5"
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
              onClick={() => navigate("/invoices")}
              className="w-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl shadow-sm transition-colors py-2.5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span>Volver</span>
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Diálogo para añadir impuesto personalizado */}
      <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
        <DialogContent className="bg-white rounded-xl shadow-lg border border-gray-100 w-[95%] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-medium text-gray-800">Añadir impuesto personalizado</DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Introduce los detalles del impuesto que quieres añadir a esta factura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="taxName" className="text-sm font-medium text-gray-700">Nombre del impuesto</Label>
              <Input 
                id="taxName" 
                value={newTaxData.name} 
                onChange={(e) => setNewTaxData({...newTaxData, name: e.target.value})}
                placeholder="Ej: IVA reducido, IGIC, etc."
                className="border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxAmount" className="text-sm font-medium text-gray-700">Valor</Label>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <Input 
                  id="taxAmount" 
                  type="number" 
                  value={newTaxData.amount}
                  onChange={(e) => setNewTaxData({...newTaxData, amount: Number(e.target.value)})}
                  placeholder="Importe o porcentaje"
                  className="border border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 rounded-lg"
                />
                <div className="flex items-center space-x-1">
                  <Switch 
                    id="isPercentage" 
                    checked={newTaxData.isPercentage}
                    onCheckedChange={(checked) => setNewTaxData({...newTaxData, isPercentage: checked})}
                  />
                  <Label htmlFor="isPercentage" className="text-sm text-gray-700">Es porcentaje (%)</Label>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowTaxDialog(false)}
              className="w-full sm:w-auto border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleAddTaxFromDialog}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              disabled={!newTaxData.name || newTaxData.amount <= 0}
            >
              Añadir impuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
        hasAmount={(form.getValues().subtotal || 0) > 0}
        hasTaxes={(form.getValues().tax || 0) > 0}
        hasExemptionReason={(form.getValues().notes || '').toLowerCase().includes('exento')}
      />
    </div>
  );
};

export default InvoiceFormApple;