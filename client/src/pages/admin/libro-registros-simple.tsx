import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, ShoppingCart, File, Users, FileSpreadsheet } from "lucide-react";
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

interface UserOption {
  id: number;
  username: string;
  name: string;
}

export default function SimpleLibroRegistros() {
  const params = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const userId = params?.userId || '';
  const { user } = useAuth();
  
  // Verificación adicional de seguridad: solo superadmin, admin o usuarios específicos pueden ver esto 
  // Esta es una protección redundante junto con la protección de ruta en App.tsx
  if (!user || (
    user.role !== 'superadmin' && 
    user.role !== 'SUPERADMIN' && 
    user.role !== 'admin' &&
    user.username !== 'Superadmin' &&
    user.username !== 'billeo_admin'
  )) {
    return <Redirect to="/" />;
  }

  useEffect(() => {
    // Cargar la lista de usuarios solo si el usuario actual tiene permisos de admin
    const fetchUsersList = async () => {
      if (!user || !(user.role === 'admin' || user.role === 'superadmin' || user.username === 'billeo_admin')) {
        return;
      }
      
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/admin/users');
        
        if (!response.ok) {
          console.error('Error al cargar la lista de usuarios:', response.statusText);
          return;
        }
        
        const usersList = await response.json();
        setUsers(usersList.map((u: any) => ({
          id: u.id,
          username: u.username,
          name: u.name || u.username
        })));
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsersList();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Si el usuario es billeo_admin y no se especifica userId (o es vacío),
        // usamos su propio ID para mostrar sus registros
        let idToUse = userId;
        
        if (user && user.username === 'billeo_admin' && (!userId || userId === '')) {
          idToUse = user.id.toString();
          console.log("Usuario billeo_admin, usando su propio ID:", idToUse);
        }
        
        // La ruta debe coincidir con la API en el backend
        const apiUrl = `/api/public/libro-registros/${idToUse}`;
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
    
    if (userId || (user && user.username === 'billeo_admin')) {
      fetchData();
    } else {
      setLoading(false);
      setError("ID de usuario no proporcionado");
    }
  }, [userId, user]);

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
  
  // Función para cambiar de usuario
  const handleUserChange = (newUserId: string) => {
    if (newUserId === 'self') {
      // Si se selecciona "Mis registros", mostramos los datos del admin (ID: 6)
      if (user && user.username === 'billeo_admin') {
        // Redirige a la versión simple con el ID del admin (6)
        setLocation(`/admin/libro-registros-simple/6`);
      }
    } else if (newUserId) {
      // Redirige a la versión simple con el ID de usuario seleccionado
      setLocation(`/admin/libro-registros-simple/${newUserId}`);
    }
  };
  
  // Funciones para manejar los cambios en los filtros
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    // Si cambia el año, reseteamos el trimestre y mes para evitar combinaciones inválidas
    if (selectedQuarter !== "all" || selectedMonth !== "all") {
      setSelectedQuarter("all");
      setSelectedMonth("all");
    }
  };
  
  const handleQuarterChange = (quarter: string) => {
    setSelectedQuarter(quarter);
    // Si seleccionamos un trimestre, reseteamos el mes para evitar combinaciones extrañas
    if (selectedMonth !== "all") {
      setSelectedMonth("all");
    }
  };
  
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    // Si seleccionamos un mes específico, reseteamos el trimestre
    if (selectedQuarter !== "all") {
      setSelectedQuarter("all");
    }
  };
  
  // Función para filtrar los datos basado en los filtros seleccionados
  const getFilteredData = () => {
    if (!data) return null;
    
    // Clonar el objeto de datos para no modificar el original
    const filteredData = {...data};
    
    // Filtrado de facturas
    filteredData.invoices = data.invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.issueDate);
      const invoiceYear = invoiceDate.getFullYear().toString();
      const invoiceMonth = (invoiceDate.getMonth() + 1).toString();
      const invoiceQuarter = Math.ceil((invoiceDate.getMonth() + 1) / 3);
      
      // Filtrar por año
      if (selectedYear !== "all" && invoiceYear !== selectedYear) {
        return false;
      }
      
      // Filtrar por trimestre si está seleccionado
      if (selectedQuarter !== "all") {
        const quarter = selectedQuarter.replace("Q", "");
        if (invoiceQuarter.toString() !== quarter) {
          return false;
        }
      }
      
      // Filtrar por mes si está seleccionado
      if (selectedMonth !== "all" && invoiceMonth !== selectedMonth) {
        return false;
      }
      
      return true;
    });
    
    // Filtrado de transacciones
    filteredData.transactions = data.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear().toString();
      const transactionMonth = (transactionDate.getMonth() + 1).toString();
      const transactionQuarter = Math.ceil((transactionDate.getMonth() + 1) / 3);
      
      // Filtrar por año
      if (selectedYear !== "all" && transactionYear !== selectedYear) {
        return false;
      }
      
      // Filtrar por trimestre si está seleccionado
      if (selectedQuarter !== "all") {
        const quarter = selectedQuarter.replace("Q", "");
        if (transactionQuarter.toString() !== quarter) {
          return false;
        }
      }
      
      // Filtrar por mes si está seleccionado
      if (selectedMonth !== "all" && transactionMonth !== selectedMonth) {
        return false;
      }
      
      return true;
    });
    
    // Filtrado de presupuestos
    filteredData.quotes = data.quotes.filter(quote => {
      const quoteDate = new Date(quote.issueDate);
      const quoteYear = quoteDate.getFullYear().toString();
      const quoteMonth = (quoteDate.getMonth() + 1).toString();
      const quoteQuarter = Math.ceil((quoteDate.getMonth() + 1) / 3);
      
      // Filtrar por año
      if (selectedYear !== "all" && quoteYear !== selectedYear) {
        return false;
      }
      
      // Filtrar por trimestre si está seleccionado
      if (selectedQuarter !== "all") {
        const quarter = selectedQuarter.replace("Q", "");
        if (quoteQuarter.toString() !== quarter) {
          return false;
        }
      }
      
      // Filtrar por mes si está seleccionado
      if (selectedMonth !== "all" && quoteMonth !== selectedMonth) {
        return false;
      }
      
      return true;
    });
    
    // Recalcular los totales en el resumen
    filteredData.summary = {
      totalInvoices: filteredData.invoices.length,
      totalTransactions: filteredData.transactions.length,
      totalQuotes: filteredData.quotes.length,
      incomeTotal: filteredData.invoices.reduce((sum, invoice) => sum + invoice.total, 0),
      expenseTotal: filteredData.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    };
    
    return filteredData;
  };
  
  // Obtener los datos filtrados
  const filteredData = data ? getFilteredData() : null;
  
  // Función para descargar como PDF
  const handleDownloadPDF = () => {
    if (!filteredData) return;
    
    // Crear un nuevo documento PDF
    const doc = new jsPDF();
    
    // Configuraciones
    const titleFontSize = 18;
    const subtitleFontSize = 14;
    const headerFontSize = 12;
    const textFontSize = 10;
    const smallFontSize = 8;
    
    // Definimos los colores (en formato RGB)
    const primaryColor = [37, 99, 235]; // Azul
    const secondaryColor = [217, 119, 6]; // Ámbar
    const tertiaryColor = [5, 150, 105]; // Esmeralda
    const textColor = [60, 60, 60]; // Gris oscuro
    
    // Obtener fecha y hora actual
    const currentDate = new Date().toLocaleDateString('es-ES');
    const currentTime = new Date().toLocaleTimeString('es-ES');
    
    // Título
    doc.setFontSize(titleFontSize);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LIBRO DE REGISTROS', 105, 20, { align: 'center' });
    
    // Subtítulo (ID usuario)
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Usuario ID: ${userId || 'Todos'}`, 105, 30, { align: 'center' });
    
    // Información de generación
    doc.setFontSize(textFontSize);
    doc.text(`Fecha de generación: ${currentDate} ${currentTime}`, 15, 40);
    
    // Filtros aplicados
    let filtrosText = `Filtros: Año ${selectedYear !== 'all' ? selectedYear : 'Todos'}`;
    if (selectedQuarter !== 'all') {
      filtrosText += `, Trimestre ${selectedQuarter.replace('Q', '')}`;
    }
    if (selectedMonth !== 'all') {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      filtrosText += `, Mes ${monthNames[parseInt(selectedMonth) - 1]}`;
    }
    doc.text(filtrosText, 15, 47);
    
    // Sección de resumen
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 52, 180, 30, 'F');
    
    doc.setFontSize(headerFontSize);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RESUMEN', 20, 60);
    
    doc.setFontSize(textFontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Total Facturas: ${filteredData.summary.totalInvoices} - Importe: ${formatCurrency(filteredData.summary.incomeTotal)}`, 20, 67);
    doc.text(`Total Gastos: ${filteredData.summary.totalTransactions} - Importe: ${formatCurrency(filteredData.summary.expenseTotal)}`, 20, 74);
    doc.text(`Total Presupuestos: ${filteredData.summary.totalQuotes}`, 120, 67);
    doc.text(`Balance: ${formatCurrency(filteredData.summary.incomeTotal - filteredData.summary.expenseTotal)}`, 120, 74);
    
    // Posición Y actual (para ir añadiendo contenido)
    let yPos = 90;
    
    // Sección de facturas
    if (filteredData.invoices.length > 0) {
      doc.setFontSize(headerFontSize);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('FACTURAS EMITIDAS', 15, yPos);
      yPos += 10;
      
      // Tabla de facturas
      const invoiceHeaders = [['Número', 'Fecha', 'Cliente', 'Base', 'IVA', 'Total', 'Estado']];
      const invoiceData = filteredData.invoices.map(invoice => [
        invoice.number,
        formatDate(invoice.issueDate),
        invoice.client.length > 25 ? invoice.client.substring(0, 22) + '...' : invoice.client,
        formatCurrency(invoice.baseAmount),
        formatCurrency(invoice.vatAmount),
        formatCurrency(invoice.total),
        invoice.status === 'paid' ? 'Pagada' : 
          invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'
      ]);
      
      autoTable(doc, {
        head: invoiceHeaders,
        body: invoiceData,
        startY: yPos,
        headStyles: { 
          fillColor: [230, 236, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        theme: 'grid'
      });
      
      // Actualizar posición Y
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Separar las transacciones por tipo
    const incomeTransactions = filteredData.transactions.filter(transaction => transaction.type === 'income');
    const expenseTransactions = filteredData.transactions.filter(transaction => transaction.type === 'expense');
    
    // Sección de ingresos
    if (incomeTransactions.length > 0) {
      // Comprobar si necesitamos una nueva página
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(headerFontSize);
      doc.setTextColor(5, 150, 105); // Verde esmeralda
      doc.text('INGRESOS', 15, yPos);
      yPos += 10;
      
      // Tabla de ingresos
      const incomeHeaders = [['Fecha', 'Descripción', 'Categoría', 'Importe']];
      const incomeData = incomeTransactions.map(transaction => [
        formatDate(transaction.date),
        transaction.description.length > 30 ? transaction.description.substring(0, 27) + '...' : transaction.description,
        transaction.category || 'Sin categoría',
        formatCurrency(transaction.amount)
      ]);
      
      autoTable(doc, {
        head: incomeHeaders,
        body: incomeData,
        startY: yPos,
        headStyles: { 
          fillColor: [236, 253, 245], // Fondo verde claro
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        theme: 'grid'
      });
      
      // Actualizar posición Y
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Sección de gastos
    if (expenseTransactions.length > 0) {
      // Comprobar si necesitamos una nueva página
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(headerFontSize);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]); // Ámbar
      doc.text('GASTOS', 15, yPos);
      yPos += 10;
      
      // Tabla de gastos
      const expenseHeaders = [['Fecha', 'Descripción', 'Categoría', 'Importe']];
      const expenseData = expenseTransactions.map(transaction => [
        formatDate(transaction.date),
        transaction.description.length > 30 ? transaction.description.substring(0, 27) + '...' : transaction.description,
        transaction.category || 'Sin categoría',
        formatCurrency(transaction.amount)
      ]);
      
      autoTable(doc, {
        head: expenseHeaders,
        body: expenseData,
        startY: yPos,
        headStyles: { 
          fillColor: [255, 251, 235], // Fondo ámbar claro
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        theme: 'grid'
      });
      
      // Actualizar posición Y
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Sección de presupuestos
    if (filteredData.quotes.length > 0) {
      // Comprobar si necesitamos una nueva página
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(headerFontSize);
      doc.setTextColor(tertiaryColor[0], tertiaryColor[1], tertiaryColor[2]);
      doc.text('PRESUPUESTOS', 15, yPos);
      yPos += 10;
      
      // Tabla de presupuestos
      const quoteHeaders = [['Número', 'Fecha', 'Cliente', 'Total', 'Estado']];
      const quoteData = filteredData.quotes.map(quote => [
        quote.number,
        formatDate(quote.issueDate),
        quote.clientName.length > 30 ? quote.clientName.substring(0, 27) + '...' : quote.clientName,
        formatCurrency(quote.total),
        quote.status === 'accepted' ? 'Aceptado' : 
          quote.status === 'pending' ? 'Pendiente' : 'Rechazado'
      ]);
      
      autoTable(doc, {
        head: quoteHeaders,
        body: quoteData,
        startY: yPos,
        headStyles: { 
          fillColor: [236, 253, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        theme: 'grid'
      });
    }
    
    // Pie de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(smallFontSize);
      doc.setTextColor(150, 150, 150);
      doc.text('Documento generado por Billeo - Sistema de Gestión Financiera para Autónomos', 105, 285, { align: 'center' });
      doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
    }
    
    // Determinar nombre del archivo con período de tiempo
    let fileName = `libro_registros_${userId || 'todos'}`;
    if (selectedYear !== 'all') {
      fileName += `_${selectedYear}`;
      if (selectedQuarter !== 'all') {
        fileName += `_T${selectedQuarter.replace('Q', '')}`;
      } else if (selectedMonth !== 'all') {
        fileName += `_mes${selectedMonth}`;
      }
    }
    fileName += '.pdf';
    
    // Guardar el PDF
    doc.save(fileName);
  };
  
  // Función para descargar como Excel (CSV mejorado)
  const handleDownloadExcel = () => {
    // Obtener los datos filtrados actualizados
    const filteredData = getFilteredData();
    if (!filteredData) return;
    
    // Información del encabezado
    const titleRow = [`LIBRO DE REGISTROS - Usuario: ${userId || 'Todos'}`];
    const dateRow = [`Fecha de generación: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`];
    
    // Filtros aplicados
    let filtersText = `Filtros: Año ${selectedYear !== 'all' ? selectedYear : 'Todos'}`;
    if (selectedQuarter !== 'all') {
      filtersText += `, Trimestre ${selectedQuarter.replace('Q', '')}`;
    }
    if (selectedMonth !== 'all') {
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      filtersText += `, Mes ${monthNames[parseInt(selectedMonth) - 1]}`;
    }
    const filtersRow = [filtersText];
    
    // Crear sección de resumen
    const summaryHeaderRow = [`RESUMEN`];
    const summaryDataRows = [
      ['Concepto', 'Cantidad', 'Importe'],
      ['Facturas', getFilteredData().summary.totalInvoices, formatCurrency(getFilteredData().summary.incomeTotal)],
      ['Gastos', getFilteredData().summary.totalTransactions, formatCurrency(getFilteredData().summary.expenseTotal)],
      ['Presupuestos', getFilteredData().summary.totalQuotes, ''],
      ['Balance', '', formatCurrency(getFilteredData().summary.incomeTotal - getFilteredData().summary.expenseTotal)]
    ];
    
    // Espaciador
    const emptyRow = [''];
    
    // Separar las transacciones por tipo
    const incomeTransactions = getFilteredData().transactions.filter(transaction => transaction.type === 'income');
    const expenseTransactions = getFilteredData().transactions.filter(transaction => transaction.type === 'expense');
    
    // Sección de facturas
    const invoiceHeaderRow = getFilteredData().invoices.length > 0 ? [`FACTURAS EMITIDAS`] : [];
    const invoiceColumnsRow = getFilteredData().invoices.length > 0 ? [['Número', 'Fecha', 'Cliente/Proveedor', 'Base Imponible', 'IVA', 'Total', 'Estado']] : [];
    const invoiceRows = getFilteredData().invoices.map(invoice => [
      invoice.number,
      formatDate(invoice.issueDate),
      invoice.client,
      invoice.baseAmount.toFixed(2),
      invoice.vatAmount.toFixed(2),
      invoice.total.toFixed(2),
      invoice.status === 'paid' ? 'Pagada' : invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'
    ]);
    
    // Sección de ingresos (transacciones de tipo ingreso)
    const incomeHeaderRow = incomeTransactions.length > 0 ? [`INGRESOS`] : [];
    const incomeColumnsRow = incomeTransactions.length > 0 ? [['Fecha', 'Descripción', 'Categoría', 'Importe']] : [];
    const incomeRows = incomeTransactions.map(transaction => [
      formatDate(transaction.date),
      transaction.description,
      transaction.category || 'Sin categoría',
      transaction.amount.toFixed(2)
    ]);
    
    // Sección de gastos (transacciones de tipo gasto)
    const expenseHeaderRow = expenseTransactions.length > 0 ? [`GASTOS`] : [];
    const expenseColumnsRow = expenseTransactions.length > 0 ? [['Fecha', 'Descripción', 'Categoría', 'Importe']] : [];
    const expenseRows = expenseTransactions.map(transaction => [
      formatDate(transaction.date),
      transaction.description,
      transaction.category || 'Sin categoría',
      transaction.amount.toFixed(2)
    ]);
    
    // Sección de presupuestos
    const quoteHeaderRow = getFilteredData().quotes.length > 0 ? [`PRESUPUESTOS`] : [];
    const quoteColumnsRow = getFilteredData().quotes.length > 0 ? [['Número', 'Fecha', 'Cliente/Proveedor', 'Total', 'Estado']] : [];
    const quoteRows = getFilteredData().quotes.map(quote => [
      quote.number,
      formatDate(quote.issueDate),
      quote.clientName,
      quote.total.toFixed(2),
      quote.status === 'accepted' ? 'Aceptado' : quote.status === 'pending' ? 'Pendiente' : 'Rechazado'
    ]);
    
    // Pie de página
    const footerRow = [`Documento generado por Billeo - Sistema de Gestión Financiera para Autónomos`];
    
    // Función auxiliar para limpiar campos con comas
    function cleanCSVField(field: string) {
      if (field && field.includes(',')) {
        return `"${field}"`;
      }
      return field;
    }
    
    // Combinar todas las secciones
    const allRows = [
      ...titleRow, ...dateRow, ...filtersRow, emptyRow,
      ...summaryHeaderRow, ...summaryDataRows, emptyRow,
      ...invoiceHeaderRow, ...invoiceColumnsRow, ...invoiceRows, emptyRow,
      ...incomeHeaderRow, ...incomeColumnsRow, ...incomeRows, emptyRow,
      ...expenseHeaderRow, ...expenseColumnsRow, ...expenseRows, emptyRow,
      ...quoteHeaderRow, ...quoteColumnsRow, ...quoteRows, emptyRow,
      ...footerRow
    ];
    
    // Convertir a CSV
    let csvContent = '';
    
    // Procesar cada fila correctamente como CSV
    allRows.forEach(row => {
      if (Array.isArray(row)) {
        // Tratar cada elemento del array como una celda del CSV
        const processedRow = row.map(cell => {
          // Si la celda contiene comas, comillas o saltos de línea, entrecomillarla
          if (cell && (typeof cell === 'string') && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
            // Escapar las comillas doblándolas
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',');
        csvContent += processedRow + '\n';
      } else {
        // Si es una sola cadena (como los encabezados), simplemente añadirla
        csvContent += row + '\n';
      }
    });
    
    // Para que Excel reconozca correctamente los caracteres especiales
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Determinar nombre del archivo con período de tiempo
    let fileName = `libro_registros_${userId || 'todos'}`;
    if (selectedYear !== 'all') {
      fileName += `_${selectedYear}`;
      if (selectedQuarter !== 'all') {
        fileName += `_T${selectedQuarter.replace('Q', '')}`;
      } else if (selectedMonth !== 'all') {
        fileName += `_mes${selectedMonth}`;
      }
    }
    fileName += '.csv';
    
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid px-4 py-6 w-full max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Libro de Registros</h1>
          <p className="text-sm text-gray-500">
            Visualizando registros del usuario ID: {
              user && user.username === 'billeo_admin' && (!userId || userId === '') 
                ? user.id 
                : (userId || 'No seleccionado')
            }
          </p>
        </div>
        
        {/* Selector de usuarios para administradores */}
        {user && (user.role === 'admin' || user.role === 'superadmin' || user.username === 'billeo_admin') && (
          <div className="mt-4 md:mt-0 w-full md:w-auto">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-gray-500" />
              <Select 
                value={userId === '6' && user?.username === 'billeo_admin' ? 'self' : userId || ''} 
                onValueChange={handleUserChange}
                disabled={loadingUsers}
              >
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {/* Opción para ver datos propios del admin */}
                  {user.username === 'billeo_admin' && (
                    <SelectItem value="self">
                      Mis registros ({user.username})
                    </SelectItem>
                  )}
                  
                  {/* Lista de todos los usuarios */}
                  {users.map((userOption) => (
                    <SelectItem key={userOption.id} value={userOption.id.toString()}>
                      {userOption.name} ({userOption.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
      
      {/* Filtros y opciones de descarga */}
      <div className="bg-white rounded-lg shadow mb-6 p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Filtro por año */}
          <div>
            <Label htmlFor="year-filter" className="text-sm font-medium mb-1 block">Año</Label>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro por trimestre */}
          <div>
            <Label htmlFor="quarter-filter" className="text-sm font-medium mb-1 block">Trimestre</Label>
            <Select value={selectedQuarter} onValueChange={handleQuarterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar trimestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Q1">1T (Ene, Feb, Mar)</SelectItem>
                <SelectItem value="Q2">2T (Abr, May, Jun)</SelectItem>
                <SelectItem value="Q3">3T (Jul, Ago, Sep)</SelectItem>
                <SelectItem value="Q4">4T (Oct, Nov, Dic)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro por mes */}
          <div>
            <Label htmlFor="month-filter" className="text-sm font-medium mb-1 block">Mes</Label>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar mes" />
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
          
          {/* Botones de descarga */}
          <div className="flex items-end space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
              onClick={handleDownloadPDF}
            >
              <FileText className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
              onClick={handleDownloadExcel}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar Excel
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2 bg-blue-50 rounded-t-lg border-b border-blue-100">
            <CardTitle className="text-lg flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-500" />
              Facturas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-3xl font-bold">{getFilteredData()?.summary.totalInvoices || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total emitidas</p>
            <p className="text-lg font-semibold mt-2">{formatCurrency(getFilteredData()?.summary.incomeTotal || 0)}</p>
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
            <p className="text-3xl font-bold">{getFilteredData()?.summary.totalTransactions || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Transacciones</p>
            <p className="text-lg font-semibold mt-2">{formatCurrency(getFilteredData()?.summary.expenseTotal || 0)}</p>
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
            <p className="text-3xl font-bold">{getFilteredData()?.summary.totalQuotes || 0}</p>
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
              {formatCurrency((getFilteredData()?.summary.incomeTotal || 0) - (getFilteredData()?.summary.expenseTotal || 0))}
            </p>
            <p className="text-sm text-gray-500 mt-1">Resultado</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Diseño de 2 columnas para las secciones principales en pantallas grandes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Columna 1: Facturas y Presupuestos */}
        <div className="space-y-6">
          {/* Sección de facturas */}
          <Card>
            <CardHeader className="bg-blue-50 border-b border-blue-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Facturas emitidas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {getFilteredData()?.invoices && getFilteredData().invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Número</TableHead>
                        <TableHead className="py-2">Fecha</TableHead>
                        <TableHead className="py-2">Cliente</TableHead>
                        <TableHead className="py-2 text-right">Base</TableHead>
                        <TableHead className="py-2 text-right">IVA</TableHead>
                        <TableHead className="py-2 text-right">Total</TableHead>
                        <TableHead className="py-2">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredData().invoices.slice(0, 6).map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.number}</TableCell>
                          <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell className="truncate max-w-[100px]">{invoice.client}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.baseAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(invoice.vatAmount)}</TableCell>
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
                  {getFilteredData().invoices.length > 6 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Mostrando 6 de {getFilteredData().invoices.length} facturas
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
          
          {/* Sección de presupuestos */}
          <Card>
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <File className="h-5 w-5 mr-2 text-emerald-500" />
                Presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {getFilteredData()?.quotes && getFilteredData().quotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Número</TableHead>
                        <TableHead className="py-2">Fecha</TableHead>
                        <TableHead className="py-2">Cliente</TableHead>
                        <TableHead className="py-2 text-right">Total</TableHead>
                        <TableHead className="py-2">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredData().quotes.slice(0, 6).map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium">{quote.number}</TableCell>
                          <TableCell>{formatDate(quote.issueDate)}</TableCell>
                          <TableCell className="truncate max-w-[120px]">{quote.clientName}</TableCell>
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
                  {getFilteredData().quotes.length > 6 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Mostrando 6 de {getFilteredData().quotes.length} presupuestos
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
        
        {/* Columna 2: Gastos y transacciones */}
        <div>
          <Card>
            <CardHeader className="bg-amber-50 border-b border-amber-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
                Gastos y transacciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {getFilteredData()?.transactions && getFilteredData().transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Fecha</TableHead>
                        <TableHead className="py-2">Descripción</TableHead>
                        <TableHead className="py-2">Categoría</TableHead>
                        <TableHead className="py-2">Tipo</TableHead>
                        <TableHead className="py-2 text-right">Importe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredData().transactions.slice(0, 14).map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell className="font-medium truncate max-w-[150px]">{transaction.description}</TableCell>
                          <TableCell className="truncate max-w-[100px]">{transaction.category || 'Sin categoría'}</TableCell>
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
                  {getFilteredData().transactions.length > 14 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Mostrando 14 de {getFilteredData().transactions.length} transacciones
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
        </div>
      </div>
    </div>
  );
}