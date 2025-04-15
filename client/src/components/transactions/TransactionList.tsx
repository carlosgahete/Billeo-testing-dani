import React, { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, Edit, Trash2, Plus, Download, Upload, TrendingDown, FileText,
  ArrowUp, ScanText, Receipt, FileDown, Wrench, Sparkles, RefreshCcw,
  AlertTriangle, DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery, useIsMobile } from "@/hooks/use-media-query";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FileUpload from "@/components/common/FileUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpenseFilters from "@/components/transactions/ExpenseFilters";
import IncomeFilters from "@/components/transactions/IncomeFilters";
import SimpleExpenseForm from "@/components/transactions/SimpleExpenseForm";
// Se eliminaron las importaciones de los formularios de gasto rápido obsoletos
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction, Category } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Definición de la interfaz Invoice para el componente
interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName?: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "pending";
  subtotal: string;
  tax: string;
  total: string;
  additionalTaxes?: any;
  notes?: string;
  attachments?: string[];
  userId: number;
}

const PaymentMethodBadge = ({ method }: { method: string }) => {
  const methodMap: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
    cash: { label: "Efectivo", variant: "outline" },
    bank_transfer: { label: "Transferencia", variant: "secondary" },
    credit_card: { label: "Tarjeta crédito", variant: "default" },
    debit_card: { label: "Tarjeta débito", variant: "default" },
    paypal: { label: "PayPal", variant: "outline" },
    other: { label: "Otro", variant: "outline" },
  };

  const { label, variant } = methodMap[method] || { label: method, variant: "outline" };

  return <Badge variant={variant}>{label}</Badge>;
};

