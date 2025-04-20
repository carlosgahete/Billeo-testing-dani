import React, { useState, useEffect } from 'react';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table';
import { 
  Select, SelectValue, SelectTrigger, SelectContent, SelectItem 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@tanstack/react-query';
// Importamos CalendarIcon separadamente para no interferir con el componente Calendar
import { FileText, Download, Users, FileUp, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
// Importamos componentes de fecha directamente
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { toast } from '@/hooks/use-toast';

// Interfaces necesarias para la función
interface LibroRegistrosData {
  user: {
    id: number;
    username: string;
    name?: string;
    email: string;
  };
  invoices: InvoiceRecord[];
  transactions: TransactionRecord[];
  quotes: QuoteRecord[];
  summary: SummaryData;
}

interface InvoiceRecord {
  id: number;
  number: string;
  date: string;
  clientName: string;
  subtotal: string;
  tax: string;
  total: string;
  status: string;
}

interface QuoteRecord {
  id: number;
  number: string;
  date: string;
  clientName: string;
  total: string;
  status: string;
}

interface TransactionRecord {
  id: number;
  date: string;
  description: string;
  category?: string;
  type: string;
  amount: string;
}

interface SummaryData {
  totalInvoices: number;
  totalTransactions: number;
  totalQuotes: number;
  incomeTotal: number;
  expenseTotal: number;
  balance: number;
  vatCollected?: number;
  vatPaid?: number;
  vatBalance?: number;
}

interface UserOption {
  id: number;
  username: string;
  name?: string;
  email: string;
}

export default function LibroRegistrosPageFixed() {
  // Estado para filtros y datos
  const [selectedUserId, setSelectedUserId] = useState<string>('current');
  const [dateRange, setDateRange] = useState<any>({ from: null, to: null });
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  
  // Consulta para obtener los datos
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/libro-registros', selectedUserId, startDate, endDate],
    queryFn: async () => {
      let url = '/api/libro-registros';
      // Si estamos en la vista de usuario actual, obtener datos de su propio userId
      const userId = selectedUserId === 'current' ? '' : selectedUserId;
      
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
      }
      
      if (startDate) {
        params.append('startDate', startDate);
      }
      
      if (endDate) {
        params.append('endDate', endDate);
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      // Primero obtenemos el usuario actual para saber su ID
      const userResponse = await fetch('/api/user');
      const userData = await userResponse.json();
      
      // Si estamos obteniendo datos del usuario actual y no se especificó un ID
      if (selectedUserId === 'current' && userData && userData.id) {
        // Usamos directamente el endpoint que incluye su ID
        url = `/api/libro-registros/${userData.id}`;
        console.log("Usando URL específica con ID:", url);
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }
      
      const responseData = await response.json() as LibroRegistrosData;
      console.log("Datos obtenidos correctamente:", responseData);
      return responseData;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 60000 // 1 minuto
  });
  
  // Estado para manejar datos en dispositivos móviles/escritorio uniformemente
  const [displayInvoices, setDisplayInvoices] = useState<InvoiceRecord[]>([]);
  const [displayTransactions, setDisplayTransactions] = useState<TransactionRecord[]>([]);
  const [displayQuotes, setDisplayQuotes] = useState<QuoteRecord[]>([]);
  
  // Actualizar los datos siempre que cambie la respuesta de la API
  useEffect(() => {
    if (data) {
      setDisplayInvoices(data.invoices || []);
      setDisplayTransactions(data.transactions || []);
      setDisplayQuotes(data.quotes || []);
      
      // Log para debugging
      console.log("Datos cargados en componente:", {
        invoices: data.invoices?.length || 0,
        transactions: data.transactions?.length || 0,
        quotes: data.quotes?.length || 0
      });
    }
  }, [data]);
  
  // Cargar usuarios para el superadmin
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsersList(data);
        }
      } catch (error) {
        console.error("Error al cargar usuarios", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios",
          variant: "destructive"
        });
      } finally {
        setLoadingUsers(false);
      }
    };
    
    // Solo cargar usuarios si el usuario actual es superadmin
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'superadmin') {
            fetchUsers();
          }
        }
      } catch (error) {
        console.error("Error al verificar rol", error);
      }
    };
    
    checkUserRole();
  }, []);

  // Funciones de utilidad
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Renderizado principal
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl bg-gradient-to-b from-gray-50 to-white dark:bg-gray-900/10 min-h-screen">      
      {/* Cabecera */}
      <PageHeader
        title="Libro de Registros"
        description="Consulta y exporta tu actividad financiera"
      />
      
      {/* Filtros y botones de exportación - Rediseñados para mejor estructura */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Primera columna: Selector de cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Users size={14} /> Cliente
            </label>
            <Select 
              value={selectedUserId} 
              onValueChange={setSelectedUserId}
              disabled={loadingUsers}
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Usuario actual</SelectItem>
                {usersList.map((userOption: UserOption) => (
                  <SelectItem key={userOption.id} value={userOption.id.toString()}>
                    {userOption.name || userOption.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Segunda columna: Rango de fechas */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Rango de fechas</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-1">
                  <CalendarIcon size={12} className="inline mr-1" /> Desde
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => {
                        setDateRange((prev: any) => ({ ...prev, from: date }));
                        setStartDate(date ? format(date, 'yyyy-MM-dd') : null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-1">
                  <CalendarIcon size={12} className="inline mr-1" /> Hasta
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => {
                        setDateRange((prev: any) => ({ ...prev, to: date }));
                        setEndDate(date ? format(date, 'yyyy-MM-dd') : null);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
        
        {/* Botones de exportación */}
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <Button variant="outline" size="sm" className="h-10">
            <FileUp className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="h-10">
            <FileText className="h-4 w-4 mr-2" />
            Informe PDF
          </Button>
        </div>
      </div>
      
      {/* Paneles de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Panel de facturas */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Facturas</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {displayInvoices.length}
            </div>
            <div className="text-gray-500 text-sm">
              Facturas en el período seleccionado
            </div>
          </div>
        </div>

        {/* Panel de gastos */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Gastos</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {displayTransactions.length}
            </div>
            <div className="text-gray-500 text-sm">
              Gastos en el período seleccionado
            </div>
          </div>
        </div>

        {/* Panel de presupuestos */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Presupuestos</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {displayQuotes.length}
            </div>
            <div className="text-gray-500 text-sm">
              Presupuestos en el período seleccionado
            </div>
          </div>
        </div>

        {/* Panel de balance */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Balance</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {data?.summary ? formatCurrency(data.summary.balance) : "€0.00"}
            </div>
            <div className="text-gray-500 text-sm">
              Balance neto en el período
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de facturas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Facturas emitidas</h3>
          <div className="text-sm text-gray-500">{displayInvoices.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            {/* Título para móvil */}
            <div className="bg-blue-100 dark:bg-gray-800 py-2 px-4 border-b border-blue-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Facturas emitidas</h3>
            </div>
            
            {/* Versión para escritorio */}
            <div className="hidden sm:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Número</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Fecha</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Cliente</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700 text-right">Base</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">IVA</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700 text-right">Total</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-400">
                        No hay facturas en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayInvoices.map((invoice, index) => (
                      <TableRow 
                        key={invoice.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                      >
                        <TableCell className="py-3 px-4 text-sm">
                          {invoice.number}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {formatDate(invoice.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {invoice.clientName}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-right">
                          {formatCurrency(parseFloat(invoice.subtotal))}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {formatCurrency(parseFloat(invoice.tax))}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm font-medium text-right">
                          {formatCurrency(parseFloat(invoice.total))}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge 
                            className={`${
                              invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                            } px-3 py-1 rounded-full text-xs font-medium shadow-sm`}
                          >
                            {invoice.status === 'paid' ? 'Pagada' : invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Versión para móvil: tarjetas en lugar de tabla */}
            <div className="sm:hidden">
              {displayInvoices.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No hay facturas en este período
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayInvoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{invoice.number}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDate(invoice.date)}</div>
                        </div>
                        <Badge 
                          className={`${
                            invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                          } px-2 py-0.5 rounded-full text-xs font-medium shadow-sm`}
                        >
                          {invoice.status === 'paid' ? 'Pagada' : invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs mt-1 text-gray-600">{invoice.clientName}</div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Base</div>
                          <div className="font-medium">{formatCurrency(parseFloat(invoice.subtotal))}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">IVA</div>
                          <div className="font-medium">{formatCurrency(parseFloat(invoice.tax))}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="font-medium text-blue-700">{formatCurrency(parseFloat(invoice.total))}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de gastos y transacciones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Gastos y transacciones</h3>
          <div className="text-sm text-gray-500">{displayTransactions.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            {/* Título para móvil */}
            <div className="bg-amber-100 dark:bg-gray-800 py-2 px-4 border-b border-amber-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Gastos y transacciones</h3>
            </div>
            
            {/* Versión para escritorio */}
            <div className="hidden sm:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Fecha</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Descripción</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Categoría</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Tipo</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700 text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                        No hay transacciones en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayTransactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                      >
                        <TableCell className="py-3 px-4 text-sm">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {transaction.category || '-'}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={`${
                            transaction.type === 'income' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200"
                          } px-3 py-1 rounded-full text-xs font-medium shadow-sm`}>
                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`py-3 px-4 text-sm font-medium text-right ${transaction.type === 'expense' ? "text-red-600" : ""}`}>
                          {formatCurrency(parseFloat(transaction.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Versión para móvil: tarjetas en lugar de tabla */}
            <div className="sm:hidden">
              {displayTransactions.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No hay transacciones en este período
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">{formatDate(transaction.date)}</div>
                        <Badge className={`${
                          transaction.type === 'income' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                          "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200"
                        } px-2 py-0.5 rounded-full text-xs font-medium shadow-sm`}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium mb-1">{transaction.description}</div>
                      
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-500">
                          {transaction.category || 'Sin categoría'}
                        </div>
                        <div className={`text-sm font-medium ${transaction.type === 'expense' ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(parseFloat(transaction.amount))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de presupuestos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Presupuestos</h3>
          <div className="text-sm text-gray-500">{displayQuotes.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            {/* Título para móvil */}
            <div className="bg-purple-100 dark:bg-gray-800 py-2 px-4 border-b border-purple-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Presupuestos</h3>
            </div>
            
            {/* Versión para escritorio */}
            <div className="hidden sm:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Número</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Fecha</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Cliente</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700 text-right">Total</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                        No hay presupuestos en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayQuotes.map((quote, index) => (
                      <TableRow 
                        key={quote.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                      >
                        <TableCell className="py-3 px-4 text-sm">
                          {quote.number}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {formatDate(quote.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {quote.clientName}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm font-medium text-right">
                          {formatCurrency(parseFloat(quote.total))}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge 
                            className={`${
                              quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                              quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                            } px-3 py-1 rounded-full text-xs font-medium shadow-sm`}
                          >
                            {quote.status === 'accepted' ? 'Aceptado' : 
                             quote.status === 'rejected' ? 'Rechazado' : 
                             quote.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Versión para móvil: tarjetas en lugar de tabla */}
            <div className="sm:hidden">
              {displayQuotes.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No hay presupuestos en este período
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayQuotes.map((quote) => (
                    <div key={quote.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{quote.number}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDate(quote.date)}</div>
                        </div>
                        <Badge 
                          className={`${
                            quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200" : 
                            "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                          } px-2 py-0.5 rounded-full text-xs font-medium shadow-sm`}
                        >
                          {quote.status === 'accepted' ? 'Aceptado' : 
                           quote.status === 'rejected' ? 'Rechazado' : 
                           quote.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs mt-1 text-gray-600">{quote.clientName}</div>
                      
                      <div className="flex justify-end mt-2">
                        <div className="text-sm font-medium text-purple-700">
                          {formatCurrency(parseFloat(quote.total))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}