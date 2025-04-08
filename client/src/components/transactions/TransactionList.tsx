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
import { Eye, Edit, Trash2, Plus, Download, Upload, TrendingDown, ArrowUp, ScanText, Receipt, FileDown } from "lucide-react";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Transaction, Category } from "@/types";

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
  const [navigate, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("all");
  const [filteredExpenseTransactions, setFilteredExpenseTransactions] = useState<Transaction[]>([]);
  const [filteredIncomeTransactions, setFilteredIncomeTransactions] = useState<Transaction[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Obtener parámetros de la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab) {
      setCurrentTab(tab);
    }
  }, []);

  // Estados de las consultas
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: invoices } = useQuery({
    queryKey: ["/api/invoices"],
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
        const hasAttachments = transaction.attachments && transaction.attachments.length > 0;
        
        // Solo mostrar botón de descarga si es un gasto y tiene archivos adjuntos
        const showDownloadButton = transaction.type === 'expense' && hasAttachments;
        
        return (
          <div className="flex justify-end space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/transactions/edit/${transaction.id}`)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            {/* Mostrar botón de descarga inmediatamente después del botón de editar */}
            {showDownloadButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  // Importamos dinámicamente para evitar problemas de dependencias cíclicas
                  import('@/lib/attachmentService').then(({ downloadExpenseOriginal }) => {
                    const category = getCategory(transaction.categoryId) || { name: "Sin categoría", icon: "folder", color: "#ccc" };
                    // Para simplificar, descargamos el primer adjunto
                    // En una mejora futura podríamos mostrar un menú desplegable si hay varios
                    if (transaction.attachments && transaction.attachments.length > 0) {
                      downloadExpenseOriginal(transaction.attachments[0], transaction as any, category);
                    }
                  });
                }}
                title="Descargar original"
              >
                <Download className="h-4 w-4" />
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

  // Calculate totals for the summary cards
  // Ingresos de transacciones
  const transactionIncomeTotal = !isLoading && Array.isArray(transactions)
    ? transactions
        .filter((t: Transaction) => t.type === "income")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
  
  // Ingresos de facturas pagadas  
  const invoiceIncomeTotal = !isLoading && Array.isArray(invoices)
    ? invoices
        .filter((inv: Invoice) => inv.status === "paid")
        .reduce((sum: number, inv: Invoice) => sum + Number(inv.total), 0)
    : 0;
  
  // Total combinado de ingresos (transacciones + facturas)
  const incomeTotal = transactionIncomeTotal + invoiceIncomeTotal;
    
  const expenseTotal = !isLoading && Array.isArray(transactions)
    ? transactions
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
    
  const balance = incomeTotal - expenseTotal;

  return (
    <div className="space-y-6 fade-in">
      {/* Cabecera estilo Apple consistente con la sección de facturas */}
      <div className="section-header mx-4 md:ml-0 fade-in mb-6">
        <div className="flex items-center">
          <div className="bg-[#E9F8FB] p-3 rounded-full mr-3 self-start mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y1="16" />
            </svg>
          </div>
          <div className="flex-grow my-auto">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none mb-1 mt-2">Ingresos y Gastos</h2>
            <p className="text-sm text-gray-500">Visualiza y gestiona todos tus movimientos económicos</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Tarjeta de Ingresos Totales - Estilo Apple moderno con gradiente e iconos */}
        <div className="scale-in dashboard-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#34C759] to-[#30D158]"></div>
          <div className="p-6">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#34C759]/10 rounded-full flex items-center justify-center mr-3">
                <ArrowUp className="h-5 w-5 text-[#34C759]" />
              </div>
              <h3 className="text-base font-medium text-[#1D1D1F]">Ingresos totales</h3>
            </div>
            
            <p className="text-3xl font-semibold text-[#1D1D1F] mb-5 pl-1">
              {formatCurrency(incomeTotal, "income")}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mt-auto">
              <div className="flex flex-col p-3 bg-[#34C759]/5 border border-[#34C759]/10 rounded-xl transition-all hover:bg-[#34C759]/10">
                <div className="flex items-center mb-1">
                  <Receipt className="h-3.5 w-3.5 text-[#34C759] mr-1.5" />
                  <span className="text-xs text-[#34C759]">Facturas</span>
                </div>
                <span className="text-sm font-medium text-[#1D1D1F]">{formatCurrency(invoiceIncomeTotal, "income")}</span>
              </div>
              <div className="flex flex-col p-3 bg-[#34C759]/5 border border-[#34C759]/10 rounded-xl transition-all hover:bg-[#34C759]/10">
                <div className="flex items-center mb-1">
                  <Download className="h-3.5 w-3.5 text-[#34C759] mr-1.5" />
                  <span className="text-xs text-[#34C759]">Transacciones</span>
                </div>
                <span className="text-sm font-medium text-[#1D1D1F]">{formatCurrency(transactionIncomeTotal, "income")}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de Gastos Totales - Estilo Apple moderno con gradiente e iconos */}
        <div className="scale-in dashboard-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FF3B30] to-[#FF453A]"></div>
          <div className="p-6">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#FF3B30]/10 rounded-full flex items-center justify-center mr-3">
                <TrendingDown className="h-5 w-5 text-[#FF3B30]" />
              </div>
              <h3 className="text-base font-medium text-[#1D1D1F]">Gastos totales</h3>
            </div>
            
            <p className="text-3xl font-semibold text-[#1D1D1F] mb-5 pl-1">
              {formatCurrency(expenseTotal, "expense")}
            </p>
            
            <div className="p-3 bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-xl flex items-center justify-between hover:bg-[#FF3B30]/10 transition-all">
              <div className="flex items-center">
                <ScanText className="h-4 w-4 text-[#FF3B30] mr-2" />
                <span className="text-sm text-[#1D1D1F]">
                  {transactions?.filter(t => t.type === 'expense').length || 0} gastos registrados
                </span>
              </div>
              <button 
                className="text-xs px-2 py-1 bg-[#FF3B30]/10 text-[#FF3B30] rounded-full"
                onClick={() => navigate("/documents/scan")}
              >
                Escanear
              </button>
            </div>
          </div>
        </div>
        
        {/* Tarjeta de Balance Neto - Con color azul e icono de cerdito */}
        <div className="scale-in dashboard-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0070F3] to-[#39F]"></div>
          <div className="p-6">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-[#0070F3]/10 rounded-full flex items-center justify-center mr-3">
                {/* Icono de cerdito */}
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0070F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"/>
                  <path d="M2 9v1c0 1.1.9 2 2 2h1"/>
                  <path d="M16 11h0"/>
                </svg>
              </div>
              <h3 className="text-base font-medium text-[#1D1D1F]">Balance neto</h3>
            </div>
            
            <p className="text-3xl font-semibold text-[#0070F3] mb-5 pl-1">
              {formatCurrency(balance, balance >= 0 ? "income" : "expense")}
            </p>
            
            <div className="p-3 bg-[#0070F3]/5 border border-[#0070F3]/10 hover:bg-[#0070F3]/10 rounded-xl flex items-center justify-center transition-all">
              <div className="flex items-center">
                {balance >= 0 ? (
                  <>
                    <svg className="h-4 w-4 text-[#0070F3] mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2m-1 5v4H7v2h4v4h2v-4h4v-2h-4V7h-2z" fill="currentColor"/>
                    </svg>
                    <span className="text-sm font-medium text-[#0070F3]">
                      Balance positivo: {Math.round(balance/incomeTotal*100)}% de ingresos
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-[#0070F3] mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2m-1 5v8h2V7h-2z" fill="currentColor"/>
                    </svg>
                    <span className="text-sm font-medium text-[#0070F3]">
                      Balance negativo: {Math.abs(Math.round(balance/expenseTotal*100))}% sobre ingresos
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-gray-200/50 scale-in">
        <div className="p-5 pb-0">
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
            <TabsList className="bg-gray-100 p-1 rounded-full border border-gray-200/50">
              <TabsTrigger className="rounded-full text-sm data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm" value="all">Todos</TabsTrigger>
              <TabsTrigger className="rounded-full text-sm data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm" value="income">Ingresos</TabsTrigger>
              <TabsTrigger className="rounded-full text-sm data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm" value="expense">Gastos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-5">
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
            searchPlaceholder="Buscar movimientos por descripción, importe o fecha..."
            actionButtons={currentTab === 'expense' ? (
              <>

                {/* Nuevo gasto */}
                <button 
                  className="button-apple-primary button-apple-sm flex items-center"
                  onClick={() => navigate("/transactions/new?type=expense")}
                >
                  <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Nuevo gasto</span>
                  <span className="sm:hidden">Gasto</span>
                </button>
                
                {/* Escanear gasto */}
                <button 
                  className="button-apple button-apple-sm flex items-center"
                  onClick={() => navigate("/documents/scan")}
                >
                  <ScanText className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Escanear gasto</span>
                  <span className="sm:hidden">Escanear</span>
                </button>
                
                {/* Descargar originales */}
                <button 
                  className="button-apple button-apple-sm flex items-center"
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
                
                {/* Exportar todos los gastos */}
                <button 
                  className="button-apple-secondary button-apple-sm flex items-center"
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
              </>
            ) : currentTab === 'income' ? (
              <>
                {/* Nuevo ingreso */}
                <button 
                  className="button-apple-primary button-apple-sm flex items-center"
                  onClick={() => navigate("/transactions/new?type=income")}
                >
                  <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Nuevo ingreso</span>
                  <span className="sm:hidden">Ingreso</span>
                </button>

                {/* Crear factura */}
                <button 
                  className="button-apple button-apple-sm flex items-center"
                  onClick={() => navigate("/invoices/new")}
                >
                  <Receipt className="h-4 w-4 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Crear factura</span>
                  <span className="sm:hidden">Factura</span>
                </button>

                {/* Exportar ingresos */}
                <button 
                  className="button-apple-secondary button-apple-sm flex items-center"
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