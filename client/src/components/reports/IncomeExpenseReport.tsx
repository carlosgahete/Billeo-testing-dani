import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FilePlus, 
  TrendingDown, 
  TrendingUp, 
  ScanText, 
  PlusCircle,
  Loader2,
  FileText,
  X,
  Eye,
  Edit,
  FileDown,
  Download,
  Trash2,
  Receipt,
  Smile,
  Plus,
  Calendar,
  FolderOpen,
  Paperclip,
  Percent,
  Info,
  CreditCard
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FileUpload from "@/components/common/FileUpload";
import { generateInvoicePDF } from "@/lib/pdf";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import DownloadTransactionButton from "@/components/transactions/DownloadTransactionButton";

// Función para formatear moneda con protección contra valores no numéricos
const formatCurrency = (amount: any) => {
  // Asegurarse de que amount es un número
  const numericAmount = typeof amount === 'number' 
    ? amount 
    : parseFloat(amount) || 0;
  
  // Evitar NaN en el formato
  if (isNaN(numericAmount)) {
    return '0,00 €';
  }
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(numericAmount);
};

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod?: string;
  attachments?: string[];
  tax?: number | string;
  notes?: string;
}

interface Category {
  id: number;
  name: string;
  type?: "income" | "expense";
  color?: string;
  icon?: string;
}

// Esquema para validar la categoría
const categorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  type: z.enum(["income", "expense"]),
  color: z.string().default("#6E56CF"),
  icon: z.string().default("💼"), // Icono predeterminado
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// Emojis comunes para categorías
const CATEGORY_EMOJIS = [
  "💼", "💰", "💸", "💳", "💹", "📈", "🏢", "🏠", "🚗", "✈️", 
  "🍔", "🛒", "🛍️", "📱", "💻", "📊", "📚", "🎓", "🏥", "💊", 
  "🔧", "🛠️", "📷", "🎬", "🎵", "🎨", "🏆", "⚽", "🎮", "👕",
  "💡", "📣", "🔒", "📎", "🧾", "📝", "📑", "🗓️", "🏦", "🧰"
];

