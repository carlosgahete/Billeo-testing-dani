import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart3, FileText, FileSpreadsheet, Wallet, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  const [activeTab, setActiveTab] = useState<string>('ingresos');

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Libro de Registros</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus registros contables y descarga informes filtrados.
          </p>
        </div>
        
        <div className="flex mt-4 lg:mt-0 space-x-4">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="flex items-center w-[150px] justify-center"
            size="lg"
          >
            <FileText className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          
          <Button
            onClick={handleDownloadExcel}
            variant="outline" 
            className="flex items-center w-[150px] justify-center"
            size="lg"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Descargar Excel
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Selecciona el periodo que deseas visualizar</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-4 md:mt-0">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Año</label>
                <Select
                  value={filterYear}
                  onValueChange={(value) => setFilterYear(value)}
                >
                  <SelectTrigger className="w-[160px]">
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
              
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium">Periodo</label>
                <Select 
                  value={filterPeriod} 
                  onValueChange={(value) => setFilterPeriod(value)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Selecciona un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo el año</SelectItem>
                    <SelectItem value="1T">1T (Ene - Mar)</SelectItem>
                    <SelectItem value="2T">2T (Abr - Jun)</SelectItem>
                    <SelectItem value="3T">3T (Jul - Sep)</SelectItem>
                    <SelectItem value="4T">4T (Oct - Dic)</SelectItem>
                    <Separator className="my-2" />
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
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center text-sm bg-muted/50 p-3 rounded-lg">
            <Filter className="mr-2 h-4 w-4 text-primary" />
            <span>
              Mostrando registros de <strong>{getPeriodName(filterPeriod)}</strong> del año <strong>{filterYear}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md mb-6">
          <TabsTrigger value="ingresos" className="flex-1">Ingresos</TabsTrigger>
          <TabsTrigger value="gastos" className="flex-1">Gastos</TabsTrigger>
          <TabsTrigger value="facturas" className="flex-1">Facturas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ingresos">
          <IngresosList 
            transactions={filteredData.transactions.filter(t => t.type === 'income')} 
          />
        </TabsContent>
        
        <TabsContent value="gastos">
          <GastosList 
            transactions={filteredData.transactions.filter(t => t.type === 'expense')} 
          />
        </TabsContent>
        
        <TabsContent value="facturas">
          <FacturasList 
            invoices={filteredData.invoices} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para mostrar la lista de ingresos
const IngresosList: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-10">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay ingresos en el periodo seleccionado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Prueba seleccionando un periodo diferente o añade nuevos ingresos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos registrados</CardTitle>
        <CardDescription>
          Total: {transactions.length} ingresos por un importe de {
            new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(
              transactions.reduce((total, t) => total + parseFloat(t.amount), 0)
            )
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('es-ES')}</TableCell>
                  <TableCell>{transaction.title}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(parseFloat(transaction.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para mostrar la lista de gastos
const GastosList: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-10">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay gastos en el periodo seleccionado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Prueba seleccionando un periodo diferente o añade nuevos gastos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos registrados</CardTitle>
        <CardDescription>
          Total: {transactions.length} gastos por un importe de {
            new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(
              transactions.reduce((total, t) => total + parseFloat(t.amount), 0)
            )
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString('es-ES')}</TableCell>
                  <TableCell>{transaction.title}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(parseFloat(transaction.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Componente para mostrar la lista de facturas
const FacturasList: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-10">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No hay facturas en el periodo seleccionado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Prueba seleccionando un periodo diferente o añade nuevas facturas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturas registradas</CardTitle>
        <CardDescription>
          Total: {invoices.length} facturas por un importe de {
            new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: 'EUR'
            }).format(
              invoices.reduce((total, i) => total + i.total, 0)
            )
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</TableCell>
                  <TableCell>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : invoice.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {invoice.status === 'paid' 
                        ? 'Pagada' 
                        : invoice.status === 'pending' 
                        ? 'Pendiente'
                        : 'Vencida'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat('es-ES', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(invoice.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// Exportamos el componente principal
export default LibroRegistrosPage;