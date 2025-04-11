import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, ShoppingCart, File } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LibroRegistrosData {
  invoices: Invoice[];
  transactions: Transaction[];
  quotes: Quote[];
  summary: {
    totalInvoices: number;
    totalTransactions: number;
    totalQuotes: number;
    incomeTotal: number;
    expenseTotal: number;
  };
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
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
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
}

import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function SimpleLibroRegistros() {
  const params = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = params?.userId || '';
  const { user } = useAuth();
  
  // Verificación adicional de seguridad: solo superadmin o el usuario 'Superadmin' puede ver esto 
  // Esta es una protección redundante junto con la protección de ruta en App.tsx
  if (!user || (
    user.role !== 'superadmin' && 
    user.role !== 'SUPERADMIN' && 
    user.role !== 'admin' &&
    user.username !== 'Superadmin'
  )) {
    return <Redirect to="/" />;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // La ruta debe coincidir con la API en el backend
        const apiUrl = `/api/public/libro-registros/${userId}`;
        console.log("Consultando datos del Libro de Registros desde:", apiUrl);
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Error al obtener datos: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.error("Error al cargar datos del libro de registros:", err);
        setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchData();
    } else {
      setLoading(false);
      setError("ID de usuario no proporcionado");
    }
  }, [userId]);

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
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <p className="mt-4 text-sm">
              Posibles causas:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-gray-600">
              <li>Problemas de conexión con el servidor</li>
              <li>ID de usuario inválido o no encontrado</li>
              <li>Problemas de autenticación (sesión expirada)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Libro de Registros</h1>
          <p className="text-sm text-gray-500">
            Visualizando registros del usuario ID: {userId || 'No seleccionado'}
          </p>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2 bg-blue-50 rounded-t-lg border-b border-blue-100">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Facturas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{data?.summary.totalInvoices || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total emitidas</p>
            <p className="text-lg font-semibold mt-2">{formatCurrency(data?.summary.incomeTotal || 0)}</p>
            <p className="text-xs text-gray-500">Importe total facturado</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 bg-amber-50 rounded-t-lg border-b border-amber-100">
            <CardTitle className="text-lg flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{data?.summary.totalTransactions || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Transacciones</p>
            <p className="text-lg font-semibold mt-2">{formatCurrency(data?.summary.expenseTotal || 0)}</p>
            <p className="text-xs text-gray-500">Importe total gastado</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 bg-emerald-50 rounded-t-lg border-b border-emerald-100">
            <CardTitle className="text-lg flex items-center">
              <File className="h-5 w-5 mr-2 text-emerald-500" />
              Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{data?.summary.totalQuotes || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total presupuestos</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2 bg-purple-50 rounded-t-lg border-b border-purple-100">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-purple-500" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">
              {formatCurrency((data?.summary.incomeTotal || 0) - (data?.summary.expenseTotal || 0))}
            </p>
            <p className="text-sm text-gray-500 mt-1">Resultado</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Sección de facturas */}
      <Card className="mb-8">
        <CardHeader className="bg-blue-50 border-b border-blue-100">
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-500" />
            Facturas emitidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data?.invoices && data.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Base Imponible</TableHead>
                    <TableHead>IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.slice(0, 5).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell>{formatCurrency(invoice.baseAmount)}</TableCell>
                      <TableCell>{formatCurrency(invoice.vatAmount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs 
                          ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                          invoice.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                          'bg-red-100 text-red-800'}`}>
                          {invoice.status === 'paid' ? 'Pagada' : 
                           invoice.status === 'pending' ? 'Pendiente' : 
                           'Cancelada'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.invoices.length > 5 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Mostrando 5 de {data.invoices.length} facturas
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No hay facturas disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Sección de gastos */}
      <Card className="mb-8">
        <CardHeader className="bg-amber-50 border-b border-amber-100">
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
            Gastos y transacciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data?.transactions && data.transactions.length > 0 ? (
            <div className="overflow-x-auto">
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
                  {data.transactions.slice(0, 5).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>{transaction.category || 'Sin categoría'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs 
                          ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 
                           'bg-red-100 text-red-800'}`}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-semibold 
                        ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.transactions.length > 5 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Mostrando 5 de {data.transactions.length} transacciones
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No hay transacciones disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Sección de presupuestos */}
      <Card>
        <CardHeader className="bg-emerald-50 border-b border-emerald-100">
          <CardTitle className="flex items-center">
            <File className="h-5 w-5 mr-2 text-emerald-500" />
            Presupuestos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data?.quotes && data.quotes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.quotes.slice(0, 5).map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.number}</TableCell>
                      <TableCell>{formatDate(quote.issueDate)}</TableCell>
                      <TableCell>{quote.clientName}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(quote.total)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs 
                          ${quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                          quote.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                          'bg-red-100 text-red-800'}`}>
                          {quote.status === 'accepted' ? 'Aceptado' : 
                           quote.status === 'pending' ? 'Pendiente' : 
                           'Rechazado'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.quotes.length > 5 && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Mostrando 5 de {data.quotes.length} presupuestos
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">No hay presupuestos disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}