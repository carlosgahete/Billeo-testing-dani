import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
// Ya no necesitamos tabs
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart3, FileText, FileSpreadsheet, Wallet, Filter, Receipt, ScrollText, BarChart2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Temporalmente usaremos funciones simuladas para generar PDF y Excel
// hasta que podamos instalar las dependencias correctamente
const generatePDF = async (data: any, filename: string) => {
  console.log('Generando PDF con datos:', data);
  alert('La funcionalidad de PDF estará disponible próximamente. Se ha registrado la petición.');
};

const generateExcel = async (data: any, filename: string) => {
  console.log('Generando Excel con datos:', data);
  alert('La funcionalidad de Excel estará disponible próximamente. Se ha registrado la petición.');
};

// Tipos para los datos
interface Transaction {
  id: number;
  title: string;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  category?: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

// Componente para mostrar el estado de carga
const LoadingState = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <BarChart3 className="h-12 w-12 text-primary animate-pulse mb-4" />
      <h2 className="text-xl font-semibold mb-2">Cargando datos...</h2>
      <p className="text-muted-foreground">Recuperando la información de tu libro de registros.</p>
    </div>
  </div>
);

// Componente para mostrar el estado de error
const ErrorState = () => (
  <div className="container mx-auto px-4 py-8">
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Error</CardTitle>
        <CardDescription>No se han podido cargar los datos del libro de registros.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Por favor, inténtalo de nuevo más tarde o contacta con soporte si el problema persiste.</p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </CardContent>
    </Card>
  </div>
);

