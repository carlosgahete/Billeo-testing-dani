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
    
    // Creamos un "hack" sencillo para hacer la impresión del PDF más fácil
    // Este método utiliza la capacidad del navegador para imprimir/guardar a PDF
    
    // Creamos un elemento DIV oculto para contener la versión imprimible
    const printableDiv = document.createElement('div');
    printableDiv.style.display = 'none';
    printableDiv.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(printableDiv);
    
    // Creamos el contenido HTML
    printableDiv.innerHTML = `
      <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
        <h1 style="text-align: center; margin-bottom: 15px;">LIBRO DE REGISTROS</h1>
        <h2 style="text-align: center; color: #666; margin-bottom: 30px;">Usuario ID: ${userId || 'Todos'}</h2>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
          <p><strong>Filtros aplicados:</strong> 
            Año: ${selectedYear !== 'all' ? selectedYear : 'Todos'}, 
            Trimestre: ${selectedQuarter !== 'all' ? `T${selectedQuarter.replace('Q', '')}` : 'Todos'}, 
            Mes: ${selectedMonth !== 'all' ? new Date(2025, parseInt(selectedMonth)-1, 1).toLocaleDateString('es-ES', {month: 'long'}) : 'Todos'}
          </p>
        </div>
        
        <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <h3 style="margin-bottom: 10px;">Resumen</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px;"><strong>Total Facturas:</strong></td>
              <td style="padding: 8px; text-align: right;">${filteredData.summary.totalInvoices}</td>
              <td style="padding: 8px;"><strong>Importe Facturado:</strong></td>
              <td style="padding: 8px; text-align: right;">${formatCurrency(filteredData.summary.incomeTotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Total Gastos:</strong></td>
              <td style="padding: 8px; text-align: right;">${filteredData.summary.totalTransactions}</td>
              <td style="padding: 8px;"><strong>Importe Gastado:</strong></td>
              <td style="padding: 8px; text-align: right;">${formatCurrency(filteredData.summary.expenseTotal)}</td>
            </tr>
            <tr>
              <td style="padding: 8px;"><strong>Total Presupuestos:</strong></td>
              <td style="padding: 8px; text-align: right;">${filteredData.summary.totalQuotes}</td>
              <td style="padding: 8px;"><strong>Balance:</strong></td>
              <td style="padding: 8px; text-align: right; font-weight: bold;">${formatCurrency(filteredData.summary.incomeTotal - filteredData.summary.expenseTotal)}</td>
            </tr>
          </table>
        </div>
        
        ${filteredData.invoices.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 10px; color: #2563eb;">Facturas Emitidas</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #e6efff;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Número</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fecha</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Cliente</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Base</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">IVA</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.invoices.map(invoice => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${invoice.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(invoice.issueDate)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${invoice.client}</td>
                  <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${formatCurrency(invoice.baseAmount)}</td>
                  <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">${formatCurrency(invoice.vatAmount)}</td>
                  <td style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(invoice.total)}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    <span style="padding: 3px 8px; border-radius: 12px; font-size: 11px; background-color: ${
                      invoice.status === 'paid' ? '#dcfce7; color: #166534' : 
                      invoice.status === 'pending' ? '#fef3c7; color: #92400e' : 
                      '#fee2e2; color: #b91c1c'
                    }">
                      ${invoice.status === 'paid' ? 'Pagada' : 
                        invoice.status === 'pending' ? 'Pendiente' : 
                        'Cancelada'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}
        
        ${filteredData.transactions.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 10px; color: #d97706;">Transacciones y Gastos</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #fffbeb;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fecha</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Descripción</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Categoría</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Tipo</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.transactions.map(transaction => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(transaction.date)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${transaction.description}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${transaction.category || 'Sin categoría'}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    <span style="padding: 3px 8px; border-radius: 12px; font-size: 11px; background-color: ${
                      transaction.type === 'income' ? '#dcfce7; color: #166534' : 
                      '#fee2e2; color: #b91c1c'
                    }">
                      ${transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td style="padding: 8px; text-align: right; border: 1px solid #ddd; color: ${
                    transaction.type === 'income' ? '#166534' : '#b91c1c'
                  }; font-weight: bold;">
                    ${formatCurrency(transaction.amount)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}
        
        ${filteredData.quotes.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h3 style="margin-bottom: 10px; color: #059669;">Presupuestos</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background-color: #ecfdf5;">
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Número</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fecha</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Cliente</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.quotes.map(quote => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${quote.number}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${formatDate(quote.issueDate)}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${quote.clientName}</td>
                  <td style="padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${formatCurrency(quote.total)}</td>
                  <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
                    <span style="padding: 3px 8px; border-radius: 12px; font-size: 11px; background-color: ${
                      quote.status === 'accepted' ? '#dcfce7; color: #166534' : 
                      quote.status === 'pending' ? '#fef3c7; color: #92400e' : 
                      '#fee2e2; color: #b91c1c'
                    }">
                      ${quote.status === 'accepted' ? 'Aceptado' : 
                        quote.status === 'pending' ? 'Pendiente' : 
                        'Rechazado'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : ''}
        
        <div style="text-align: center; color: #666; margin-top: 40px; font-size: 12px;">
          <p>Documento generado por Billeo - Sistema de Gestión Financiera para Autónomos</p>
          <p>${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</p>
        </div>
      </div>
    `;
    
    // En lugar de abrir una ventana de impresión, creamos un PDF para descargar
    // Convertimos el HTML a Blob y lo descargamos
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
          <title>Libro de Registros - Usuario ID: ${userId || 'Todos'}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            @page { size: auto; margin: 20mm; }
          </style>
        </head>
        <body>
          ${printableDiv.innerHTML}
        </body>
      </html>
    `;
    
    // Crear un Blob con el HTML
    // Aseguramos la codificación adecuada usando un Encoder UTF-8
    const encoder = new TextEncoder();
    const utf8Array = encoder.encode(htmlContent);
    // Forzamos más agresivamente el tipo a un tipo binario genérico con BOM UTF-8
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const combinedArray = new Uint8Array(BOM.length + utf8Array.length);
    combinedArray.set(BOM, 0);
    combinedArray.set(utf8Array, BOM.length);
    const blob = new Blob([combinedArray], { type: 'application/force-download' });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace para descargar
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
    fileName += '.html'; // Usamos HTML que puede ser abierto y guardado como PDF
    
    // Configuramos todos los atributos para forzar la descarga sin abrir
    link.href = url;
    link.setAttribute('download', fileName);
    // Quitamos target="_blank" que puede causar problemas
    link.style.display = 'none';
    
    // Añadimos al DOM, hacemos clic y limpiamos con un poco más de retraso
    document.body.appendChild(link);
    
    // Pequeño retraso antes de hacer clic
    setTimeout(() => {
      try {
        link.click();
      } catch (err) {
        console.error("Error al hacer clic en el enlace de descarga:", err);
        alert("Hubo un problema al descargar el PDF. Por favor, inténtelo de nuevo.");
      }
      
      // Limpieza con más tiempo
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        if (document.body.contains(printableDiv)) {
          document.body.removeChild(printableDiv);
        }
        URL.revokeObjectURL(url);
      }, 300);
    }, 100);
  };
  
  // Función para descargar como CSV (compatible con Excel)
  const handleDownloadExcel = () => {
    if (!filteredData) return;
    
    // Nombre del archivo
    let fileName = `libro_registros_${userId || 'todos'}`;
    if (selectedYear !== 'all') {
      fileName += `_${selectedYear}`;
      if (selectedQuarter !== 'all') {
        fileName += `_T${selectedQuarter.replace('Q', '')}`;
      } else if (selectedMonth !== 'all') {
        fileName += `_mes${selectedMonth}`;
      }
    }
    fileName += '.txt'; // Usamos TXT (con contenido TSV) para garantizar compatibilidad
    
    // Generar datos para facturas
    const invoicesData = filteredData.invoices.map(invoice => ({
      'Número': invoice.number,
      'Fecha_Emisión': formatDate(invoice.issueDate),
      'Fecha_Vencimiento': formatDate(invoice.dueDate || invoice.issueDate),
      'Cliente': invoice.client,
      'Base_Imponible': invoice.baseAmount.toFixed(2),
      'IVA': invoice.vatAmount.toFixed(2),
      'Total': invoice.total.toFixed(2),
      'Tipo_IVA': `${invoice.vatRate || 21}%`,
      'Estado': invoice.status === 'paid' ? 'Pagada' : 
               invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'
    }));
    
    // Generar datos para ingresos
    const incomesData = filteredData.transactions.filter(t => t.type === 'income').map(income => ({
      'Fecha': formatDate(income.date),
      'Descripción': income.description,
      'Categoría': income.category || 'Sin categoría',
      'Importe': income.amount.toFixed(2),
      'Notas': income.notes || ''
    }));
    
    // Generar datos para gastos
    const expensesData = filteredData.transactions.filter(t => t.type === 'expense').map(expense => ({
      'Fecha': formatDate(expense.date),
      'Descripción': expense.description,
      'Categoría': expense.category || 'Sin categoría',
      'Importe': expense.amount.toFixed(2),
      'Notas': expense.notes || ''
    }));
    
    // Generar datos para presupuestos
    const quotesData = filteredData.quotes.map(quote => ({
      'Número': quote.number,
      'Fecha_Emisión': formatDate(quote.issueDate),
      'Fecha_Expiración': formatDate(quote.expiryDate || quote.issueDate),
      'Cliente': quote.clientName,
      'Total': quote.total.toFixed(2),
      'Estado': quote.status === 'accepted' ? 'Aceptado' : 
               quote.status === 'pending' ? 'Pendiente' : 'Rechazado'
    }));
    
    // Datos del resumen
    const summaryData = [{
      'Periodo': selectedYear !== 'all' ? 
                (selectedQuarter !== 'all' ? `${selectedYear} - T${selectedQuarter.replace('Q', '')}` :
                 selectedMonth !== 'all' ? `${selectedYear} - ${new Date(2025, parseInt(selectedMonth)-1, 1).toLocaleDateString('es-ES', {month: 'long'})}` :
                 selectedYear) : 'Todos',
      'Total_Facturas': filteredData.summary.totalInvoices,
      'Importe_Facturado': filteredData.summary.incomeTotal.toFixed(2),
      'Total_Gastos': filteredData.summary.totalTransactions,
      'Importe_Gastos': filteredData.summary.expenseTotal.toFixed(2),
      'Total_Presupuestos': filteredData.summary.totalQuotes,
      'Balance': (filteredData.summary.incomeTotal - filteredData.summary.expenseTotal).toFixed(2)
    }];
    
    // Función para crear una tabla HTML a partir de datos
    const createTable = (data: Record<string, any>[], title: string) => {
      if (!data || data.length === 0) {
        return `<h3>${title}</h3><p>No hay datos disponibles</p>`;
      }
      
      const headers = Object.keys(data[0]);
      
      let table = `
        <h3 style="margin-top: 20px; color: #333;">${title}</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
          <tr style="background-color: #f2f2f2; font-weight: bold;">
            ${headers.map(header => `<th>${header.replace(/_/g, ' ')}</th>`).join('')}
          </tr>
          ${data.map((row: Record<string, any>) => `
            <tr>
              ${headers.map(header => {
                const value = row[header];
                // Formatear como moneda si es un número y contiene palabras clave financieras
                if (!isNaN(Number(value)) && 
                    (header.includes('Total') || 
                     header.includes('Importe') || 
                     header.includes('Base') || 
                     header.includes('IVA'))) {
                  return `<td align="right">${Number(value).toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  })}</td>`;
                }
                return `<td>${value}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </table>
      `;
      
      return table;
    };
    
    // Crear una hoja de estilo para el documento Excel
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #2563eb; text-align: center; margin-bottom: 20px; }
        h3 { color: #333; margin-top: 30px; margin-bottom: 10px; }
        .sheet { display: none; }
        .visible { display: block; }
        .tab-buttons { margin-bottom: 20px; }
        .tab-button {
          padding: 8px 16px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          margin-right: 5px;
        }
        .tab-button.active {
          background-color: #2563eb;
          color: white;
          border-color: #2563eb;
        }
        .info-header {
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
          border: 1px solid #ddd;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f2f2f2; text-align: left; padding: 8px; }
        td { padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    `;
    
    // Lógica para cambiar entre pestañas (para vista previa)
    const script = `
      <script>
        function showSheet(sheetId) {
          // Ocultar todas las hojas
          var sheets = document.getElementsByClassName('sheet');
          for (var i = 0; i < sheets.length; i++) {
            sheets[i].classList.remove('visible');
          }
          
          // Mostrar la hoja seleccionada
          document.getElementById(sheetId).classList.add('visible');
          
          // Actualizar botones activos
          var buttons = document.getElementsByClassName('tab-button');
          for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('active');
          }
          
          document.getElementById('btn-' + sheetId).classList.add('active');
        }
      </script>
    `;
    
    // Función para convertir array de objetos a CSV
    const objectsToCSV = (data: Record<string, any>[]) => {
      if (!data || data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [];
      
      // Añadir cabeceras
      csvRows.push(headers.map(header => `"${header.replace(/_/g, ' ')}"`).join(','));
      
      // Añadir filas de datos
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          // Formatear valores de moneda
          if (!isNaN(Number(value)) && 
              (header.includes('Total') || 
              header.includes('Importe') || 
              header.includes('Base') || 
              header.includes('IVA'))) {
            return `"${Number(value).toFixed(2)} €"`;
          }
          // Escapar comillas en texto
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return `"${value}"`;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    };
    
    // Vamos a cambiar el enfoque y crear un TSV (Tab-Separated Values) que Excel abre mejor
    // Creamos solo el Excel con las facturas, que son el dato central
    
    // Preparar el encabezado
    const headerRow = [
      'Número', 'Fecha Emisión', 'Fecha Vencimiento', 'Cliente', 
      'Base Imponible (€)', 'IVA (€)', 'Total (€)', 'Tipo IVA', 'Estado'
    ].join('\t');
    
    // Preparar las filas de datos
    const dataRows = filteredData.invoices.map(invoice => [
      invoice.number,
      formatDate(invoice.issueDate),
      formatDate(invoice.dueDate || invoice.issueDate),
      invoice.client,
      invoice.baseAmount.toFixed(2).replace('.', ','),
      invoice.vatAmount.toFixed(2).replace('.', ','),
      invoice.total.toFixed(2).replace('.', ','),
      `${invoice.vatRate || 21}%`,
      invoice.status === 'paid' ? 'Pagada' : 
       invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'
    ].join('\t')).join('\n');
    
    // Crear el contenido del archivo
    const title = `LIBRO DE REGISTROS - FACTURAS EMITIDAS`;
    const generationDate = `Generado: ${new Date().toLocaleDateString('es-ES')}`;
    const filterInfo = `Filtros: Año: ${selectedYear !== 'all' ? selectedYear : 'Todos'}, Trimestre: ${selectedQuarter !== 'all' ? `T${selectedQuarter.replace('Q', '')}` : 'Todos'}, Mes: ${selectedMonth !== 'all' ? new Date(2025, parseInt(selectedMonth)-1, 1).toLocaleDateString('es-ES', {month: 'long'}) : 'Todos'}`;
    const summary = `Total Facturas: ${filteredData.summary.totalInvoices}, Importe Total: ${filteredData.summary.incomeTotal.toFixed(2).replace('.', ',')} €`;
    
    // Combinar todo en un contenido TSV limpio
    const tsvContent = [
      title,
      generationDate,
      filterInfo,
      summary,
      '',
      headerRow,
      dataRows,
      '',
      'Documento generado por Billeo - Sistema de Gestión Financiera para Autónomos'
    ].join('\n');
    
    // Preparar el BOM UTF-8 para que Excel reconozca los caracteres internacionales
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const encoder = new TextEncoder();
    const tsvArray = encoder.encode(tsvContent);
    
    // Combinar BOM con contenido TSV
    const combinedArray = new Uint8Array(BOM.length + tsvArray.length);
    combinedArray.set(BOM, 0);
    combinedArray.set(tsvArray, BOM.length);
    
    // Crear el Blob con tipo correcto para texto plano
    const blob = new Blob([combinedArray], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Crear un enlace y hacer clic para descargar
    const link = document.createElement('a');
    
    // Configuramos todos los atributos para forzar la descarga sin abrir
    link.href = url;
    link.setAttribute('download', fileName);
    // Quitamos target="_blank" que puede causar problemas
    link.style.display = 'none';
    
    // Añadimos al DOM, hacemos clic y limpiamos con un poco más de retraso
    document.body.appendChild(link);
    
    // Pequeño retraso antes de hacer clic
    setTimeout(() => {
      try {
        link.click();
      } catch (err) {
        console.error("Error al hacer clic en el enlace de descarga:", err);
        alert("Hubo un problema al descargar el Excel. Por favor, inténtelo de nuevo.");
      }
      
      // Limpieza con más tiempo
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 300);
    }, 100);
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
            <p className="text-3xl font-bold">{filteredData?.summary.totalInvoices || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total emitidas</p>
            <p className="text-lg font-semibold mt-2">{formatCurrency(filteredData?.summary.incomeTotal || 0)}</p>
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
            <p className="text-3xl font-bold">{filteredData?.summary.totalTransactions || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Transacciones</p>
            <p className="text-lg font-semibold mt-2">{formatCurrency(filteredData?.summary.expenseTotal || 0)}</p>
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
            <p className="text-3xl font-bold">{filteredData?.summary.totalQuotes || 0}</p>
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
              {formatCurrency((filteredData?.summary.incomeTotal || 0) - (filteredData?.summary.expenseTotal || 0))}
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
              {filteredData?.invoices && filteredData.invoices.length > 0 ? (
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
                      {filteredData.invoices.slice(0, 6).map((invoice) => (
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
                  {filteredData.invoices.length > 6 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Mostrando 6 de {filteredData.invoices.length} facturas
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
              {filteredData?.quotes && filteredData.quotes.length > 0 ? (
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
                      {filteredData.quotes.slice(0, 6).map((quote) => (
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
                  {filteredData.quotes.length > 6 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Mostrando 6 de {filteredData.quotes.length} presupuestos
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
              {filteredData?.transactions && filteredData.transactions.length > 0 ? (
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
                      {filteredData.transactions.slice(0, 14).map((transaction) => (
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
                  {filteredData.transactions.length > 14 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      Mostrando 14 de {filteredData.transactions.length} transacciones
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