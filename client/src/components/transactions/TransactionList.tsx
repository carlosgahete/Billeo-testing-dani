import { useState } from "react";
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
import { Eye, Edit, Trash2, Plus, Download, Upload, TrendingDown, ScanText, Receipt } from "lucide-react";
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

interface Transaction {
  id: number;
  title?: string;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod: string;
  notes?: string;
  additionalTaxes?: string;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
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

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 5000, // Actualización automática cada 5 segundos
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = transactionsLoading || categoriesLoading;

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

  const filteredTransactions = Array.isArray(transactions) 
    ? transactions.filter((transaction: Transaction) => {
        if (currentTab === "all") return true;
        return transaction.type === currentTab;
      })
    : [];

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
        
        // Si hay un título definido, mostrarlo como título principal
        if (title) {
          return (
            <div className="max-w-[250px]">
              <div className="font-medium text-gray-800">{title}</div>
              <div className="text-xs text-gray-500 truncate">{description}</div>
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
              </div>
            );
          }
        }
        
        // Si no hay título ni proveedor, mostrar solo la descripción
        return (
          <div className="max-w-[200px] truncate">
            {description}
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
        
        // Usar el ícono de categoría en lugar del signo + o -
        const category = getCategory(row.original.categoryId);
        
        return (
          <div className="flex items-center">
            <span className="mr-2 text-lg" style={{ color: category.color }}>{category.icon}</span>
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
        
        return (
          <div className="flex justify-end space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/transactions/edit/${transaction.id}`)}
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
  const incomeTotal = !isLoading && Array.isArray(transactions)
    ? transactions
        .filter((t: Transaction) => t.type === "income")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
    
  const expenseTotal = !isLoading && Array.isArray(transactions)
    ? transactions
        .filter((t: Transaction) => t.type === "expense")
        .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)
    : 0;
    
  const balance = incomeTotal - expenseTotal;

  return (
    <div className="w-full p-6 bg-gray-50">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-3 md:mb-0">
          <div className="bg-[#04C4D9] p-2 rounded-full mr-3">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Ingresos y Gastos</h2>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={() => navigate("/transactions/scan")}
          >
            <ScanText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Escanear gasto</span>
            <span className="sm:hidden">Escanear</span>
          </Button>
          
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="sm"
                className="h-9 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Importar CSV</span>
                <span className="sm:hidden">Importar</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar movimientos desde CSV</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-neutral-600 mb-4">
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
          
          <Button
            size="sm"
            className="h-9 bg-[#04C4D9] hover:bg-[#03b3c7] text-white"
            onClick={() => navigate("/transactions/new")}
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nuevo movimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Ingresos */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Ingresos totales</h3>
              <div className="p-2 rounded-full bg-green-100">
                <Download className="h-4 w-4 text-green-600" />
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(incomeTotal, "income")}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Base imponible</span>
              <span className="font-medium text-green-600">{formatCurrency(incomeTotal, "income")}</span>
            </div>
          </div>
        </Card>
        
        {/* Gastos */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Gastos totales</h3>
              <div className="p-2 rounded-full bg-red-100">
                <Upload className="h-4 w-4 text-red-600" />
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(expenseTotal, "expense")}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Base imponible</span>
              <span className="font-medium text-red-600">{formatCurrency(expenseTotal, "expense")}</span>
            </div>
          </div>
        </Card>
        
        {/* Balance neto */}
        <Card className="overflow-hidden rounded-xl shadow-md border-0 hover:shadow-lg transition-shadow">
          <div className="px-5 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Balance neto</h3>
              <div className={`p-2 rounded-full ${balance >= 0 ? "bg-[#04C4D9]/20" : "bg-red-100"}`}>
                {balance >= 0 ? (
                  <Plus className={`h-4 w-4 text-[#04C4D9]`} />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            
            <div className="mt-4 mb-1">
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-[#04C4D9]" : "text-red-600"}`}>
                {formatCurrency(balance, balance >= 0 ? "income" : "expense")}
              </div>
            </div>
          </div>
          
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Resultado</span>
              <span className={`font-medium ${balance >= 0 ? "text-[#04C4D9]" : "text-red-600"}`}>
                {balance >= 0 ? "Positivo" : "Negativo"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <Tabs 
            defaultValue="all" 
            value={currentTab}
            onValueChange={(value) => {
              setCurrentTab(value);
              navigate(`/transactions?tab=${value}`, { replace: true });
            }}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="income">Ingresos</TabsTrigger>
              <TabsTrigger value="expense">Gastos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-0">
          <DataTable
            columns={columns}
            data={filteredTransactions || []}
            searchPlaceholder="Buscar movimientos por descripción, categoría o importe..."
          />
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