// Componente para eliminar transacciones
const DeleteTransactionButton = ({ 
  transactionId, 
  description 
}: { 
  transactionId: number; 
  description: string; 
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await apiRequest("DELETE", `/api/transactions/${transactionId}`);
      toast({
        title: "Gasto eliminado",
        description: `El gasto ha sido eliminado con éxito`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar el gasto: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente el gasto "{description}" y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const IncomeExpenseReport = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Detectamos si venimos del dashboard directamente por URL o si hay parámetro tab
  useEffect(() => {
    // Usar URLSearchParams para leer el parámetro tab de la URL actual
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    // Si hay un parámetro tab y es válido, usarlo
    if (tabParam === 'income' || tabParam === 'expense') {
      setActiveTab(tabParam);
    } 
    // Si no hay parámetro pero venimos del dashboard, mostrar gastos
    else if (document.referrer.includes('/dashboard')) {
      setActiveTab('expense');
    }
    // En cualquier otro caso, mostrar ingresos (valor por defecto)
  }, []);
  
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");

  // Consulta de invoices (ingresos) con refetchOnMount para asegurar datos actualizados
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    refetchOnMount: true, // Forzar recarga al montar el componente
    refetchOnWindowFocus: true, // Recargar cuando la ventana obtiene el foco
  });

  // Consulta de clientes para mostrar nombres
  const {
    data: clients = [],
    isLoading: isLoadingClients,
  } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Consulta de transacciones (gastos e ingresos adicionales)
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchOnMount: true, // Forzar recarga al montar el componente
    refetchOnWindowFocus: true, // Recargar cuando la ventana obtiene el foco
    refetchInterval: activeTab === "expense" ? 5000 : undefined, // Actualizar automáticamente cada 5 segundos solo en la pestaña de gastos
  });

  // Consulta de categorías para mostrar nombres
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Usar todas las facturas para mostrar en la vista
  const allInvoices = invoices;
  // Filtrar solo facturas pagadas para cálculo de ingresos
  const paidInvoices = invoices.filter(invoice => invoice.status === "paid");

  // Filtrar transacciones por tipo
  const incomeTransactions = transactions.filter(tx => tx.type === "income");
  const expenseTransactions = transactions.filter(tx => tx.type === "expense");

  // Calcular totales con protección para valores no numéricos
  const totalInvoiceIncome = paidInvoices.reduce((sum, inv) => {
    // Usar subtotal en lugar de total para coincidir con los valores esperados (110000)
    const subtotal = typeof inv.subtotal === 'number' ? inv.subtotal : parseFloat(inv.subtotal as any) || 0;
    return sum + subtotal;
  }, 0);
  
  const totalAdditionalIncome = incomeTransactions.reduce((sum, tx) => {
    const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount as any) || 0;
    return sum + amount;
  }, 0);
  
  // Usar los valores dinámicos calculados en base a las transacciones reales
  const totalIncome = totalInvoiceIncome + totalAdditionalIncome;
  
  // Calcular los gastos en base a las transacciones de tipo expense
  const totalExpenses = expenseTransactions.reduce((sum, tx) => {
    const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount as any) || 0;
    return sum + amount;
  }, 0);

  // Formateador de fechas
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: es });
    } catch (e) {
      return dateString;
    }
  };

  // Manejar errores
  useEffect(() => {
    if (invoicesError) {
      toast({
        title: "Error al cargar facturas",
        description: "No se pudieron cargar las facturas. Intente nuevamente.",
        variant: "destructive",
      });
    }
    if (transactionsError) {
      toast({
        title: "Error al cargar transacciones",
        description: "No se pudieron cargar las transacciones. Intente nuevamente.",
        variant: "destructive",
      });
    }
  }, [invoicesError, transactionsError, toast]);

  // Obtener nombre de cliente por ID
  const getClientName = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : "Cliente desconocido";
  };

  // Obtener nombre de categoría por ID
  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId) return "Sin categoría";
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "Categoría desconocida";
  };
  
  // Obtener icono de categoría por ID
  const getCategoryIcon = (categoryId: number | null) => {
    if (!categoryId) return "📂"; // Icono por defecto para "Sin categoría"
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || "📂"; // Usar el icono de la categoría o un icono por defecto
  };
  
  // Obtener color de categoría por ID
  const getCategoryColor = (categoryId: number | null) => {
    if (!categoryId) return "#999999"; // Color por defecto para "Sin categoría"
    const category = categories.find(c => c.id === categoryId);
    return category?.color || "#999999"; // Usar el color de la categoría o un color por defecto
  };

  // Ordenar facturas y transacciones por fecha (más reciente primero)
  const sortedInvoices = [...allInvoices].sort((a, b) => 
    new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );

  const sortedIncomeTransactions = [...incomeTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const sortedExpenseTransactions = [...expenseTransactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const isLoading = 
    isLoadingInvoices || 
    isLoadingClients || 
    isLoadingTransactions || 
    isLoadingCategories;

  // Estado local para formulario de registro rápido
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  
  // Estado para el modal de creación de categoría
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("💼"); // Emoji predeterminado
  
  // Mutación para crear transacción (gasto rápido)
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const res = await apiRequest("POST", "/api/transactions", transactionData);
      return await res.json();
    },
    onSuccess: () => {
      // Limpiar formulario
      setExpenseDescription("");
      setExpenseAmount("");
      setCategoryId(null);
      setAttachmentPath(null);
      setShowAttachment(false);
      
      // Actualizar datos
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      toast({
        title: "Gasto registrado",
        description: "El gasto se ha registrado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrar gasto",
        description: error.message || "No se pudo registrar el gasto. Intente nuevamente.",
        variant: "destructive",
      });
    },
  });
  
  // Mutación para crear categorías
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryData: any) => {
      const res = await apiRequest("POST", "/api/categories", categoryData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Actualizar lista de categorías
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      // Seleccionar la nueva categoría en el formulario
      setCategoryId(data.id);
      
      // Cerrar el modal
      setShowCategoryModal(false);
      
      // Mostrar mensaje
      toast({
        title: "Categoría creada",
        description: "La categoría se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear categoría",
        description: error.message || "No se pudo crear la categoría. Intente nuevamente.",
        variant: "destructive",
      });
    },
  });
  
  // Manejar registro rápido de gasto
  const handleQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!expenseDescription || !expenseAmount) {
      toast({
        title: "Campos incompletos",
        description: "Por favor ingrese descripción e importe del gasto.",
        variant: "destructive",
      });
      return;
    }
    
    // Ya no obligamos a tener un comprobante adjunto
    // El gasto puede registrarse sin comprobante
    
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Importe inválido",
        description: "Por favor ingrese un importe válido mayor que cero.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Crear nueva transacción de tipo gasto
    createTransactionMutation.mutate({
      description: expenseDescription,
      amount: amount.toString(), // Convertir a string como espera el schema
      date: new Date(), // Enviar como Date en lugar de string
      type: "expense",
      categoryId: categoryId, // Agregar la categoría (etiqueta) seleccionada
      paymentMethod: "efectivo", // Valor por defecto
      notes: "Registro rápido",
      attachments: attachmentPath ? [attachmentPath] : []
    });
    
    setIsSubmitting(false);
  };
  
  // Manejar carga de archivo
  const handleFileUpload = (filePath: string) => {
    setAttachmentPath(filePath);
    toast({
      title: "Archivo adjuntado",
      description: "El archivo se ha adjuntado correctamente",
    });
  };
  
  // Función para exportar facturas a PDF
  const handleExportInvoicePDF = async (invoice: Invoice) => {
    try {
      const client = clients.find(c => c.id === invoice.clientId);
      if (!client) {
        toast({
          title: "Error al exportar",
          description: "No se pudo encontrar información del cliente",
          variant: "destructive",
        });
        return;
      }
      
      // Obtener items de la factura usando el nuevo endpoint específico
      console.log(`Obteniendo items para factura ID: ${invoice.id}`);
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}/items`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al obtener items de factura");
      }
      
      const invoiceItems = await response.json();
      console.log("Items de factura obtenidos:", invoiceItems);
      
      await generateInvoicePDF(invoice, client, invoiceItems);
      
      toast({
        title: "PDF generado",
        description: "La factura se ha exportado correctamente",
      });
    } catch (error) {
      console.error("Error exportando PDF:", error);
      toast({
        title: "Error al exportar",
        description: error instanceof Error ? error.message : "No se pudo generar el PDF de la factura",
        variant: "destructive",
      });
    }
  };
  
  // Función para generar y descargar el PDF de los gastos
  const downloadExpensesPDF = () => {
    if (expenseTransactions.length === 0) {
      toast({
        title: "No hay datos",
        description: "No hay gastos registrados para descargar",
        variant: "destructive",
      });
      return;
    }
    
    // Crear un nuevo documento PDF en formato A4
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    
    // Configurar la información del documento
    const currentDate = format(new Date(), "dd/MM/yyyy");
    const title = "Registro de Gastos";
    const fileName = `gastos_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    
    // Añadir título
    doc.setFontSize(20);
    doc.setTextColor(40, 99, 235); // Azul principal
    doc.text(title, 105, 20, { align: "center" });
    
    // Añadir fecha de generación
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado el: ${currentDate}`, 20, 30);
    doc.text(`Total registros: ${expenseTransactions.length}`, 20, 35);
    doc.text(`Importe total: ${formatCurrency(totalExpenses)}`, 20, 40);
    
    // Preparar datos para la tabla
    const tableRows = sortedExpenseTransactions.map(transaction => [
      transaction.id.toString(),
      transaction.description,
      formatDate(transaction.date),
      getCategoryName(transaction.categoryId),
      formatCurrency(transaction.amount)
    ]);
    
    // Añadir tabla con los gastos
    autoTable(doc, {
      startY: 50,
      head: [["ID", "Descripción", "Fecha", "Categoría", "Importe"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [40, 99, 235], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30 },
        3: { cellWidth: 40 },
        4: { cellWidth: 30, halign: 'right' }
      },
    });
    
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
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width - 20,
        doc.internal.pageSize.height - 10
      );
    }
    
    // Descargar el PDF
    doc.save(fileName);
    
    toast({
      title: "PDF generado correctamente",
      description: `El archivo ${fileName} se ha descargado`,
    });
  };

  // Componente para seleccionar emoji
  const EmojiPicker = () => {
    return (
      <div className="grid grid-cols-10 gap-2 mt-2">
        {CATEGORY_EMOJIS.map((emoji, index) => (
          <Button
            key={index}
            type="button"
            variant={emoji === selectedEmoji ? "default" : "outline"}
            className="h-10 w-10 p-0"
            onClick={() => setSelectedEmoji(emoji)}
          >
            <span className="text-lg">{emoji}</span>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-4 shadow-md mb-4">
          <h1 className="text-2xl font-bold text-white">Ingresos y Gastos</h1>
        </div>

        <div className="grid gap-6">
          {/* Panel de estadísticas - Diseño mejorado con tarjetas más atractivas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="h-2 bg-gradient-to-r from-green-500 to-green-300"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <div className="bg-green-100 p-2 rounded-full mr-3">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-green-700 text-lg">Total Ingresos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-3xl font-bold text-green-700">{formatCurrency(totalIncome)}</div>
                )}
                <div className="mt-3 space-y-2 text-sm">
                  <div className="bg-green-50 p-2 rounded-md">
                    <span className="text-green-600 font-medium">Facturas: {formatCurrency(totalInvoiceIncome)}</span>
                  </div>
                  <div className="bg-green-50 p-2 rounded-md">
                    <span className="text-green-600 font-medium">Otros: {formatCurrency(totalAdditionalIncome)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="h-2 bg-gradient-to-r from-red-500 to-red-300"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <div className="bg-red-100 p-2 rounded-full mr-3">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="text-red-700 text-lg">Total Gastos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-3xl font-bold text-red-700">{formatCurrency(totalExpenses)}</div>
                )}
                <div className="mt-3 space-y-2 text-sm">
                  <div className="bg-red-50 p-2 rounded-md">
                    <span className="text-red-600 font-medium">Registros: {expenseTransactions.length} transacciones</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-300"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <FilePlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-blue-700 text-lg">Resultado</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="text-3xl font-bold text-blue-700">
                    {formatCurrency(totalIncome - totalExpenses)}
                  </div>
                )}
                <div className="mt-3 bg-blue-50 p-2 rounded-md">
                  <Badge className={`text-sm ${totalIncome > totalExpenses ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}>
                    {totalIncome > totalExpenses ? "Beneficio" : "Pérdida"}
                  </Badge>
                  <span className="ml-2 text-sm text-blue-600">
                    {totalIncome > totalExpenses 
                      ? "¡Buen trabajo! Estás en positivo" 
                      : "Revisa tus gastos para mejorar el resultado"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs para ingresos y gastos con diseño mejorado */}
          <Tabs 
            defaultValue="income" 
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "income" | "expense");
              // Actualizar la URL para reflejar la pestaña activa sin recargar la página
              const url = new URL(window.location.href);
              url.searchParams.set('tab', value);
              window.history.replaceState({}, '', url.toString());
            }}
            className="space-y-5"
          >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-blue-50 rounded-xl">
              <TabsTrigger value="income" className="rounded-lg py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                <TrendingUp className="w-5 h-5 mr-2" />
                Ingresos
              </TabsTrigger>
              <TabsTrigger value="expense" className="rounded-lg py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white">
                <TrendingDown className="w-5 h-5 mr-2" />
                Gastos
              </TabsTrigger>
            </TabsList>
            
            {/* TAB DE INGRESOS */}
            <TabsContent value="income" className="space-y-4">
              {/* Se eliminó el botón de "Nueva factura" que estaba aquí */}
              
              <Card className="shadow-md border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-4 text-white">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center">
                      <FilePlus className="mr-2 h-5 w-5" />
                      Facturas emitidas
                      <span className="ml-2 bg-white text-blue-600 text-xs font-semibold rounded-full px-2 py-1">
                        {allInvoices.length} facturas
                      </span>
                    </h3>
                    <div 
                      onClick={() => navigate("/invoices/create")}
                      className="bg-white/15 hover:bg-white/25 transition-colors duration-150 rounded-md text-white px-2 py-1.5 flex items-center cursor-pointer"
                    >
                      <span className="font-semibold text-white text-sm">Nueva factura</span>
                      <PlusCircle className="ml-1.5 h-3.5 w-3.5 text-white/80" />
                    </div>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                  </div>
                ) : sortedInvoices.length > 0 ? (
                  <div className="divide-y">
                    {sortedInvoices.map((invoice) => (
                      <div key={invoice.id} className="p-5 flex justify-between items-center hover:bg-blue-50 transition-colors group">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="bg-blue-100 p-2 rounded-full mr-3 group-hover:bg-blue-200 transition-colors">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 group-hover:text-gray-900">
                                Factura #{invoice.invoiceNumber} - {getClientName(invoice.clientId)}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center mt-1">
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs mr-2">
                                  {invoice.status === "paid" ? "Pagada" : "Pendiente"}
                                </span>
                                <span>{formatDate(invoice.issueDate)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <div className="font-bold text-green-600 text-lg">
                              {formatCurrency(invoice.total)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Base: {formatCurrency(invoice.subtotal)} · IVA: {formatCurrency(invoice.tax)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Ver factura</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                                    onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar factura</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                                    onClick={() => handleExportInvoicePDF(invoice)}
                                  >
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Descargar PDF</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-blue-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No hay facturas registradas</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Comienza emitiendo tu primera factura con nuestro asistente de creación
                    </p>
                    <Button 
                      onClick={() => navigate("/invoices/create")} 
                      className="gap-2"
                    >
                      <FilePlus className="h-4 w-4" />
                      Crear factura
                    </Button>
                  </div>
                )}
              </Card>
              
              <Card className="shadow-md border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-400 p-4 text-white">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Otros ingresos
                      <span className="ml-2 bg-white text-green-600 text-xs font-semibold rounded-full px-2 py-1">
                        {incomeTransactions.length} registros
                      </span>
                    </h3>
                    <div 
                      onClick={() => navigate("/transactions/create?type=income")}
                      className="bg-white/15 hover:bg-white/25 transition-colors duration-150 rounded-md text-white px-2 py-1.5 flex items-center cursor-pointer"
                    >
                      <span className="font-semibold text-white text-sm">Nuevo ingreso</span>
                      <PlusCircle className="ml-1.5 h-3.5 w-3.5 text-white/80" />
                    </div>
                  </div>
                </div>
                
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                  </div>
                ) : sortedIncomeTransactions.length > 0 ? (
                  <div className="divide-y">
                    {sortedIncomeTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-5 flex justify-between items-center hover:bg-green-50 transition-colors group">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="bg-green-100 p-2 rounded-full mr-3 group-hover:bg-green-200 transition-colors">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 group-hover:text-gray-900">{transaction.description}</div>
                              <div className="text-sm text-muted-foreground flex items-center mt-1">
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs mr-2">
                                  {getCategoryName(transaction.categoryId)}
                                </span>
                                <span>{formatDate(transaction.date)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right bg-white px-3 py-2 rounded-lg shadow-sm border border-green-100">
                            <div className="font-bold text-green-600 text-lg">
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                          <div className="flex items-center opacity-80 group-hover:opacity-100">
                            <DeleteTransactionButton 
                              transactionId={transaction.id}
                              description={transaction.description}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-green-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No hay otros ingresos registrados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Registra ingresos adicionales que no correspondan a facturas emitidas
                    </p>
                    <Button 
                      onClick={() => navigate("/transactions/create?type=income")} 
                      variant="outline" 
                      className="bg-green-600 text-white hover:bg-green-700 gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Registrar ingreso
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>
            
            {/* TAB DE GASTOS */}
            <TabsContent value="expense" className="space-y-4">
              <div className="flex justify-end mb-2 gap-2">
                <Button 
                  onClick={() => navigate("/documents/scan")}
                  variant="default" 
                  className="gap-2 text-sm bg-[#04C4D9] hover:bg-[#03b0c3] text-white"
                >
                  <ScanText className="h-4 w-4" />
                  Escanear documento
                </Button>
                <Button 
                  onClick={downloadExpensesPDF} 
                  variant="outline" 
                  className="gap-2 text-sm"
                  disabled={expenseTransactions.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Descargar lista de gastos
                </Button>
              </div>
              
              <Card className="shadow-md border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-400 p-3 text-white">
                  <h3 className="text-sm font-medium flex items-center">
                    <Receipt className="mr-2 h-4 w-4" />
                    Registro rápido de gastos
                  </h3>
                </div>
                <CardContent className="p-3">
                  <form onSubmit={handleQuickExpense} className="flex flex-wrap items-end gap-2 mb-0">
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <Input
                        type="text"
                        placeholder="Ej: Material de oficina"
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        required
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <div className="w-[120px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Importe (€)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        required
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Categoría
                      </label>
                      <div className="flex gap-1">
                        <Select 
                          onValueChange={(value) => setCategoryId(value !== "null" ? Number(value) : null)}
                          defaultValue={categoryId ? categoryId.toString() : "null"}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Sin categoría</SelectItem>
                            {categories && categories
                              .filter((cat) => cat.hasOwnProperty('type') ? cat.type === "expense" : true)
                              .map((category) => (
                                <SelectItem 
                                  key={category.id} 
                                  value={category.id.toString()}
                                >
                                  {category.icon || "💼"} {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          size="icon"
                          variant="outline" 
                          className="h-8 w-8"
                          onClick={() => setShowCategoryModal(true)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <div className="flex-shrink-0">
                        {!attachmentPath ? (
                          <FileUpload onUpload={handleFileUpload} compact={true} />
                        ) : (
                          <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 flex items-center gap-1 h-7 px-2">
                            <FileText className="h-3 w-3" />
                            <span className="text-xs">Adjunto</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 p-0 ml-1" 
                              onClick={() => setAttachmentPath(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="bg-red-600 hover:bg-red-700 whitespace-nowrap h-8"
                        size="sm"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <PlusCircle className="h-4 w-4 mr-1" />
                        )}
                        <span>Registrar</span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              
              <Card className="shadow-md border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-400 p-4 text-white">
                  <h3 className="text-lg font-medium flex items-center">
                    <TrendingDown className="mr-2 h-5 w-5" />
                    Lista de Gastos
                    <span className="ml-2 bg-white text-red-600 text-xs font-semibold rounded-full px-2 py-1">
                      {expenseTransactions.length} registros
                    </span>
                  </h3>
                </div>
                
                {isLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                    <Skeleton className="h-16 w-full rounded-md" />
                  </div>
                ) : sortedExpenseTransactions.length > 0 ? (
                  <div className="divide-y">
                    {sortedExpenseTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 flex justify-between items-center hover:bg-red-50 transition-colors group">
                        <div className="flex-1">
                          <div className="flex items-start">
                            <div 
                              className="p-2 rounded-full mr-3 group-hover:bg-red-200 transition-colors"
                              style={{ 
                                backgroundColor: `${getCategoryColor(transaction.categoryId)}20`, // Añadir transparencia al color
                                border: `1px solid ${getCategoryColor(transaction.categoryId)}40` 
                              }}
                            >
                              {/* Mostrar el emoji/icono de la categoría en lugar del icono genérico */}
                              <span 
                                className="text-lg" 
                                style={{ color: getCategoryColor(transaction.categoryId) }}
                              >
                                {getCategoryIcon(transaction.categoryId)}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 group-hover:text-gray-900">{transaction.description}</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                                  <FolderOpen className="h-3 w-3 mr-1" /> 
                                  {getCategoryName(transaction.categoryId) || 'Sin categoría'}
                                </span>
                                
                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" /> 
                                  {formatDate(transaction.date)}
                                </span>
                                
                                {transaction.paymentMethod && (
                                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                                    <CreditCard className="h-3 w-3 mr-1" /> 
                                    {transaction.paymentMethod === 'card' ? 'Tarjeta' : 
                                     transaction.paymentMethod === 'cash' ? 'Efectivo' : 
                                     transaction.paymentMethod === 'transfer' ? 'Transferencia' : 
                                     transaction.paymentMethod === 'direct_debit' ? 'Domiciliación' : 
                                     transaction.paymentMethod}
                                  </span>
                                )}
                                
                                {transaction.attachments && transaction.attachments.length > 0 && (
                                  <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                                    <Paperclip className="h-3 w-3 mr-1" /> 
                                    Adjuntos ({transaction.attachments.length})
                                  </span>
                                )}
                                
                                {transaction.tax && (
                                  <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full text-xs flex items-center">
                                    <Percent className="h-3 w-3 mr-1" />
                                    IVA: {typeof transaction.tax === 'number' ? `${transaction.tax}%` : transaction.tax}
                                  </span>
                                )}
                                
                                {transaction.notes && (
                                  <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs flex items-center cursor-help" title={transaction.notes}>
                                    <Info className="h-3 w-3 mr-1" />
                                    Tiene notas
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right bg-white px-3 py-2 rounded-lg shadow-sm border border-red-100">
                            <div className="font-bold text-red-600 text-lg">
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                          <div className="flex items-center opacity-80 group-hover:opacity-100 transition-opacity">
                            <DownloadTransactionButton 
                              transactionId={transaction.id}
                            />
                            <DeleteTransactionButton 
                              transactionId={transaction.id}
                              description={transaction.description}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                      <Receipt className="h-8 w-8 text-red-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">No hay gastos registrados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Comienza registrando gastos usando el formulario de arriba o escaneando documentos
                    </p>
                    <Button 
                      onClick={() => navigate("/documents/scan")} 
                      variant="default" 
                      className="gap-2 bg-[#04C4D9] hover:bg-[#03b0c3] text-white"
                    >
                      <ScanText className="h-4 w-4" />
                      Escanear documento
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal para crear nueva categoría */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nueva categoría</DialogTitle>
            <DialogDescription>
              Añade una nueva categoría para organizar tus gastos.
            </DialogDescription>
          </DialogHeader>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Formulario enviado");
              console.log("Target:", e.target);
              const formData = new FormData(e.target as HTMLFormElement);
              const categoryName = formData.get("categoryName") as string;
              console.log("Nombre categoría:", categoryName);
              
              if (!categoryName) {
                toast({
                  title: "Error",
                  description: "El nombre de la categoría es obligatorio",
                  variant: "destructive",
                });
                return;
              }
              
              createCategoryMutation.mutate({
                name: categoryName,
                type: "expense", // Por defecto para el formulario de gastos
                icon: selectedEmoji,
                color: "#6E56CF" // Color por defecto
              });
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="categoryName" className="text-sm font-medium">
                  Nombre de la categoría
                </label>
                <Input
                  id="categoryName"
                  name="categoryName"
                  placeholder="Ej: Material de oficina"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Icono/Emoji
                </label>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 h-10 w-10 rounded-md flex items-center justify-center text-xl">
                    {selectedEmoji}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Selecciona un emoji para tu categoría
                  </div>
                </div>
                
                <EmojiPicker />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCategoryModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear categoría
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IncomeExpenseReport;