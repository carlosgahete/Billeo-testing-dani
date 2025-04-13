import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
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

// Mantenemos la definición Invoice propia de este componente
interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "pending";
  subtotal: string;
  tax: string;
  total: string;
  additionalTaxes?: string;
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
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
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
  const [currentTab, setCurrentTab] = useState("all");
  const [filteredExpenseTransactions, setFilteredExpenseTransactions] = useState<Transaction[]>([]);
  const [filteredIncomeTransactions, setFilteredIncomeTransactions] = useState<Transaction[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [isRepairing, setIsRepairing] = useState(false);
  
  // Estado para detectar dispositivos móviles
  const [isMobile, setIsMobile] = useState(false);
  
  // Efecto para detectar si estamos en un dispositivo móvil
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Comprobación inicial
    checkIfMobile();
    
    // Escuchar cambios de tamaño de ventana
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Eliminar múltiples transacciones
  const handleDeleteSelectedTransactions = async (transactions: Transaction[]) => {
    if (transactions.length === 0) return;
    
    // Mostrar mensaje de carga
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
      
      // Actualizar datos inmediatamente
      await Promise.all([
        refetchTransactions(),
        refetchInvoices(),
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] })
      ]);
      
    } catch (error: any) {
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

  // Estados de las consultas
  const { data: transactions, isLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/transactions"],
    refetchOnWindowFocus: true, // Recargar datos cuando la ventana recupera el foco
    staleTime: 0, // Considerar datos obsoletos inmediatamente
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ["/api/invoices"],
    refetchOnWindowFocus: true, // Recargar datos cuando la ventana recupera el foco
  });

  // Función para determinar qué datos mostrar según los filtros activos
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    
    // Si estamos en la pestaña de gastos y hay filtros aplicados
    if (currentTab === "expense" && filteredExpenseTransactions.length > 0) {
      return filteredExpenseTransactions;
    }
    // Si estamos en la pestaña de ingresos y hay filtros aplicados
    else if (currentTab === "income" && filteredIncomeTransactions.length > 0) {
      return filteredIncomeTransactions;
    }
    // Si no hay filtros, filtramos por el tipo de la pestaña seleccionada
    else if (currentTab !== "all") {
      return transactions.filter((t: Transaction) => t.type === currentTab);
    }
    // En la pestaña "todos", mostramos todas las transacciones
    return transactions;
  }, [transactions, currentTab, filteredExpenseTransactions, filteredIncomeTransactions]);

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
        
        // Depuración para ver el estado de los attachments
        console.log('TransactionID:', transaction.id, 'Type:', transaction.type, 'Tiene attachments:', !!transaction.attachments, transaction.attachments);
        
        return (
          <div className="flex justify-end space-x-1">
            {/* Botones de visualización y descarga para gastos con adjuntos */}
            {transaction.type === 'expense' && transaction.attachments && transaction.attachments.length > 0 && (
              <>
                {/* Botón de visualización */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    import('@/lib/attachmentService').then(({ viewExpenseOriginal }) => {
                      const category = getCategory(transaction.categoryId) || { name: "Sin categoría", icon: "folder", color: "#ccc" };
                      viewExpenseOriginal(transaction.attachments[0], transaction as any, category);
                    });
                  }}
                  title="Ver documento"
                  className="text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                
                {/* Botón de descarga */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    import('@/lib/attachmentService').then(({ downloadExpenseOriginal }) => {
                      const category = getCategory(transaction.categoryId) || { name: "Sin categoría", icon: "folder", color: "#ccc" };
                      downloadExpenseOriginal(transaction.attachments[0], transaction as any, category);
                    });
                  }}
                  title="Descargar original"
                  className="text-green-700 hover:text-green-800 hover:bg-green-50"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/transactions/edit/${transaction.id}`)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
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

  // Calculate totals for the summary cards
  // Ingresos de transacciones
  const transactionIncomeTotal = !isLoading && Array.isArray(transactions)
    ? transactions
        .filter((t: Transaction) => t.type === "income")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
  
  // Ingresos de facturas pagadas - para mostrar en el panel de facturas, pero no para el total
  const invoiceIncomeTotal = !isLoading && Array.isArray(invoices)
    ? invoices
        .filter((inv: Invoice) => inv.status === "paid")
        .reduce((sum: number, inv: Invoice) => sum + Number(inv.total), 0)
    : 0;
  
  // Si las transacciones están vacías (0), usamos el total de facturas pagadas
  // Este cambio es necesario porque las facturas pagadas deberían generar transacciones automáticamente,
  // pero parece que esto no está ocurriendo correctamente
  console.log("Cálculo de ingresos totales:", {
    transactionIncomeTotal,
    invoiceIncomeTotal
  });
  
  const incomeTotal = transactionIncomeTotal > 0 ? transactionIncomeTotal : invoiceIncomeTotal;
    
  const expenseTotal = !isLoading && Array.isArray(transactions)
    ? transactions
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
    
  const balance = incomeTotal - expenseTotal;

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
    <div className="space-y-6 fade-in">
      {/* Cabecera estilo Apple alineada con menú hamburguesa */}
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
        
        {/* Espacio para mantener la alineación */}
        <div className="mr-6">
          {/* Botón eliminado */}
        </div>
      </div>

      {/* Resumen para dispositivos móviles - Minimalista */}
      <div className="flex sm:hidden justify-between items-center mb-4 px-2">
        <div className="text-center flex-1">
          <p className="text-xs text-gray-500">Ingresos</p>
          <p className="text-base font-medium text-[#007AFF]">{formatCurrency(incomeTotal, "income")}</p>
        </div>
        <div className="mx-2 h-8 border-r border-gray-100"></div>
        <div className="text-center flex-1">
          <p className="text-xs text-gray-500">Gastos</p>
          <p className="text-base font-medium text-[#FF3B30]">{formatCurrency(expenseTotal, "expense")}</p>
        </div>
        <div className="mx-2 h-8 border-r border-gray-100"></div>
        <div className="text-center flex-1">
          <p className="text-xs text-gray-500">Balance</p>
          <p className="text-base font-medium text-[#34C759]">
            {balance < 0 
              ? `-${Math.abs(balance).toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`
              : balance.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
            }
          </p>
        </div>
      </div>
      
      {/* Tarjetas de resumen estilo Apple - Solo visibles en desktop */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 mx-2">
        {/* Tarjeta de Ingresos Totales */}
        <div className="dashboard-card fade-in">
          <div className="p-5">
            <div className="flex items-center mb-4">
              <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
                <ArrowUp className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingresos totales</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#007AFF] pt-1">
                {formatCurrency(incomeTotal, "income")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {invoices?.filter(inv => inv.status === 'paid').length || 0} facturas cobradas
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
                <p className="text-sm text-gray-600">Gastos totales</p>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-[#FF3B30] pt-1">
                {formatCurrency(expenseTotal, "expense")}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {transactions?.filter(t => t.type === 'expense').length || 0} gastos registrados
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
        {transactions?.filter(t => t.type === 'income').length === 0 && invoices?.filter(inv => inv.status === 'paid').length > 0 ? (
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
      
      {/* Alerta móvil si se necesita reparación */}
      {transactions?.filter(t => t.type === 'income').length === 0 && invoices?.filter(inv => inv.status === 'paid').length > 0 ? (
        <div className="sm:hidden mx-2 mb-4 p-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2 flex-shrink-0" />
          <span className="text-xs text-amber-700 flex-grow">Faltan ingresos por facturas cobradas</span>
          <button 
            className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full"
            onClick={handleRepairInvoiceTransactions}
            disabled={isRepairing}
          >
            {isRepairing ? 'Reparando...' : 'Reparar'}
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 scale-in bg-white shadow-sm overflow-hidden">
        <div className="pt-6 pb-3 px-5">
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
        <div className="px-5 pb-5">
          {/* Mostrar filtros de gastos cuando estamos en la pestaña de gastos */}
          {currentTab === "expense" && transactions && categories && (
            <div className="mb-6">
              <ExpenseFilters 
                transactions={transactions}
                categories={categories}
                onFilterChange={setFilteredExpenseTransactions}
                onExportClick={handleExportFilteredExpenses}
              />
            </div>
          )}
          
          {/* Mostrar filtros de ingresos cuando estamos en la pestaña de ingresos */}
          {currentTab === "income" && transactions && categories && (
            <div className="mb-6">
              <IncomeFilters 
                transactions={transactions}
                categories={categories}
                onFilterChange={setFilteredIncomeTransactions}
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
                  className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 flex items-center"
                  onClick={() => handleExportFilteredExpenses()}
                  disabled={transactions?.filter(t => t.type === 'expense').length === 0}
                  title={filteredExpenseTransactions.length > 0 ? 
                    `Exportar ${filteredExpenseTransactions.length} gastos filtrados` : 
                    `Exportar todos los gastos (${transactions?.filter(t => t.type === 'expense').length || 0})`}
                >
                  <FileDown className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {filteredExpenseTransactions.length > 0 ? 
                      `Exportar ${filteredExpenseTransactions.length} filtrados` : 
                      "Exportar todos los gastos"}
                  </span>
                  <span className="sm:hidden">Exportar</span>
                </button>
                
                {/* Escanear gasto */}
                <button 
                  className="text-sm px-3 py-1.5 bg-[#007AFF] text-white rounded-full hover:bg-[#0A84FF] transition-colors flex items-center"
                  onClick={() => navigate("/documents/scan")}
                >
                  <ScanText className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Escanear gasto</span>
                  <span className="sm:hidden">Escanear</span>
                </button>
                
                {/* Descargar originales */}
                <button 
                  className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 flex items-center"
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
                  title="Descargar documentos originales de los gastos"
                >
                  <Download className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Descargar originales</span>
                  <span className="sm:hidden">Originales</span>
                </button>
                
                {/* Se eliminó el registro rápido de gastos */}
              </>
            ) : currentTab === 'income' ? (
              <>
                {/* Crear factura */}
                <button 
                  className="text-sm px-3 py-1.5 bg-[#007AFF] text-white rounded-full hover:bg-[#0A84FF] transition-colors flex items-center"
                  onClick={() => navigate("/invoices/create")}
                >
                  <Receipt className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Crear factura</span>
                  <span className="sm:hidden">Factura</span>
                </button>

                {/* Exportar ingresos */}
                <button 
                  className="text-sm px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 flex items-center"
                  onClick={() => handleExportFilteredIncome()}
                  disabled={transactions?.filter(t => t.type === 'income').length === 0}
                  title={filteredIncomeTransactions.length > 0 ? 
                    `Exportar ${filteredIncomeTransactions.length} ingresos filtrados` : 
                    `Exportar todos los ingresos (${transactions?.filter(t => t.type === 'income').length || 0})`}
                >
                  <FileDown className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {filteredIncomeTransactions.length > 0 ? 
                      `Exportar ${filteredIncomeTransactions.length} filtrados` : 
                      "Exportar todos los ingresos"}
                  </span>
                  <span className="sm:hidden">Exportar</span>
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