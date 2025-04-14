import * as XLSX from 'xlsx';

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

interface ExcelData {
  year: string;
  period: string;
  transactions: Transaction[];
  invoices: Invoice[];
  user: User | null;
}

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

// Función principal para generar el Excel
export const generateExcel = async (data: ExcelData, filename: string): Promise<void> => {
  const { year, period, transactions, invoices, user } = data;
  
  // Preparar datos para las hojas de cálculo
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalInvoices = invoices.reduce((sum, i) => sum + i.total, 0);
  
  // Formatear datos para el resumen
  const summaryData = [
    ['Libro de Registros', '', ''],
    ['', '', ''],
    ['Periodo:', getPeriodName(period), year],
    ['Usuario:', user?.name || user?.username || 'N/A', ''],
    ['Fecha de generación:', new Date().toLocaleDateString('es-ES'), ''],
    ['', '', ''],
    ['Resumen General', '', ''],
    ['Tipo', 'Importe', 'Cantidad'],
    ['Ingresos', totalIncome, incomeTransactions.length],
    ['Gastos', totalExpenses, expenseTransactions.length],
    ['Facturas', totalInvoices, invoices.length],
    ['Balance', totalIncome - totalExpenses, ''],
  ];
  
  // Formatear datos para ingresos
  const incomeHeaders = ['ID', 'Fecha', 'Concepto', 'Descripción', 'Importe'];
  const incomeData = incomeTransactions.map(t => [
    t.id,
    formatDate(t.date),
    t.title,
    t.description,
    parseFloat(t.amount)
  ]);
  
  // Formatear datos para gastos
  const expenseHeaders = ['ID', 'Fecha', 'Concepto', 'Descripción', 'Importe'];
  const expenseData = expenseTransactions.map(t => [
    t.id,
    formatDate(t.date),
    t.title,
    t.description,
    parseFloat(t.amount)
  ]);
  
  // Formatear datos para facturas
  const invoiceHeaders = ['ID', 'Número', 'Fecha', 'Cliente', 'Estado', 'Base Imponible', 'IVA', 'Total'];
  const invoiceData = invoices.map(i => [
    i.id,
    i.invoiceNumber,
    formatDate(i.issueDate),
    i.clientName,
    getStatusText(i.status),
    i.subtotal,
    i.tax,
    i.total
  ]);
  
  // Crear un libro nuevo
  const workbook = XLSX.utils.book_new();
  
  // Crear hojas y añadirlas al libro
  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumen');
  
  if (incomeTransactions.length > 0) {
    const incomeWorksheet = XLSX.utils.aoa_to_sheet([incomeHeaders, ...incomeData]);
    XLSX.utils.book_append_sheet(workbook, incomeWorksheet, 'Ingresos');
  }
  
  if (expenseTransactions.length > 0) {
    const expenseWorksheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseData]);
    XLSX.utils.book_append_sheet(workbook, expenseWorksheet, 'Gastos');
  }
  
  if (invoices.length > 0) {
    const invoiceWorksheet = XLSX.utils.aoa_to_sheet([invoiceHeaders, ...invoiceData]);
    XLSX.utils.book_append_sheet(workbook, invoiceWorksheet, 'Facturas');
  }
  
  // Guardar el libro como archivo Excel
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};