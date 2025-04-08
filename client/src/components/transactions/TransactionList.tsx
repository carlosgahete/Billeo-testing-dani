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
import { Eye, Edit, Trash2, Plus, Download, Upload, TrendingDown, ScanText, Receipt, FileDown } from "lucide-react";
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Obtener tab de los parámetros de URL
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const tabParam = urlParams.get('tab');
  const initialTab = tabParam === 'income' || tabParam === 'expense' ? tabParam : 'all';
  
  const [currentTab, setCurrentTab] = useState<string>(initialTab);
  const [filteredExpenseTransactions, setFilteredExpenseTransactions] = useState<Transaction[]>([]);

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

  const handleImportCSV = (filePath: string) => {
    toast({
      title: "CSV importado",
      description: "El archivo CSV se ha importado correctamente. Los movimientos han sido añadidos.",
    });
    setIsImportDialogOpen(false);
    
    // In a real app, we'd wait for the server to process the import and then reload the data
    queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
  };
  
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

  // Manejo de transacciones filtradas
  const getFilteredTransactions = () => {
    if (!Array.isArray(transactions)) return [];
    
    // Si estamos en la pestaña de gastos y hay filtros aplicados, usar las transacciones filtradas
    if (currentTab === "expense" && filteredExpenseTransactions.length > 0) {
      return filteredExpenseTransactions;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium text-gray-800 tracking-tight">
            Ingresos y Gastos
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestiona todos tus movimientos económicos
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-start sm:justify-end w-full sm:w-auto">
          {/* Siempre visible: Importar CSV */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <button className="button-apple-secondary button-apple-sm flex items-center">
                <Upload className="h-4 w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">Importar CSV</span>
                <span className="sm:hidden">Importar</span>
              </button>
            </DialogTrigger>
            <DialogContent className="glass-modal">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium tracking-tight">Importar movimientos desde CSV</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Sube un archivo CSV con tus movimientos bancarios para importarlos al sistema.
                  El archivo debe tener columnas para fecha, descripción, importe y tipo de movimiento.
                </p>
                <FileUpload
                  onUpload={handleImportCSV}
                  accept=".csv"
                />
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Visible solo en la pestaña 'income': Nuevo ingreso */}
          {currentTab === 'income' && (
            <button 
              className="button-apple-primary button-apple-sm flex items-center"
              onClick={() => navigate("/transactions/new?type=income")}
            >
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo ingreso</span>
              <span className="sm:hidden">Ingreso</span>
            </button>
          )}
          
          {/* Visible solo en la pestaña 'expense': Nuevo gasto */}
          {currentTab === 'expense' && (
            <button 
              className="button-apple-primary button-apple-sm flex items-center"
              onClick={() => navigate("/transactions/new?type=expense")}
            >
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo gasto</span>
              <span className="sm:hidden">Gasto</span>
            </button>
          )}
          
          {/* Visible solo en la pestaña 'expense': Escanear gasto */}
          {currentTab === 'expense' && (
            <button 
              className="button-apple button-apple-sm flex items-center"
              onClick={() => navigate("/documents/scan")}
            >
              <ScanText className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Escanear gasto</span>
              <span className="sm:hidden">Escanear</span>
            </button>
          )}
          
          {/* Visible siempre en la pestaña 'expense': Botones para descargar/exportar */}
          {currentTab === 'expense' && (
            <>
              {/* Botón para descargar documentos originales */}
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
              
              {/* Botón para exportar a PDF */}
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
          )}
          
          {/* Visible solo en la pestaña 'income': Crear factura */}
          {currentTab === 'income' && (
            <button 
              className="button-apple button-apple-sm flex items-center"
              onClick={() => navigate("/invoices/new")}
            >
              <Receipt className="h-4 w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Crear factura</span>
              <span className="sm:hidden">Factura</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-2">
        <div className="dashboard-card scale-in">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-2">Ingresos totales</p>
                <p className="text-2xl font-medium text-gray-800 flex items-center">
                  {formatCurrency(incomeTotal, "income")}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  <p>Facturas: {formatCurrency(invoiceIncomeTotal, "income")}</p>
                  <p>Transacciones: {formatCurrency(transactionIncomeTotal, "income")}</p>
                </div>
              </div>
              <div className="p-2.5 rounded-full bg-[#E3F4E9] text-[#34C759]">
                <Download className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card scale-in">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-2">Gastos totales</p>
                <p className="text-2xl font-medium text-gray-800">
                  {formatCurrency(expenseTotal, "expense")}
                </p>
              </div>
              <div className="p-2.5 rounded-full bg-[#FFE9EA] text-[#FF3B30]">
                <Upload className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card scale-in">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm mb-2">Balance neto</p>
                <p className={`text-2xl font-medium ${balance >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}`}>
                  {formatCurrency(balance, balance >= 0 ? "income" : "expense")}
                </p>
              </div>
              <div className={`p-2.5 rounded-full ${balance >= 0 ? "bg-[#E3F4E9] text-[#34C759]" : "bg-[#FFE9EA] text-[#FF3B30]"}`}>
                {balance >= 0 ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
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
          {/* Mostrar filtros solo cuando estamos en la pestaña de gastos */}
          {currentTab === "expense" && transactions && categories && (
            <div className="mb-6 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
              <ExpenseFilters 
                transactions={transactions}
                categories={categories}
                onFilterChange={setFilteredExpenseTransactions}
                onExportClick={handleExportFilteredExpenses}
              />
            </div>
          )}
          
          <DataTable
            columns={columns}
            data={filteredTransactions || []}
            searchPlaceholder="Buscar movimientos por descripción, importe o fecha..."
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
