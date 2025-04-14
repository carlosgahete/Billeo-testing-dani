import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';

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

interface User {
  id: number;
  name?: string;
  username: string;
  taxId?: string;
  [key: string]: any;
}

interface PDFData {
  year: string;
  period: string;
  transactions: Transaction[];
  invoices: Invoice[];
  user: User | null;
}

// Constantes de estilos
const COLORS = {
  primary: '#007AFF', // Color iOS
  secondary: '#34c759',
  text: '#1c1c1e',
  lightText: '#8e8e93',
  background: '#ffffff',
  success: '#34c759',
  danger: '#ff3b30',
};

// Función para formatear fechas
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Función para obtener el nombre del periodo
const getPeriodName = (period: string): string => {
  if (period === 'all') return 'Todo el año';
  if (period === '1T') return 'Primer Trimestre';
  if (period === '2T') return 'Segundo Trimestre';
  if (period === '3T') return 'Tercer Trimestre';
  if (period === '4T') return 'Cuarto Trimestre';
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthIndex = parseInt(period) - 1;
  return monthNames[monthIndex];
};

// Función para formatear moneda
const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(numAmount);
};

// Función para obtener el texto del estado de una factura
const getStatusText = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid': return 'Pagada';
    case 'pending': return 'Pendiente';
    case 'draft': return 'Borrador';
    case 'overdue': return 'Vencida';
    default: return status;
  }
};

// Función principal para generar el PDF
export const generatePDF = async (data: PDFData, filename: string): Promise<void> => {
  const { year, period, transactions, invoices, user } = data;
  
  // Crear un nuevo documento PDF
  const doc = new jsPDF();
  
  // Añadir título y subtítulo
  const periodName = getPeriodName(period);
  doc.setFontSize(18);
  doc.setTextColor(COLORS.primary);
  doc.text('Libro de Registros', 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);
  doc.text(`Periodo: ${periodName} ${year}`, 14, 30);
  
  // Información del usuario
  if (user) {
    doc.setFontSize(10);
    doc.setTextColor(COLORS.lightText);
    doc.text(`Usuario: ${user.name || user.username}`, 14, 40);
    if (user.taxId) {
      doc.text(`NIF/CIF: ${user.taxId}`, 14, 45);
    }
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 14, 50);
  }
  
  // Calcular totales
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + i.total, 0);
  
  // Resumen general
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text('Resumen General', 14, 60);
  
  const summaryData = [
    ['Ingresos', formatCurrency(totalIncome), incomeTransactions.length.toString()],
    ['Gastos', formatCurrency(totalExpenses), expenseTransactions.length.toString()],
    ['Facturas', formatCurrency(totalInvoices), invoices.length.toString()],
    ['Balance', formatCurrency(totalIncome - totalExpenses), '']
  ];
  
  autoTable(doc, {
    startY: 65,
    head: [['Tipo', 'Importe', 'Cantidad']],
    body: summaryData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.background,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 40, halign: 'center' },
    },
  });
  
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Sección de Ingresos
  if (incomeTransactions.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.text('Ingresos', 14, currentY);
    
    const incomeData = incomeTransactions.map(t => [
      formatDate(t.date),
      t.title,
      t.description,
      formatCurrency(t.amount)
    ]);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Fecha', 'Concepto', 'Descripción', 'Importe']],
      body: incomeData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: COLORS.background,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 85 },
        3: { cellWidth: 30, halign: 'right' },
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Sección de Gastos
  if (expenseTransactions.length > 0) {
    // Si no hay suficiente espacio, añadir una nueva página
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.text('Gastos', 14, currentY);
    
    const expenseData = expenseTransactions.map(t => [
      formatDate(t.date),
      t.title,
      t.description,
      formatCurrency(t.amount)
    ]);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Fecha', 'Concepto', 'Descripción', 'Importe']],
      body: expenseData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.danger,
        textColor: COLORS.background,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 85 },
        3: { cellWidth: 30, halign: 'right' },
      },
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Sección de Facturas
  if (invoices.length > 0) {
    // Si no hay suficiente espacio, añadir una nueva página
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(COLORS.primary);
    doc.text('Facturas', 14, currentY);
    
    const invoiceData = invoices.map(i => [
      i.invoiceNumber,
      formatDate(i.issueDate),
      i.clientName,
      getStatusText(i.status),
      formatCurrency(i.subtotal),
      formatCurrency(i.tax),
      formatCurrency(i.total)
    ]);
    
    autoTable(doc, {
      startY: currentY + 5,
      head: [['Número', 'Fecha', 'Cliente', 'Estado', 'Base', 'IVA', 'Total']],
      body: invoiceData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.background,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 22 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 25, halign: 'right' },
      },
    });
  }
  
  // Pie de página con información legal
  doc.setFontSize(8);
  doc.setTextColor(COLORS.lightText);
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Libro de Registros - Generado el ${new Date().toLocaleDateString('es-ES')} - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Guardar el archivo PDF
  doc.save(`${filename}.pdf`);
};