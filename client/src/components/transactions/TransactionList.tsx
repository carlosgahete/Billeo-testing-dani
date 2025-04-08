import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
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
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente el movimiento "{description}" y no se puede deshacer.
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
  // Ya no utilizamos el diálogo de importación de CSV
  
  // Obtener tab de los parámetros de URL
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const tabParam = urlParams.get('tab');
  const initialTab = tabParam === 'income' || tabParam === 'expense' ? tabParam : 'all';
  
  const [currentTab, setCurrentTab] = useState<string>(initialTab);
  const [filteredExpenseTransactions, setFilteredExpenseTransactions] = useState<Transaction[]>([]);
  const [filteredIncomeTransactions, setFilteredIncomeTransactions] = useState<Transaction[]>([]);

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 5000, // Actualización automática cada 5 segundos
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Obtener facturas para calcular ingresos correctamente
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const isLoading = transactionsLoading || categoriesLoading || invoicesLoading;

  const getCategory = (categoryId: number | null) => {
    if (!categoryId || !categories || !Array.isArray(categories)) {
      return { name: "Sin categoría", icon: "📂", color: "#999999" };
    }
    const category = categories.find((c: Category) => c.id === categoryId);
    return category 
      ? { name: category.name, icon: category.icon || "📂", color: category.color }
      : { name: "Sin categoría", icon: "📂", color: "#999999" };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };

  const formatCurrency = (value: number, type: string) => {
    const formattedValue = new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(Math.abs(Number(value)));
    
    return formattedValue;
  };

  // La función de importación CSV ha sido eliminada
  
  // Función para exportar los gastos filtrados
  const handleExportFilteredExpenses = async () => {
    try {
      // Obtenemos los gastos que vamos a exportar
      // Si hay filtros aplicados, usamos esos gastos filtrados
      // Si no hay filtros, usamos todos los gastos de transacciones
      const expensesToExport = filteredExpenseTransactions.length > 0
        ? filteredExpenseTransactions
        : transactions?.filter(t => t.type === 'expense') || [];
      
      if (expensesToExport.length === 0) {
        toast({
          title: "No hay gastos",
          description: "No se encontraron gastos para exportar.",
          variant: "destructive",
        });
        return;
      }
      
      // Mostrar un mensaje descriptivo dependiendo si son gastos filtrados o todos
      toast({
        title: "Preparando gastos",
        description: filteredExpenseTransactions.length > 0
          ? `Generando informe de ${filteredExpenseTransactions.length} gastos filtrados...`
          : `Generando informe de todos los gastos (${expensesToExport.length})...`,
      });
      
      // Crear un contenedor para mostrar progreso
      const progressContainer = document.createElement('div');
      progressContainer.id = 'export-progress-container';
      progressContainer.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      progressContainer.style.backdropFilter = 'blur(4px)';
      
      const progressCard = document.createElement('div');
      progressCard.className = 'bg-white rounded-xl shadow-xl p-6 max-w-md w-full';
      
      progressCard.innerHTML = `
        <h2 class="text-xl font-medium text-center mb-4">Generando informe de gastos</h2>
        <div class="mb-4">
          <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div id="progress-bar" class="h-full bg-blue-600 rounded-full" style="width: 0%"></div>
          </div>
          <p id="progress-text" class="text-sm text-center mt-2">Preparando informe...</p>
        </div>
      `;
      
      progressContainer.appendChild(progressCard);
      document.body.appendChild(progressContainer);
      
      const progressBar = document.getElementById('progress-bar');
      const progressText = document.getElementById('progress-text');
      
      // Función para actualizar el progreso
      const updateProgress = (percentage: number, message: string) => {
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = message;
      };
      
      try {
        updateProgress(20, "Obteniendo datos de categorías...");
        
        // Crear un PDF para la exportación
        const doc = new jsPDF();
        
        // Añadir título y fecha
        const currentDate = new Date().toLocaleDateString('es-ES');
        doc.setFontSize(18);
        doc.text("Informe de Gastos", 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generado el ${currentDate}`, 105, 22, { align: 'center' });
        
        updateProgress(40, "Procesando datos de gastos...");
        
        // Preparar los datos para la tabla
        const tableData = expensesToExport.map(expense => {
          // Obtener información de la categoría
          const category = getCategory(expense.categoryId);
          
          // Formatear datos
          const formattedDate = formatDate(expense.date);
          const formattedAmount = formatCurrency(expense.amount, 'expense');
          
          // Detectar si hay información del proveedor en las notas
          let providerName = "No especificado";
          if (expense.notes) {
            const providerMatch = expense.notes.match(/🏢 Proveedor:\s*([^\n]+)/);
            if (providerMatch && providerMatch[1] && providerMatch[1] !== 'No detectado') {
              providerName = providerMatch[1].trim();
            }
          }
          
          return [
            formattedDate,
            expense.title || providerName,
            expense.description,
            category.name,
            formattedAmount
          ];
        });
        
        updateProgress(70, "Generando PDF...");
        
        // Calcular total de gastos
        const totalAmount = expensesToExport.reduce((sum, expense) => sum + Number(expense.amount), 0);
        const formattedTotal = formatCurrency(totalAmount, 'expense');
        
        // Añadir tabla al PDF
        autoTable(doc, {
          head: [['Fecha', 'Proveedor', 'Descripción', 'Categoría', 'Importe']],
          body: tableData,
          foot: [['Total', '', '', '', formattedTotal]],
          theme: 'striped',
          headStyles: { fillColor: [170, 0, 0], textColor: [255, 255, 255] },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
          margin: { top: 30 },
        });
        
        updateProgress(90, "Finalizando documento...");
        
        // Añadir pie de página
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.text(`Página ${i} de ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
        }
        
        // Generar nombre de archivo con el tipo apropiado (filtrados o todos)
        const fileName = filteredExpenseTransactions.length > 0
          ? `Gastos_Filtrados_${new Date().toISOString().split('T')[0]}.pdf`
          : `Todos_Los_Gastos_${new Date().toISOString().split('T')[0]}.pdf`;
        
        updateProgress(100, "¡Informe listo para descargar!");
        
        // Limpiar modal de progreso
        setTimeout(() => {
          document.body.removeChild(progressContainer);
          
          // Descargar PDF
          doc.save(fileName);
          
          toast({
            title: "Informe generado",
            description: filteredExpenseTransactions.length > 0
              ? "El informe de gastos filtrados ha sido generado y descargado exitosamente."
              : "El informe con todos los gastos ha sido generado y descargado exitosamente.",
          });
        }, 1000);
        
      } catch (error) {
        // En caso de error, eliminar modal de progreso
        if (document.body.contains(progressContainer)) {
          document.body.removeChild(progressContainer);
        }
        throw error;
      }
    } catch (error: any) {
      console.error("Error al exportar gastos filtrados:", error);
      
      toast({
        title: "Error",
        description: `No se pudo generar el informe: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Función para exportar los ingresos filtrados
  const handleExportFilteredIncome = async () => {
    try {
      // Obtenemos los ingresos que vamos a exportar
      const incomeToExport = filteredIncomeTransactions.length > 0
        ? filteredIncomeTransactions
        : transactions?.filter(t => t.type === 'income') || [];
      
      if (incomeToExport.length === 0) {
        toast({
          title: "No hay ingresos",
          description: "No se encontraron ingresos para exportar.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Preparando ingresos",
        description: filteredIncomeTransactions.length > 0
          ? `Generando informe de ${filteredIncomeTransactions.length} ingresos filtrados...`
          : `Generando informe de todos los ingresos (${incomeToExport.length})...`,
      });
      
      // Similar a la exportación de gastos, pero con colores verdes en lugar de rojos
      const doc = new jsPDF();
      
      // Añadir título y fecha
      const currentDate = new Date().toLocaleDateString('es-ES');
      doc.setFontSize(18);
      doc.text("Informe de Ingresos", 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generado el ${currentDate}`, 105, 22, { align: 'center' });
      
      // Preparar los datos para la tabla
      const tableData = incomeToExport.map(income => {
        const category = getCategory(income.categoryId);
        const formattedDate = formatDate(income.date);
        const formattedAmount = formatCurrency(income.amount, 'income');
        
        return [
          formattedDate,
          income.title || 'No especificado',
          income.description,
          category.name,
          formattedAmount
        ];
      });
      
      // Calcular total de ingresos
      const totalAmount = incomeToExport.reduce((sum, income) => sum + Number(income.amount), 0);
      const formattedTotal = formatCurrency(totalAmount, 'income');
      
      // Añadir tabla al PDF con colores verdes
      autoTable(doc, {
        head: [['Fecha', 'Cliente', 'Descripción', 'Categoría', 'Importe']],
        body: tableData,
        foot: [['Total', '', '', '', formattedTotal]],
        theme: 'striped',
        headStyles: { fillColor: [0, 150, 50], textColor: [255, 255, 255] },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
        margin: { top: 30 },
      });
      
      // Añadir pie de página
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
      }
      
      // Generar nombre de archivo
      const fileName = filteredIncomeTransactions.length > 0
        ? `Ingresos_Filtrados_${new Date().toISOString().split('T')[0]}.pdf`
        : `Todos_Los_Ingresos_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Descargar PDF
      doc.save(fileName);
      
      toast({
        title: "Informe generado",
        description: filteredIncomeTransactions.length > 0
          ? "El informe de ingresos filtrados ha sido generado y descargado exitosamente."
          : "El informe con todos los ingresos ha sido generado y descargado exitosamente.",
      });
      
    } catch (error: any) {
      console.error("Error al exportar ingresos filtrados:", error);
      
      toast({
        title: "Error",
        description: `No se pudo generar el informe: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Manejo de transacciones filtradas
  const getFilteredTransactions = () => {
    if (!Array.isArray(transactions)) return [];
    
    // Si estamos en la pestaña correspondiente y hay filtros aplicados, usar las transacciones filtradas
    if (currentTab === "expense" && filteredExpenseTransactions.length > 0) {
      return filteredExpenseTransactions;
    } else if (currentTab === "income" && filteredIncomeTransactions.length > 0) {
      return filteredIncomeTransactions;
    }
    
    // En caso contrario, aplicar el filtro por tipo según la pestaña seleccionada
    return transactions.filter((transaction: Transaction) => {
      if (currentTab === "all") return true;
      return transaction.type === currentTab;
    });
  };
  
  const filteredTransactions = getFilteredTransactions();

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.getValue("date")),
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => {
        // Obtener el título (si existe), la descripción y las notas
        const title = row.original.title as string;
        const description = row.getValue("description") as string;
        const notes = row.original.notes as string || '';
        const type = row.original.type as string;
        const attachments = row.original.attachments as string[] || [];
        
        // Función para descargar archivos adjuntos
        const handleDownloadAttachment = (filename: string) => {
          window.open(`/api/download/${filename}`, '_blank');
        };
        
        // Renderizar archivos adjuntos
        const renderAttachments = () => {
          if (!attachments || attachments.length === 0) return null;
          
          return (
            <div className="mt-1 flex flex-wrap gap-1">
              {attachments.map((filename, index) => {
                // Determinar el tipo de archivo para mostrar el icono adecuado
                const ext = filename.split('.').pop()?.toLowerCase() || '';
                let icon = '📄'; // Documento genérico por defecto
                
                if (['pdf'].includes(ext)) icon = '📑';
                else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) icon = '🖼️';
                else if (['xls', 'xlsx', 'csv'].includes(ext)) icon = '📊';
                else if (['doc', 'docx', 'txt'].includes(ext)) icon = '📝';
                
                return (
                  <button
                    key={index}
                    onClick={() => handleDownloadAttachment(filename)}
                    className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs hover:bg-blue-100"
                    title={`Descargar ${filename}`}
                  >
                    <span className="mr-1">{icon}</span>
                    <span>Descargar</span>
                  </button>
                );
              })}
            </div>
          );
        };
        
        // Si hay un título definido, mostrarlo como título principal
        if (title) {
          return (
            <div className="max-w-[250px]">
              <div className="font-medium text-gray-800">{title}</div>
              <div className="text-xs text-gray-500 truncate">{description}</div>
              {renderAttachments()}
            </div>
          );
        }
        
        // Si no hay título pero es un gasto, intentamos detectar el proveedor en las notas
        if (type === 'expense') {
          // Buscar el proveedor en las notas (generadas por el escaneo de documentos)
          const providerMatch = notes.match(/🏢 Proveedor:\s*([^\n]+)/);
          
          if (providerMatch && providerMatch[1] && providerMatch[1] !== 'No detectado') {
            // Si encontramos un proveedor, mostramos el nombre como título y la descripción como subtítulo
            const providerName = providerMatch[1].trim();
            return (
              <div className="max-w-[250px]">
                <div className="font-medium text-gray-800">{providerName}</div>
                <div className="text-xs text-gray-500 truncate">{description}</div>
                {renderAttachments()}
              </div>
            );
          }
        }
        
        // Si no hay título ni proveedor, mostrar solo la descripción
        return (
          <div className="max-w-[250px]">
            <div className="max-w-[200px] truncate font-medium text-gray-800">
              {description}
            </div>
            {renderAttachments()}
          </div>
        );
      },
    },
    {
      accessorKey: "categoryId",
      header: "Categoría",
      cell: ({ row }) => {
        const category = getCategory(row.getValue("categoryId"));
        return (
          <div className="flex items-center">
            <span className="mr-2 text-xl" style={{ color: category.color }}>{category.icon}</span>
            <span>{category.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Método de pago",
      cell: ({ row }) => <PaymentMethodBadge method={row.getValue("paymentMethod")} />,
    },
    {
      accessorKey: "amount",
      header: "Base Imponible",
      cell: ({ row }) => {
        const type = row.original.type;
        const amount = row.getValue<number>("amount");
        
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
                    const category = getCategory(transaction.categoryId);
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
      <div className="relative mb-8 pb-6 border-b border-gray-100 after:absolute after:bottom-0 after:left-0 after:w-24 after:h-1 after:bg-gradient-to-r after:from-[#34C759] after:to-[#30D158]">
        <div className="flex flex-row justify-between items-center">
          <div className="max-w-[70%]">
            <div className="flex items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#34C759] to-[#30D158] shadow-md mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </div>
              <h1 className="text-[28px] font-medium text-[#1D1D1F] tracking-tight">
                Ingresos y Gastos
              </h1>
            </div>
            <p className="text-[#6E6E73] text-sm mt-2 ml-14">
              Visualiza y gestiona todos tus movimientos económicos
            </p>
          </div>
          <div className="ml-auto">
            {/* Área reservada para controles futuros */}
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
        
        {/* Tarjeta de Balance Neto - Estilo Apple moderno con gradiente e iconos */}
        <div className="scale-in dashboard-card relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
            balance >= 0 
              ? "from-[#34C759] to-[#30D158]" 
              : "from-[#FF3B30] to-[#FF453A]"
          }`}></div>
          <div className="p-6">
            <div className="flex items-center mb-3">
              <div className={`w-10 h-10 ${
                balance >= 0 
                  ? "bg-[#34C759]/10" 
                  : "bg-[#FF3B30]/10"
              } rounded-full flex items-center justify-center mr-3`}>
                {balance >= 0 ? (
                  <ArrowUp className={`h-5 w-5 ${
                    balance >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
                  }`} />
                ) : (
                  <TrendingDown className={`h-5 w-5 ${
                    balance >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
                  }`} />
                )}
              </div>
              <h3 className="text-base font-medium text-[#1D1D1F]">Balance neto</h3>
            </div>
            
            <p className={`text-3xl font-semibold ${
              balance >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"
            } mb-5 pl-1`}>
              {formatCurrency(balance, balance >= 0 ? "income" : "expense")}
            </p>
            
            <div className={`p-3 ${
              balance >= 0 
                ? "bg-[#34C759]/5 border border-[#34C759]/10 hover:bg-[#34C759]/10" 
                : "bg-[#FF3B30]/5 border border-[#FF3B30]/10 hover:bg-[#FF3B30]/10"
            } rounded-xl flex items-center justify-center transition-all`}>
              <div className="flex items-center">
                {balance >= 0 ? (
                  <>
                    <svg className="h-4 w-4 text-[#34C759] mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.5839C12.7674 22.1952 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2462 3.61096 17.4371C2.43727 15.628 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13643 4.39828 5.49718C5.79935 3.85793 7.69279 2.71549 9.79619 2.24025C11.8996 1.76502 14.1003 1.98245 16.07 2.86011" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={`text-sm font-medium text-[#34C759]`}>
                      Balance positivo: {Math.round(balance/incomeTotal*100)}% de ingresos
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-[#FF3B30] mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 9V13M12 17H12.01M7.86489 2H16.1351C17.1587 2 18.1055 2.31424 18.8862 2.89461C19.6669 3.47498 20.241 4.29183 20.5303 5.22862L22.961 13.632C23.1232 14.1424 23.1812 14.6797 23.1316 15.212C23.0819 15.7442 22.9259 16.2595 22.6747 16.7298C22.4235 17.2001 22.0823 17.6154 21.6723 17.9463C21.2622 18.2772 20.792 18.5163 20.291 18.6453L13.9559 20.2C13.3254 20.3564 12.6647 20.3564 12.0342 20.2L5.70896 18.6453C5.20798 18.5163 4.73773 18.2772 4.32766 17.9463C3.9176 17.6154 3.57645 17.2001 3.32524 16.7298C3.07404 16.2595 2.91805 15.7442 2.86839 15.212C2.81873 14.6797 2.87671 14.1424 3.03896 13.632L5.46962 5.22862C5.75901 4.29183 6.33305 3.47498 7.11379 2.89461C7.89454 2.31424 8.84127 2 9.86489 2H7.86489Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={`text-sm font-medium text-[#FF3B30]`}>
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
