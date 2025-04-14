import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces para los datos
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
  user?: {
    id: number;
    username: string;
    name: string;
  };
  client?: any;
  company?: any;
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

// Componente principal - sin restricciones de autenticación
export default function LibroRegistrosLibre() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<string>("all");
  
  // ID de usuario hardcodeado para pruebas
  const DEMO_USER_ID = "1";
  
  // Función para cargar datos - usando directamente el userId 1 para pruebas
  const fetchLibroData = async () => {
    try {
      setLoading(true);
      console.log("Cargando datos del libro de registros para usuario de prueba...");
      
      const response = await fetch(`/api/libro-registros/${DEMO_USER_ID}?year=${selectedYear}&quarter=${selectedQuarter}&month=${selectedMonth}&card=${selectedCard}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
      console.log("Datos cargados correctamente:", result);
    } catch (err: any) {
      console.error("Error fetching libro-registros data:", err);
      setError(`Error al cargar los datos: ${err.message}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchLibroData();
  }, [selectedYear, selectedQuarter, selectedMonth, selectedCard]);

  // Filtros por año, trimestre y mes
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setSelectedQuarter("all");
    setSelectedMonth("all");
  };

  const handleQuarterChange = (value: string) => {
    setSelectedQuarter(value);
    setSelectedMonth("all");
  };

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
  };
  
  const handleCardChange = (value: string) => {
    setSelectedCard(value);
  };

  // Generar PDF con los datos actuales
  const generatePDF = () => {
    if (!data) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Libro de Registros", 14, 22);
    doc.setFontSize(11);
    doc.text(`Año: ${selectedYear}${selectedQuarter !== 'all' ? ` - Trimestre: ${selectedQuarter}` : ''}${selectedMonth !== 'all' ? ` - Mes: ${selectedMonth}` : ''}`, 14, 30);
    
    // Resumen
    doc.setFontSize(14);
    doc.text("Resumen", 14, 40);
    
    const summaryData = [
      ['Concepto', 'Cantidad', 'Importe Total'],
      ['Facturas', data.summary.totalInvoices.toString(), `${data.summary.incomeTotal.toLocaleString('es-ES')} €`],
      ['Gastos', data.summary.totalTransactions.toString(), `${data.summary.expenseTotal.toLocaleString('es-ES')} €`],
      ['Presupuestos', data.summary.totalQuotes.toString(), '']
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'striped',
    });
    
    // Facturas
    if (data.invoices.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Facturas", 14, 20);
      
      const invoiceData = [
        ['Número', 'Fecha', 'Cliente', 'Base', 'IVA', 'Total', 'Estado'],
        ...data.invoices.map(inv => [
          inv.number,
          format(new Date(inv.issueDate), 'dd/MM/yyyy'),
          inv.client,
          `${inv.baseAmount.toLocaleString('es-ES')} €`,
          `${inv.vatAmount.toLocaleString('es-ES')} €`,
          `${inv.total.toLocaleString('es-ES')} €`,
          getStatusText(inv.status)
        ])
      ];
      
      autoTable(doc, {
        startY: 25,
        head: [invoiceData[0]],
        body: invoiceData.slice(1),
        theme: 'striped',
      });
    }
    
    // Transacciones
    if (data.transactions.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Gastos", 14, 20);
      
      const transactionData = [
        ['Fecha', 'Descripción', 'Categoría', 'Importe', 'Tipo'],
        ...data.transactions.map(tr => [
          format(new Date(tr.date), 'dd/MM/yyyy'),
          tr.description,
          tr.category,
          `${Math.abs(tr.amount).toLocaleString('es-ES')} €`,
          tr.type === 'income' ? 'Ingreso' : 'Gasto'
        ])
      ];
      
      autoTable(doc, {
        startY: 25,
        head: [transactionData[0]],
        body: transactionData.slice(1),
        theme: 'striped',
      });
    }
    
    // Presupuestos
    if (data.quotes.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Presupuestos", 14, 20);
      
      const quoteData = [
        ['Número', 'Fecha', 'Cliente', 'Total', 'Estado'],
        ...data.quotes.map(q => [
          q.number,
          format(new Date(q.issueDate), 'dd/MM/yyyy'),
          q.clientName,
          `${q.total.toLocaleString('es-ES')} €`,
          getStatusText(q.status)
        ])
      ];
      
      autoTable(doc, {
        startY: 25,
        head: [quoteData[0]],
        body: quoteData.slice(1),
        theme: 'striped',
      });
    }
    
    doc.save(`libro-registros-${selectedYear}${selectedQuarter !== 'all' ? `-T${selectedQuarter}` : ''}${selectedMonth !== 'all' ? `-M${selectedMonth}` : ''}.pdf`);
  };

  // Generar CSV con los datos actuales
  const generateCSV = () => {
    if (!data) return;
    
    // Preparar datos para CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Encabezado
    csvContent += "Libro de Registros - Año: " + selectedYear;
    if (selectedQuarter !== 'all') csvContent += " - Trimestre: " + selectedQuarter;
    if (selectedMonth !== 'all') csvContent += " - Mes: " + selectedMonth;
    csvContent += "\n\n";
    
    // Resumen
    csvContent += "RESUMEN\n";
    csvContent += "Concepto,Cantidad,Importe Total\n";
    csvContent += `Facturas,${data.summary.totalInvoices},${data.summary.incomeTotal.toLocaleString('es-ES')} €\n`;
    csvContent += `Gastos,${data.summary.totalTransactions},${data.summary.expenseTotal.toLocaleString('es-ES')} €\n`;
    csvContent += `Presupuestos,${data.summary.totalQuotes},\n\n`;
    
    // Facturas
    if (data.invoices.length > 0) {
      csvContent += "FACTURAS\n";
      csvContent += "Número,Fecha,Cliente,Base,IVA,Total,Estado\n";
      
      data.invoices.forEach(inv => {
        csvContent += `${inv.number},${format(new Date(inv.issueDate), 'dd/MM/yyyy')},"${inv.client}",${inv.baseAmount.toLocaleString('es-ES')} €,${inv.vatAmount.toLocaleString('es-ES')} €,${inv.total.toLocaleString('es-ES')} €,${getStatusText(inv.status)}\n`;
      });
      
      csvContent += "\n";
    }
    
    // Transacciones
    if (data.transactions.length > 0) {
      csvContent += "GASTOS\n";
      csvContent += "Fecha,Descripción,Categoría,Importe,Tipo\n";
      
      data.transactions.forEach(tr => {
        csvContent += `${format(new Date(tr.date), 'dd/MM/yyyy')},"${tr.description}","${tr.category}",${Math.abs(tr.amount).toLocaleString('es-ES')} €,${tr.type === 'income' ? 'Ingreso' : 'Gasto'}\n`;
      });
      
      csvContent += "\n";
    }
    
    // Presupuestos
    if (data.quotes.length > 0) {
      csvContent += "PRESUPUESTOS\n";
      csvContent += "Número,Fecha,Cliente,Total,Estado\n";
      
      data.quotes.forEach(q => {
        csvContent += `${q.number},${format(new Date(q.issueDate), 'dd/MM/yyyy')},"${q.clientName}",${q.total.toLocaleString('es-ES')} €,${getStatusText(q.status)}\n`;
      });
    }
    
    // Crear enlace de descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `libro-registros-${selectedYear}${selectedQuarter !== 'all' ? `-T${selectedQuarter}` : ''}${selectedMonth !== 'all' ? `-M${selectedMonth}` : ''}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funciones auxiliares para mostrar estados
  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Pendiente",
      paid: "Pagado",
      overdue: "Vencido",
      draft: "Borrador",
      accepted: "Aceptado",
      rejected: "Rechazado",
      sent: "Enviado"
    };
    
    return statusMap[status] || status;
  }

  // Funciones auxiliares para obtener nombres de meses
  const getMonthName = (monthNum: string): string => {
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return monthNames[parseInt(monthNum) - 1];
  };

  // Determinar trimestre basado en mes seleccionado
  const getQuarterFromMonth = (month: number): string => {
    if (month >= 1 && month <= 3) return "1";
    if (month >= 4 && month <= 6) return "2";
    if (month >= 7 && month <= 9) return "3";
    return "4";
  };

  // Obtener años disponibles para selector
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return [
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1
    ].map(year => ({
      value: year.toString(),
      label: year.toString()
    }));
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h1 className="text-2xl font-bold">Libro de Registros</h1>
          <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
            <Button 
              variant="default" 
              onClick={generatePDF}
              className="flex items-center gap-2 w-[150px]"
              disabled={loading || !data}
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            
            <Button 
              variant="default" 
              onClick={generateCSV}
              className="flex items-center gap-2 w-[150px]"
              disabled={loading || !data}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="year-select">Año</Label>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Selecciona un año" />
              </SelectTrigger>
              <SelectContent>
                {getYearOptions().map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="quarter-select">Trimestre</Label>
            <Select value={selectedQuarter} onValueChange={handleQuarterChange}>
              <SelectTrigger id="quarter-select">
                <SelectValue placeholder="Selecciona un trimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Primer trimestre</SelectItem>
                <SelectItem value="2">Segundo trimestre</SelectItem>
                <SelectItem value="3">Tercer trimestre</SelectItem>
                <SelectItem value="4">Cuarto trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="month-select">Mes</Label>
            <Select 
              value={selectedMonth} 
              onValueChange={handleMonthChange}
              disabled={selectedQuarter !== "all" && selectedQuarter !== ""}
            >
              <SelectTrigger id="month-select">
                <SelectValue placeholder="Selecciona un mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {[...Array(12)].map((_, i) => (
                  <SelectItem 
                    key={i + 1} 
                    value={(i + 1).toString()}
                    disabled={selectedQuarter !== "all" && selectedQuarter !== getQuarterFromMonth(i + 1)}
                  >
                    {getMonthName((i + 1).toString())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="card-select">Medio de pago</Label>
            <Select value={selectedCard} onValueChange={handleCardChange}>
              <SelectTrigger id="card-select">
                <SelectValue placeholder="Selecciona tarjeta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Bizum">Bizum</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Mensaje de error */}
        {error && !loading && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <p className="text-sm mt-2">
              Intenta recargar la página o contacta al soporte si el problema persiste.
            </p>
          </div>
        )}
        
        {/* Mostrar datos */}
        {data && !loading && !error && (
          <div className="space-y-6">
            {/* Datos de usuario */}
            {data.user && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h2 className="text-lg font-semibold mb-2">Datos del usuario</h2>
                <p><strong>Nombre:</strong> {data.user.name}</p>
                <p><strong>Usuario:</strong> {data.user.username}</p>
              </div>
            )}
            
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Facturas emitidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-2xl font-bold">{data.summary.totalInvoices}</div>
                    <div className="text-xl text-right">
                      {data.summary.incomeTotal.toLocaleString('es-ES')} €
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Gastos registrados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-2xl font-bold">{data.summary.totalTransactions}</div>
                    <div className="text-xl text-right">
                      {data.summary.expenseTotal.toLocaleString('es-ES')} €
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    Presupuestos enviados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.summary.totalQuotes}</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Tabla de facturas */}
            {data.invoices.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Facturas</h2>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Base</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell>{invoice.number}</TableCell>
                            <TableCell>
                              {format(new Date(invoice.issueDate), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{invoice.client}</TableCell>
                            <TableCell className="text-right">
                              {invoice.baseAmount.toLocaleString('es-ES')} €
                            </TableCell>
                            <TableCell className="text-right">
                              {invoice.vatAmount.toLocaleString('es-ES')} €
                            </TableCell>
                            <TableCell className="text-right">
                              {invoice.total.toLocaleString('es-ES')} €
                            </TableCell>
                            <TableCell>
                              <span 
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                                      'bg-yellow-100 text-yellow-800'}`}
                              >
                                {getStatusText(invoice.status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tabla de gastos */}
            {data.transactions.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Gastos</h2>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead>Tipo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(new Date(transaction.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>{transaction.category}</TableCell>
                            <TableCell className="text-right">
                              {Math.abs(transaction.amount).toLocaleString('es-ES')} €
                            </TableCell>
                            <TableCell>
                              <span 
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                              >
                                {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tabla de presupuestos */}
            {data.quotes.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4">Presupuestos</h2>
                <div className="rounded-md border overflow-hidden">
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
                        {data.quotes.map((quote) => (
                          <TableRow key={quote.id}>
                            <TableCell>{quote.number}</TableCell>
                            <TableCell>
                              {format(new Date(quote.issueDate), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>{quote.clientName}</TableCell>
                            <TableCell className="text-right">
                              {quote.total.toLocaleString('es-ES')} €
                            </TableCell>
                            <TableCell>
                              <span 
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium
                                  ${quote.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                    quote.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                      'bg-yellow-100 text-yellow-800'}`}
                              >
                                {getStatusText(quote.status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mensaje si no hay datos */}
            {data.invoices.length === 0 && data.transactions.length === 0 && data.quotes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay datos disponibles para los filtros seleccionados.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}