const DeleteTransactionDialog = ({ 
  transactionId, 
  description, 
  onConfirm 
}: { 
  transactionId: number; 
  description: string; 
  onConfirm: () => void; 
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      await apiRequest("DELETE", `/api/transactions/${transactionId}`);
      toast({
        title: "Movimiento eliminado",
        description: `El movimiento ha sido eliminado con éxito`,
      });
      // Invalidar todas las consultas relevantes para garantizar que el dashboard y otras vistas se actualicen correctamente
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] })
      ]);
      onConfirm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar el movimiento: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Eliminar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente el movimiento "{description}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600"
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const TransactionList = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Estado para los filtros de año y periodo
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  
  // Años disponibles para el filtro (últimos 5 años)
  const availableYears = Array.from({ length: 5 }, (_, i) => 
    (new Date().getFullYear() - i).toString()
  );
  const [currentTab, setCurrentTab] = useState("all");
  const [filteredExpenseTransactions, setFilteredExpenseTransactions] = useState<Transaction[]>([]);
  const [filteredIncomeTransactions, setFilteredIncomeTransactions] = useState<Transaction[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);
  const [showExpenseFilters, setShowExpenseFilters] = useState(false);
  const [showIncomeFilters, setShowIncomeFilters] = useState(false);
  const [expenseFiltersApplied, setExpenseFiltersApplied] = useState(false);
  const [incomeFiltersApplied, setIncomeFiltersApplied] = useState(false);
  
  // Detectar dispositivos móviles de forma directa
  const [isMobile, setIsMobile] = useState(false);
  
  // Efecto para detectar si estamos en un dispositivo móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Comprobación inicial
    checkIfMobile();
    
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Eliminar múltiples transacciones con mejor fluidez
  const handleDeleteSelectedTransactions = async (transactions: Transaction[]) => {
    if (transactions.length === 0) return;
    
    // Guardamos los IDs de las transacciones que vamos a eliminar
    const transactionIds = transactions.map(t => t.id);
    
    // Actualizamos el estado optimista antes de la petición para mejor UX
    // Optimistic UI update - eliminar las transacciones del estado local inmediatamente
    const currentTransactions = queryClient.getQueryData<Transaction[]>([getFilteredTransactionsUrl()]) || [];
    
    // Hacer un respaldo por si falla
    const previousTransactions = [...currentTransactions];
    
    // Actualizar el cache local inmediatamente (antes de la petición al servidor)
    queryClient.setQueryData<Transaction[]>([getFilteredTransactionsUrl()], 
      currentTransactions.filter(t => !transactionIds.includes(t.id))
    );
    
    // Limpiar selección
    setSelectedTransactions([]);
    
    // Mostrar mensaje de carga con UI optimista
    toast({
      title: "Eliminando transacciones",
      description: `Eliminando ${transactions.length} transacciones...`,
    });
    
    try {
      // Crear un array de promesas para eliminar todas las transacciones en paralelo
      const deletePromises = transactions.map(transaction => 
        apiRequest("DELETE", `/api/transactions/${transaction.id}`)
          .catch(error => {
            console.error(`Error al eliminar transacción ${transaction.id}:`, error);
            return null; // Continuar con las demás transacciones aunque alguna falle
          })
      );
      
      // Esperar a que todas las eliminaciones se completen
      await Promise.all(deletePromises);
      
      // Notificar al usuario
      toast({
        title: "Transacciones eliminadas",
        description: `Se han eliminado ${transactions.length} transacciones con éxito`,
      });
      
      // Actualizar datos inmediatamente en todas las vistas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] })
      ]);
      
    } catch (error: any) {
      // Revertir el cambio optimista si hay error
      queryClient.setQueryData([getFilteredTransactionsUrl()], previousTransactions);
      
      toast({
        title: "Error",
        description: `No se pudieron eliminar algunas transacciones: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  // Exportar múltiples transacciones
  const handleExportSelectedTransactions = async (transactions: Transaction[]) => {
    if (transactions.length === 0 || isExporting) return;
    setIsExporting(true);
    
    try {
      // Determinar el tipo predominante para el título
      const expenseCount = transactions.filter(t => t.type === 'expense').length;
      const incomeCount = transactions.filter(t => t.type === 'income').length;
      const documentTitle = expenseCount > incomeCount ? 'Informe de Gastos' : 'Informe de Ingresos';
      const colorScheme = expenseCount > incomeCount ? [0, 122, 255] : [52, 199, 89];
      
      // Crear nuevo documento PDF
      const pdf = new jsPDF();
      
      // Añadir título y metadata
      pdf.setProperties({
        title: `${documentTitle} - ${new Date().toLocaleDateString('es-ES')}`,
        author: 'Billeo App',
        subject: documentTitle,
        keywords: 'finanzas, autónomos',
      });
      
      // Añadir cabecera al documento
      pdf.setFontSize(22);
      pdf.setTextColor(33, 33, 33);
      pdf.text(documentTitle, 14, 22);
      
      // Añadir fecha de generación
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 28);
      pdf.text(`Total de elementos: ${transactions.length}`, 14, 33);
      pdf.text(`Gastos: ${expenseCount} | Ingresos: ${incomeCount}`, 14, 38);
      
      // Calcular totales
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
        
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      pdf.text(`Total gastos: ${formatCurrency(totalExpenses, 'expense')} | Total ingresos: ${formatCurrency(totalIncome, 'income')}`, 14, 43);
      
      // Preparar datos para la tabla
      const tableData = transactions.map((t: Transaction) => {
        const category = getCategory(t.categoryId);
        return [
          formatDate(t.date),
          t.title,
          t.type === 'expense' ? 'Gasto' : 'Ingreso',
          t.description,
          category ? category.name : 'Sin categoría',
          formatCurrency(Number(t.amount), t.type)
        ];
      });
      
      // Añadir tabla al PDF
      autoTable(pdf, {
        head: [['Fecha', 'Concepto', 'Tipo', 'Descripción', 'Categoría', 'Importe']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: {
          fillColor: colorScheme,
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 50 },
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Fecha
          1: { cellWidth: 30 }, // Concepto
          2: { cellWidth: 20 }, // Tipo
          3: { cellWidth: 'auto' }, // Descripción
          4: { cellWidth: 30 }, // Categoría
          5: { cellWidth: 30, halign: 'right' } // Importe
        }
      });
      
      // Añadir pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${pageCount} | Generado por Billeo App`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Guardar PDF
      pdf.save(`Informe_Seleccionados_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Informe generado correctamente",
        description: `Se han exportado ${transactions.length} elementos al PDF.`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Error al generar el informe",
        description: error.message || "Ocurrió un error al intentar generar el PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Obtener parámetros de la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      setCurrentTab(tab);
    }
  }, []);

  // Función para construir la URL con los filtros de año y periodo
  const getFilteredTransactionsUrl = () => {
    let url = "/api/transactions";
    const params = new URLSearchParams();
    
    if (selectedYear !== "all") {
      params.append("year", selectedYear);
    }
    
    if (selectedPeriod !== "all") {
      // Determinar si es trimestre o mes
      if (selectedPeriod.startsWith("Q")) {
        params.append("quarter", selectedPeriod.replace("Q", ""));
      } else {
        params.append("month", selectedPeriod);
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  };

  // Estados de las consultas
  const { data: transactions, isLoading, refetch: refetchTransactions } = useQuery({
    queryKey: [getFilteredTransactionsUrl()],
    refetchOnWindowFocus: true, // Recargar datos cuando la ventana recupera el foco
    refetchOnMount: "always", // Recargar siempre al montar el componente
    refetchInterval: 3000, // Recargar cada 3 segundos
    refetchOnReconnect: true, // Recargar al reconectar
    staleTime: 0, // Considerar datos obsoletos inmediatamente
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Función para construir la URL con los filtros para facturas (similar al de transacciones)
  const getFilteredInvoicesUrl = () => {
    let url = "/api/invoices";
    const params = new URLSearchParams();
    
    if (selectedYear !== "all") {
      params.append("year", selectedYear);
    }
    
    if (selectedPeriod !== "all") {
      // Determinar si es trimestre o mes
      if (selectedPeriod.startsWith("Q")) {
        params.append("quarter", selectedPeriod.replace("Q", ""));
      } else {
        params.append("month", selectedPeriod);
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return url;
  };

  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: [getFilteredInvoicesUrl()],
    refetchOnWindowFocus: true, // Recargar datos cuando la ventana recupera el foco
    refetchOnMount: "always", // Recargar siempre al montar el componente
    refetchInterval: 3000, // Recargar cada 3 segundos
    refetchOnReconnect: true, // Recargar al reconectar
    staleTime: 0, // Considerar datos obsoletos inmediatamente
  });

  // Función para determinar qué datos mostrar según los filtros activos
  // Función para filtrar transacciones por año y periodo
  const filterTransactionsByDate = React.useCallback((transactions: Transaction[]) => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions.filter((transaction: Transaction) => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear().toString();
      const transactionMonth = (transactionDate.getMonth() + 1).toString().padStart(2, '0');
      
      // Filtro por año
      if (selectedYear !== 'all' && transactionYear !== selectedYear) {
        console.log(`Filtrado por año: ${transactionYear} != ${selectedYear}`);
        return false;
      }
      
      // Filtro por periodo (trimestre o mes)
      if (selectedPeriod !== 'all') {
        // Filtros trimestrales
        if (selectedPeriod === 'Q1' && !['01', '02', '03'].includes(transactionMonth)) {
          console.log(`Filtrado por Q1: ${transactionMonth} no está en [01,02,03]`);
          return false;
        }
        if (selectedPeriod === 'Q2' && !['04', '05', '06'].includes(transactionMonth)) {
          console.log(`Filtrado por Q2: ${transactionMonth} no está en [04,05,06]`);
          return false;
        }
        if (selectedPeriod === 'Q3' && !['07', '08', '09'].includes(transactionMonth)) {
          console.log(`Filtrado por Q3: ${transactionMonth} no está en [07,08,09]`);
          return false;
        }
        if (selectedPeriod === 'Q4' && !['10', '11', '12'].includes(transactionMonth)) {
          console.log(`Filtrado por Q4: ${transactionMonth} no está en [10,11,12]`);
          return false;
        }
        
        // Filtros mensuales
        if (selectedPeriod.length === 2 && selectedPeriod !== transactionMonth) {
          console.log(`Filtrado por mes: ${transactionMonth} != ${selectedPeriod}`);
          return false;
        }
      }
      
      return true;
    });
  }, [selectedYear, selectedPeriod]);
  
  // No necesitamos más filterInvoicesByDate ya que el filtrado se hace en la API

  // Función para convertir facturas en transacciones virtuales (para visualización)
  // Solo para facturas que NO tengan ya una transacción real asociada
  const convertInvoicesToTransactions = useCallback(() => {
    if (!invoices || !transactions) return [];
    
    // Filtrar facturas que ya tienen transacciones reales
    const invoicesWithTransactions = transactions
      .filter(t => t.invoiceId !== null && t.invoiceId !== undefined)
      .map(t => t.invoiceId);
      
    console.log("🔍 Facturas que ya tienen transacciones:", invoicesWithTransactions);
    
    // Solo crear transacciones virtuales para facturas sin transacción real
    return invoices
      .filter(invoice => !invoicesWithTransactions.includes(invoice.id))
      .map((invoice) => {
        // Determinar categoría predeterminada para facturas
        const invoiceCategory = categories?.find((c) => c.type === "income" && c.name === "Ventas") || { id: 0, name: "Ventas", type: "income", icon: "receipt", color: "#4F46E5" };
        
        // Establecer fechas
        const issueDate = new Date(invoice.issueDate);
        
        // Crear la transacción con datos de la factura
        return {
          id: `invoice-${invoice.id}`, // Prefijo para identificar que es una factura virtual
          userId: invoice.userId,
          title: `Factura ${invoice.invoiceNumber}`,
          description: `Cliente: ${invoice.clientName || 'Sin nombre'}`,
          amount: invoice.total,
          date: issueDate,
          categoryId: invoiceCategory.id,
          type: "income",
          paymentMethod: invoice.status === "paid" ? "card" : null,
          notes: invoice.notes || null,
          attachments: invoice.attachments || null,
          additionalTaxes: invoice.additionalTaxes || null,
          invoiceId: invoice.id,
          invoiceStatus: invoice.status, // Campo adicional para almacenar el estado de la factura
          // Añadimos marca para diferenciar de transacciones normales
          isInvoiceTransaction: true
        };
      });
  }, [invoices, categories, transactions]);

  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    // Aplicamos primero los filtros de pestaña
    let result = [];
    
    // Obtenemos transacciones virtuales de facturas
    const invoiceTransactions = convertInvoicesToTransactions();
    
    // Si estamos en la pestaña de gastos y hay filtros aplicados
    if (currentTab === "expense" && filteredExpenseTransactions.length > 0) {
      result = filteredExpenseTransactions;
    }
    // Si estamos en la pestaña de ingresos y hay filtros aplicados
    else if (currentTab === "income" && filteredIncomeTransactions.length > 0) {
      result = filteredIncomeTransactions;
      
      // Si estamos en ingresos, añadimos las facturas convertidas a transacciones
      // (solo si no hay filtros específicos de ingresos activos que lo impidan)
      if (!incomeFiltersApplied) {
        result = [...result, ...invoiceTransactions];
      }
    }
    // Si no hay filtros, filtramos por el tipo de la pestaña seleccionada
    else if (currentTab !== "all") {
      result = transactions.filter((t: Transaction) => t.type === currentTab);
      
      // Si estamos en ingresos, añadimos las facturas convertidas a transacciones
      if (currentTab === "income") {
        result = [...result, ...invoiceTransactions];
      }
    }
    // En la pestaña "todos", mostramos todas las transacciones
    else {
      result = transactions;
      
      // Añadimos también las facturas como transacciones virtuales
      result = [...result, ...invoiceTransactions];
    }
    
    // Eliminar duplicados (en caso de que haya transacciones generadas para facturas)
    const uniqueTransactions = result.reduce((acc, current) => {
      // Si es una factura virtual, la incluimos siempre
      if (current.isInvoiceTransaction) {
        acc.push(current);
        return acc;
      }
      
      // Para transacciones normales, verificamos si ya existe una con el mismo ID
      const exists = acc.find(item => !item.isInvoiceTransaction && item.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);
    
    // Aplicamos los filtros de fecha sobre el resultado
    return filterTransactionsByDate(uniqueTransactions);
  }, [transactions, currentTab, filteredExpenseTransactions, filteredIncomeTransactions, filterTransactionsByDate, convertInvoicesToTransactions, incomeFiltersApplied]);

  // Obtener categoría por ID
  const getCategory = (categoryId: number) => {
    if (!categories) return null;
    const category = categories.find((c: Category) => c.id === categoryId);
    return category || null;
  };

  // Formatear fecha a formato español
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Formatear importes como moneda española
  const formatCurrency = (amount: number, type: string = "income") => {
    // Para gastos, mostramos el signo negativo delante
    const prefix = type === "expense" ? "-" : "";
    // Formateamos con 2 decimales y separador de miles
    return `${prefix}${amount.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Exportar gastos filtrados a PDF
  const handleExportFilteredExpenses = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      // Determinar qué gastos exportar (filtrados o todos)
      const expensesToExport = filteredExpenseTransactions.length > 0 
        ? filteredExpenseTransactions 
        : transactions?.filter((t: Transaction) => t.type === 'expense') || [];
      
      if (expensesToExport.length === 0) {
        toast({
          title: "No hay gastos para exportar",
          description: "No se encontraron gastos que cumplan con los criterios de filtrado.",
          variant: "default"
        });
        setIsExporting(false);
        return;
      }
      
      // Crear nuevo documento PDF
      const pdf = new jsPDF();
      
      // Añadir título y metadata
      pdf.setProperties({
        title: `Informe de Gastos - ${new Date().toLocaleDateString('es-ES')}`,
        author: 'Billeo App',
        subject: 'Informe de Gastos',
        keywords: 'gastos, finanzas, autónomos',
      });
      
      // Añadir cabecera al documento
      pdf.setFontSize(22);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Informe de Gastos', 14, 22);
      
      // Añadir fecha de generación
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 28);
      
      // Añadir número de gastos exportados
      pdf.text(`Total de gastos: ${expensesToExport.length}`, 14, 33);
      
      // Si hay filtros aplicados, mostrar información de filtrado
      if (filteredExpenseTransactions.length > 0) {
        pdf.text('* Informe filtrado según criterios personalizados', 14, 38);
      }
      
      // Calcular el total de gastos
      const totalAmount = expensesToExport.reduce((sum, t: Transaction) => sum + Number(t.amount), 0);
      pdf.text(`Importe total: ${formatCurrency(totalAmount, 'expense')}`, 14, 43);
      
      // Preparar datos para la tabla
      const tableData = expensesToExport.map((t: Transaction) => {
        const category = getCategory(t.categoryId);
        return [
          formatDate(t.date),
          t.title,
          t.description,
          category ? category.name : 'Sin categoría',
          formatCurrency(Number(t.amount), 'expense')
        ];
      });
      
      // Añadir tabla al PDF
      autoTable(pdf, {
        head: [['Fecha', 'Concepto', 'Descripción', 'Categoría', 'Importe']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 122, 255],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 50 },
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Fecha
          1: { cellWidth: 35 }, // Concepto
          2: { cellWidth: 'auto' }, // Descripción (ajusta automáticamente)
          3: { cellWidth: 30 }, // Categoría
          4: { cellWidth: 30, halign: 'right' } // Importe (alineado a la derecha)
        }
      });
      
      // Añadir pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${pageCount} | Generado por Billeo App`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Guardar PDF
      pdf.save(`Informe_Gastos_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Informe generado correctamente",
        description: `Se han exportado ${expensesToExport.length} gastos al PDF.`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Error al generar el informe",
        description: error.message || "Ocurrió un error al intentar generar el PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar ingresos filtrados a PDF
  const handleExportFilteredIncome = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      // Determinar qué ingresos exportar (filtrados o todos)
      const incomeToExport = filteredIncomeTransactions.length > 0 
        ? filteredIncomeTransactions 
        : transactions?.filter((t: Transaction) => t.type === 'income') || [];
      
      if (incomeToExport.length === 0) {
        toast({
          title: "No hay ingresos para exportar",
          description: "No se encontraron ingresos que cumplan con los criterios de filtrado.",
          variant: "default"
        });
        setIsExporting(false);
        return;
      }
      
      // Crear nuevo documento PDF
      const pdf = new jsPDF();
      
      // Añadir título y metadata
      pdf.setProperties({
        title: `Informe de Ingresos - ${new Date().toLocaleDateString('es-ES')}`,
        author: 'Billeo App',
        subject: 'Informe de Ingresos',
        keywords: 'ingresos, finanzas, autónomos',
      });
      
      // Añadir cabecera al documento
      pdf.setFontSize(22);
      pdf.setTextColor(33, 33, 33);
      pdf.text('Informe de Ingresos', 14, 22);
      
      // Añadir fecha de generación
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, 14, 28);
      
      // Añadir número de ingresos exportados
      pdf.text(`Total de ingresos: ${incomeToExport.length}`, 14, 33);
      
      // Si hay filtros aplicados, mostrar información de filtrado
      if (filteredIncomeTransactions.length > 0) {
        pdf.text('* Informe filtrado según criterios personalizados', 14, 38);
      }
      
      // Calcular el total de ingresos
      const totalAmount = incomeToExport.reduce((sum, t: Transaction) => sum + Number(t.amount), 0);
      pdf.text(`Importe total: ${formatCurrency(totalAmount, 'income')}`, 14, 43);
      
      // Preparar datos para la tabla
      const tableData = incomeToExport.map((t: Transaction) => {
        const category = getCategory(t.categoryId);
        return [
          formatDate(t.date),
          t.title,
          t.description,
          category ? category.name : 'Sin categoría',
          formatCurrency(Number(t.amount), 'income')
        ];
      });
      
      // Añadir tabla al PDF
      autoTable(pdf, {
        head: [['Fecha', 'Concepto', 'Descripción', 'Categoría', 'Importe']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: {
          fillColor: [52, 199, 89], // Color verde para ingresos
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 50 },
        styles: {
          overflow: 'linebreak',
          cellPadding: 3,
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Fecha
          1: { cellWidth: 35 }, // Concepto
          2: { cellWidth: 'auto' }, // Descripción (ajusta automáticamente)
          3: { cellWidth: 30 }, // Categoría
          4: { cellWidth: 30, halign: 'right' } // Importe (alineado a la derecha)
        }
      });
      
      // Añadir pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Página ${i} de ${pageCount} | Generado por Billeo App`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      // Guardar PDF
      pdf.save(`Informe_Ingresos_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Informe generado correctamente",
        description: `Se han exportado ${incomeToExport.length} ingresos al PDF.`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Error al generar el informe",
        description: error.message || "Ocurrió un error al intentar generar el PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Definición de columnas para la tabla
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "title",
      header: "Concepto",
      cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => <div className="max-w-[300px] truncate">{row.original.description}</div>,
    },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => {
        const category = getCategory(row.original.categoryId);
        return (
          <div className="flex items-center">
            {category ? (
              <>
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: category.color || '#ccc' }}
                />
                <span>{category.name}</span>
              </>
            ) : (
              <span className="text-gray-400">Sin categoría</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Método de pago",
      cell: ({ row }) => {
        const { paymentMethod } = row.original;
        return paymentMethod ? <PaymentMethodBadge method={paymentMethod} /> : null;
      },
    },
    {
      accessorKey: "amount",
      header: "Importe",
      cell: ({ row }) => {
        const { amount, type } = row.original;
        return (
          <div>
            <span className={`font-medium ${type === "income" ? "text-secondary-600" : "text-danger-500"}`}>
              {formatCurrency(amount, type)}
            </span>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;
        
        // Determinar si es una transacción de factura virtual
        const isInvoiceTransaction = transaction.isInvoiceTransaction;
        
        // Para facturas virtuales, mostrar el estado con un color
        if (isInvoiceTransaction) {
          // Obtener el estado de la factura
          const invoiceStatus = transaction.invoiceStatus;
          
          // Determinar el color según el estado de la factura
          const getStatusColor = () => {
            switch (invoiceStatus) {
              case 'paid':
                return 'bg-green-500 text-white';
              case 'pending':
                return 'bg-amber-500 text-white';
              case 'overdue':
                return 'bg-red-500 text-white';
              case 'canceled':
                return 'bg-gray-500 text-white';
              default:
                return 'bg-blue-500 text-white';
            }
          };
          
          // Texto del estado
          const getStatusText = () => {
            switch (invoiceStatus) {
              case 'paid':
                return 'Pagada';
              case 'pending':
                return 'Pendiente';
              case 'overdue':
                return 'Vencida';
              case 'canceled':
                return 'Cancelada';
              default:
                return 'Desconocido';
            }
          };
          
          return (
            <div className="flex justify-end items-center space-x-2">
              {/* Mostrar el estado como un badge con el color correspondiente */}
              <Badge 
                className={`rounded-full text-xs px-2 py-0.5 ${getStatusColor()}`}
                title={`Factura ${getStatusText()}`}
              >
                {getStatusText()}
              </Badge>
              
              {/* Botón para ver la factura */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/invoices/view/${transaction.invoiceId}`)}
                title="Ver factura"
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        
        // Para transacciones normales, mostrar los botones estándar
        // Obtener información sobre documentos adjuntos
        const hasAttachments = transaction.type === 'expense' && 
                              transaction.attachments && 
                              transaction.attachments.length > 0;
        
        return (
          <div className="flex justify-end space-x-1">
            {/* Botón de editar siempre visible */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/transactions/edit/${transaction.id}`)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            {/* Botón de descarga - siempre visible pero deshabilitado si no hay adjuntos */}
            <Button
              variant={hasAttachments ? "ghost" : "outline"}
              size="icon"
              onClick={() => {
                if (!hasAttachments) {
                  toast({
                    title: "Sin documentos",
                    description: "Esta transacción no tiene documentos adjuntos",
                    variant: "default"
                  });
                  return;
                }
                
                import('@/lib/attachmentService').then(({ downloadExpenseOriginal }) => {
                  const category = getCategory(transaction.categoryId) || { name: "Sin categoría", icon: "folder", color: "#ccc" };
                  downloadExpenseOriginal(transaction.attachments[0], transaction as any, category);
                });
              }}
              title={hasAttachments ? "Descargar documento original" : "Sin documentos adjuntos"}
              className={hasAttachments 
                ? "text-green-700 hover:text-green-800 hover:bg-green-50" 
                : "text-gray-400 hover:text-gray-500 cursor-help"}
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {/* Botón de visualización solo si hay adjuntos */}
            {hasAttachments && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  import('@/lib/attachmentService').then(({ viewExpenseOriginal }) => {
                    const category = getCategory(transaction.categoryId) || { name: "Sin categoría", icon: "folder", color: "#ccc" };
                    viewExpenseOriginal(transaction.attachments[0], transaction as any, category);
                  });
                }}
                title="Ver documento original"
                className="text-blue-700 hover:text-blue-800 hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            
            <DeleteTransactionDialog
              transactionId={transaction.id}
              description={transaction.description}
              onConfirm={() => {
                // Already invalidating in the dialog component
              }}
            />
          </div>
        );
      },
    },
  ];

  // Calculate totals for the summary cards (ahora usando las transacciones filtradas)
  // Usamos filteredTransactions en lugar de transactions para reflejar los filtros de año/periodo
  // Ingresos de transacciones
  const transactionIncomeTotal = !isLoading && Array.isArray(filteredTransactions)
    ? filteredTransactions
        .filter((t: Transaction) => t.type === "income")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
  
  // Ya no necesitamos filterInvoicesByDate porque filtramos del lado del servidor
  
  // Como ahora el API retorna facturas filtradas, ya no es necesario filtrarlas en el cliente
  const filteredInvoices = !isLoading && Array.isArray(invoices) 
    ? invoices
    : [];
    
  // Log de depuración para entender la discrepancia entre facturas y transacciones
  console.log("🔍 Detalles de facturas y transacciones:", {
    totalFacturas: invoices?.length || 0,
    facturasEnFiltro: filteredInvoices.length,
    totalTransacciones: transactions?.length || 0,
    transaccionesIngresos: transactions?.filter((t: any) => t.type === 'income').length || 0,
    transaccionesGastos: transactions?.filter((t: any) => t.type === 'expense').length || 0,
    filtro: { año: selectedYear, periodo: selectedPeriod }
  });
  
  // Ingresos de facturas pagadas filtradas
  const invoiceIncomeTotal = filteredInvoices.length > 0
    ? filteredInvoices
        .filter((inv: Invoice) => inv.status === "paid")
        .reduce((sum: number, inv: Invoice) => sum + Number(inv.total), 0)
    : 0;
  
  // Combinamos ambos ingresos: los de transacciones directas y los de facturas
  // Esto garantiza que el total refleje correctamente todos los ingresos, tanto
  // los registrados manualmente como los generados por facturas
  const incomeTotal = transactionIncomeTotal + invoiceIncomeTotal;
    
  // Gastos usando filteredTransactions para reflejar los filtros
  const expenseTotal = !isLoading && Array.isArray(filteredTransactions)
    ? filteredTransactions
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
    
  // Calcular los valores netos utilizando las mismas fórmulas exactas del dashboard
  // Para ingresos: Aplicamos la base imponible (sin IVA) en lugar del porcentaje aproximado
  const baseIncomeSinIVA = Math.round(incomeTotal / 1.21); // Exactamente igual que en dashboard.tsx
  const irpfRetencionIngresos = Math.round(baseIncomeSinIVA * 0.15); // 15% IRPF sobre base imponible
  
  // Para gastos: Base imponible y recuperación de IVA
  const baseExpensesSinIVA = expenseTotal;
  const ivaSoportado = Math.round(baseExpensesSinIVA * 0.21); // IVA soportado (se recupera)
  
  // Beneficio antes de impuestos
  const beneficioAntesImpuestos = baseIncomeSinIVA - baseExpensesSinIVA;
  const irpfTotal = irpfRetencionIngresos; // No hay retenciones en gastos que compensen
  
  // Beneficio neto y balance
  const netIncomeTotal = baseIncomeSinIVA - irpfRetencionIngresos; // Ingresos después de impuestos
  const netExpenseTotal = baseExpensesSinIVA - ivaSoportado; // Gastos después de recuperar IVA
  const balance = netIncomeTotal - netExpenseTotal; // Balance neto real

  // Función para reparar las transacciones de facturas pagadas
  
  const handleRepairInvoiceTransactions = async () => {
    if (isRepairing) return;
    
    setIsRepairing(true);
    try {
      // Realizar la petición POST para reparar las transacciones
      await fetch('/api/repair/invoice-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      // Refrescar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      
      // Mostrar confirmación de éxito
      toast({
        title: "Reparación completada",
        description: "Se han procesado las facturas pagadas y generado las transacciones faltantes.",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Error al reparar transacciones",
        description: error.message || "No se pudieron reparar las transacciones de facturas pagadas.",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 fade-in">
      {isMobile ? null : (
        /* Cabecera estilo Apple solo en desktop */
        <div className="section-header fade-in mb-3 mt-0 pt-0 flex items-center justify-between">
          <div className="flex items-center ml-16 md:ml-12">
            <div className="bg-[#E9F8FB] p-3 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10" />
                <line x1="18" y1="20" x2="18" y2="4" />
                <line x1="6" y1="20" x2="6" y2="16" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none mb-0.5">Ingresos y Gastos</h2>
              <p className="text-sm text-gray-500 mt-0 leading-tight">Visualiza y gestiona todos tus movimientos económicos</p>
            </div>
          </div>
          
          {/* Filtros de año y periodo estilo Apple */}
          <div className="flex items-center space-x-3 mr-6">
            <div className="flex items-center bg-[#F2F2F7] rounded-full overflow-hidden shadow-inner border border-gray-200/60">
              {/* Selector de Año */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0 focus:outline-none py-1.5 pl-3 pr-2 text-gray-700 font-medium appearance-none"
                style={{ 
                  WebkitAppearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' width=\'18\' height=\'18\' stroke=\'%238E8E93\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\' class=\'css-i6dzq1\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                  paddingRight: '24px'
                }}
              >
                <option value="all">Todos los años</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              
              {/* Selector de Periodo */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0 focus:outline-none py-1.5 pl-3 pr-2 text-gray-700 font-medium appearance-none"
                style={{ 
                  WebkitAppearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' width=\'18\' height=\'18\' stroke=\'%238E8E93\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\' class=\'css-i6dzq1\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                  paddingRight: '24px'
                }}
              >
                <option value="all">Todos los periodos</option>
                <option value="Q1">T1 (Ene-Mar)</option>
                <option value="Q2">T2 (Abr-Jun)</option>
                <option value="Q3">T3 (Jul-Sep)</option>
                <option value="Q4">T4 (Oct-Dic)</option>
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* El resumen para dispositivos móviles ha sido eliminado completamente para un diseño más minimalista */}
      
      {/* Tarjetas de resumen estilo Apple - Solo visibles en desktop */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-5 mb-8 mx-2 w-full">
        {/* Tarjeta de Ingresos Totales */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
                <ArrowUp className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingresos netos</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#007AFF] pt-1">
                {formatCurrency(netIncomeTotal, "income")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {filteredInvoices.filter(inv => inv.status === 'paid').length || 0} facturas cobradas
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de Gastos Totales */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#FFF5F5] p-2.5 rounded-full mr-3">
                <TrendingDown className="h-4 w-4 text-[#FF3B30]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gastos netos</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {formatCurrency(netExpenseTotal, "expense")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {filteredTransactions?.filter(t => t.type === 'expense').length || 0} gastos registrados
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de Balance Neto */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F5FFF7] p-2.5 rounded-full mr-3">
                <DollarSign className="h-4 w-4 text-[#34C759]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance neto</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#34C759] pt-1">
                {balance < 0 
                ? `-${Math.abs(balance).toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : balance.toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {balance >= 0 ? 'Balance positivo' : 'Balance negativo'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de Reparar si es necesario */}
        {filteredTransactions?.filter(t => t.type === 'income').length === 0 && filteredInvoices?.filter(inv => inv.status === 'paid').length > 0 ? (
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#FFF9F5] p-2.5 rounded-full mr-3">
                <AlertTriangle className="h-4 w-4 text-[#FF9500]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Acción necesaria</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 pb-3">
                Faltan ingresos por facturas cobradas
              </div>
              <button 
                className="text-sm px-3 py-1.5 bg-[#007AFF] text-white rounded-full hover:bg-[#0A84FF] transition-colors"
                onClick={handleRepairInvoiceTransactions}
                disabled={isRepairing}
              >
                {isRepairing ? 'Reparando...' : 'Reparar ahora'}
              </button>
            </div>
          </div>
        </div>
        ) : null}
      </div>
      
      {/* Alerta móvil si se necesita reparación - versión más compacta */}
      {filteredTransactions?.filter(t => t.type === 'income').length === 0 && filteredInvoices?.filter(inv => inv.status === 'paid').length > 0 ? (
        <div className="sm:hidden mx-1 mb-2 p-1.5 bg-amber-50 border border-amber-100 rounded-lg flex items-center">
          <AlertTriangle className="h-3 w-3 text-amber-500 mr-1.5 flex-shrink-0" />
          <span className="text-xs text-amber-700 flex-grow">Faltan ingresos</span>
          <button 
            className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full"
            onClick={handleRepairInvoiceTransactions}
            disabled={isRepairing}
          >
            {isRepairing ? 'Reparando...' : 'Reparar'}
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 scale-in bg-white shadow-sm overflow-hidden sm:mt-0 -mt-2">
        <div className="sm:pt-6 pt-4 pb-3 px-5">
          <Tabs 
            defaultValue="all" 
            value={currentTab}
            onValueChange={(value) => {
              setCurrentTab(value);
              // Limpiar los filtros de gastos al cambiar de pestaña
              if (value !== "expense") {
                setFilteredExpenseTransactions([]);
              }
              navigate(`/transactions?tab=${value}`, { replace: true });
            }}
            className="w-full"
          >
            <TabsList className="bg-[#F2F2F7] p-1 rounded-full border border-gray-200/60 mx-auto flex justify-center w-full max-w-sm shadow-inner">
              <TabsTrigger 
                className="rounded-full text-sm min-w-[80px] md:min-w-[100px] transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-[#000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#8E8E93] font-medium" 
                value="all"
              >
                Todos
              </TabsTrigger>
              <TabsTrigger 
                className="rounded-full text-sm min-w-[80px] md:min-w-[100px] transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-[#000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#8E8E93] font-medium" 
                value="income"
              >
                Ingresos
              </TabsTrigger>
              <TabsTrigger 
                className="rounded-full text-sm min-w-[80px] md:min-w-[100px] transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-[#000] data-[state=active]:shadow-sm data-[state=inactive]:text-[#8E8E93] font-medium" 
                value="expense"
              >
                Gastos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="px-5 sm:pb-5 pb-3">
          {/* Mostrar filtros de gastos cuando estamos en la pestaña de gastos y se ha activado el filtro */}
          {currentTab === "expense" && transactions && categories && (
            <div className="mb-6">
              <ExpenseFilters 
                transactions={transactions}
                categories={categories}
                showFilters={showExpenseFilters}
                onToggleFilters={() => setShowExpenseFilters(!showExpenseFilters)}
                onFilterChange={(filtered) => {
                  setFilteredExpenseTransactions(filtered);
                  setExpenseFiltersApplied(filtered.length > 0);
                }}
                onExportClick={handleExportFilteredExpenses}
              />
            </div>
          )}
          
          {/* Mostrar filtros de ingresos cuando estamos en la pestaña de ingresos y se ha activado el filtro */}
          {currentTab === "income" && transactions && categories && (
            <div className="mb-6">
              <IncomeFilters 
                transactions={transactions}
                categories={categories}
                showFilters={showIncomeFilters}
                onToggleFilters={() => setShowIncomeFilters(!showIncomeFilters)}
                onFilterChange={(filtered) => {
                  setFilteredIncomeTransactions(filtered);
                  setIncomeFiltersApplied(filtered.length > 0);
                }}
                onExportClick={handleExportFilteredIncome}
              />
            </div>
          )}
          
          <DataTable
            columns={columns}
            data={filteredTransactions || []}
            selectable={true}
            onRowSelectionChange={(selectedRows) => setSelectedTransactions(selectedRows)}
            onDeleteSelected={handleDeleteSelectedTransactions}
            onExportSelected={handleExportSelectedTransactions}
            searchPlaceholder="Buscar movimientos por descripción, importe o fecha..."
            actionButtons={currentTab === 'expense' ? (
              <>

                {/* Exportar todos los gastos */}
                <button 
                  className="text-sm px-2 sm:px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 flex items-center"
                  onClick={() => handleExportFilteredExpenses()}
                  disabled={transactions?.filter(t => t.type === 'expense').length === 0}
                  title="Exportar gastos a PDF"
                >
                  <FileDown className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {filteredExpenseTransactions.length > 0 ? 
                      `Exportar ${filteredExpenseTransactions.length} filtrados` : 
                      "Exportar todos los gastos"}
                  </span>
                  <span className="sm:hidden">PDF</span>
                </button>
                
                {/* Escanear gasto - Estilo Apple */}
                <button 
                  className="text-sm px-2 sm:px-3 py-1.5 bg-gradient-to-b from-[#007AFF] to-[#0063CC] text-white rounded-full hover:from-[#0A84FF] hover:to-[#0A6ADC] transition-all flex items-center shadow-sm relative overflow-hidden"
                  onClick={() => navigate("/documents/scan")}
                  title="Escanear gasto"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                  <ScanText className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Escanear gasto</span>
                  <span className="sm:hidden font-medium">Scan</span>
                </button>
                
                {/* Descargar originales */}
                <button 
                  className="text-sm px-2 sm:px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 flex items-center"
                  onClick={() => {
                    // Importamos dinámicamente para evitar problemas de dependencias cíclicas
                    import('@/lib/attachmentService').then(({ downloadExpenseOriginalsAsZip }) => {
                      // Filtrar los gastos que tienen documentos adjuntos
                      const expenses = (filteredExpenseTransactions.length > 0 ? filteredExpenseTransactions : transactions)
                        .filter(t => t.type === 'expense' && t.attachments && t.attachments.length > 0);
                      
                      if (expenses.length === 0) {
                        // Usamos toast desde el hook ya destructurado
                        toast({
                          title: "Sin documentos originales",
                          description: "No hay documentos originales disponibles para descargar.",
                          variant: "default"
                        });
                        return;
                      }
                      
                      downloadExpenseOriginalsAsZip(expenses as any, categories || []);
                    });
                  }}
                  title="Descargar documentos originales"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Descargar originales</span>
                  <span className="sm:hidden">Docs</span>
                </button>
                
                {/* Botón de filtro */}
                <button 
                  className={`text-sm px-2 sm:px-3 py-1.5 flex items-center rounded-full transition-colors ${
                    expenseFiltersApplied 
                    ? "bg-[#FF9F0A] text-white hover:bg-[#FF9F0A]/90" 
                    : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    // Asegurarse de que estamos en la pestaña de gastos
                    if (currentTab !== 'expense') {
                      setCurrentTab('expense');
                    }
                    // Mostrar u ocultar los filtros de gastos
                    setShowExpenseFilters(!showExpenseFilters);
                  }}
                  title={expenseFiltersApplied ? "Filtros personalizados aplicados" : "Filtrar gastos"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${expenseFiltersApplied ? '' : 'mr-1 sm:mr-2'}`}>
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
                  </svg>
                  <span className="hidden sm:inline">
                    {showExpenseFilters ? "Ocultar filtros" : "Filtrar"}
                  </span>
                  {expenseFiltersApplied && (
                    <span className="ml-1 bg-white rounded-full w-4 h-4 text-[10px] text-[#FF9F0A] font-bold flex items-center justify-center shadow-sm">
                      ✓
                    </span>
                  )}
                </button>
                
                {/* Se eliminó el registro rápido de gastos */}
              </>
            ) : currentTab === 'income' ? (
              <>
                {/* Crear factura - Estilo Apple */}
                <button 
                  className="text-sm px-2 sm:px-3 py-1.5 bg-gradient-to-b from-[#007AFF] to-[#0063CC] text-white rounded-full hover:from-[#0A84FF] hover:to-[#0A6ADC] transition-all flex items-center shadow-sm relative overflow-hidden"
                  onClick={() => navigate("/invoices/create")}
                  title="Crear factura"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity"></div>
                  <Receipt className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline font-medium">Crear factura</span>
                  <span className="sm:hidden font-medium">Factura</span>
                </button>

                {/* Exportar ingresos */}
                <button 
                  className="text-sm px-2 sm:px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 flex items-center"
                  onClick={() => handleExportFilteredIncome()}
                  disabled={transactions?.filter(t => t.type === 'income').length === 0}
                  title="Exportar ingresos a PDF"
                >
                  <FileDown className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {filteredIncomeTransactions.length > 0 ? 
                      `Exportar ${filteredIncomeTransactions.length} filtrados` : 
                      "Exportar todos los ingresos"}
                  </span>
                  <span className="sm:hidden">PDF</span>
                </button>
                
                {/* Botón de filtro para ingresos */}
                <button 
                  className={`text-sm px-2 sm:px-3 py-1.5 flex items-center rounded-full transition-colors ${
                    incomeFiltersApplied 
                    ? "bg-[#34C759] text-white hover:bg-[#34C759]/90" 
                    : "bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    // Asegurarse de que estamos en la pestaña de ingresos
                    if (currentTab !== 'income') {
                      setCurrentTab('income');
                    }
                    // Mostrar u ocultar los filtros de ingresos
                    setShowIncomeFilters(!showIncomeFilters);
                  }}
                  title={incomeFiltersApplied ? "Filtros personalizados aplicados" : "Filtrar ingresos"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${incomeFiltersApplied ? '' : 'mr-1 sm:mr-2'}`}>
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                  <span className="hidden sm:inline">
                    {showIncomeFilters ? "Ocultar filtros" : "Filtrar"}
                  </span>
                  {incomeFiltersApplied && (
                    <span className="ml-1 bg-white rounded-full w-4 h-4 text-[10px] text-[#34C759] font-bold flex items-center justify-center shadow-sm">
                      ✓
                    </span>
                  )}
                </button>
              </>
            ) : null}
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionList;