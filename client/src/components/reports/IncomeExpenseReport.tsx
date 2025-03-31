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
  Trash2
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
// import { PageTitle } from "@/components/ui/page-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import FileUpload from "@/components/common/FileUpload";
import { generateInvoicePDF } from "@/lib/pdf";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
}

interface Category {
  id: number;
  name: string;
}

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

  // Consulta de invoices (ingresos)
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
  } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
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
  });

  // Consulta de categorías para mostrar nombres
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Filtrar solo facturas pagadas (ingresos)
  const paidInvoices = invoices.filter(invoice => invoice.status === "paid");

  // Filtrar transacciones por tipo
  const incomeTransactions = transactions.filter(tx => tx.type === "income");
  const expenseTransactions = transactions.filter(tx => tx.type === "expense");

  // Calcular totales con protección para valores no numéricos
  const totalInvoiceIncome = paidInvoices.reduce((sum, inv) => {
    const total = typeof inv.total === 'number' ? inv.total : parseFloat(inv.total as any) || 0;
    return sum + total;
  }, 0);
  
  const totalAdditionalIncome = incomeTransactions.reduce((sum, tx) => {
    const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount as any) || 0;
    return sum + amount;
  }, 0);
  
  const totalIncome = totalInvoiceIncome + totalAdditionalIncome;
  
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

  // Ordenar facturas y transacciones por fecha (más reciente primero)
  const sortedInvoices = [...paidInvoices].sort((a, b) => 
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  
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
    
    if (!attachmentPath) {
      toast({
        title: "Comprobante obligatorio",
        description: "Debe adjuntar un comprobante (factura, ticket o recibo) para registrar el gasto.",
        variant: "destructive",
      });
      // Abrir automáticamente el panel de adjuntos
      setShowAttachment(true);
      return;
    }
    
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
      amount: amount,
      date: new Date().toISOString(),
      type: "expense",
      paymentMethod: "efectivo", // Valor por defecto
      notes: "Registro rápido",
      attachments: [attachmentPath] // Adjunto obligatorio
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

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-4 -mt-5">
        <h1 className="text-2xl font-semibold text-black ml-6">Ingresos y Gastos</h1>
      </div>

      <div className="grid gap-6">
        {/* Panel de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                Total Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Facturas: {formatCurrency(totalInvoiceIncome)} | 
                Otros: {formatCurrency(totalAdditionalIncome)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700 flex items-center">
                <TrendingDown className="mr-2 h-4 w-4" />
                Total Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                De {expenseTransactions.length} transacciones
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                <FilePlus className="mr-2 h-4 w-4" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatCurrency(totalIncome - totalExpenses)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {totalIncome > totalExpenses ? "Beneficio" : "Pérdida"}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs para ingresos y gastos */}
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
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
          </TabsList>
          
          {/* TAB DE INGRESOS */}
          <TabsContent value="income" className="space-y-4">
            {/* Acciones adicionales - Solo visibles en la pestaña de ingresos */}
            <div className="flex flex-wrap gap-3 justify-start mb-4">
              <Button 
                onClick={() => navigate("/transactions/create")} 
                variant="default" 
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Nueva transacción
              </Button>
              
              <Button 
                onClick={() => navigate("/invoices/create")} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <FilePlus className="h-4 w-4" />
                Nueva factura
              </Button>
            </div>
            
            <div className="rounded-md border">
              <div className="bg-muted/40 p-4">
                <h3 className="text-sm font-medium">Facturas emitidas</h3>
              </div>
              
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sortedInvoices.length > 0 ? (
                <div className="divide-y">
                  {sortedInvoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 flex justify-between items-center hover:bg-muted/30">
                      <div className="flex-1">
                        <div className="font-medium">
                          Factura #{invoice.invoiceNumber} - {getClientName(invoice.clientId)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(invoice.issueDate)} · {invoice.status === "paid" ? "Pagada" : "Pendiente"}
                        </div>
                      </div>
                      <div className="text-right flex-initial mr-4">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(invoice.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Base: {formatCurrency(invoice.subtotal)} · IVA: {formatCurrency(invoice.tax)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-initial">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/invoices/${invoice.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver detalles</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/invoices/${invoice.id}?edit=true`)}
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
                                onClick={() => handleExportInvoicePDF(invoice)}
                              >
                                <FileDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Exportar a PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No hay facturas disponibles</p>
                  <Button 
                    onClick={() => navigate("/invoices/create")} 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                  >
                    Crear factura
                  </Button>
                </div>
              )}
            </div>
            
            <div className="rounded-md border">
              <div className="bg-muted/40 p-4">
                <h3 className="text-sm font-medium">Otros ingresos</h3>
              </div>
              
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sortedIncomeTransactions.length > 0 ? (
                <div className="divide-y">
                  {sortedIncomeTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 flex justify-between items-center hover:bg-muted/30">
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)} · {getCategoryName(transaction.categoryId)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No hay otros ingresos registrados</p>
                  <Button 
                    onClick={() => navigate("/transactions/create")} 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                  >
                    Registrar ingreso
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* TAB DE GASTOS */}
          <TabsContent value="expense" className="space-y-4">
            {/* Acciones adicionales - Solo visibles en la pestaña de gastos */}
            <div className="flex flex-wrap gap-3 justify-start mb-4">
              <Button 
                onClick={() => navigate("/documents/scan")} 
                variant="default" 
                className="flex items-center gap-2 bg-primary text-white relative shadow-md border border-primary/20 hover:bg-primary/90 transition-all"
              >
                <ScanText className="h-4 w-4" />
                <span className="font-medium">Escanear documento</span>
                <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-sm border border-white">
                  +
                </span>
              </Button>
              
              <Button 
                onClick={downloadExpensesPDF} 
                variant="outline" 
                className="flex items-center gap-2"
                disabled={expenseTransactions.length === 0}
              >
                <Download className="h-4 w-4" />
                Descargar gastos (PDF)
              </Button>
            </div>
            
            {/* Formulario de registro rápido de gastos - Solo visible en la pestaña de gastos */}
            <Card className="border-2 border-red-100 shadow-sm">
              <CardHeader className="pb-3 pt-3">
                <CardTitle className="text-lg font-medium text-red-800 flex items-center">
                  <TrendingDown className="mr-2 h-5 w-5" />
                  Registro rápido de gastos
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Registra rápidamente un gasto. Debes adjuntar un comprobante (factura, ticket o recibo).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickExpense} className="flex flex-col md:flex-row items-center gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Descripción del gasto"
                      value={expenseDescription}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseDescription(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="md:w-[120px] w-full">
                    <Input
                      placeholder="Importe (€)"
                      value={expenseAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseAmount(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="w-full"
                    />
                  </div>
                  
                  <div className="md:w-auto w-full flex items-center gap-1">
                    {!attachmentPath ? (
                      <FileUpload onUpload={handleFileUpload} compact={true} />
                    ) : (
                      <>
                        <Badge className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 flex items-center gap-1 h-7 px-2">
                          <FileText className="h-3 w-3" />
                          <span className="text-xs">Adjunto</span>
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full p-0" 
                          onClick={() => setAttachmentPath(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <div>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
                      size="sm"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <PlusCircle className="h-4 w-4 mr-1" />
                      )}
                      Registrar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            <div className="rounded-md border">
              <div className="bg-muted/40 p-4">
                <h3 className="text-sm font-medium">Gastos registrados</h3>
              </div>
              
              {isLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : sortedExpenseTransactions.length > 0 ? (
                <div className="divide-y">
                  {sortedExpenseTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 flex justify-between items-center hover:bg-muted/30">
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)} · {getCategoryName(transaction.categoryId)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-red-600">
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                        <DeleteTransactionButton 
                          transactionId={transaction.id}
                          description={transaction.description}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No hay gastos registrados</p>
                  <Button 
                    onClick={() => navigate("/transactions/create")} 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                  >
                    Registrar gasto
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IncomeExpenseReport;