import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FilePlus, TrendingDown, TrendingUp } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
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

// Función para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
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

const IncomeExpenseReport = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
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

  // Calcular totales
  const totalInvoiceIncome = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalAdditionalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncome = totalInvoiceIncome + totalAdditionalIncome;
  
  const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0);

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

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Ingresos y Gastos" 
        description="Visualización detallada de todos los ingresos y gastos"
      />
      
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
          onValueChange={(value) => setActiveTab(value as "income" | "expense")}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="expense">Gastos</TabsTrigger>
          </TabsList>
          
          {/* TAB DE INGRESOS */}
          <TabsContent value="income" className="space-y-4">
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
                      <div>
                        <div className="font-medium">
                          Factura #{invoice.invoiceNumber} - {getClientName(invoice.clientId)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(invoice.issueDate)} · {invoice.status === "paid" ? "Pagada" : "Pendiente"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(invoice.total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Base: {formatCurrency(invoice.subtotal)} · IVA: {formatCurrency(invoice.tax)}
                        </div>
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
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(transaction.amount)}
                        </div>
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
            
            <div className="rounded-md border bg-muted/20 p-4">
              <h3 className="font-medium mb-2">Registro rápido de gastos</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Puedes registrar gastos subiendo una factura o ticket para su procesamiento automático.
              </p>
              <Button 
                onClick={() => navigate("/document-scan")} 
                variant="default" 
                size="sm"
              >
                Escanear documento
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IncomeExpenseReport;