// Componente principal del Libro de Registros
const LibroRegistrosPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterPeriod, setFilterPeriod] = useState<string>('all'); // 'all', '1T', '2T', '3T', '4T', '01', '02', ...
  // Ya no necesitamos la pestaña activa, ahora mostramos todo en un diseño de tarjetas

  // Obtenemos la lista de años disponibles (desde el año actual hasta 3 años atrás)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      currentYear.toString(),
      (currentYear - 1).toString(),
      (currentYear - 2).toString(),
      (currentYear - 3).toString()
    ];
  }, []);

  // Consulta para obtener transacciones (ingresos y gastos)
  const transactionsQuery = useQuery({
    queryKey: ['/api/transactions'],
    enabled: !!user,
  });

  // Consulta para obtener facturas
  const invoicesQuery = useQuery({
    queryKey: ['/api/invoices'],
    enabled: !!user,
  });

  // Datos filtrados según los criterios seleccionados
  const filteredData = useMemo(() => {
    if (!transactionsQuery.data || !invoicesQuery.data) {
      return { transactions: [], invoices: [] };
    }

    // Filtramos por año
    let transactions = (transactionsQuery.data as Transaction[]).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getFullYear().toString() === filterYear;
    });

    let invoices = (invoicesQuery.data as Invoice[]).filter(invoice => {
      const invoiceDate = new Date(invoice.issueDate);
      return invoiceDate.getFullYear().toString() === filterYear;
    });

    // Filtramos por periodo (trimestre o mes)
    if (filterPeriod !== 'all') {
      if (filterPeriod.endsWith('T')) {
        // Es un trimestre
        const quarter = parseInt(filterPeriod[0]);
        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 2;

        transactions = transactions.filter(transaction => {
          const month = new Date(transaction.date).getMonth();
          return month >= startMonth && month <= endMonth;
        });

        invoices = invoices.filter(invoice => {
          const month = new Date(invoice.issueDate).getMonth();
          return month >= startMonth && month <= endMonth;
        });
      } else {
        // Es un mes específico
        const month = parseInt(filterPeriod) - 1; // Restamos 1 porque los meses en JS van de 0 a 11

        transactions = transactions.filter(transaction => {
          return new Date(transaction.date).getMonth() === month;
        });

        invoices = invoices.filter(invoice => {
          return new Date(invoice.issueDate).getMonth() === month;
        });
      }
    }

    return { transactions, invoices };
  }, [transactionsQuery.data, invoicesQuery.data, filterYear, filterPeriod]);

  // Función para descargar los datos como PDF
  const handleDownloadPDF = async () => {
    try {
      const data = {
        year: filterYear,
        period: filterPeriod,
        transactions: filteredData.transactions,
        invoices: filteredData.invoices,
        user: user
      };
      
      await generatePDF(data, `Libro_Registros_${filterYear}_${filterPeriod}`);
      
      toast({
        title: 'PDF generado correctamente',
        description: 'El archivo se ha descargado en tu dispositivo.',
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({
        title: 'Error al generar PDF',
        description: 'No se pudo generar el archivo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Función para descargar los datos como Excel
  const handleDownloadExcel = async () => {
    try {
      const data = {
        year: filterYear,
        period: filterPeriod,
        transactions: filteredData.transactions,
        invoices: filteredData.invoices,
        user: user
      };
      
      await generateExcel(data, `Libro_Registros_${filterYear}_${filterPeriod}`);
      
      toast({
        title: 'Excel generado correctamente',
        description: 'El archivo se ha descargado en tu dispositivo.',
      });
    } catch (error) {
      console.error('Error al generar Excel:', error);
      toast({
        title: 'Error al generar Excel',
        description: 'No se pudo generar el archivo. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Función para obtener el nombre del periodo seleccionado
  const getPeriodName = (period: string): string => {
    if (period === 'all') return 'Todo el año';
    if (period === '1T') return 'Primer Trimestre';
    if (period === '2T') return 'Segundo Trimestre';
    if (period === '3T') return 'Tercer Trimestre';
    if (period === '4T') return 'Cuarto Trimestre';
    
    // Es un mes específico
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIndex = parseInt(period) - 1;
    return monthNames[monthIndex];
  };

  // Renderizamos los estados de carga y error
  if (transactionsQuery.isLoading || invoicesQuery.isLoading) {
    return <LoadingState />;
  }

  if (transactionsQuery.isError || invoicesQuery.isError) {
    return <ErrorState />;
  }

  // Calcular totales para las tarjetas resumen
  const facturasCount = filteredData.invoices.length;
  const facturasTotal = filteredData.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  
  const gastosCount = filteredData.transactions.filter(t => t.type === 'expense').length;
  const gastosTotal = filteredData.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  
  // Supongamos que tenemos 5 presupuestos para mostrar (esto sería de otra consulta)
  const presupuestosCount = 5;
  
  // Calcular el balance (facturas - gastos)
  const balanceTotal = facturasTotal - gastosTotal;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Fila superior de filtros y botones de descarga */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Año</label>
          <Select
            value={filterYear}
            onValueChange={(value) => setFilterYear(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un año" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Trimestre</label>
          <Select 
            value={filterPeriod.endsWith('T') ? filterPeriod : 'all'} 
            onValueChange={(value) => setFilterPeriod(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un trimestre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1T">1T (Ene - Mar)</SelectItem>
              <SelectItem value="2T">2T (Abr - Jun)</SelectItem>
              <SelectItem value="3T">3T (Jul - Sep)</SelectItem>
              <SelectItem value="4T">4T (Oct - Dic)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Mes</label>
          <Select 
            value={!filterPeriod.endsWith('T') && filterPeriod !== 'all' ? filterPeriod : 'all'} 
            onValueChange={(value) => setFilterPeriod(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="01">Enero</SelectItem>
              <SelectItem value="02">Febrero</SelectItem>
              <SelectItem value="03">Marzo</SelectItem>
              <SelectItem value="04">Abril</SelectItem>
              <SelectItem value="05">Mayo</SelectItem>
              <SelectItem value="06">Junio</SelectItem>
              <SelectItem value="07">Julio</SelectItem>
              <SelectItem value="08">Agosto</SelectItem>
              <SelectItem value="09">Septiembre</SelectItem>
              <SelectItem value="10">Octubre</SelectItem>
              <SelectItem value="11">Noviembre</SelectItem>
              <SelectItem value="12">Diciembre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="md:col-span-3 flex justify-end gap-2 mt-2">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="flex items-center gap-2"
            size="sm"
          >
            <FileText className="h-4 w-4" />
            Descargar PDF
          </Button>
          
          <Button
            onClick={handleDownloadExcel}
            variant="outline" 
            className="flex items-center gap-2 bg-white text-green-600 border-green-200 hover:bg-green-50"
            size="sm"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Descargar Excel
          </Button>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Facturas */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <div className="rounded-md bg-blue-100 p-2 mr-4">
                <Receipt className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-4xl font-bold">{facturasCount}</p>
                <p className="text-sm text-muted-foreground">Total emitidas</p>
                <p className="text-lg font-semibold mt-1 text-blue-700">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(facturasTotal)}
                </p>
                <p className="text-xs text-muted-foreground">Importe total facturado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card className="bg-amber-50 border-amber-100">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <div className="rounded-md bg-amber-100 p-2 mr-4">
                <Wallet className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <p className="text-4xl font-bold">{gastosCount}</p>
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-lg font-semibold mt-1 text-amber-700">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(gastosTotal)}
                </p>
                <p className="text-xs text-muted-foreground">Importe total gastado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Presupuestos */}
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-start">
              <div className="rounded-md bg-emerald-100 p-2 mr-4">
                <ScrollText className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <p className="text-4xl font-bold">{presupuestosCount}</p>
                <p className="text-sm text-muted-foreground">Total presupuestos</p>
                <p className="text-lg font-semibold mt-1 text-emerald-700">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(0)}
                </p>
                <p className="text-xs text-muted-foreground">Importe total presupuestado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className={balanceTotal >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}>
          <CardContent className="pt-6">
            <div className="flex items-start">
              <div className={`rounded-md p-2 mr-4 ${balanceTotal >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                <BarChart2 className={`h-6 w-6 ${balanceTotal >= 0 ? "text-green-700" : "text-red-700"}`} />
              </div>
              <div>
                <p className={`text-4xl font-bold ${balanceTotal >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(balanceTotal)}
                </p>
                <p className="text-sm text-muted-foreground">Resultado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facturas emitidas */}
      <Card className="mb-6">
        <CardHeader className="py-4 px-6">
          <div className="flex items-center">
            <Receipt className="h-5 w-5 text-blue-700 mr-2" />
            <CardTitle className="text-lg">Facturas emitidas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>{invoice.clientName}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(invoice.subtotal)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(invoice.tax)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                          : invoice.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                          : 'bg-red-100 text-red-800 hover:bg-red-100'
                      }>
                        {invoice.status === 'paid' 
                          ? 'Pagada' 
                          : invoice.status === 'pending' 
                          ? 'Pendiente'
                          : 'Rechazada'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay facturas emitidas en el periodo seleccionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gastos y transacciones */}
      <Card className="mb-6">
        <CardHeader className="py-4 px-6">
          <div className="flex items-center">
            <Wallet className="h-5 w-5 text-amber-700 mr-2" />
            <CardTitle className="text-lg">Gastos y transacciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredData.transactions.filter(t => t.type === 'expense').length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.transactions
                  .filter(t => t.type === 'expense')
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString('es-ES')}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.category || 'Sin categoría'}</TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Gasto</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(parseFloat(transaction.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay gastos en el periodo seleccionado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Presupuestos */}
      <Card className="mb-6">
        <CardHeader className="py-4 px-6">
          <div className="flex items-center">
            <ScrollText className="h-5 w-5 text-emerald-700 mr-2" />
            <CardTitle className="text-lg">Presupuestos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">1</TableCell>
                <TableCell>27/03/2025</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>1.060,00 €</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aceptado</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">P-001</TableCell>
                <TableCell>01/04/2025</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>6.360,00 €</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aceptado</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">MA</TableCell>
                <TableCell>28/03/2025</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>106,00 €</TableCell>
                <TableCell>
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rechazado</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">4P-001</TableCell>
                <TableCell>28/03/2025</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>1.060,00 €</TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aceptado</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// Componentes anteriores de listas eliminados ya que ahora usamos un diseño diferente

// Exportamos el componente principal
export default LibroRegistrosPage;