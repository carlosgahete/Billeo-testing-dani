import React, { useState, useEffect } from "react";
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
  Paperclip,
  FileCheck
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";

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

  // Estado local para formulario de registro rápido
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para el archivo de comprobante (opcional)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showUploadOption, setShowUploadOption] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Mutación para crear transacción (gasto rápido)
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      // Primero creamos la transacción
      const res = await apiRequest("POST", "/api/transactions", transactionData);
      const transaction = await res.json();
      
      // Si hay un archivo adjunto, lo subimos como segunda operación
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        
        // Enviamos el archivo mediante la API de subida
        await fetch(`/api/upload?transactionId=${transaction.id}&type=expense`, {
          method: "POST",
          body: formData,
        });
      }
      
      return transaction;
    },
    onSuccess: () => {
      // Limpiar formulario
      setExpenseDescription("");
      setExpenseAmount("");
      setReceiptFile(null);
      setShowUploadOption(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
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
  
  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };
  
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
    
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Importe inválido",
        description: "Por favor ingrese un importe válido mayor que cero.",
        variant: "destructive",
      });
      return;
    }
    
    // Validar que hay un archivo adjunto
    if (!receiptFile) {
      // Si no hay archivo, mostramos el formulario de adjunción
      setShowUploadOption(true);
      toast({
        title: "Comprobante requerido",
        description: "Por favor adjunte un comprobante (factura, recibo o imagen) del gasto.",
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
      notes: `Registro con comprobante: ${receiptFile.name}`
    });
  };

  return (
    <div className="space-y-6 mt-8">
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
            {/* Acciones de ingresos */}
            <div className="mb-6 flex flex-wrap gap-3 justify-start">
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
              
              <Button 
                onClick={() => navigate("/documents/scan")} 
                variant="secondary" 
                className="flex items-center gap-2"
              >
                <ScanText className="h-4 w-4" />
                Escanear documento
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
            {/* Formulario de registro rápido de gastos */}
            <Card className="border-2 border-red-100 shadow-sm">
              <CardHeader className="pb-3 pt-3">
                <CardTitle className="text-lg font-medium text-red-800 flex items-center">
                  <TrendingDown className="mr-2 h-5 w-5" />
                  Registro rápido de gastos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickExpense} className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                      <Input
                        placeholder="Descripción del gasto"
                        value={expenseDescription}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpenseDescription(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="md:w-1/4">
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
                    <div>
                      <Button 
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowUploadOption(!showUploadOption)}
                        className="md:h-10 md:w-10"
                        title={showUploadOption ? "Ocultar opción de adjunto" : "Adjuntar comprobante (requerido)"}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlusCircle className="h-4 w-4 mr-2" />
                      )}
                      Registrar gasto
                    </Button>
                  </div>
                  
                  {/* Campo de archivo requerido */}
                  {showUploadOption && (
                    <div className="flex flex-col gap-2 p-3 border border-dashed border-red-300 rounded-md bg-red-50">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-medium text-red-800">Adjunte un comprobante (requerido)</p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf,.webp"
                        className="text-sm flex-1"
                        required
                      />
                      {receiptFile ? (
                        <div className="text-xs flex items-center gap-1 text-green-700 bg-green-50 p-1 rounded">
                          <FileCheck className="h-3 w-3" />
                          Comprobante seleccionado: {receiptFile.name}
                        </div>
                      ) : (
                        <div className="text-xs text-red-600">
                          Seleccione una imagen o PDF del comprobante para continuar
                        </div>
                      )}
                    </div>
                  )}
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