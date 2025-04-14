import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Funciones de utilidades para formatear fecha y moneda
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy", { locale: es });
  } catch (e) {
    return dateString;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(amount);
};

// Tipo para todos los datos del libro de registros
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

// Tipo para facturas
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

// Tipo para presupuestos
interface QuoteRecord {
  id: number;
  number: string;
  date: string;
  clientName: string;
  total: string;
  status: string;
}

// Tipo para transacciones
interface TransactionRecord {
  id: number;
  date: string;
  description: string;
  category?: string;
  type: string;
  amount: string;
}

// Tipo para los datos de resumen
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

// Componente principal
export default function LibroRegistrosPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Estado para controlar la carga de datos
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  
  // Datos filtrados
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceRecord[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionRecord[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  
  // Redirección si no hay usuario
  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);
  
  // Función para cargar datos del libro de registros
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const userId = user.id.toString();
        const apiUrl = `/api/libro-registros/${userId}?year=${selectedYear}&quarter=${selectedQuarter}&month=${selectedMonth}`;
        
        const response = await fetch(apiUrl, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.error("Error al cargar datos del libro de registros:", err);
        setError(`No se pudieron cargar los datos del libro de registros: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, selectedYear, selectedQuarter, selectedMonth]);
  
  // Filtrar datos cuando cambian los filtros o los datos
  useEffect(() => {
    if (!data) return;
    
    // Filtro de año
    const year = parseInt(selectedYear);
    
    // Filtro de trimestre
    let quarterMonths: number[] = [];
    if (selectedQuarter === "Q1") quarterMonths = [1, 2, 3];
    if (selectedQuarter === "Q2") quarterMonths = [4, 5, 6];
    if (selectedQuarter === "Q3") quarterMonths = [7, 8, 9];
    if (selectedQuarter === "Q4") quarterMonths = [10, 11, 12];
    
    // Filtro de mes específico
    const month = selectedMonth !== "all" ? parseInt(selectedMonth) : null;
    
    // Filtrar facturas
    const invoices = data.invoices.filter(invoice => {
      const date = new Date(invoice.date);
      const invoiceYear = date.getFullYear();
      const invoiceMonth = date.getMonth() + 1;
      
      // Filtrar por año
      if (invoiceYear !== year) return false;
      
      // Filtrar por trimestre si está seleccionado
      if (selectedQuarter !== "all" && !quarterMonths.includes(invoiceMonth)) return false;
      
      // Filtrar por mes si está seleccionado
      if (month !== null && invoiceMonth !== month) return false;
      
      return true;
    });
    
    // Filtrar presupuestos
    const quotes = data.quotes.filter(quote => {
      const date = new Date(quote.date);
      const quoteYear = date.getFullYear();
      const quoteMonth = date.getMonth() + 1;
      
      // Filtrar por año
      if (quoteYear !== year) return false;
      
      // Filtrar por trimestre si está seleccionado
      if (selectedQuarter !== "all" && !quarterMonths.includes(quoteMonth)) return false;
      
      // Filtrar por mes si está seleccionado
      if (month !== null && quoteMonth !== month) return false;
      
      return true;
    });
    
    // Filtrar transacciones
    const transactions = data.transactions.filter(transaction => {
      const date = new Date(transaction.date);
      const transactionYear = date.getFullYear();
      const transactionMonth = date.getMonth() + 1;
      
      // Filtrar por año
      if (transactionYear !== year) return false;
      
      // Filtrar por trimestre si está seleccionado
      if (selectedQuarter !== "all" && !quarterMonths.includes(transactionMonth)) return false;
      
      // Filtrar por mes si está seleccionado
      if (month !== null && transactionMonth !== month) return false;
      
      return true;
    });
    
    // Calcular resumen
    const incomeTransactions = transactions.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const expenseTransactions = transactions.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    // Calcular totales de facturas
    const invoiceTotal = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0);
    
    // Actualizar estados
    setFilteredInvoices(invoices);
    setFilteredQuotes(quotes);
    setFilteredTransactions(transactions);
    
    // Actualizar resumen
    setSummary({
      totalInvoices: invoices.length,
      totalTransactions: transactions.length,
      totalQuotes: quotes.length,
      incomeTotal: invoiceTotal,
      expenseTotal: expenseTransactions,
      balance: invoiceTotal - expenseTransactions
    });
    
  }, [data, selectedYear, selectedQuarter, selectedMonth]);
  
  // Función para exportar a PDF
  const exportToPDF = () => {
    if (!filteredInvoices || !filteredTransactions || !filteredQuotes || !summary) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text("Libro de Registros", 14, 20);
      
      // Filtros aplicados
      doc.setFontSize(10);
      let filterText = `Año: ${selectedYear}`;
      if (selectedQuarter !== "all") filterText += `, Trimestre: ${selectedQuarter}`;
      if (selectedMonth !== "all") {
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        filterText += `, Mes: ${monthNames[parseInt(selectedMonth) - 1]}`;
      }
      doc.text(filterText, 14, 28);
      
      // Resumen
      doc.setFontSize(12);
      doc.text("Resumen", 14, 38);
      
      doc.setFontSize(10);
      doc.text(`Facturas: ${summary.totalInvoices} - Total: ${formatCurrency(summary.incomeTotal)}`, 14, 46);
      doc.text(`Gastos: ${filteredTransactions.filter(t => t.type === 'expense').length} - Total: ${formatCurrency(summary.expenseTotal)}`, 14, 54);
      doc.text(`Presupuestos: ${summary.totalQuotes}`, 14, 62);
      doc.text(`Balance: ${formatCurrency(summary.balance)}`, 14, 70);
      
      // Facturas
      doc.setFontSize(12);
      doc.text("Facturas emitidas", 14, 82);
      
      // @ts-ignore - La biblioteca jspdf-autotable no está bien tipada con TypeScript
      doc.autoTable({
        startY: 86,
        head: [['Número', 'Fecha', 'Cliente', 'Base imponible', 'IVA', 'Total', 'Estado']],
        body: filteredInvoices.map(inv => [
          inv.number,
          formatDate(inv.date),
          inv.clientName,
          formatCurrency(parseFloat(inv.subtotal)),
          formatCurrency(parseFloat(inv.tax)),
          formatCurrency(parseFloat(inv.total)),
          inv.status === 'paid' ? 'Pagada' : inv.status
        ])
      });
      
      // Presupuestos
      // @ts-ignore
      const finalY = doc.lastAutoTable.finalY || 150;
      doc.setFontSize(12);
      doc.text("Presupuestos", 14, finalY + 10);
      
      // @ts-ignore
      doc.autoTable({
        startY: finalY + 14,
        head: [['Número', 'Fecha', 'Cliente', 'Total', 'Estado']],
        body: filteredQuotes.map(quote => [
          quote.number,
          formatDate(quote.date),
          quote.clientName,
          formatCurrency(parseFloat(quote.total)),
          quote.status === 'accepted' ? 'Aceptado' : 
          quote.status === 'rejected' ? 'Rechazado' : quote.status
        ])
      });
      
      // Gastos y transacciones
      // @ts-ignore
      const finalY2 = doc.lastAutoTable.finalY || finalY + 60;
      
      // Verificar si necesitamos una nueva página
      if (finalY2 > 240) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text("Gastos y transacciones", 14, 20);
        
        // @ts-ignore
        doc.autoTable({
          startY: 24,
          head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe']],
          body: filteredTransactions.map(t => [
            formatDate(t.date),
            t.description,
            t.category || '',
            t.type === 'income' ? 'Ingreso' : 'Gasto',
            formatCurrency(parseFloat(t.amount))
          ])
        });
      } else {
        doc.setFontSize(12);
        doc.text("Gastos y transacciones", 14, finalY2 + 10);
        
        // @ts-ignore
        doc.autoTable({
          startY: finalY2 + 14,
          head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe']],
          body: filteredTransactions.map(t => [
            formatDate(t.date),
            t.description,
            t.category || '',
            t.type === 'income' ? 'Ingreso' : 'Gasto',
            formatCurrency(parseFloat(t.amount))
          ])
        });
      }
      
      doc.save(`libro-registros-${selectedYear}-${selectedQuarter}-${selectedMonth}.pdf`);
      
      toast({
        title: "Éxito",
        description: "El PDF se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };
  
  // Función para exportar a Excel (en este ejemplo, como CSV)
  const exportToExcel = () => {
    if (!filteredInvoices || !filteredTransactions || !filteredQuotes || !summary) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Crear CSV para facturas
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Encabezados y resumen
      csvContent += "LIBRO DE REGISTROS\\n";
      csvContent += `Año: ${selectedYear}, `;
      if (selectedQuarter !== "all") csvContent += `Trimestre: ${selectedQuarter}, `;
      if (selectedMonth !== "all") {
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        csvContent += `Mes: ${monthNames[parseInt(selectedMonth) - 1]}`;
      }
      csvContent += "\\n\\n";
      
      // Resumen
      csvContent += "RESUMEN\\n";
      csvContent += `Facturas: ${summary.totalInvoices} - Total: ${formatCurrency(summary.incomeTotal)}\\n`;
      csvContent += `Gastos: ${filteredTransactions.filter(t => t.type === 'expense').length} - Total: ${formatCurrency(summary.expenseTotal)}\\n`;
      csvContent += `Presupuestos: ${summary.totalQuotes}\\n`;
      csvContent += `Balance: ${formatCurrency(summary.balance)}\\n\\n`;
      
      // Facturas
      csvContent += "FACTURAS EMITIDAS\\n";
      csvContent += "Número,Fecha,Cliente,Base imponible,IVA,Total,Estado\\n";
      
      filteredInvoices.forEach(inv => {
        csvContent += `${inv.number},${formatDate(inv.date)},${inv.clientName},${inv.subtotal},${inv.tax},${inv.total},${inv.status === 'paid' ? 'Pagada' : inv.status}\\n`;
      });
      
      csvContent += "\\n";
      
      // Presupuestos
      csvContent += "PRESUPUESTOS\\n";
      csvContent += "Número,Fecha,Cliente,Total,Estado\\n";
      
      filteredQuotes.forEach(quote => {
        const status = quote.status === 'accepted' ? 'Aceptado' : 
                      quote.status === 'rejected' ? 'Rechazado' : quote.status;
                      
        csvContent += `${quote.number},${formatDate(quote.date)},${quote.clientName},${quote.total},${status}\\n`;
      });
      
      csvContent += "\\n";
      
      // Gastos y transacciones
      csvContent += "GASTOS Y TRANSACCIONES\\n";
      csvContent += "Fecha,Descripción,Categoría,Tipo,Importe\\n";
      
      filteredTransactions.forEach(t => {
        const type = t.type === 'income' ? 'Ingreso' : 'Gasto';
        csvContent += `${formatDate(t.date)},${t.description},${t.category || ''},${type},${t.amount}\\n`;
      });
      
      // Crear un enlace para descargar el archivo
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `libro-registros-${selectedYear}-${selectedQuarter}-${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Éxito",
        description: "El archivo Excel se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error al generar Excel:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el archivo Excel",
        variant: "destructive"
      });
    }
  };
  
  // Renderizar componente de carga
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Libro de Registros"
          description="Consulta y exporta tu actividad financiera"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // Renderizar mensaje de error
  if (error) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Libro de Registros"
          description="Consulta y exporta tu actividad financiera"
        />
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center text-red-500">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Si no hay datos después de cargar
  if (!data || !summary) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader
          title="Libro de Registros"
          description="Consulta y exporta tu actividad financiera"
        />
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">No hay datos disponibles para mostrar.</div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Renderizar componente principal
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <PageHeader
        title="Libro de Registros"
        description="Consulta y exporta tu actividad financiera"
        className="mb-10"
      />
      
      {/* Filtros y botones de exportación */}
      <div className="backdrop-blur-sm bg-white/30 dark:bg-gray-950/30 rounded-2xl p-6 mb-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">Año</p>
            <Select 
              value={selectedYear} 
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border-0 shadow-sm">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">Trimestre</p>
            <Select 
              value={selectedQuarter} 
              onValueChange={setSelectedQuarter}
            >
              <SelectTrigger className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border-0 shadow-sm">
                <SelectValue placeholder="Seleccionar trimestre" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Q1">1º Trimestre</SelectItem>
                <SelectItem value="Q2">2º Trimestre</SelectItem>
                <SelectItem value="Q3">3º Trimestre</SelectItem>
                <SelectItem value="Q4">4º Trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">Mes</p>
            <Select 
              value={selectedMonth} 
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="w-full rounded-xl bg-gray-50 dark:bg-gray-900 border-0 shadow-sm">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Enero</SelectItem>
                <SelectItem value="2">Febrero</SelectItem>
                <SelectItem value="3">Marzo</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Mayo</SelectItem>
                <SelectItem value="6">Junio</SelectItem>
                <SelectItem value="7">Julio</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Septiembre</SelectItem>
                <SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem>
                <SelectItem value="12">Diciembre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-3 items-end">
            <Button 
              variant="outline" 
              onClick={exportToPDF}
              className="flex items-center gap-2 rounded-xl h-10 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 border-0 shadow-sm transition-all"
            >
              <FileText size={16} />
              PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              className="flex items-center gap-2 rounded-xl h-10 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 border-0 shadow-sm transition-all"
            >
              <FileSpreadsheet size={16} />
              Excel
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="border-0 overflow-hidden rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-base font-medium text-blue-700 dark:text-blue-300">
              Facturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-white">{summary.totalInvoices}</div>
            <div className="text-sm text-blue-700/70 dark:text-blue-300/70">Total emitidas</div>
            <div className="text-xl font-semibold mt-3 text-blue-900 dark:text-white">{formatCurrency(summary.incomeTotal)}</div>
            <div className="text-sm text-blue-700/70 dark:text-blue-300/70">Importe total facturado</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 overflow-hidden rounded-2xl shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-2">
              <Download className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-300">
              Gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-white">
              {filteredTransactions.filter(t => t.type === 'expense').length}
            </div>
            <div className="text-sm text-amber-700/70 dark:text-amber-300/70">Transacciones</div>
            <div className="text-xl font-semibold mt-3 text-amber-900 dark:text-white">{formatCurrency(summary.expenseTotal)}</div>
            <div className="text-sm text-amber-700/70 dark:text-amber-300/70">Importe total gastado</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 overflow-hidden rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-base font-medium text-green-700 dark:text-green-300">
              Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-white">{summary.totalQuotes}</div>
            <div className="text-sm text-green-700/70 dark:text-green-300/70">Total presupuestos</div>
          </CardContent>
        </Card>
        
        <Card className="border-0 overflow-hidden rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20">
          <CardHeader className="pb-2">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mb-2">
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">=</span>
            </div>
            <CardTitle className="text-base font-medium text-purple-700 dark:text-purple-300">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-white">{formatCurrency(summary.balance)}</div>
            <div className="text-sm text-purple-700/70 dark:text-purple-300/70">Resultado</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabla de facturas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Facturas emitidas</h3>
          <div className="text-sm text-gray-500">{filteredInvoices.length} registros</div>
        </div>
        <Card className="border-0 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow className="border-b-0">
                    <TableHead className="font-medium text-gray-500">Número</TableHead>
                    <TableHead className="font-medium text-gray-500">Fecha</TableHead>
                    <TableHead className="font-medium text-gray-500">Cliente</TableHead>
                    <TableHead className="font-medium text-gray-500">Base</TableHead>
                    <TableHead className="font-medium text-gray-500">IVA</TableHead>
                    <TableHead className="font-medium text-gray-500">Total</TableHead>
                    <TableHead className="font-medium text-gray-500">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No hay facturas en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{formatDate(invoice.date)}</TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(invoice.subtotal))}</TableCell>
                        <TableCell>{formatCurrency(parseFloat(invoice.tax))}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(parseFloat(invoice.total))}</TableCell>
                        <TableCell>
                          <Badge className={invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 rounded-lg font-medium px-3 py-1" : "rounded-lg font-medium px-3 py-1"}>
                            {invoice.status === 'paid' ? 'Pagada' : invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabla de gastos y transacciones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Gastos y transacciones</h3>
          <div className="text-sm text-gray-500">{filteredTransactions.length} registros</div>
        </div>
        <Card className="border-0 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow className="border-b-0">
                    <TableHead className="font-medium text-gray-500">Fecha</TableHead>
                    <TableHead className="font-medium text-gray-500">Descripción</TableHead>
                    <TableHead className="font-medium text-gray-500">Categoría</TableHead>
                    <TableHead className="font-medium text-gray-500">Tipo</TableHead>
                    <TableHead className="font-medium text-gray-500">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay transacciones en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell>{formatDate(transaction.date)}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>{transaction.category || '-'}</TableCell>
                        <TableCell>
                          <Badge className={transaction.type === 'income' ? "bg-green-100 text-green-800 hover:bg-green-100 rounded-lg font-medium px-3 py-1" : "bg-red-100 text-red-800 hover:bg-red-100 rounded-lg font-medium px-3 py-1"}>
                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(parseFloat(transaction.amount))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabla de presupuestos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Presupuestos</h3>
          <div className="text-sm text-gray-500">{filteredQuotes.length} registros</div>
        </div>
        <Card className="border-0 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow className="border-b-0">
                    <TableHead className="font-medium text-gray-500">Número</TableHead>
                    <TableHead className="font-medium text-gray-500">Fecha</TableHead>
                    <TableHead className="font-medium text-gray-500">Cliente</TableHead>
                    <TableHead className="font-medium text-gray-500">Total</TableHead>
                    <TableHead className="font-medium text-gray-500">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay presupuestos en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((quote) => (
                      <TableRow key={quote.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell className="font-medium">{quote.number}</TableCell>
                        <TableCell>{formatDate(quote.date)}</TableCell>
                        <TableCell>{quote.clientName}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(parseFloat(quote.total))}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 rounded-lg font-medium px-3 py-1" : 
                              quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 rounded-lg font-medium px-3 py-1" : 
                              "rounded-lg font-medium px-3 py-1"
                            }
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}