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
import { Eye, Edit, Trash2, Plus, Download, Upload, TrendingDown, ScanText, Receipt, Filter, Calendar, CheckCircle2 } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FileUpload from "@/components/common/FileUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { FilterDialog } from "@/components/transactions/filters/FilterDialog";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  
  // Estados para filtros
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [isCategoryFilterActive, setIsCategoryFilterActive] = useState(false);
  
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

  // Helper para verificar si la fecha está en el rango seleccionado
  const isDateInRange = (dateString: string) => {
    if (!isDateFilterActive || !dateRange.from || !dateRange.to) return true;
    const txDate = new Date(dateString);
    return isWithinInterval(txDate, {
      start: dateRange.from,
      end: dateRange.to
    });
  };

  // Función para aplicar todos los filtros
  const filteredTransactions = Array.isArray(transactions) 
    ? transactions.filter((transaction: Transaction) => {
        // Filtrar por tipo (tab)
        if (currentTab !== "all" && transaction.type !== currentTab) return false;
        
        // Filtrar por categoría (solo si está activo el filtro)
        if (isCategoryFilterActive && selectedCategoryId && transaction.categoryId !== selectedCategoryId) return false;
        
        // Filtrar por fecha (solo si está activo el filtro)
        if (isDateFilterActive && !isDateInRange(transaction.date)) return false;
        
        return true;
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
    
  // Calcular el balance y otros valores derivados
  const balance = incomeTotal - expenseTotal;
  
  // Calcular neto e IVA para gastos (asumiendo IVA general del 21%)
  const expenseNetAmount = expenseTotal / 1.21;
  const expenseVAT = expenseTotal - expenseNetAmount;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Ingresos y Gastos
            </h1>
            <p className="text-blue-100 mt-1">
              Gestiona todos tus movimientos económicos
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-start sm:justify-end w-full sm:w-auto">
            <div>
              <Button 
                variant="secondary" 
                className="flex items-center h-10 bg-white text-blue-600 hover:bg-blue-50 border-none"
                onClick={() => setIsFilterDialogOpen(true)}
              >
                <Filter className="h-4 w-4 mr-2" />
                <span>Filtrar</span>
                {(isDateFilterActive || isCategoryFilterActive) && (
                  <Badge className="ml-2 bg-blue-600">
                    {(isDateFilterActive && isCategoryFilterActive) ? '2' : '1'}
                  </Badge>
                )}
              </Button>
            </div>
            
            {/* Nuevo componente de filtro como diálogo separado */}
            <FilterDialog
              isOpen={isFilterDialogOpen}
              onOpenChange={setIsFilterDialogOpen}
              dateRange={dateRange}
              setDateRange={setDateRange}
              isDateFilterActive={isDateFilterActive}
              setIsDateFilterActive={setIsDateFilterActive}
              selectedCategoryId={selectedCategoryId}
              setSelectedCategoryId={setSelectedCategoryId}
              isCategoryFilterActive={isCategoryFilterActive}
              setIsCategoryFilterActive={setIsCategoryFilterActive}
              categories={categories}
              currentTab={currentTab}
            />

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex items-center h-10 bg-white text-blue-600 hover:bg-blue-50 border-none">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Importar CSV</span>
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="overflow-hidden shadow-md border-t-4 border-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-green-50 to-white p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-green-700 font-medium mb-1">Ingresos totales</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(incomeTotal, "income")}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Download className="h-6 w-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden shadow-md border-t-4 border-red-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-red-50 to-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-red-700 font-medium mb-1">Gastos totales</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(expenseTotal, "expense")}
                  </p>
                  <div className="mt-2 pt-2 border-t border-red-100">
                    <div className="flex items-center text-sm text-red-800">
                      <span className="font-medium mr-1">Neto (sin IVA):</span>
                      {formatCurrency(expenseNetAmount, "expense")}
                    </div>
                    <div className="flex items-center text-sm text-red-800">
                      <span className="font-medium mr-1">IVA soportado:</span>
                      {formatCurrency(expenseVAT, "expense")}
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <Upload className="h-6 w-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden shadow-md border-t-4 border-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-blue-50 to-white p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-700 font-medium mb-1">Balance neto</p>
                  <p className={`text-3xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(balance, balance >= 0 ? "income" : "expense")}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${balance >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                  {balance >= 0 ? (
                    <Plus className="h-6 w-6" />
                  ) : (
                    <TrendingDown className="h-6 w-6" />
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0 overflow-hidden">
        <CardHeader className="pb-0 bg-gradient-to-r from-gray-50 to-white border-b">
          <Tabs 
            defaultValue="all" 
            value={currentTab}
            onValueChange={(value) => {
              setCurrentTab(value);
              navigate(`/transactions?tab=${value}`, { replace: true });
            }}
            className="w-full"
          >
            <TabsList className="bg-gray-100">
              <TabsTrigger value="all" className="data-[state=active]:bg-white">
                <Receipt className="h-4 w-4 mr-2" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="income" className="data-[state=active]:bg-white data-[state=active]:text-green-600">
                <Download className="h-4 w-4 mr-2" />
                Ingresos
              </TabsTrigger>
              <TabsTrigger value="expense" className="data-[state=active]:bg-white data-[state=active]:text-red-600">
                <Upload className="h-4 w-4 mr-2" />
                Gastos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {(isDateFilterActive || isCategoryFilterActive) && (
            <div className="p-4 pt-6 bg-blue-50 border-b border-blue-100 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 px-3 py-1">
                  <Filter className="h-3 w-3 mr-1" />
                  Filtros activos
                </Badge>
                
                {isCategoryFilterActive && selectedCategoryId && (
                  <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 px-3 py-1">
                    <span className="flex items-center">
                      {(() => {
                        if (!Array.isArray(categories)) return (
                          <>
                            <span className="mr-1">📂</span>
                            Categoría: Desconocida
                          </>
                        );

                        const category = categories.find(c => c.id === selectedCategoryId);
                        if (!category) return (
                          <>
                            <span className="mr-1">📂</span>
                            Categoría: Desconocida
                          </>
                        );

                        return (
                          <>
                            <span className="mr-1">{category.icon || "📂"}</span>
                            Categoría: {category.name}
                          </>
                        );
                      })()}
                    </span>
                  </Badge>
                )}
                
                {isDateFilterActive && dateRange.from && dateRange.to && (
                  <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 px-3 py-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    Período: {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                  </Badge>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    setDateRange({
                      from: startOfMonth(new Date()),
                      to: endOfMonth(new Date())
                    });
                    setSelectedCategoryId(null);
                    setIsDateFilterActive(false);
                    setIsCategoryFilterActive(false);
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}
          <div className="p-4 bg-white rounded-b-lg">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <Filter className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No hay resultados</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  No se encontraron transacciones con los filtros actuales. Prueba a cambiar los criterios de búsqueda.
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredTransactions || []}
                searchPlaceholder="Buscar movimientos..."
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionList;
