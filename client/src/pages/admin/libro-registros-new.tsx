import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, ShoppingCart, File, Users, FileSpreadsheet, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";


// Definiciones de tipos igual que en el original
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

interface UserOption {
  id: number;
  username: string;
  name: string;
  searchName?: string;
  searchUsername?: string;
}

interface LibroRegistrosSimpleProps {
  params?: {
    userId?: string;
  };
  forceOwnUser?: boolean;
}

export default function SimpleLibroRegistros({ params: propsParams, forceOwnUser = false }: LibroRegistrosSimpleProps) {
  const urlParams = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<string>("all");
  
  // Usar los parámetros pasados por prop o por URL
  const params = propsParams || urlParams;
  const userId = params?.userId || '';
  const { user, hasAdminPrivileges } = useAuth();
  
  // Estado para el selector de usuarios con búsqueda
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  
  // Verificación adicional de seguridad con acceso para usuarios a su propio libro
  if (!user) {
    return <Redirect to="/" />;
  }
  
  // Verificar si el usuario está intentando acceder a su propio libro de registros
  const isViewingSelf = params?.userId && parseInt(params.userId) === user.id;
  
  // Verificación de seguridad: sólo permitir acceso a los propios datos o si es admin
  const accessAllowed = forceOwnUser || isViewingSelf || hasAdminPrivileges();
  
  if (!accessAllowed) {
    console.log("Acceso denegado - no es admin ni está viendo sus propios datos");
    return <Redirect to="/" />;
  }

  useEffect(() => {
    // Cargar la lista de usuarios autorizados si el usuario actual tiene permisos de admin
    const fetchUsersList = async () => {
      if (!user) {
        return;
      }
      
      // Determinar si el usuario tiene privilegios administrativos usando la función centralizada
      const isAdmin = hasAdminPrivileges();
      // En este caso, consideramos superadmin igual que admin para simplificar
      const isSuperAdmin = isAdmin;
      
      if (!isAdmin) {
        return;
      }
      
      try {
        setLoadingUsers(true);
        
        // Para superadmin cargamos todos los usuarios
        // Para admin normal cargamos solo los clientes asignados
        // Usamos la función isSuperAdmin para determinar el tipo de permiso
        const apiUrl = isSuperAdmin 
          ? '/api/admin/users' 
          : '/api/admin/assigned-clients';
          
        console.log(`Consultando usuarios autorizados desde: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          console.error('Error al cargar la lista de usuarios:', response.statusText);
          return;
        }
        
        const usersList = await response.json();
        console.log("Lista de clientes/usuarios recibida:", usersList);
        
        // Añadir el usuario actual (admin) al inicio de la lista
        const adminUser = {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          searchUsername: user.username.toLowerCase(),
          searchName: user.name ? user.name.toLowerCase() : user.username.toLowerCase()
        };
        
        const mappedUsers = usersList.map((u: any) => ({
          id: u.id,
          username: u.username,
          name: u.name || u.username,
          // Añadimos campos para búsqueda en minúsculas
          searchUsername: u.username.toLowerCase(),
          searchName: u.name ? u.name.toLowerCase() : u.username.toLowerCase()
        }));
        
        // Poner al admin actual al principio de la lista
        const fullUsersList = [adminUser, ...mappedUsers.filter(u => u.id !== user.id)];
        
        console.log("Lista de usuarios procesada:", fullUsersList);
        setUsers(fullUsersList);
        
        // Por defecto, seleccionamos al usuario actual (admin)
        if ((!userId || userId === '') && user) {
          console.log("Seleccionando al usuario actual como predeterminado:", user.id);
          setLocation(`/admin/libro-registros-new/${user.id}`);
        }
        
      } catch (err) {
        console.error('Error al cargar usuarios:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsersList();
  }, [user, userId, setLocation, hasAdminPrivileges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Detectar si es superadmin usando la función centralizada
        const isSuperAdmin = hasAdminPrivileges();
        
        // Si no se especifica userId (o es vacío), usamos el ID del usuario actual
        let idToUse = userId;
        
        if (user && (!userId || userId === '')) {
          // Para cualquier tipo de usuario, si accede sin especificar ID, muestra sus propios datos
          idToUse = user.id.toString();
          console.log("Usuario accediendo a su propio ID:", idToUse);
        }
        
        if (!idToUse) {
          throw new Error("No hay ID de usuario válido para consultar");
        }
        
        // La ruta debe coincidir con la API en el backend
        // Usar la ruta correcta para obtener los datos
        const apiUrl = `/api/libro-registros/${idToUse}`;
        console.log("Consultando datos del Libro de Registros desde:", apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error de API (${response.status}):`, errorText);
          throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
        }
        
        const jsonData = await response.json();
        console.log("Datos recibidos correctamente del libro de registros");
        setData(jsonData);
      } catch (err) {
        console.error("Error al cargar datos del libro de registros:", err);
        setError(`No se pudieron cargar los datos del libro de registros: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    
    // Cualquier usuario puede ver su propio libro de registros
    if (user) {
      fetchData();
    } else {
      setLoading(false);
      setError("No se pudieron cargar los datos del libro de registros");
    }
  }, [userId, user, hasAdminPrivileges]);

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
    if (!newUserId) return;
    
    // Si selecciona el propio admin actual, redirigir a su ID
    if (newUserId === 'self' && user) {
      setLocation(`/admin/libro-registros-new/${user.id}`);
      return;
    }
    
    console.log(`Cambiando vista al usuario con ID: ${newUserId}`);
    // Redirige a la versión new con el ID de usuario seleccionado
    setLocation(`/admin/libro-registros-new/${newUserId}`);
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
    doc.text(`Total Gastos: ${filteredData.transactions.filter(t => t.type === 'expense').length} - Importe: ${formatCurrency(filteredData.summary.expenseTotal)}`, 20, 74);
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
      doc.setTextColor(tertiaryColor[0], tertiaryColor[1], tertiaryColor[2]);
      doc.text('INGRESOS', 15, yPos);
      yPos += 10;
      
      // Tabla de ingresos
      const incomeHeaders = [['Fecha', 'Descripción', 'Categoría', 'Importe']];
      const incomeData = incomeTransactions.map(transaction => [
        formatDate(transaction.date),
        transaction.description,
        transaction.category || 'Sin categoría',
        formatCurrency(transaction.amount)
      ]);
      
      autoTable(doc, {
        head: incomeHeaders,
        body: incomeData,
        startY: yPos,
        headStyles: { 
          fillColor: [236, 253, 245],
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
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('GASTOS', 15, yPos);
      yPos += 10;
      
      // Tabla de gastos
      const expenseHeaders = [['Fecha', 'Descripción', 'Categoría', 'Importe']];
      const expenseData = expenseTransactions.map(transaction => [
        formatDate(transaction.date),
        transaction.description,
        transaction.category || 'Sin categoría',
        formatCurrency(transaction.amount)
      ]);
      
      autoTable(doc, {
        head: expenseHeaders,
        body: expenseData,
        startY: yPos,
        headStyles: { 
          fillColor: [255, 247, 237],
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
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('PRESUPUESTOS', 15, yPos);
      yPos += 10;
      
      // Tabla de presupuestos
      const quoteHeaders = [['Número', 'Fecha', 'Cliente', 'Total', 'Estado']];
      const quoteData = filteredData.quotes.map(quote => [
        quote.number,
        formatDate(quote.issueDate),
        quote.clientName.length > 25 ? quote.clientName.substring(0, 22) + '...' : quote.clientName,
        formatCurrency(quote.total),
        quote.status === 'accepted' ? 'Aceptado' : 
          quote.status === 'pending' ? 'Pendiente' : 'Rechazado'
      ]);
      
      autoTable(doc, {
        head: quoteHeaders,
        body: quoteData,
        startY: yPos,
        headStyles: { 
          fillColor: [230, 236, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        theme: 'grid'
      });
    }
    
    // Guardar documento
    doc.save(`libro-registros-${userId || 'todos'}.pdf`);
  };
  
  // Función para descargar como Excel
  // Función para escapar campos CSV para manejar comas y comillas
  const escapeCsvField = (field: string | number) => {
    const stringField = String(field);
    // Si contiene comas, comillas o saltos de línea, envolvemos entre comillas y escapamos comillas internas
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  // Función que convierte un array de arrays a texto CSV
  const convertToCSV = (rows: (string | number)[][]) => {
    return rows.map(row => 
      row.map(field => escapeCsvField(field)).join(',')
    ).join('\n');
  };

  // Función para descargar como CSV (reemplaza a Excel)
  const handleDownloadExcel = () => {
    if (!filteredData) return;
    
    // Creamos un array para cada sección
    
    // RESUMEN
    const summaryRows = [
      ['LIBRO DE REGISTROS - RESUMEN'],
      [`Usuario ID: ${userId || 'Todos'}`],
      [`Generado: ${new Date().toLocaleString('es-ES')}`],
      [''],
      ['Filtros aplicados:'],
      [`Año: ${selectedYear !== 'all' ? selectedYear : 'Todos'}`],
      [`Trimestre: ${selectedQuarter !== 'all' ? selectedQuarter.replace('Q', '') : 'Todos'}`],
      [`Mes: ${selectedMonth !== 'all' ? selectedMonth : 'Todos'}`],
      [''],
      ['Concepto', 'Cantidad', 'Importe'],
      ['Facturas', filteredData.summary.totalInvoices, filteredData.summary.incomeTotal],
      ['Gastos', filteredData.transactions.filter(t => t.type === 'expense').length, filteredData.summary.expenseTotal],
      ['Presupuestos', filteredData.summary.totalQuotes, ''],
      ['Balance', '', filteredData.summary.incomeTotal - filteredData.summary.expenseTotal]
    ];
    
    // Convertir el resumen a CSV
    let csvContent = convertToCSV(summaryRows);
    
    // FACTURAS
    if (filteredData.invoices.length > 0) {
      // Separador
      csvContent += '\n\n';
      
      // Encabezado
      csvContent += convertToCSV([
        ['FACTURAS EMITIDAS'],
        [''],
        ['Número', 'Fecha', 'Cliente', 'Base', 'IVA', 'Total', 'Estado']
      ]);
      
      // Datos de facturas
      const invoiceRows = filteredData.invoices.map(invoice => [
        invoice.number,
        formatDate(invoice.issueDate),
        invoice.client,
        invoice.baseAmount,
        invoice.vatAmount,
        invoice.total,
        invoice.status === 'paid' ? 'Pagada' : 
          invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'
      ]);
      
      csvContent += '\n' + convertToCSV(invoiceRows);
    }
    
    // TRANSACCIONES
    if (filteredData.transactions.length > 0) {
      // Separador
      csvContent += '\n\n';
      
      // Encabezado
      csvContent += convertToCSV([
        ['TRANSACCIONES'],
        [''],
        ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe']
      ]);
      
      // Datos de transacciones
      const transactionRows = filteredData.transactions.map(transaction => [
        formatDate(transaction.date),
        transaction.description,
        transaction.category || 'Sin categoría',
        transaction.type === 'income' ? 'Ingreso' : 'Gasto',
        transaction.amount
      ]);
      
      csvContent += '\n' + convertToCSV(transactionRows);
    }
    
    // PRESUPUESTOS
    if (filteredData.quotes.length > 0) {
      // Separador
      csvContent += '\n\n';
      
      // Encabezado
      csvContent += convertToCSV([
        ['PRESUPUESTOS'],
        [''],
        ['Número', 'Fecha', 'Cliente', 'Total', 'Estado']
      ]);
      
      // Datos de presupuestos
      const quoteRows = filteredData.quotes.map(quote => [
        quote.number,
        formatDate(quote.issueDate),
        quote.clientName,
        quote.total,
        quote.status === 'accepted' ? 'Aceptado' : 
          quote.status === 'pending' ? 'Pendiente' : 'Rechazado'
      ]);
      
      csvContent += '\n' + convertToCSV(quoteRows);
    }
    
    // Crear un Blob con el contenido CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Crear un objeto URL para el blob
    const url = URL.createObjectURL(blob);
    
    // Crear un elemento 'a' para la descarga
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `libro-registros-${userId || 'todos'}.csv`);
    
    // Añadir el enlace al DOM, hacer clic en él y luego eliminarlo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar la URL del objeto
    URL.revokeObjectURL(url);
  };

  // Estado para almacenar el usuario seleccionado para visualización
  const selectedUserOption = users.find(u => u.id.toString() === userId);
  
  // Obtener los datos filtrados para mostrar en la interfaz
  const filteredResults = getFilteredData();
  if (!filteredResults) {
    return (
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold">Libro de Registros</h1>
        <p className="text-gray-500">No hay datos disponibles para mostrar</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {forceOwnUser ? "Mi Libro de Registros" : (selectedUserOption ? `Libro de Registros: ${selectedUserOption.name}` : "Libro de Registros")}
          </h1>
          <p className="text-gray-500 text-sm">
            Consulta tus facturas, gastos, presupuestos y transacciones
          </p>
        </div>
        
        {/* Selector de usuario para administradores */}
        {!forceOwnUser && (
          <div className="flex items-center space-x-2 w-full lg:w-auto">
            <div className="flex-grow lg:flex-grow-0">
              <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full lg:w-[240px] flex items-center justify-between"
                    disabled={loadingUsers}
                  >
                    {loadingUsers ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="mr-2 h-4 w-4" />
                    )}
                    <span className="flex-grow text-left">
                      {selectedUserOption ? selectedUserOption.name : "Seleccionar usuario"}
                    </span>
                    <Search className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="end">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar usuario..." 
                      className="h-9"
                      value={userSearchTerm}
                      onValueChange={setUserSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {users
                          .filter(u => 
                            u.searchName?.includes(userSearchTerm.toLowerCase()) || 
                            u.searchUsername?.includes(userSearchTerm.toLowerCase())
                          )
                          .map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.id.toString()}
                              onSelect={() => {
                                handleUserChange(user.id.toString());
                                setUserPopoverOpen(false);
                              }}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              <span>{user.name}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      {/* Filtros y botones de descarga - estilo Apple */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end flex-1">
            <div>
              <Label htmlFor="year-filter" className="block mb-2 text-sm">Año</Label>
              <Select
                value={selectedYear}
                onValueChange={handleYearChange}
              >
                <SelectTrigger id="year-filter" className="h-10">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => 
                    new Date().getFullYear() - i
                  ).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quarter-filter" className="block mb-2 text-sm">Trimestre</Label>
              <Select
                value={selectedQuarter}
                onValueChange={handleQuarterChange}
              >
                <SelectTrigger id="quarter-filter" className="h-10">
                  <SelectValue placeholder="Seleccionar trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Q1">Primer trimestre</SelectItem>
                  <SelectItem value="Q2">Segundo trimestre</SelectItem>
                  <SelectItem value="Q3">Tercer trimestre</SelectItem>
                  <SelectItem value="Q4">Cuarto trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="month-filter" className="block mb-2 text-sm">Mes</Label>
              <Select
                value={selectedMonth}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger id="month-filter" className="h-10">
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
          </div>
          
          {/* Botones de descarga alineados a la derecha */}
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              className="flex items-center h-10 w-[150px]"
            >
              <FileText className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDownloadExcel}
              className="flex items-center h-10 w-[150px]"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Facturas */}
        <Card 
          className={`cursor-pointer transition-all ${selectedCard === 'facturas' || selectedCard === 'all' ? 'ring-2 ring-blue-300' : 'hover:shadow-md'}`}
          onClick={() => setSelectedCard(selectedCard === 'facturas' ? 'all' : 'facturas')}
        >
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-500">Facturas</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {filteredResults.summary.totalInvoices}
            </div>
            <p className="text-xs text-gray-500">Total emitidas</p>
            <div className="mt-2 text-lg font-semibold">
              {formatCurrency(filteredResults.summary.incomeTotal)}
            </div>
            <p className="text-xs text-gray-500">Importe total facturado</p>
          </CardContent>
        </Card>

        {/* Gastos */}
        <Card 
          className={`cursor-pointer transition-all ${selectedCard === 'gastos' || selectedCard === 'all' ? 'ring-2 ring-amber-300' : 'hover:shadow-md'}`}
          onClick={() => setSelectedCard(selectedCard === 'gastos' ? 'all' : 'gastos')}
        >
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-gray-500">Gastos</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {filteredResults.transactions.filter(t => t.type === 'expense').length}
            </div>
            <p className="text-xs text-gray-500">Transacciones</p>
            <div className="mt-2 text-lg font-semibold">
              {formatCurrency(filteredResults.summary.expenseTotal)}
            </div>
            <p className="text-xs text-gray-500">Importe total gastado</p>
          </CardContent>
        </Card>

        {/* Presupuestos */}
        <Card 
          className={`cursor-pointer transition-all ${selectedCard === 'presupuestos' || selectedCard === 'all' ? 'ring-2 ring-emerald-300' : 'hover:shadow-md'}`}
          onClick={() => setSelectedCard(selectedCard === 'presupuestos' ? 'all' : 'presupuestos')}
        >
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <File className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-gray-500">Presupuestos</span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {filteredResults.summary.totalQuotes}
            </div>
            <p className="text-xs text-gray-500">Total presupuestos</p>
            <div className="mt-2 text-lg font-semibold">
              {filteredResults.quotes.filter(q => q.status === 'accepted').length} aceptados
            </div>
            <p className="text-xs text-gray-500">
              {filteredResults.quotes.filter(q => q.status === 'pending').length} pendientes, {' '}
              {filteredResults.quotes.filter(q => q.status === 'rejected').length} rechazados
            </p>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card 
          className={`cursor-pointer transition-all ${selectedCard === 'balance' || selectedCard === 'all' ? 'ring-2 ring-purple-300' : 'hover:shadow-md'}`}
          onClick={() => setSelectedCard(selectedCard === 'balance' ? 'all' : 'balance')}
        >
          <CardContent className="p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Balance</span>
            </div>
            <div className={`mt-2 text-2xl font-bold ${filteredResults.summary.incomeTotal - filteredResults.summary.expenseTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(filteredResults.summary.incomeTotal - filteredResults.summary.expenseTotal)}
            </div>
            <p className="text-xs text-gray-500">Resultado</p>
            <div className="mt-2 text-sm">
              <span className="text-blue-500 font-medium">{formatCurrency(filteredResults.summary.incomeTotal)}</span>
              <span className="text-gray-400 mx-1">-</span>
              <span className="text-amber-500 font-medium">{formatCurrency(filteredResults.summary.expenseTotal)}</span>
            </div>
            <p className="text-xs text-gray-500">Ingresos - Gastos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tablas de datos - Mostrar solo las seleccionadas o todas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facturas */}
        {(selectedCard === 'all' || selectedCard === 'facturas') && filteredResults.invoices.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-50 border-b border-blue-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Facturas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    {filteredResults.invoices.slice(0, 6).map((invoice) => (
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
                {filteredResults.invoices.length > 6 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Mostrando 6 de {filteredResults.invoices.length} facturas
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Presupuestos */}
        {(selectedCard === 'all' || selectedCard === 'presupuestos') && filteredResults.quotes.length > 0 && (
          <Card>
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <File className="h-5 w-5 mr-2 text-emerald-500" />
                Presupuestos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    {filteredResults.quotes.slice(0, 6).map((quote) => (
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
                {filteredResults.quotes.length > 6 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Mostrando 6 de {filteredResults.quotes.length} presupuestos
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Gastos y transacciones */}
        {(selectedCard === 'all' || selectedCard === 'gastos') && filteredResults.transactions.length > 0 && (
          <Card className={selectedCard === 'gastos' ? "lg:col-span-2" : ""}>
            <CardHeader className="bg-amber-50 border-b border-amber-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <ShoppingCart className="h-5 w-5 mr-2 text-amber-500" />
                Gastos y transacciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
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
                    {filteredResults.transactions.slice(0, 14).map((transaction) => (
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
                {filteredResults.transactions.length > 14 && (
                  <div className="p-3 text-center text-sm text-gray-500">
                    Mostrando 14 de {filteredResults.transactions.length} transacciones
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}