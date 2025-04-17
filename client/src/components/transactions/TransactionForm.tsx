import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import FileUpload from "../common/FileUpload";
import { CalendarIcon, Loader2, FileText, Receipt, Download, Plus, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const transactionSchema = z.object({
  title: z.string().optional(),
  description: z.string().min(1, "La descripción es obligatoria"),
  amount: z.coerce.number().min(0.01, "El importe debe ser mayor que cero"),
  date: z.date(),
  type: z.enum(["income", "expense"]),
  categoryId: z.coerce.number().optional().nullable(),
  paymentMethod: z.string().min(1, "El método de pago es obligatorio"),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transactionId?: number;
}

// Interfaces para tipar correctamente los datos
interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
}

interface Transaction {
  id: number;
  title?: string;
  description: string;
  amount: number | string;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod: string;
  notes?: string;
  attachments?: string[];
}

// Esquema para el formulario de categoría
const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#6E56CF"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const TransactionForm = ({ transactionId }: TransactionFormProps) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [location, navigate] = useLocation();
  
  // Estado para controlar el diálogo de nueva categoría
  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false);
  
  // Formulario para la nueva categoría
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#6E56CF",
    },
  });
  
  const isEditMode = !!transactionId;

  // Fetch categories for dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Interfaz para la respuesta de autenticación
  interface AuthResponse {
    authenticated: boolean;
    user?: {
      id: number;
      username: string;
      name: string;
      [key: string]: any;
    };
  }
  
  // Verificar autenticación primero
  const { data: authData } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/session"],
  });

  // Fetch transaction data if in edit mode and user is authenticated
  const { data: transactionData, isLoading: transactionLoading } = useQuery<Transaction>({
    queryKey: [`/api/transactions/${transactionId}`],
    enabled: isEditMode && !!authData?.authenticated,
  });

  // Define default values for the form
  const defaultValues = {
    title: "",
    description: "",
    amount: 0,
    date: new Date(),
    type: "expense" as "income" | "expense",
    categoryId: null,
    paymentMethod: "bank_transfer",
    notes: "",
    attachments: [] as string[],
  };

  // Initialize form with default values
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  // Initialize form with transaction data when loaded
  useEffect(() => {
    if (transactionData && !transactionLoading) {
      console.log("Transaction data loaded:", transactionData);
      console.log("Date from API:", transactionData.date);
      
      // Convierte la fecha con mayor robustez
      let transactionDate;
      try {
        // La fecha puede venir en varios formatos, intentamos procesarla adecuadamente
        if (typeof transactionData.date === 'string') {
          // Eliminar la parte de la zona horaria si existe y puede causar problemas
          const dateStr = transactionData.date.replace(/Z|(\+|\-)\d{2}:\d{2}$/, '');
          transactionDate = new Date(dateStr);
          console.log("Parsed date from string:", transactionDate);
        } else {
          transactionDate = new Date(transactionData.date);
          console.log("Parsed date from non-string:", transactionDate);
        }
        
        // Validación adicional
        if (isNaN(transactionDate.getTime())) {
          console.error("Invalid date detected, using current date instead");
          transactionDate = new Date();
        }
      } catch (error) {
        console.error("Error parsing date:", error);
        transactionDate = new Date();
      }
      
      // Aseguramos que la fecha sea válida antes de actualizar el formulario
      console.log("Final date to use:", transactionDate);
      
      // Si no hay un título en los datos, usar la descripción como título
      const title = transactionData.title || transactionData.description;
      
      form.reset({
        ...transactionData,
        title: title, // Usar título existente o la descripción como título
        date: transactionDate,
        amount: typeof transactionData.amount === 'string' 
          ? parseFloat(transactionData.amount) 
          : transactionData.amount,
      });
      
      if (transactionData.attachments) {
        setAttachments(transactionData.attachments);
      }
    }
  }, [transactionData, transactionLoading, form]);

  // Create or update transaction mutation
  const mutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      // Format date to ISO string for API request
      const payload = {
        ...data,
        date: data.date.toISOString(),
        attachments,
      };
      
      if (isEditMode) {
        return apiRequest("PUT", `/api/transactions/${transactionId}`, payload);
      } else {
        return apiRequest("POST", "/api/transactions", payload);
      }
    },
    onSuccess: (response) => {
      console.log("✅ Transacción guardada:", response);
      
      // Disparar evento personalizado para notificar a los componentes sobre el cambio
      const eventName = isEditMode ? 'transaction-updated' : 'transaction-created';
      window.dispatchEvent(new CustomEvent(eventName, { 
        detail: { transactionId: isEditMode ? transactionId : (response as any)?.id || 'new' }
      }));
      
      console.log(`🔔 Evento disparado: ${eventName}`);
      
      // Eliminar completamente las consultas relevantes para forzar una recarga completa
      console.log("🧹 Limpiando caché de consultas...");
      queryClient.removeQueries({ queryKey: ["transactions"] });
      queryClient.removeQueries({ queryKey: ["dashboard"] }); // Usar misma clave que en useDashboardData
      
      // Solicitar explícitamente una recarga del dashboard con nocache para forzar datos frescos
      fetch("/api/stats/dashboard-fix?nocache=" + Date.now(), { 
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } 
      })
      .then(() => {
        console.log("⚡ Forzando recarga de datos para dashboard");
        
        // Refrescar explícitamente todas las consultas con las claves correctas
        queryClient.refetchQueries({ queryKey: ["dashboard"] });
        queryClient.refetchQueries({ queryKey: ["transactions"] });
        
        // Disparar evento para actualización del dashboard (esto forzará la actualización a través del hook)
        console.log("📣 Disparando evento dashboard-refresh-required");
        window.dispatchEvent(new CustomEvent('dashboard-refresh-required'));
        
        // Disparar una segunda actualización después de un breve retraso
        setTimeout(() => {
          console.log("🔄 Segunda actualización del dashboard");
          window.dispatchEvent(new CustomEvent('dashboard-refresh-required'));
        }, 800);
      })
      .catch(err => console.error("❌ Error al recargar dashboard:", err));
      
      toast({
        title: isEditMode ? "Movimiento actualizado" : "Movimiento creado",
        description: isEditMode
          ? "El movimiento se ha actualizado correctamente"
          : "El movimiento se ha creado correctamente",
      });
      navigate("/transactions");
    },
    onError: (error: any) => {
      console.error("Error al guardar transacción:", error);
      
      // Intentar analizar la respuesta JSON si existe
      let errorMessage = "Ha ocurrido un error al guardar el gasto";
      let errorDetails = "";
      
      try {
        if (error.response) {
          const data = error.response.data;
          if (data && data.message) {
            errorMessage = data.message;
          }
          if (data && data.errors && Array.isArray(data.errors)) {
            errorDetails = data.errors.map((err: any) => err.message || JSON.stringify(err)).join(", ");
          }
        }
      } catch (parseError) {
        console.error("Error al analizar la respuesta de error:", parseError);
      }
      
      toast({
        title: "Error al guardar",
        description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Estado para guardar la sugerencia de la IA
  const [aiVerification, setAiVerification] = useState<{
    isValid: boolean;
    suggestion?: string;
    categoryHint?: string;
    isLoading: boolean;
  }>({
    isValid: true,
    isLoading: false
  });

  // Mutación para verificar el gasto con IA
  const verifyExpenseMutation = useMutation({
    mutationFn: async (data: { description: string; amount: string }) => {
      const response = await apiRequest("POST", "/api/verify-expense", data);
      return response.json();
    },
    onSuccess: (data) => {
      setAiVerification({
        ...data,
        isLoading: false
      });
      
      // Si el gasto es válido, continuar con el registro
      if (data.isValid) {
        // Si tenemos una sugerencia de categoría, intentamos encontrarla
        if (data.categoryHint && categories) {
          const suggestedCategory = categories.find(
            cat => cat.name.toLowerCase().includes(data.categoryHint!.toLowerCase())
          );
          
          if (suggestedCategory && !form.getValues().categoryId) {
            // Actualizar el formulario con la categoría sugerida
            form.setValue('categoryId', suggestedCategory.id);
            
            toast({
              title: "Categoría sugerida",
              description: `Se ha aplicado la categoría sugerida: ${suggestedCategory.name}`,
            });
          }
        }
        
        // Proceder con el envío del formulario
        submitTransaction(form.getValues());
      }
    },
    onError: (error) => {
      setAiVerification({
        isValid: true, // Por defecto permitimos continuar
        suggestion: "No se pudo verificar el gasto. Puedes continuar si la información es correcta.",
        isLoading: false
      });
      
      toast({
        title: "Error al verificar el gasto",
        description: "No se pudo conectar con el servicio de IA, pero puedes continuar con el registro.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: TransactionFormValues) => {
    // Solo verificamos los gastos, no los ingresos
    if (data.type === "expense" && !isEditMode) {
      setAiVerification({
        ...aiVerification,
        isLoading: true
      });
      
      // Verificar el gasto con IA
      verifyExpenseMutation.mutate({
        description: data.description,
        amount: data.amount.toString()
      });
    } else {
      // Si es un ingreso o estamos en modo edición, simplemente enviamos los datos
      submitTransaction(data);
    }
  };
  
  // Función que realmente envía los datos a la API
  const submitTransaction = (data: TransactionFormValues) => {
    // Asegurarse de que los datos estén en el formato correcto
    const formattedData: TransactionFormValues = {
      ...data,
      // Asegurarse de que amount sea un número
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount,
      // Garantizar que categoryId sea null si no está definido o si es una cadena vacía
      categoryId: 
        data.categoryId === null || 
        data.categoryId === undefined || 
        data.categoryId === 0 ||
        String(data.categoryId) === ''
          ? null 
          : typeof data.categoryId === 'string' 
            ? parseInt(data.categoryId) 
            : data.categoryId,
    };
    
    // Añadir los archivos adjuntos al payload pero no al objeto formattedData
    // ya que no es parte del esquema TransactionFormValues
    const payloadToSend = {
      ...formattedData,
      attachments: attachments || []
    };
    
    console.log("Enviando datos al servidor:", JSON.stringify(payloadToSend, null, 2));
    mutation.mutate(payloadToSend as any);
  };

  const handleFileUpload = (path: string) => {
    setAttachments([...attachments, path]);
  };

  // Función para generar y descargar el PDF del gasto
  const downloadTransactionPDF = () => {
    if (!transactionData) return;
    
    // Crear un nuevo documento PDF en formato A4
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    
    // Configurar la información del documento
    const formattedDate = transactionData.date 
      ? format(new Date(transactionData.date), "dd/MM/yyyy")
      : format(new Date(), "dd/MM/yyyy");
    
    const title = `Comprobante de ${transactionData.type === "income" ? "Ingreso" : "Gasto"}`;
    const fileName = `${transactionData.type === "income" ? "ingreso" : "gasto"}_${transactionData.id}_${formattedDate.replace(/\//g, "-")}.pdf`;
    
    // Añadir título
    doc.setFontSize(20);
    doc.setTextColor(40, 99, 235); // Azul principal
    doc.text(title, 105, 20, { align: "center" });
    
    // Añadir fecha y número de referencia
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${formattedDate}`, 20, 30);
    doc.text(`Ref: #${transactionData.id}`, 20, 35);
    
    // Añadir información básica
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    // Tabla con los detalles del gasto
    autoTable(doc, {
      startY: 45,
      head: [["Concepto", "Detalles"]],
      body: [
        ["Descripción", transactionData.description],
        ["Importe", `${transactionData.amount} €`],
        ["Tipo", transactionData.type === "income" ? "Ingreso" : "Gasto"],
        ["Método de pago", getPaymentMethodText(transactionData.paymentMethod)],
        ["Notas", transactionData.notes || "---"]
      ],
      theme: "grid",
      headStyles: { fillColor: [40, 99, 235], textColor: [255, 255, 255] },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: "auto" }
      },
    });
    
    // Si hay adjuntos, listarlos
    if (transactionData.attachments && transactionData.attachments.length > 0) {
      const y = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(12);
      doc.setTextColor(40, 99, 235);
      doc.text("Archivos adjuntos:", 20, y);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      
      transactionData.attachments.forEach((attachment, index) => {
        const fileName = attachment.split('/').pop() || attachment;
        doc.text(`- ${fileName}`, 25, y + 7 + (index * 5));
      });
    }
    
    // Pie de página
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Generado por Billeo - ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }
    
    // Descargar el PDF
    doc.save(fileName);
    
    toast({
      title: "PDF generado correctamente",
      description: `El archivo ${fileName} se ha descargado`,
    });
  };
  
  // Función auxiliar para obtener el texto del método de pago
  const getPaymentMethodText = (method: string): string => {
    const methods: Record<string, string> = {
      "cash": "Efectivo",
      "bank_transfer": "Transferencia bancaria",
      "credit_card": "Tarjeta de crédito",
      "debit_card": "Tarjeta de débito",
      "paypal": "PayPal",
      "other": "Otro"
    };
    
    return methods[method] || method;
  };

  // Función para extraer información de IVA de las notas
  const extractTaxInfo = (notes?: string): string | null => {
    if (!notes) return null;
    
    const taxMatch = notes.match(/IVA estimado: ([\d.,]+)€/);
    return taxMatch ? taxMatch[1] : null;
  };

  // Función para extraer información de proveedor de las notas
  const extractVendorInfo = (notes?: string): string | null => {
    if (!notes) return null;
    
    const vendorMatch = notes.match(/Vendedor: ([^.]+)/);
    return vendorMatch ? vendorMatch[1] : null;
  };

  // Verificar si las notas contienen información de OCR
  const hasOcrData = transactionData?.notes?.includes('Extraído automáticamente');
  const taxAmount = hasOcrData ? extractTaxInfo(transactionData?.notes) : null;
  const vendor = hasOcrData ? extractVendorInfo(transactionData?.notes) : null;

  if ((isEditMode && transactionLoading) || categoriesLoading) {
    return <div className="flex justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>;
  }

  // Mutación para crear una nueva categoría
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Categoría creada",
        description: `La categoría ${data.name} se ha creado correctamente`,
      });
      
      // Cerrar el modal
      setNewCategoryDialogOpen(false);
      
      // Refrescar la lista de categorías
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      // Resetear formulario
      categoryForm.reset({
        name: "",
        type: "expense",
        color: "#6E56CF",
      });
      
      // Seleccionar la categoría recién creada
      setTimeout(() => {
        if (data.id) {
          form.setValue('categoryId', data.id);
        }
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear la categoría",
        description: "No se pudo crear la categoría. Inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Manejador para crear una nueva categoría
  const handleCreateCategory = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Modal para crear una nueva categoría */}
        <Dialog open={newCategoryDialogOpen} onOpenChange={setNewCategoryDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear nueva categoría</DialogTitle>
              <DialogDescription>
                Crea una nueva categoría para clasificar tus movimientos
              </DialogDescription>
            </DialogHeader>
            
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
                <FormField
                  control={categoryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la categoría" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={categoryForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Ingreso</SelectItem>
                          <SelectItem value="expense">Gasto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={categoryForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full border" 
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input type="color" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewCategoryDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCategoryMutation.isPending}>
                    {createCategoryMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear categoría
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {isEditMode ? "Editar movimiento" : "Nuevo movimiento"}
              {hasOcrData && (
                <Badge variant="outline" className="ml-2 bg-blue-50">
                  <Receipt className="h-3 w-3 mr-1" />
                  Escaneado
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notificación de verificación de IA en proceso */}
            {aiVerification.isLoading && (
              <div className="bg-blue-50 p-3 rounded-md mb-4 flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600" />
                <p className="text-sm text-blue-700">
                  Verificando gasto con IA...
                </p>
              </div>
            )}
            
            {/* Mensaje de sugerencia/advertencia de la IA cuando está disponible */}
            {!aiVerification.isLoading && aiVerification.suggestion && !isEditMode && (
              <div className={`p-3 rounded-md mb-4 ${aiVerification.isValid ? 'bg-green-50' : 'bg-amber-50'}`}>
                <h3 className={`text-sm font-medium mb-2 ${aiVerification.isValid ? 'text-green-700' : 'text-amber-700'}`}>
                  {aiVerification.isValid ? 'Sugerencia de IA' : 'Advertencia de IA'}
                </h3>
                <p className="text-sm mb-2">
                  {aiVerification.suggestion}
                </p>
                
                {!aiVerification.isValid && (
                  <div className="flex justify-end mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => submitTransaction(form.getValues())}
                      className="text-xs"
                    >
                      Registrar de todos modos
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {hasOcrData && (
              <div className="bg-blue-50 p-3 rounded-md mb-4">
                <h3 className="text-sm font-medium mb-2 text-blue-700">Información detectada automáticamente</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {vendor && vendor !== "No detectado" && (
                    <div>
                      <span className="text-blue-700 font-medium">Vendedor:</span> {vendor}
                    </div>
                  )}
                  {taxAmount && (
                    <div>
                      <span className="text-blue-700 font-medium">IVA:</span> {taxAmount}€
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del gasto</FormLabel>
                  <FormControl>
                    <Input placeholder="Título que aparecerá en la lista de gastos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción del movimiento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          selected={field.value}
                          onSelect={field.onChange}
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de movimiento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Ingreso</SelectItem>
                        <SelectItem value="expense">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        if (value === "new_category") {
                          // Abrir diálogo para crear nueva categoría
                          categoryForm.setValue('type', form.getValues("type"));
                          setNewCategoryDialogOpen(true);
                        } else {
                          // Actualizar el valor normalmente
                          field.onChange(value !== "null" ? parseInt(value) : null);
                        }
                      }}
                      defaultValue={
                        field.value ? field.value.toString() : "null"
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin categoría</SelectItem>
                        {categories && categories
                          .filter((cat) => cat.type === form.getValues("type"))
                          .map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        <SelectItem value="new_category" className="text-primary border-t mt-1 pt-1">
                          + Añadir nueva categoría
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                      <SelectItem value="credit_card">Tarjeta de crédito</SelectItem>
                      <SelectItem value="debit_card">Tarjeta de débito</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
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
                      placeholder="Notas adicionales..."
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
                <FileUpload onUpload={handleFileUpload} />
                
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm bg-gray-50 p-2 rounded-md border border-gray-100">
                        <FileText className="h-4 w-4 mr-1 text-blue-500" />
                        <span className="flex-1 truncate">
                          {attachment.split('/').pop()}
                        </span>
                        <div className="flex space-x-1">
                          {/* Botón para ver el archivo */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs px-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => {
                              // Importar dinámicamente para evitar dependencias cíclicas
                              import('@/lib/attachmentService').then(({ viewExpenseOriginal }) => {
                                // Preparar los datos mínimos necesarios del gasto para la función
                                const expense = {
                                  id: transactionId || 0,
                                  userId: 0,
                                  description: form.getValues().description || '',
                                  amount: parseFloat(String(form.getValues().amount || 0)),
                                  date: form.getValues().date?.toISOString() || new Date().toISOString(),
                                  type: 'expense',
                                  categoryId: form.getValues().categoryId ? parseInt(String(form.getValues().categoryId)) : null,
                                  paymentMethod: form.getValues().paymentMethod || '',
                                  title: form.getValues().title || '',
                                  attachments: [attachment]
                                };
                                
                                // Buscar la categoría si existe
                                const category = categories?.find(c => c.id === (expense.categoryId || 0));
                                
                                // Llamar a la función para ver el archivo
                                viewExpenseOriginal(attachment, {...expense, type: 'expense' as const, categoryId: expense.categoryId as number}, category);
                              });
                            }}
                          >
                            Ver archivo
                          </Button>
                          
                          {/* Botón para descargar el archivo */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                            onClick={() => {
                              // Importar dinámicamente para evitar dependencias cíclicas
                              import('@/lib/attachmentService').then(({ downloadExpenseOriginal }) => {
                                // Preparar los datos mínimos necesarios del gasto para la función
                                const expense = {
                                  id: transactionId || 0,
                                  userId: 0,
                                  description: form.getValues().description || '',
                                  amount: parseFloat(String(form.getValues().amount || 0)),
                                  date: form.getValues().date?.toISOString() || new Date().toISOString(),
                                  type: 'expense',
                                  categoryId: form.getValues().categoryId ? parseInt(String(form.getValues().categoryId)) : null,
                                  paymentMethod: form.getValues().paymentMethod || '',
                                  title: form.getValues().title || '',
                                  attachments: [attachment]
                                };
                                
                                // Buscar la categoría si existe
                                const category = categories?.find(c => c.id === (expense.categoryId || 0));
                                
                                // Llamar a la función para descargar el archivo
                                downloadExpenseOriginal(attachment, {...expense, type: 'expense' as const, categoryId: expense.categoryId as number}, category);
                              });
                            }}
                          >
                            Descargar
                          </Button>
                          
                          {/* Botón para eliminar el archivo */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs px-2 text-red-700 hover:text-red-800 hover:bg-red-50"
                            onClick={() => {
                              const newAttachments = [...attachments];
                              newAttachments.splice(index, 1);
                              setAttachments(newAttachments);
                            }}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/transactions")}
          >
            Cancelar
          </Button>
          {isEditMode && (
            <Button
              type="button"
              variant="secondary"
              onClick={downloadTransactionPDF}
              className="bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransactionForm;