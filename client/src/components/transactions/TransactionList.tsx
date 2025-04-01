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
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod: string;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
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
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = transactionsLoading || categoriesLoading;

  const getCategoryName = (categoryId: number | null) => {
    if (!categoryId || !categories || !Array.isArray(categories)) return "Sin categoría";
    const category = categories.find((c: Category) => c.id === categoryId);
    return category ? category.name : "Sin categoría";
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
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("description")}
        </div>
      ),
    },
    {
      accessorKey: "categoryId",
      header: "Categoría",
      cell: ({ row }) => getCategoryName(row.getValue("categoryId")),
    },
    {
      accessorKey: "paymentMethod",
      header: "Método de pago",
      cell: ({ row }) => <PaymentMethodBadge method={row.getValue("paymentMethod")} />,
    },
    {
      accessorKey: "amount",
      header: "Importe",
      cell: ({ row }) => {
        const type = row.original.type;
        const amount = row.getValue<number>("amount");
        return (
          <div className={`font-medium ${type === "income" ? "text-secondary-600" : "text-danger-500"}`}>
            {type === "income" ? "+" : "-"}{formatCurrency(amount, type)}
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            Ingresos y Gastos
          </h1>
          <p className="text-neutral-500">
            Gestiona todos tus movimientos económicos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end w-full sm:w-auto">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center h-9">
                <Upload className="h-4 w-4 mr-1 sm:mr-2" />
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
            variant="outline"
            className="flex items-center h-9"
            onClick={() => navigate("/documents/scan")}
          >
            <ScanText className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Escanear documento</span>
            <span className="sm:hidden">Escanear</span>
          </Button>
          

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">Ingresos totales</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {formatCurrency(incomeTotal, "income")}
                </p>
              </div>
              <div className="p-2 rounded-full bg-secondary-50 text-secondary-600">
                <Download className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">Gastos totales</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {formatCurrency(expenseTotal, "expense")}
                </p>
              </div>
              <div className="p-2 rounded-full bg-danger-50 text-danger-500">
                <Upload className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-neutral-500 text-sm">Balance neto</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-secondary-600" : "text-danger-500"}`}>
                  {formatCurrency(balance, balance >= 0 ? "income" : "expense")}
                </p>
              </div>
              <div className={`p-2 rounded-full ${balance >= 0 ? "bg-secondary-50 text-secondary-600" : "bg-danger-50 text-danger-500"}`}>
                {balance >= 0 ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
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
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredTransactions || []}
            searchPlaceholder="Buscar movimientos..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionList;
