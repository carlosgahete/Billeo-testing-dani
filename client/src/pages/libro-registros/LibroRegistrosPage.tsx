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
// Importar solo jsPDF sin autoTable (enfoque simple)
import { jsPDF } from "jspdf";
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
  
  // Función para exportar a PDF - versión mejorada con diseño atractivo
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
      // Crear documento PDF en formato A4
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pageWidth = doc.internal.pageSize.width;
      const margin = 15;
      
      // Función para crear rectángulos con colores
      const drawColorBox = (y: number, height: number, color: string, title: string) => {
        // Convertir color de tailwind a rgb
        let rgb = [59, 130, 246]; // blue-500 por defecto
        
        if (color === 'blue') rgb = [59, 130, 246];
        if (color === 'amber') rgb = [245, 158, 11];
        if (color === 'green') rgb = [34, 197, 94];
        if (color === 'purple') rgb = [168, 85, 247];
        
        // Dibujar cabecera de color
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
        
        // Título en blanco
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin + 5, y + 5.5);
        
        // Dibujar cuerpo blanco
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y + 8, pageWidth - 2 * margin, height - 8, 'F');
        
        // Resetear color de texto a negro
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      };
      
      // Función para dibujar líneas horizontales finas
      const drawHorizontalLine = (y: number, width: number) => {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.1);
        doc.line(margin, y, margin + width, y);
      };
      
      // CABECERA Y TÍTULO
      // Título principal con logo
      doc.setFillColor(28, 100, 242);
      doc.rect(0, 0, pageWidth, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("BILLEO - LIBRO DE REGISTROS", margin, 10);
      
      // Fecha de generación
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${formatDate(new Date().toISOString())}`, pageWidth - margin - 35, 10);
      
      // Parámetros del período
      let periodoTitle = `Período: ${selectedYear}`;
      if (selectedQuarter !== "all") {
        const quarterNames = {
          "Q1": "1er Trimestre",
          "Q2": "2do Trimestre", 
          "Q3": "3er Trimestre",
          "Q4": "4to Trimestre"
        };
        periodoTitle += ` - ${quarterNames[selectedQuarter as keyof typeof quarterNames]}`;
      }
      
      if (selectedMonth !== "all") {
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        periodoTitle += ` - ${monthNames[parseInt(selectedMonth) - 1]}`;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(periodoTitle, margin, 22);
      
      // TARJETAS DE RESUMEN (similar al diseño de la web)
      let currentY = 30;
      
      // Dibujar el recuadro para el resumen
      drawColorBox(currentY, 40, 'purple', 'RESUMEN');
      
      // Datos del resumen
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text("Facturas emitidas:", margin + 5, currentY + 15);
      doc.text("Gastos registrados:", margin + 5, currentY + 22);
      doc.text("Presupuestos:", margin + 5, currentY + 29);
      doc.text("Balance:", margin + 5, currentY + 36);
      
      // Valores en negrita
      doc.setFont('helvetica', 'bold');
      doc.text(`${summary.totalInvoices}`, margin + 40, currentY + 15);
      doc.text(`${formatCurrency(summary.incomeTotal)}`, pageWidth - margin - 25, currentY + 15);
      
      doc.text(`${filteredTransactions.filter(t => t.type === 'expense').length}`, margin + 40, currentY + 22);
      
      // Gastos en rojo
      doc.setTextColor(220, 38, 38); // Rojo para gastos
      doc.text(`${formatCurrency(summary.expenseTotal)}`, pageWidth - margin - 25, currentY + 22);
      doc.setTextColor(0, 0, 0); // Restaurar color negro
      
      doc.text(`${summary.totalQuotes}`, margin + 40, currentY + 29);
      
      // Balance en color según sea positivo o negativo
      if (summary.balance < 0) {
        doc.setTextColor(220, 38, 38); // Rojo para balance negativo
      } else {
        doc.setTextColor(34, 197, 94); // Verde para balance positivo
      }
      doc.setFontSize(11);
      doc.text(`${formatCurrency(summary.balance)}`, pageWidth - margin - 25, currentY + 36);
      doc.setTextColor(0, 0, 0); // Restaurar color negro
      
      // SECCIÓN DE FACTURAS
      currentY += 45;
      drawColorBox(currentY, 50, 'blue', 'FACTURAS EMITIDAS');
      
      // Cabecera de la tabla de facturas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Número", margin + 5, currentY + 15);
      doc.text("Fecha", margin + 25, currentY + 15);
      doc.text("Cliente", margin + 50, currentY + 15);
      doc.text("Base", pageWidth - margin - 55, currentY + 15);
      doc.text("IVA", pageWidth - margin - 35, currentY + 15);
      doc.text("Total", pageWidth - margin - 20, currentY + 15);
      
      drawHorizontalLine(currentY + 17, pageWidth - 2 * margin - 10);
      
      // Datos de facturas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      let facturaY = currentY + 22;
      const maxFacturas = Math.min(8, filteredInvoices.length);
      
      for (let i = 0; i < maxFacturas; i++) {
        const inv = filteredInvoices[i];
        
        // Limitar longitud de textos
        const clienteText = inv.clientName.length > 30 ? inv.clientName.substring(0, 27) + "..." : inv.clientName;
        
        doc.text(inv.number, margin + 5, facturaY);
        doc.text(formatDate(inv.date), margin + 25, facturaY);
        doc.text(clienteText, margin + 50, facturaY);
        doc.text(formatCurrency(parseFloat(inv.subtotal)), pageWidth - margin - 55, facturaY, { align: 'right' });
        doc.text(formatCurrency(parseFloat(inv.tax)), pageWidth - margin - 35, facturaY, { align: 'right' });
        doc.text(formatCurrency(parseFloat(inv.total)), pageWidth - margin - 20, facturaY, { align: 'right' });
        
        facturaY += 5;
        
        // Líneas separadoras
        if (i < maxFacturas - 1) {
          drawHorizontalLine(facturaY - 2, pageWidth - 2 * margin - 10);
        }
      }
      
      // Si hay más facturas de las que se muestran
      if (filteredInvoices.length > maxFacturas) {
        doc.setFont('helvetica', 'italic');
        doc.text(`... y ${filteredInvoices.length - maxFacturas} más`, margin + 5, facturaY + 3);
      }
      
      // SECCIÓN DE PRESUPUESTOS
      currentY += 55;
      drawColorBox(currentY, 45, 'green', 'PRESUPUESTOS');
      
      // Cabecera de la tabla de presupuestos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Número", margin + 5, currentY + 15);
      doc.text("Fecha", margin + 30, currentY + 15);
      doc.text("Cliente", margin + 55, currentY + 15);
      doc.text("Total", pageWidth - margin - 40, currentY + 15);
      doc.text("Estado", pageWidth - margin - 20, currentY + 15);
      
      drawHorizontalLine(currentY + 17, pageWidth - 2 * margin - 10);
      
      // Datos de presupuestos
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      let presupuestoY = currentY + 22;
      const maxPresupuestos = Math.min(5, filteredQuotes.length);
      
      if (filteredQuotes.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text("No hay presupuestos en este período", margin + 5, presupuestoY);
      } else {
        for (let i = 0; i < maxPresupuestos; i++) {
          const quote = filteredQuotes[i];
          
          // Limitar longitud de textos
          const clienteText = quote.clientName.length > 30 ? quote.clientName.substring(0, 27) + "..." : quote.clientName;
          
          // Estado formateado
          const status = quote.status === 'accepted' ? 'Aceptado' : 
                         quote.status === 'rejected' ? 'Rechazado' : 
                         quote.status === 'pending' ? 'Pendiente' : quote.status;
          
          doc.text(quote.number, margin + 5, presupuestoY);
          doc.text(formatDate(quote.date), margin + 30, presupuestoY);
          doc.text(clienteText, margin + 55, presupuestoY);
          doc.text(formatCurrency(parseFloat(quote.total)), pageWidth - margin - 40, presupuestoY, { align: 'right' });
          doc.text(status, pageWidth - margin - 20, presupuestoY);
          
          presupuestoY += 5;
          
          // Líneas separadoras
          if (i < maxPresupuestos - 1) {
            drawHorizontalLine(presupuestoY - 2, pageWidth - 2 * margin - 10);
          }
        }
        
        // Si hay más presupuestos de los que se muestran
        if (filteredQuotes.length > maxPresupuestos) {
          doc.setFont('helvetica', 'italic');
          doc.text(`... y ${filteredQuotes.length - maxPresupuestos} más`, margin + 5, presupuestoY + 3);
        }
      }
      
      // SECCIÓN DE GASTOS (en la misma página)
      currentY += 50;
      
      drawColorBox(currentY, 60, 'amber', 'GASTOS Y TRANSACCIONES');
      
      // Cabecera de la tabla de gastos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text("Fecha", margin + 5, currentY + 15);
      doc.text("Descripción", margin + 30, currentY + 15);
      doc.text("Categoría", pageWidth - margin - 60, currentY + 15);
      doc.text("Tipo", pageWidth - margin - 35, currentY + 15);
      doc.text("Importe", pageWidth - margin - 15, currentY + 15);
      
      drawHorizontalLine(currentY + 17, pageWidth - 2 * margin - 10);
      
      // Datos de gastos y transacciones
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      let gastoY = currentY + 22;
      const maxGastos = Math.min(8, filteredTransactions.length);
      
      if (filteredTransactions.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text("No hay transacciones en este período", margin + 5, gastoY);
      } else {
        for (let i = 0; i < maxGastos; i++) {
          const t = filteredTransactions[i];
          
          // Limitar longitud de textos
          const descripcionText = t.description.length > 30 ? t.description.substring(0, 27) + "..." : t.description;
          const categoriaText = t.category ? (t.category.length > 15 ? t.category.substring(0, 12) + "..." : t.category) : "-";
          
          // Tipo formateado
          const type = t.type === 'income' ? 'Ingreso' : 'Gasto';
          
          doc.text(formatDate(t.date), margin + 5, gastoY);
          doc.text(descripcionText, margin + 30, gastoY);
          doc.text(categoriaText, pageWidth - margin - 60, gastoY);
          doc.text(type, pageWidth - margin - 35, gastoY);
          
          // Importe en rojo para gastos, verde para ingresos
          if (t.type === 'expense') {
            doc.setTextColor(220, 38, 38); // Rojo para gastos
          } else {
            doc.setTextColor(34, 197, 94); // Verde para ingresos
          }
          
          doc.text(formatCurrency(parseFloat(t.amount)), pageWidth - margin - 15, gastoY, { align: 'right' });
          doc.setTextColor(0, 0, 0); // Restaurar color negro
          
          gastoY += 5;
          
          // Líneas separadoras
          if (i < maxGastos - 1) {
            drawHorizontalLine(gastoY - 2, pageWidth - 2 * margin - 10);
          }
        }
        
        // Si hay más gastos de los que se muestran
        if (filteredTransactions.length > maxGastos) {
          doc.setFont('helvetica', 'italic');
          doc.text(`... y ${filteredTransactions.length - maxGastos} más`, margin + 5, gastoY + 3);
        }
      }
      
      // Pie de página simplificado (solo en la página actual)
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Billeo - Generado ${formatDate(new Date().toISOString())}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      
      // Guardar documento
      doc.save(`Billeo-Libro-Registros-${selectedYear}${selectedQuarter !== 'all' ? '-' + selectedQuarter : ''}${selectedMonth !== 'all' ? '-' + selectedMonth : ''}.pdf`);
      
      toast({
        title: "Éxito",
        description: "El PDF se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    }
  };
  
  // Función para exportar a Excel (en este ejemplo, como CSV) - Mejorado visualmente
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
      // Crear CSV para facturas con mejor formato visual
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Encabezados con formato mejorado
      csvContent += "BILLEO - LIBRO DE REGISTROS;;;;;;;\\n";
      
      // Período con formato
      let periodoText = `PERÍODO:;${selectedYear}`;
      if (selectedQuarter !== "all") {
        const quarterNames = {
          "Q1": "1er Trimestre",
          "Q2": "2do Trimestre", 
          "Q3": "3er Trimestre",
          "Q4": "4to Trimestre"
        };
        periodoText += `;${quarterNames[selectedQuarter as keyof typeof quarterNames]}`;
      }
      
      if (selectedMonth !== "all") {
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        periodoText += `;${monthNames[parseInt(selectedMonth) - 1]}`;
      }
      csvContent += periodoText + ";;;;;;\\n\\n";
      
      // Resumen con formato tipo tabla
      csvContent += "RESUMEN;;;;;;;\\n";
      csvContent += "Concepto;Cantidad;Total;;;;;\\n";
      csvContent += `Facturas emitidas;${summary.totalInvoices};${formatCurrency(summary.incomeTotal)};;;;;\\n`;
      csvContent += `Gastos;${filteredTransactions.filter(t => t.type === 'expense').length};${formatCurrency(summary.expenseTotal)};;;;;\\n`;
      csvContent += `Presupuestos;${summary.totalQuotes};;;;;;\\n`;
      csvContent += `BALANCE;;${formatCurrency(summary.balance)};;;;;\\n\\n`;
      
      // Facturas con cabecera destacada
      csvContent += "FACTURAS EMITIDAS;;;;;;;\\n";
      csvContent += "Número;Fecha;Cliente;Base imponible;IVA;Total;Estado;\\n";
      
      // Datos de facturas
      filteredInvoices.forEach(inv => {
        const status = inv.status === 'paid' ? 'Pagada' : 
                     inv.status === 'pending' ? 'Pendiente' : 
                     inv.status === 'overdue' ? 'Vencida' : inv.status;
        
        csvContent += `${inv.number};${formatDate(inv.date)};${inv.clientName.replace(/;/g, ',')};${inv.subtotal};${inv.tax};${inv.total};${status};\\n`;
      });
      
      // Añadir separador
      csvContent += ";;;;;;;\\n";
      
      // Presupuestos con cabecera destacada
      csvContent += "PRESUPUESTOS;;;;;;;\\n";
      csvContent += "Número;Fecha;Cliente;Total;Estado;;;\\n";
      
      // Datos de presupuestos
      filteredQuotes.forEach(quote => {
        const status = quote.status === 'accepted' ? 'Aceptado' : 
                     quote.status === 'rejected' ? 'Rechazado' : 
                     quote.status === 'pending' ? 'Pendiente' : quote.status;
                      
        csvContent += `${quote.number};${formatDate(quote.date)};${quote.clientName.replace(/;/g, ',')};${quote.total};${status};;;\\n`;
      });
      
      // Añadir separador
      csvContent += ";;;;;;;\\n";
      
      // Gastos y transacciones con cabecera destacada
      csvContent += "GASTOS Y TRANSACCIONES;;;;;;;\\n";
      csvContent += "Fecha;Descripción;Categoría;Tipo;Importe;;;\\n";
      
      // Datos de gastos con formato para identificar tipo (Ingreso/Gasto)
      filteredTransactions.forEach(t => {
        const type = t.type === 'income' ? 'Ingreso' : 'Gasto';
        csvContent += `${formatDate(t.date)};${t.description.replace(/;/g, ',')};${(t.category || '').replace(/;/g, ',')};${type};${t.amount};;;\\n`;
      });
      
      // Nota informativa
      csvContent += ";;;;;;;\\n";
      csvContent += "Generado por Billeo;;;;;;;\\n";
      csvContent += `Fecha de generación;${formatDate(new Date().toISOString())};;;;;;\\n`;
      
      // Usar punto y coma como separador para mejor compatibilidad con Excel en español
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Billeo-Libro-Registros-${selectedYear}${selectedQuarter !== 'all' ? '-' + selectedQuarter : ''}${selectedMonth !== 'all' ? '-' + selectedMonth : ''}.csv`);
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
        description: "No se pudo generar el archivo Excel: " + (error instanceof Error ? error.message : String(error)),
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
    <div className="container mx-auto py-6 px-4 max-w-7xl bg-gradient-to-b from-gray-50 to-white dark:bg-gray-900/10 min-h-screen">      
      {/* Filtros y botones de exportación */}
      <div className="flex flex-wrap items-center justify-between mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Año</label>
            <Select 
              value={selectedYear} 
              onValueChange={setSelectedYear}
            >
              <SelectTrigger className="h-10 w-[110px] rounded-xl bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 focus:ring-2 focus:ring-blue-200 transition-all">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Trimestre</label>
            <Select 
              value={selectedQuarter} 
              onValueChange={setSelectedQuarter}
            >
              <SelectTrigger className="h-10 w-[140px] rounded-xl bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 focus:ring-2 focus:ring-blue-200 transition-all">
                <SelectValue placeholder="Trimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Q1">1º Trimestre</SelectItem>
                <SelectItem value="Q2">2º Trimestre</SelectItem>
                <SelectItem value="Q3">3º Trimestre</SelectItem>
                <SelectItem value="Q4">4º Trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mes</label>
            <Select 
              value={selectedMonth} 
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="h-10 w-[130px] rounded-xl bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 focus:ring-2 focus:ring-blue-200 transition-all">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
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
        </div>
          
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportToPDF}
            className="flex items-center gap-2 h-10 px-4 text-sm bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-all rounded-full"
          >
            <FileText size={16} />
            Descargar PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={exportToExcel}
            className="flex items-center gap-2 h-10 px-4 text-sm bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 transition-all rounded-full"
          >
            <FileSpreadsheet size={16} />
            Descargar Excel
          </Button>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-in fade-in-50 slide-in-from-bottom-6 duration-700">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <div className="text-sm font-medium text-white">Facturas</div>
          </div>
          <div className="p-4 bg-white">
            <div className="text-2xl font-semibold">{summary.totalInvoices}</div>
            <div className="text-xs text-gray-500">Total emitidas</div>
            <div className="mt-3 text-lg font-semibold">{formatCurrency(summary.incomeTotal)}</div>
            <div className="text-xs text-gray-500">Importe total facturado</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 flex items-center">
            <Download className="h-5 w-5 text-white mr-2" />
            <div className="text-sm font-medium text-white">Gastos</div>
          </div>
          <div className="p-4 bg-white">
            <div className="text-2xl font-semibold">
              {filteredTransactions.filter(t => t.type === 'expense').length}
            </div>
            <div className="text-xs text-gray-500">Transacciones</div>
            <div className="mt-3 text-lg font-semibold text-red-600">{formatCurrency(summary.expenseTotal)}</div>
            <div className="text-xs text-gray-500">Importe total gastado</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <div className="text-sm font-medium text-white">Presupuestos</div>
          </div>
          <div className="p-4 bg-white">
            <div className="text-2xl font-semibold">{summary.totalQuotes}</div>
            <div className="text-xs text-gray-500">Total presupuestos</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex items-center">
            <span className="font-bold text-white mr-2">=</span>
            <div className="text-sm font-medium text-white">Balance</div>
          </div>
          <div className="p-4 bg-white">
            <div className={`text-2xl font-semibold ${summary.balance < 0 ? "text-red-600" : ""}`}>
              {formatCurrency(summary.balance)}
            </div>
            <div className="text-xs text-gray-500">Resultado</div>
          </div>
        </div>
      </div>
      
      {/* Tabla de facturas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Facturas emitidas</h3>
          <div className="text-sm text-gray-500">{filteredInvoices.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">Número</TableHead>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">Fecha</TableHead>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">Cliente</TableHead>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">Base</TableHead>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">IVA</TableHead>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">Total</TableHead>
                  <TableHead className="py-2 px-4 bg-blue-100 dark:bg-gray-800 text-xs text-blue-700 font-medium border-b border-blue-200 dark:border-gray-700">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-400">
                      No hay facturas en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice, index) => (
                    <TableRow 
                      key={invoice.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                    >
                      <TableCell className="py-2 px-4 text-sm">{invoice.number}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{formatDate(invoice.date)}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{invoice.clientName}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{formatCurrency(parseFloat(invoice.subtotal))}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{formatCurrency(parseFloat(invoice.tax))}</TableCell>
                      <TableCell className="py-2 px-4 text-sm font-medium">{formatCurrency(parseFloat(invoice.total))}</TableCell>
                      <TableCell className="py-2 px-4">
                        <Badge className={invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-green-200" : "bg-gray-100 text-gray-800 hover:bg-gray-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-gray-200"}>
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
      
      {/* Tabla de gastos y transacciones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Gastos y transacciones</h3>
          <div className="text-sm text-gray-500">{filteredTransactions.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700">Fecha</TableHead>
                  <TableHead className="py-2 px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700">Descripción</TableHead>
                  <TableHead className="py-2 px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700">Categoría</TableHead>
                  <TableHead className="py-2 px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700">Tipo</TableHead>
                  <TableHead className="py-2 px-4 bg-amber-100 dark:bg-gray-800 text-xs text-amber-700 font-medium border-b border-amber-200 dark:border-gray-700">Importe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                      No hay transacciones en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <TableRow 
                      key={transaction.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                    >
                      <TableCell className="py-2 px-4 text-sm">{formatDate(transaction.date)}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{transaction.description}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{transaction.category || '-'}</TableCell>
                      <TableCell className="py-2 px-4">
                        <Badge className={transaction.type === 'income' ? "bg-green-100 text-green-800 hover:bg-green-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-green-200" : "bg-red-100 text-red-800 hover:bg-red-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-red-200"}>
                          {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`py-2 px-4 text-sm font-medium ${transaction.type === 'expense' ? "text-red-600" : ""}`}>
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
      
      {/* Tabla de presupuestos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Presupuestos</h3>
          <div className="text-sm text-gray-500">{filteredQuotes.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2 px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700">Número</TableHead>
                  <TableHead className="py-2 px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700">Fecha</TableHead>
                  <TableHead className="py-2 px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700">Cliente</TableHead>
                  <TableHead className="py-2 px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700">Total</TableHead>
                  <TableHead className="py-2 px-4 bg-green-100 dark:bg-gray-800 text-xs text-green-700 font-medium border-b border-green-200 dark:border-gray-700">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                      No hay presupuestos en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote, index) => (
                    <TableRow 
                      key={quote.id} 
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                    >
                      <TableCell className="py-2 px-4 text-sm">{quote.number}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{formatDate(quote.date)}</TableCell>
                      <TableCell className="py-2 px-4 text-sm">{quote.clientName}</TableCell>
                      <TableCell className="py-2 px-4 text-sm font-medium">{formatCurrency(parseFloat(quote.total))}</TableCell>
                      <TableCell className="py-2 px-4">
                        <Badge 
                          className={
                            quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-green-200" : 
                            quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-red-200" : 
                            "bg-gray-100 text-gray-800 hover:bg-gray-100 px-3 py-0.5 rounded-full text-xs font-medium shadow-sm border border-gray-200"
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
        </div>
      </div>
    </div>
  );
}