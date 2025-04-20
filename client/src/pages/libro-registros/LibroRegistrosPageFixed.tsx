import React, { useState, useEffect } from 'react';
import { 
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell 
} from '@/components/ui/table';
import { 
  Select, SelectValue, SelectTrigger, SelectContent, SelectItem 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@tanstack/react-query';
// Importamos CalendarIcon separadamente para no interferir con el componente Calendar
import { FileText, Download, Users, FileUp, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
// Importamos componentes de fecha directamente
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { toast } from '@/hooks/use-toast';
// Importamos jsPDF para generar PDFs
import { jsPDF } from "jspdf";

// Interfaces necesarias para la función
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

interface QuoteRecord {
  id: number;
  number: string;
  date: string;
  clientName: string;
  total: string;
  status: string;
}

interface TransactionRecord {
  id: number;
  date: string;
  description: string;
  category?: string;
  type: string;
  amount: string;
}

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

interface UserOption {
  id: number;
  username: string;
  name?: string;
  email: string;
}

export default function LibroRegistrosPageFixed() {
  // Estado para filtros y datos
  const [selectedUserId, setSelectedUserId] = useState<string>('current');
  const [dateRange, setDateRange] = useState<any>({ from: null, to: null });
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  
  // Referencia al usuario actual para asegurar su ID siempre esté disponible
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Cargar el ID del usuario actual una sola vez
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userResponse = await fetch('/api/user');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData && userData.id) {
            console.log("ID de usuario actual obtenido:", userData.id);
            setCurrentUserId(userData.id);
          }
        }
      } catch (error) {
        console.error("Error al obtener usuario actual:", error);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // Consulta para obtener los datos
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/libro-registros', selectedUserId, startDate, endDate, currentUserId],
    queryFn: async () => {
      // Si no tenemos el ID del usuario actual, esperar
      if (selectedUserId === 'current' && !currentUserId) {
        throw new Error('Esperando ID de usuario');
      }
      
      // Determinar la URL base
      let url;
      
      // Cuando es usuario actual o se selecciona específicamente un ID
      if (selectedUserId === 'current' && currentUserId) {
        // Uso directo del endpoint con ID para usuario actual
        url = `/api/libro-registros/${currentUserId}`;
        console.log("Usando URL específica con ID usuario actual:", url);
      } else if (selectedUserId !== 'current') {
        // Uso directo del endpoint con ID para otro usuario
        url = `/api/libro-registros/${selectedUserId}`;
        console.log("Usando URL específica con ID seleccionado:", url);
      } else {
        // Fallback a la URL general (no debería ocurrir)
        url = '/api/libro-registros';
        console.log("Usando URL general (fallback):", url);
      }
      
      // Añadir parámetros de fecha si existen
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      // Realizar la petición HTTP
      console.log("URL final para petición:", url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }
      
      const responseData = await response.json() as LibroRegistrosData;
      console.log("Datos obtenidos correctamente:", responseData);
      console.log("Facturas:", responseData.invoices?.length || 0);
      console.log("Transacciones:", responseData.transactions?.length || 0);
      console.log("Presupuestos:", responseData.quotes?.length || 0);
      
      return responseData;
    },
    // No recargar automáticamente para evitar doble carga
    refetchOnWindowFocus: false,
    // Recargar siempre al montar el componente
    refetchOnMount: true,
    // Refrescar solo si cambia el usuario actual
    enabled: selectedUserId === 'current' ? !!currentUserId : true,
    // Mantener datos frescos por 1 minuto
    staleTime: 60000
  });
  
  // Estado para manejar datos en dispositivos móviles/escritorio uniformemente
  const [displayInvoices, setDisplayInvoices] = useState<InvoiceRecord[]>([]);
  const [displayTransactions, setDisplayTransactions] = useState<TransactionRecord[]>([]);
  const [displayExpenses, setDisplayExpenses] = useState<TransactionRecord[]>([]);
  const [displayQuotes, setDisplayQuotes] = useState<QuoteRecord[]>([]);
  
  // Actualizar los datos siempre que cambie la respuesta de la API
  useEffect(() => {
    if (data) {
      // Establecer facturas y presupuestos
      setDisplayInvoices(data.invoices || []);
      setDisplayQuotes(data.quotes || []);
      
      // Establecer todas las transacciones
      const allTransactions = data.transactions || [];
      setDisplayTransactions(allTransactions);
      
      // Filtrar solo los gastos para la vista móvil
      const expensesOnly = allTransactions.filter(transaction => 
        transaction.type === 'expense' || transaction.type === 'gasto'
      );
      setDisplayExpenses(expensesOnly);
      
      // Log para debugging
      console.log("Datos cargados en componente:", {
        invoices: data.invoices?.length || 0,
        allTransactions: allTransactions.length,
        expensesOnly: expensesOnly.length,
        quotes: data.quotes?.length || 0
      });
    }
  }, [data]);
  
  // Cargar usuarios para el superadmin
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsersList(data);
        }
      } catch (error) {
        console.error("Error al cargar usuarios", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios",
          variant: "destructive"
        });
      } finally {
        setLoadingUsers(false);
      }
    };
    
    // Solo cargar usuarios si el usuario actual es superadmin
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'superadmin') {
            fetchUsers();
          }
        }
      } catch (error) {
        console.error("Error al verificar rol", error);
      }
    };
    
    checkUserRole();
  }, []);

  // Funciones de utilidad
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };
  
  // Función para exportar a PDF
  const exportToPDF = () => {
    if (!data || !displayInvoices || !displayTransactions || !displayQuotes) {
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
      let periodoTitle = "Período: ";
      if (dateRange.from) {
        periodoTitle += `Desde ${format(dateRange.from, "dd/MM/yyyy", { locale: es })}`;
      }
      if (dateRange.to) {
        periodoTitle += ` hasta ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`;
      }
      if (!dateRange.from && !dateRange.to) {
        periodoTitle += "Completo";
      }
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(periodoTitle, margin, 22);
      
      // RESUMEN
      let currentY = 30;
      
      // Dibujar el recuadro para el resumen
      drawColorBox(currentY, 40, 'purple', 'RESUMEN');
      
      // Datos del resumen
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      currentY += 15;
      doc.text("Total facturas:", margin + 5, currentY);
      doc.text(`${displayInvoices.length}`, margin + 45, currentY);
      
      currentY += 6;
      doc.text("Total gastos:", margin + 5, currentY);
      doc.text(`${displayExpenses.length}`, margin + 45, currentY);
      
      currentY += 6;
      doc.text("Total presupuestos:", margin + 5, currentY);
      doc.text(`${displayQuotes.length}`, margin + 45, currentY);
      
      // Columna derecha del resumen
      doc.text("Ingresos:", pageWidth - margin - 65, currentY - 12);
      doc.text(formatCurrency(data.summary.incomeTotal), pageWidth - margin - 5, currentY - 12, { align: 'right' });
      
      doc.text("Gastos:", pageWidth - margin - 65, currentY - 6);
      doc.text(formatCurrency(data.summary.expenseTotal), pageWidth - margin - 5, currentY - 6, { align: 'right' });
      
      doc.text("Balance:", pageWidth - margin - 65, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(data.summary.balance), pageWidth - margin - 5, currentY, { align: 'right' });
      
      // FACTURAS
      currentY += 20;
      
      // Dibujar sección de facturas
      drawColorBox(currentY, 60, 'blue', 'FACTURAS');
      
      currentY += 15;
      
      // Cabecera de facturas
      const facturaHeaderY = currentY;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      
      // Posiciones X fijas para alineación correcta
      const numeroX = margin + 5;
      const fechaX = margin + 25;
      const clienteX = margin + 50;
      const importeX = pageWidth - margin - 15;
      const estadoX = pageWidth - margin - 40;
      
      doc.text("Número", numeroX, facturaHeaderY);
      doc.text("Fecha", fechaX, facturaHeaderY);
      doc.text("Cliente", clienteX, facturaHeaderY);
      doc.text("Estado", estadoX, facturaHeaderY);
      doc.text("Importe", importeX, facturaHeaderY, { align: 'right' });
      
      drawHorizontalLine(facturaHeaderY + 2, pageWidth - 2 * margin - 10);
      
      // Contenido de facturas
      let facturaY = facturaHeaderY + 7;
      doc.setFont('helvetica', 'normal');
      
      if (displayInvoices.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text("No hay facturas en este período", margin + 5, facturaY);
      } else {
        for (let i = 0; i < Math.min(displayInvoices.length, 5); i++) {
          const factura = displayInvoices[i];
          // Cortar textos largos
          const clienteText = factura.clientName.length > 15 ? factura.clientName.substring(0, 12) + "..." : factura.clientName;
          const numeroText = factura.number.length > 10 ? factura.number.substring(0, 8) + "..." : factura.number;
          
          doc.text(numeroText, numeroX, facturaY);
          doc.text(formatDate(factura.date), fechaX, facturaY);
          doc.text(clienteText, clienteX, facturaY);
          
          // Estado con formato
          let estadoTexto = "Pendiente";
          if (factura.status === 'paid') estadoTexto = "Pagada";
          if (factura.status === 'overdue') estadoTexto = "Vencida";
          doc.text(estadoTexto, estadoX, facturaY);
          
          // Importe con formato
          doc.text(formatCurrency(parseFloat(factura.total)), importeX, facturaY, { align: 'right' });
          
          facturaY += 7;
          
          // Línea separadora excepto para la última
          if (i < Math.min(displayInvoices.length, 5) - 1) {
            drawHorizontalLine(facturaY - 3.5, pageWidth - 2 * margin - 10);
          }
        }
        
        // Si hay más facturas de las que se muestran
        if (displayInvoices.length > 5) {
          facturaY += 3;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.text(`... y ${displayInvoices.length - 5} facturas más`, pageWidth / 2, facturaY, { align: 'center' });
        }
      }
      
      // GASTOS
      currentY = facturaY + 15;
      
      // Dibujar sección de gastos
      drawColorBox(currentY, 60, 'amber', 'GASTOS');
      
      currentY += 15;
      
      // Cabecera de gastos
      const gastoHeaderY = currentY;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      
      // Posiciones X fijas para gastos
      const descripcionX = margin + 25;
      const categoriaX = margin + 70;
      const tipoX = pageWidth - margin - 40;
      
      doc.text("Fecha", margin + 5, gastoHeaderY);
      doc.text("Descripción", descripcionX, gastoHeaderY);
      doc.text("Categoría", categoriaX, gastoHeaderY);
      doc.text("Tipo", tipoX, gastoHeaderY);
      doc.text("Importe", importeX, gastoHeaderY, { align: 'right' });
      
      drawHorizontalLine(gastoHeaderY + 2, pageWidth - 2 * margin - 10);
      
      // Contenido de gastos
      let gastoY = gastoHeaderY + 7;
      doc.setFont('helvetica', 'normal');
      
      if (displayExpenses.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.text("No hay gastos en este período", margin + 5, gastoY);
      } else {
        for (let i = 0; i < Math.min(displayExpenses.length, 5); i++) {
          const t = displayExpenses[i];
          // Limitar longitud de textos
          const descripcionText = t.description.length > 20 ? t.description.substring(0, 17) + "..." : t.description;
          const categoriaText = t.category ? (t.category.length > 15 ? t.category.substring(0, 12) + "..." : t.category) : "-";
          
          doc.text(formatDate(t.date), margin + 5, gastoY);
          doc.text(descripcionText, descripcionX, gastoY);
          doc.text(categoriaText, categoriaX, gastoY);
          doc.text("Gasto", tipoX, gastoY);
          
          // Importe en rojo para gastos
          doc.setTextColor(220, 38, 38); // Rojo para gastos
          doc.text(formatCurrency(parseFloat(t.amount)), importeX, gastoY, { align: 'right' });
          doc.setTextColor(0, 0, 0); // Restaurar color negro
          
          gastoY += 7;
          
          // Líneas separadoras
          if (i < Math.min(displayExpenses.length, 5) - 1) {
            drawHorizontalLine(gastoY - 3.5, pageWidth - 2 * margin - 10);
          }
        }
        
        // Si hay más gastos de los que se muestran
        if (displayExpenses.length > 5) {
          gastoY += 3;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.text(`... y ${displayExpenses.length - 5} gastos más`, pageWidth / 2, gastoY, { align: 'center' });
        }
      }
      
      // Pie de página
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Billeo - Generado ${formatDate(new Date().toISOString())}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      
      // Guardar documento utilizando una técnica compatible con dispositivos móviles
      try {
        // Generar el PDF como blob
        const pdfBlob = doc.output('blob');
        
        // Crear una URL temporal para el blob
        const blobUrl = URL.createObjectURL(pdfBlob);
        
        // Crear un elemento de enlace para la descarga
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Billeo-Libro-Registros${dateRange.from ? '-desde-' + format(dateRange.from, "ddMMyyyy") : ''}${dateRange.to ? '-hasta-' + format(dateRange.to, "ddMMyyyy") : ''}.pdf`;
        link.style.display = 'none';
        
        // Añadir el enlace al DOM
        document.body.appendChild(link);
        
        // Simular un clic en el enlace para iniciar la descarga
        link.click();
        
        // Eliminar el enlace y liberar la URL
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (downloadError) {
        console.error("Error específico en la descarga:", downloadError);
        throw new Error("Error al descargar el PDF");
      }
      
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
  
  // Función para exportar a Excel/CSV
  const exportToCSV = () => {
    if (!data || !displayInvoices || !displayTransactions || !displayQuotes) {
      toast({
        title: "Error",
        description: "No hay datos para exportar",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Crear un contenido CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Cabecera del archivo
      csvContent += "BILLEO - LIBRO DE REGISTROS\r\n";
      csvContent += `Fecha de generación: ${formatDate(new Date().toISOString())}\r\n\r\n`;
      
      // Información del período
      let periodoText = "Período: ";
      if (dateRange.from) {
        periodoText += `Desde ${format(dateRange.from, "dd/MM/yyyy", { locale: es })}`;
      }
      if (dateRange.to) {
        periodoText += ` hasta ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`;
      }
      if (!dateRange.from && !dateRange.to) {
        periodoText += "Completo";
      }
      csvContent += periodoText + "\r\n\r\n";
      
      // Sección de resumen
      csvContent += "RESUMEN\r\n";
      csvContent += `Total facturas,${displayInvoices.length}\r\n`;
      csvContent += `Total gastos,${displayExpenses.length}\r\n`;
      csvContent += `Total presupuestos,${displayQuotes.length}\r\n`;
      csvContent += `Ingresos,${data.summary.incomeTotal}\r\n`;
      csvContent += `Gastos,${data.summary.expenseTotal}\r\n`;
      csvContent += `Balance,${data.summary.balance}\r\n\r\n`;
      
      // Sección de facturas
      if (displayInvoices.length > 0) {
        csvContent += "FACTURAS\r\n";
        csvContent += "Número,Fecha,Cliente,Estado,Subtotal,IVA,Total\r\n";
        
        displayInvoices.forEach(factura => {
          // Estado con formato
          let estadoTexto = "Pendiente";
          if (factura.status === 'paid') estadoTexto = "Pagada";
          if (factura.status === 'overdue') estadoTexto = "Vencida";
          
          csvContent += `"${factura.number}","${formatDate(factura.date)}","${factura.clientName}","${estadoTexto}","${factura.subtotal}","${factura.tax}","${factura.total}"\r\n`;
        });
        csvContent += "\r\n";
      }
      
      // Sección de gastos
      if (displayExpenses.length > 0) {
        csvContent += "GASTOS\r\n";
        csvContent += "Fecha,Descripción,Categoría,Tipo,Importe\r\n";
        
        displayExpenses.forEach(gasto => {
          csvContent += `"${formatDate(gasto.date)}","${gasto.description}","${gasto.category || '-'}","Gasto","${gasto.amount}"\r\n`;
        });
      }
      
      // Codificar y descargar con manejo mejorado para dispositivos móviles
      try {
        // Crear un Blob con el contenido CSV
        const blob = new Blob([csvContent.substring(22)], { type: 'text/csv;charset=utf-8;' });
        
        // Crear URL para el blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Crear un enlace de descarga
        const link = document.createElement("a");
        link.href = blobUrl;
        link.style.display = "none";
        link.download = `Billeo-Libro-Registros${dateRange.from ? '-desde-' + format(dateRange.from, "ddMMyyyy") : ''}${dateRange.to ? '-hasta-' + format(dateRange.to, "ddMMyyyy") : ''}.csv`;
        
        // Añadir al DOM, clicar y luego eliminar
        document.body.appendChild(link);
        link.click();
        
        // Limpiar después de un breve retraso
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      } catch (downloadError) {
        console.error("Error específico en la descarga del CSV:", downloadError);
        throw new Error("Error al descargar el archivo CSV");
      }
      
      toast({
        title: "Éxito",
        description: "El archivo CSV se ha descargado correctamente",
      });
    } catch (error) {
      console.error("Error al generar CSV:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el archivo CSV: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    }
  };

  // Renderizado principal
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl bg-gradient-to-b from-gray-50 to-white dark:bg-gray-900/10 min-h-screen">      
      {/* Cabecera */}
      <PageHeader
        title="Libro de Registros"
        description="Consulta y exporta tu actividad financiera"
      />
      
      {/* Filtros y botones de exportación - Rediseñados para mejor estructura */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
        {/* Selector de cliente - Optimizado para móvil */}
        <div className="space-y-2 mb-5">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Users size={14} /> Cliente
          </label>
          <Select 
            value={selectedUserId} 
            onValueChange={setSelectedUserId}
            disabled={loadingUsers}
          >
            <SelectTrigger className="w-full h-10">
              <SelectValue placeholder="Seleccionar usuario" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper" align="start" className="max-h-[var(--radix-select-content-available-height)] overflow-y-auto w-[var(--radix-select-trigger-width)]">
              <SelectItem value="current">Usuario actual</SelectItem>
              {usersList.map((userOption: UserOption) => (
                <SelectItem key={userOption.id} value={userOption.id.toString()}>
                  {userOption.name || userOption.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Rango de fechas */}
        <div className="space-y-2 mb-5">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Rango de fechas</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-1">
                <CalendarIcon size={12} className="inline mr-1" /> Desde
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => {
                      setDateRange((prev: any) => ({ ...prev, from: date }));
                      setStartDate(date ? format(date, 'yyyy-MM-dd') : null);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-1">
                <CalendarIcon size={12} className="inline mr-1" /> Hasta
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => {
                      setDateRange((prev: any) => ({ ...prev, to: date }));
                      setEndDate(date ? format(date, 'yyyy-MM-dd') : null);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        {/* Botones de exportación */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10" 
            onClick={exportToCSV}
            disabled={isLoading || !data}
          >
            <FileUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar</span> CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10" 
            onClick={exportToPDF}
            disabled={isLoading || !data}
          >
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Informe</span> PDF
          </Button>
        </div>
      </div>
      
      {/* Paneles de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Panel de facturas */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Facturas</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {displayInvoices.length}
            </div>
            <div className="text-gray-500 text-sm">
              Facturas en el período seleccionado
            </div>
          </div>
        </div>

        {/* Panel de gastos */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Gastos</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {displayExpenses.length}
            </div>
            <div className="text-gray-500 text-sm">
              Gastos en el período seleccionado
            </div>
          </div>
        </div>

        {/* Panel de presupuestos */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Presupuestos</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {displayQuotes.length}
            </div>
            <div className="text-gray-500 text-sm">
              Presupuestos en el período seleccionado
            </div>
          </div>
        </div>

        {/* Panel de balance */}
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 flex items-center">
            <FileText className="h-5 w-5 text-white mr-2" />
            <h3 className="text-white font-medium">Balance</h3>
          </div>
          <div className="p-4">
            <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              {data?.summary ? formatCurrency(data.summary.balance) : "€0.00"}
            </div>
            <div className="text-gray-500 text-sm">
              Balance neto en el período
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de facturas */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Facturas emitidas</h3>
          <div className="text-sm text-gray-500">{displayInvoices.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            {/* Título para móvil */}
            <div className="bg-blue-100 dark:bg-gray-800 py-2 px-4 border-b border-blue-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Facturas emitidas</h3>
            </div>
            
            {/* Versión para escritorio */}
            <div className="hidden sm:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Número</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Fecha</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Cliente</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700 text-right">Base</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">IVA</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700 text-right">Total</TableHead>
                    <TableHead className="py-3 px-4 bg-blue-100 dark:bg-gray-800 text-sm text-blue-700 dark:text-blue-400 font-medium border-b border-blue-200 dark:border-gray-700">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-gray-400">
                        No hay facturas en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayInvoices.map((invoice, index) => (
                      <TableRow 
                        key={invoice.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                      >
                        <TableCell className="py-3 px-4 text-sm">
                          {invoice.number}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {formatDate(invoice.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {invoice.clientName}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-right">
                          {formatCurrency(parseFloat(invoice.subtotal))}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {formatCurrency(parseFloat(invoice.tax))}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm font-medium text-right">
                          {formatCurrency(parseFloat(invoice.total))}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge 
                            className={`${
                              invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                            } px-3 py-1 rounded-full text-xs font-medium shadow-sm`}
                          >
                            {invoice.status === 'paid' ? 'Pagada' : invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Versión para móvil: tarjetas en lugar de tabla */}
            <div className="sm:hidden">
              {displayInvoices.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No hay facturas en este período
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayInvoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{invoice.number}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDate(invoice.date)}</div>
                        </div>
                        <Badge 
                          className={`${
                            invoice.status === 'paid' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                          } px-2 py-0.5 rounded-full text-xs font-medium shadow-sm`}
                        >
                          {invoice.status === 'paid' ? 'Pagada' : invoice.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs mt-1 text-gray-600">{invoice.clientName}</div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Base</div>
                          <div className="font-medium">{formatCurrency(parseFloat(invoice.subtotal))}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">IVA</div>
                          <div className="font-medium">{formatCurrency(parseFloat(invoice.tax))}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="font-medium text-blue-700">{formatCurrency(parseFloat(invoice.total))}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de gastos y transacciones */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Gastos y transacciones</h3>
          {/* En escritorio, mostramos todas las transacciones, en móvil solo gastos */}
          <div className="text-sm text-gray-500">
            <span className="hidden sm:inline">{displayTransactions.length} registros</span>
            <span className="sm:hidden">{displayExpenses.length} gastos</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            {/* Título para móvil */}
            <div className="bg-amber-100 dark:bg-gray-800 py-2 px-4 border-b border-amber-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Gastos</h3>
            </div>
            
            {/* Versión para escritorio (todas las transacciones) */}
            <div className="hidden sm:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Fecha</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Descripción</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Categoría</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700">Tipo</TableHead>
                    <TableHead className="py-3 px-4 bg-amber-100 dark:bg-gray-800 text-sm text-amber-700 dark:text-amber-400 font-medium border-b border-amber-200 dark:border-gray-700 text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                        No hay transacciones en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayTransactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                      >
                        <TableCell className="py-3 px-4 text-sm">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {transaction.category || '-'}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge className={`${
                            transaction.type === 'income' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200"
                          } px-3 py-1 rounded-full text-xs font-medium shadow-sm`}>
                            {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`py-3 px-4 text-sm font-medium text-right ${transaction.type === 'expense' ? "text-red-600" : ""}`}>
                          {formatCurrency(parseFloat(transaction.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Versión para móvil: sólo gastos, en tarjetas */}
            <div className="sm:hidden">
              {displayExpenses.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No hay gastos en este período
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayExpenses.map((expense) => (
                    <div key={expense.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs text-gray-500">{formatDate(expense.date)}</div>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border border-red-200 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">
                          Gasto
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium mb-1">{expense.description}</div>
                      
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-500">
                          {expense.category || 'Sin categoría'}
                        </div>
                        <div className="text-sm font-medium text-red-600">
                          {formatCurrency(parseFloat(expense.amount))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla de presupuestos */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Presupuestos</h3>
          <div className="text-sm text-gray-500">{displayQuotes.length} registros</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all">
          <div className="overflow-x-auto">
            {/* Título para móvil */}
            <div className="bg-purple-100 dark:bg-gray-800 py-2 px-4 border-b border-purple-200 dark:border-gray-700 sm:hidden">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Presupuestos</h3>
            </div>
            
            {/* Versión para escritorio */}
            <div className="hidden sm:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Número</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Fecha</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Cliente</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700 text-right">Total</TableHead>
                    <TableHead className="py-3 px-4 bg-purple-100 dark:bg-gray-800 text-sm text-purple-700 dark:text-purple-400 font-medium border-b border-purple-200 dark:border-gray-700">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-400">
                        No hay presupuestos en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayQuotes.map((quote, index) => (
                      <TableRow 
                        key={quote.id} 
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10"
                      >
                        <TableCell className="py-3 px-4 text-sm">
                          {quote.number}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {formatDate(quote.date)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm">
                          {quote.clientName}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm font-medium text-right">
                          {formatCurrency(parseFloat(quote.total))}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge 
                            className={`${
                              quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                              quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200" : 
                              "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                            } px-3 py-1 rounded-full text-xs font-medium shadow-sm`}
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
            
            {/* Versión para móvil: tarjetas en lugar de tabla */}
            <div className="sm:hidden">
              {displayQuotes.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No hay presupuestos en este período
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayQuotes.map((quote) => (
                    <div key={quote.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium">{quote.number}</div>
                          <div className="text-xs text-gray-500 mt-1">{formatDate(quote.date)}</div>
                        </div>
                        <Badge 
                          className={`${
                            quote.status === 'accepted' ? "bg-green-100 text-green-800 hover:bg-green-100 border border-green-200" : 
                            quote.status === 'rejected' ? "bg-red-100 text-red-800 hover:bg-red-100 border border-red-200" : 
                            "bg-gray-100 text-gray-800 hover:bg-gray-100 border border-gray-200"
                          } px-2 py-0.5 rounded-full text-xs font-medium shadow-sm`}
                        >
                          {quote.status === 'accepted' ? 'Aceptado' : 
                           quote.status === 'rejected' ? 'Rechazado' : 
                           quote.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs mt-1 text-gray-600">{quote.clientName}</div>
                      
                      <div className="flex justify-end mt-2">
                        <div className="text-sm font-medium text-purple-700">
                          {formatCurrency(parseFloat(quote.total))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}