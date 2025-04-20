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
  // Estado y funciones simuladas para que compile
  const [selectedUserId, setSelectedUserId] = useState<string>('current');
  const [dateRange, setDateRange] = useState<any>({ from: null, to: null });
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [displayInvoices, setDisplayInvoices] = useState<InvoiceRecord[]>([]);
  const [displayTransactions, setDisplayTransactions] = useState<TransactionRecord[]>([]);
  const [displayQuotes, setDisplayQuotes] = useState<QuoteRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersList, setUsersList] = useState<UserOption[]>([]);

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
      
      {/* Filtros y botones de exportación */}
      <div className="flex flex-wrap items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Selector de cliente para superadmin */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
              <Users size={12} /> Cliente
            </label>
            <Select 
              value={selectedUserId} 
              onValueChange={setSelectedUserId}
              disabled={loadingUsers}
            >
              <SelectTrigger className="w-[180px] h-9">
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
          
          {/* Selector de rango de fechas */}
          <div className="flex flex-col md:flex-row gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <CalendarIcon size={12} /> Desde
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[120px] h-9 justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <CalendarIcon size={12} /> Hasta
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[120px] h-9 justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
        
        {/* Botones de exportación */}
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" className="text-xs h-9">
            <FileUp className="h-3.5 w-3.5 mr-1" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-9">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Informe PDF
          </Button>
        </div>
      </div>
      
      {/* Paneles de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      </div>
      
      {/* Tabla de facturas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Facturas emitidas</h3>
          <div className="text-sm text-gray-500">{displayInvoices.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {/* Título para móvil */}
            <div className="bg-blue-100 dark:bg-gray-800 py-2 px-4 border-b border-blue-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-blue-700">Facturas emitidas</h3>
            </div>
            
            <div className="min-w-full">
              <Table className="w-full table-fixed sm:table-auto">
                <TableHeader className="hidden sm:table-header-group">
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 w-[80px] sm:w-auto">Número</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 w-[80px] sm:w-auto">Fecha</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 text-right w-[70px] sm:w-auto">Base</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 hidden sm:table-cell">IVA</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 w-[70px] sm:w-auto">Total</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700 w-[90px] sm:w-auto">Estado</TableHead>
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
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate sm:whitespace-normal">
                          <span className="inline sm:hidden text-gray-500 mr-1 text-[10px]">Nº:</span>
                          {invoice.number}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate sm:whitespace-normal">
                          {formatDate(invoice.date)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
                          {invoice.clientName}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-right truncate sm:whitespace-normal">
                          {formatCurrency(parseFloat(invoice.subtotal))}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-right hidden sm:table-cell">
                          {formatCurrency(parseFloat(invoice.tax))}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium text-right truncate sm:whitespace-normal">
                          {formatCurrency(parseFloat(invoice.total))}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <Badge 
                            className={`${
                              invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                            } px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shadow-sm max-w-[80px] sm:max-w-none truncate`}
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {/* Título para móvil */}
            <div className="bg-amber-100 dark:bg-gray-800 py-2 px-4 border-b border-amber-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-amber-700">Gastos y transacciones</h3>
            </div>
            
            <div className="min-w-full">
              <Table className="w-full table-fixed sm:table-auto">
                <TableHeader className="hidden sm:table-header-group">
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700 w-[80px] sm:w-auto">Fecha</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700">Descripción</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700 hidden sm:table-cell">Categoría</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700 w-[70px] sm:w-auto">Tipo</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700 w-[80px] sm:w-auto">Importe</TableHead>
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
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate sm:whitespace-normal">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate sm:whitespace-normal">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
                          {transaction.category || '-'}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <Badge className={`${
                            transaction.type === 'income' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200"
                          } px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shadow-sm max-w-[80px] sm:max-w-none truncate`}>
                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium truncate sm:whitespace-normal ${transaction.type === 'expense' ? "text-red-600" : ""}`}>
                          {formatCurrency(parseFloat(transaction.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {/* Título para móvil */}
            <div className="bg-green-100 dark:bg-gray-800 py-2 px-4 border-b border-green-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-green-700">Presupuestos</h3>
            </div>
            
            <div className="min-w-full">
              <Table className="w-full table-fixed sm:table-auto">
                <TableHeader className="hidden sm:table-header-group">
                  <TableRow>
                    <TableHead className="py-2 px-2 sm:px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700 w-[80px] sm:w-auto">Número</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700 w-[80px] sm:w-auto">Fecha</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700 hidden sm:table-cell">Cliente</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700 w-[80px] sm:w-auto">Total</TableHead>
                    <TableHead className="py-2 px-2 sm:px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700 w-[90px] sm:w-auto">Estado</TableHead>
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
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate sm:whitespace-normal">
                          <span className="inline sm:hidden text-gray-500 mr-1 text-[10px]">Nº:</span>
                          {quote.number}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm truncate sm:whitespace-normal">
                          {formatDate(quote.date)}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">
                          {quote.clientName}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-xs sm:text-sm font-medium truncate sm:whitespace-normal">
                          {formatCurrency(parseFloat(quote.total))}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <Badge 
                            className={`${
                              quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                              quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                            } px-2 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-medium shadow-sm max-w-[80px] sm:max-w-none truncate`}
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
          </div>
        </div>
      </div>
    </div>
  );
}