import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  FileText, 
  ShoppingCart, 
  File, 
  BarChart4, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  Euro, 
  ArrowUpDown, 
  AlertCircle,
  FileDown,
  CheckSquare,
  RefreshCw
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Definir interfaces para los datos
interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

interface Invoice {
  id: number;
  number: string;
  issueDate: string;
  dueDate: string;
  client: string;
  total: number;
  status: string;
  baseAmount: number;
  vatAmount: number;
  vatRate: number;
  irpf?: number;
  notes?: string;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  categoryId?: number;
  paymentMethod?: string;
  notes?: string;
}

interface Quote {
  id: number;
  number: string;
  issueDate: string;
  expiryDate: string;
  clientName: string;
  total: number;
  status: string;
  baseAmount?: number;
  vatAmount?: number;
  notes?: string;
}

interface Summary {
  totalInvoices: number;
  totalTransactions: number;
  totalQuotes: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  vatCollected: number;
  vatPaid: number;
  vatBalance: number;
}

interface LibroRegistrosData {
  user: User;
  invoices: Invoice[];
  transactions: Transaction[];
  quotes: Quote[];
  summary: Summary;
}

// Definir tipos para filtros
type DateRange = {
  from: Date;
  to: Date;
};

// Componente principal
export default function EnhancedLibroRegistros() {
  const params = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = params?.userId || '';
  const { user } = useAuth();
  
  // Estados para filtros
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 3), // Por defecto, últimos 3 meses
    to: new Date()
  });
  
  // Estados para ordenación
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Verificación adicional de seguridad: solo superadmin puede ver esto
  if (!user || (user.role !== 'superadmin' && user.role !== 'SUPERADMIN')) {
    return <Redirect to="/" />;
  }

  // Función para cargar los datos
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Construir URL con parámetros de filtrado
      let url = `/api/public/libro-registros/${userId}`;
      const queryParams = [];
      
      if (dateRange.from) {
        queryParams.push(`startDate=${dateRange.from.toISOString()}`);
      }
      
      if (dateRange.to) {
        queryParams.push(`endDate=${dateRange.to.toISOString()}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error al obtener datos: ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      setData(jsonData);
      
      if (forceRefresh) {
        toast({
          title: "Datos actualizados",
          description: "El libro de registros se ha actualizado correctamente.",
          variant: "default",
        });
      }
    } catch (err) {
      console.error("Error al cargar datos del libro de registros:", err);
      setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Cargar datos cuando cambia el usuario o los filtros de fecha
  useEffect(() => {
    if (userId) {
      fetchData();
    } else {
      setLoading(false);
      setError("ID de usuario no proporcionado");
    }
  }, [userId, dateRange]);
  
  // Función para aplicar filtros
  const applyFilters = (items: any[], type: 'invoice' | 'transaction' | 'quote') => {
    if (!items) return [];
    
    let filtered = [...items];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        if (type === 'invoice') {
          const invoice = item as Invoice;
          return invoice.number.toLowerCase().includes(search) || 
                 invoice.client.toLowerCase().includes(search) ||
                 (invoice.notes && invoice.notes.toLowerCase().includes(search));
        } else if (type === 'transaction') {
          const transaction = item as Transaction;
          return transaction.description.toLowerCase().includes(search) || 
                 transaction.category.toLowerCase().includes(search) ||
                 (transaction.notes && transaction.notes.toLowerCase().includes(search));
        } else { // quote
          const quote = item as Quote;
          return quote.number.toLowerCase().includes(search) || 
                 quote.clientName.toLowerCase().includes(search) ||
                 (quote.notes && quote.notes.toLowerCase().includes(search));
        }
      });
    }
    
    // Filtrar por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (type === 'invoice') {
          return (item as Invoice).status === statusFilter;
        } else if (type === 'transaction') {
          return (item as Transaction).type === statusFilter;
        } else { // quote
          return (item as Quote).status === statusFilter;
        }
      });
    }
    
    // Ordenar resultados
    filtered.sort((a, b) => {
      const getValueForSorting = (item: any) => {
        if (sortColumn === "date" || sortColumn === "issueDate" || sortColumn === "dueDate") {
          const dateStr = type === 'transaction' ? item.date : 
                          (sortColumn === "dueDate" ? item.dueDate : item.issueDate);
          return new Date(dateStr).getTime();
        } else if (sortColumn === "total" || sortColumn === "amount") {
          return type === 'transaction' ? item.amount : item.total;
        } else if (sortColumn === "number") {
          return item.number || "";
        } else if (sortColumn === "client" || sortColumn === "clientName") {
          return type === 'invoice' ? item.client : item.clientName;
        } else if (sortColumn === "status") {
          return item.status;
        } else if (sortColumn === "description") {
          return type === 'transaction' ? item.description : "";
        } else if (sortColumn === "category") {
          return type === 'transaction' ? item.category : "";
        }
        return item[sortColumn] || "";
      };
      
      const valueA = getValueForSorting(a);
      const valueB = getValueForSorting(b);
      
      if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };
  
  // Funciones para cambiar ordenación
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  // Función de exportación a CSV
  const exportToCSV = () => {
    if (!data) return;
    
    // Función para escapar valores para CSV
    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Si contiene comas, comillas o saltos de línea, encierra en comillas y escapa las comillas internas
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    // Función para crear una línea CSV
    const createCSVLine = (values: any[]) => {
      return values.map(escapeCSV).join(',') + '\n';
    };
    
    // Crear CSV para resumen
    let csv = createCSVLine(["Libro de Registros - Resumen"]);
    csv += createCSVLine(["Usuario", data.user.name, "ID", data.user.id.toString()]);
    csv += createCSVLine(["Email", data.user.email, "Username", data.user.username]);
    csv += createCSVLine([]);
    csv += createCSVLine(["Periodo", `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`]);
    csv += createCSVLine([]);
    csv += createCSVLine(["Concepto", "Cantidad", "Importe"]);
    csv += createCSVLine(["Facturas emitidas", data.summary.totalInvoices, formatCurrency(data.summary.incomeTotal)]);
    csv += createCSVLine(["Gastos", data.summary.totalTransactions, formatCurrency(data.summary.expenseTotal)]);
    csv += createCSVLine(["Presupuestos", data.summary.totalQuotes, ""]);
    csv += createCSVLine([]);
    csv += createCSVLine(["Resultado", "", formatCurrency(data.summary.balance)]);
    csv += createCSVLine([]);
    csv += createCSVLine(["IVA Repercutido", "", formatCurrency(data.summary.vatCollected)]);
    csv += createCSVLine(["IVA Soportado", "", formatCurrency(data.summary.vatPaid)]);
    csv += createCSVLine(["Balance IVA", "", formatCurrency(data.summary.vatBalance)]);
    csv += createCSVLine([]);
    csv += createCSVLine([]);
    
    // Añadir facturas
    csv += createCSVLine(["FACTURAS"]);
    const invoiceHeaders = ["Número", "Fecha Emisión", "Fecha Vencimiento", "Cliente", "Base Imponible", "IVA", "IRPF", "Total", "Estado", "Notas"];
    csv += createCSVLine(invoiceHeaders);
    
    data.invoices.forEach(invoice => {
      csv += createCSVLine([
        invoice.number,
        format(new Date(invoice.issueDate), "dd/MM/yyyy"),
        format(new Date(invoice.dueDate), "dd/MM/yyyy"),
        invoice.client,
        invoice.baseAmount,
        invoice.vatAmount,
        invoice.irpf || 0,
        invoice.total,
        invoice.status === 'paid' ? 'Pagada' : invoice.status === 'pending' ? 'Pendiente' : 'Cancelada',
        invoice.notes || ""
      ]);
    });
    
    csv += createCSVLine([]);
    csv += createCSVLine([]);
    
    // Añadir transacciones
    csv += createCSVLine(["TRANSACCIONES"]);
    const transactionHeaders = ["Fecha", "Descripción", "Categoría", "Método de Pago", "Importe", "Tipo", "Notas"];
    csv += createCSVLine(transactionHeaders);
    
    data.transactions.forEach(transaction => {
      csv += createCSVLine([
        format(new Date(transaction.date), "dd/MM/yyyy"),
        transaction.description,
        transaction.category,
        transaction.paymentMethod || "",
        transaction.amount,
        transaction.type === 'expense' ? 'Gasto' : 'Ingreso',
        transaction.notes || ""
      ]);
    });
    
    // Crear un objeto blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `libro-registros-${userId}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Utilidad para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR'
    }).format(amount);
  };
  
  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: es });
    } catch (e) {
      return "Fecha inválida";
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay datos disponibles</AlertTitle>
          <AlertDescription>No se encontraron registros para este usuario.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredInvoices = applyFilters(data.invoices, 'invoice');
  const filteredTransactions = applyFilters(data.transactions, 'transaction');
  const filteredQuotes = applyFilters(data.quotes, 'quote');

  // Calcular totales filtrados para mostrar en las tarjetas
  const filteredIncomeTotal = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const filteredExpenseTotal = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Libro de Registros</h1>
          <p className="text-sm text-gray-500">
            {data.user.name} ({data.user.username}) - ID: {data.user.id}
          </p>
        </div>
        
        <div className="flex flex-wrap mt-4 md:mt-0 gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            className="flex items-center"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-md flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado/Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <DatePickerWithRange 
                date={dateRange} 
                onChange={setDateRange} 
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Contenido Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart4 className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Resumen</span>
            <span className="md:hidden">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Facturas</span>
            <span className="md:hidden">Facts.</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center">
            <ShoppingCart className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Gastos</span>
            <span className="md:hidden">Gastos</span>
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex items-center">
            <File className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Presupuestos</span>
            <span className="md:hidden">Presu.</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Pestaña de Resumen */}
        <TabsContent value="overview" className="space-y-6">
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-blue-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Ingresos
                </CardTitle>
                <Euro className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-baseline">
                  <p className="text-3xl font-bold">{formatCurrency(filteredIncomeTotal)}</p>
                  <p className="text-sm text-gray-500">
                    {filteredInvoices.length} facturas
                  </p>
                </div>
                <Separator className="my-3" />
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>IVA Repercutido:</span>
                    <span>{formatCurrency(data.summary.vatCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Imponible:</span>
                    <span>{formatCurrency(filteredIncomeTotal - data.summary.vatCollected)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-amber-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
                  Gastos
                </CardTitle>
                <Euro className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-baseline">
                  <p className="text-3xl font-bold">{formatCurrency(filteredExpenseTotal)}</p>
                  <p className="text-sm text-gray-500">
                    {filteredTransactions.filter(t => t.type === 'expense').length} transacciones
                  </p>
                </div>
                <Separator className="my-3" />
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>IVA Soportado:</span>
                    <span>{formatCurrency(data.summary.vatPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base Imponible:</span>
                    <span>{formatCurrency(filteredExpenseTotal - data.summary.vatPaid)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 to-emerald-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <BarChart4 className="h-5 w-5 mr-2 text-emerald-500" />
                  Balance
                </CardTitle>
                <CheckSquare className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-baseline">
                  <p className="text-3xl font-bold">{formatCurrency(filteredIncomeTotal - filteredExpenseTotal)}</p>
                  <p className="text-sm text-gray-500">Resultado</p>
                </div>
                <Separator className="my-3" />
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between mb-1">
                    <span>IVA a liquidar:</span>
                    <span className={data.summary.vatBalance > 0 ? "text-red-500 font-medium" : "text-green-500 font-medium"}>
                      {formatCurrency(data.summary.vatBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Beneficio neto:</span>
                    <span className="font-medium">
                      {formatCurrency((filteredIncomeTotal - data.summary.vatCollected) - (filteredExpenseTotal - data.summary.vatPaid))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Top facturas y gastos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-500" />
                  Últimas Facturas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.slice(0, 5).map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatCurrency(invoice.total)}</TableCell>
                        <TableCell>
                          <Badge className={
                            invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                            invoice.status === 'pending' ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : 
                            "bg-red-100 text-red-800 hover:bg-red-100"
                          }>
                            {invoice.status === 'paid' ? 'Pagada' : 
                             invoice.status === 'pending' ? 'Pendiente' : 
                             'Cancelada'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                          No hay facturas para mostrar
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
                  Últimos Gastos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions
                      .filter(t => t.type === 'expense')
                      .slice(0, 5)
                      .map(expense => (
                        <TableRow key={expense.id}>
                          <TableCell>{formatDate(expense.date)}</TableCell>
                          <TableCell className="font-medium truncate max-w-[150px]">
                            {expense.description}
                          </TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{formatCurrency(expense.amount)}</TableCell>
                        </TableRow>
                      ))}
                    {filteredTransactions.filter(t => t.type === 'expense').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                          No hay gastos para mostrar
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Pestaña de Facturas */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Facturas emitidas
              </CardTitle>
              <CardDescription>
                Mostrando {filteredInvoices.length} facturas por un total de {formatCurrency(filteredIncomeTotal)}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center">
                          Número
                          {sortColumn === "number" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("issueDate")}
                      >
                        <div className="flex items-center">
                          Fecha
                          {sortColumn === "issueDate" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("client")}
                      >
                        <div className="flex items-center">
                          Cliente
                          {sortColumn === "client" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Base Imponible</TableHead>
                      <TableHead>IVA</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 text-right"
                        onClick={() => handleSort("total")}
                      >
                        <div className="flex items-center justify-end">
                          Total
                          {sortColumn === "total" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Estado
                          {sortColumn === "status" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={invoice.client}>
                          {invoice.client}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.baseAmount)}</TableCell>
                        <TableCell>{formatCurrency(invoice.vatAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
                        <TableCell>
                          <Badge className={
                            invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                            invoice.status === 'pending' ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : 
                            "bg-red-100 text-red-800 hover:bg-red-100"
                          }>
                            {invoice.status === 'paid' ? 'Pagada' : 
                             invoice.status === 'pending' ? 'Pendiente' : 
                             'Cancelada'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          No hay facturas que coincidan con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Gastos */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
                Transacciones
              </CardTitle>
              <CardDescription>
                Mostrando {filteredTransactions.length} transacciones por un total de {formatCurrency(filteredExpenseTotal)} en gastos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center">
                          Fecha
                          {sortColumn === "date" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("description")}
                      >
                        <div className="flex items-center">
                          Descripción
                          {sortColumn === "description" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("category")}
                      >
                        <div className="flex items-center">
                          Categoría
                          {sortColumn === "category" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50 text-right"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-end">
                          Importe
                          {sortColumn === "amount" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center">
                          Tipo
                          {sortColumn === "type" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium" title={transaction.description}>
                          {transaction.description}
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell>{transaction.paymentMethod || "N/A"}</TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            transaction.type === 'expense' 
                              ? "bg-red-100 text-red-800 hover:bg-red-100" 
                              : "bg-green-100 text-green-800 hover:bg-green-100"
                          }>
                            {transaction.type === 'expense' ? 'Gasto' : 'Ingreso'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                          No hay transacciones que coincidan con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Pestaña de Presupuestos */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="flex items-center">
                <File className="h-5 w-5 mr-2 text-emerald-500" />
                Presupuestos
              </CardTitle>
              <CardDescription>
                Mostrando {filteredQuotes.length} presupuestos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("number")}
                      >
                        <div className="flex items-center">
                          Número
                          {sortColumn === "number" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("issueDate")}
                      >
                        <div className="flex items-center">
                          Fecha
                          {sortColumn === "issueDate" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("clientName")}
                      >
                        <div className="flex items-center">
                          Cliente
                          {sortColumn === "clientName" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Estado
                          {sortColumn === "status" && (
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">{quote.number}</TableCell>
                        <TableCell>{formatDate(quote.issueDate)}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={quote.clientName}>
                          {quote.clientName}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(quote.total)}</TableCell>
                        <TableCell>
                          <Badge className={
                            quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                            quote.status === 'pending' ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : 
                            "bg-red-100 text-red-800 hover:bg-red-100"
                          }>
                            {quote.status === 'accepted' ? 'Aceptado' : 
                             quote.status === 'pending' ? 'Pendiente' : 
                             'Rechazado'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredQuotes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                          No hay presupuestos que coincidan con los filtros seleccionados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}