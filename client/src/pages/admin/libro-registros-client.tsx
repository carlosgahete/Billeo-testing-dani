import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  File,
  FileText,
  FileSpreadsheet,
  Search,
  Users,
  ShoppingCart,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

// Definiciones de tipos
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
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  notes?: string;
  netAmount?: number;
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

interface ClientOption {
  id: number;
  name: string;
  taxId: string;
}

interface ClientLibroRegistrosProps {
  forceOwnUser?: boolean;
}

export default function ClientLibroRegistros({ forceOwnUser = false }: ClientLibroRegistrosProps) {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LibroRegistrosData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  
  const { user } = useAuth();
  
  // Estado para el selector de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState<string>("");
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  
  // Verificación de seguridad
  if (!user) {
    return <Redirect to="/" />;
  }
  
  // Cargar clientes asignados
  useEffect(() => {
    const fetchClients = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Para admin normal cargar solo los clientes asignados
        const clientsUrl = user.role === 'admin' ? '/api/admin/assigned-clients' : '/api/clients';
        console.log(`Consultando clientes desde: ${clientsUrl}`);
        
        const response = await fetch(clientsUrl);
        
        if (!response.ok) {
          console.error("Error al cargar clientes:", response.statusText);
          return;
        }
        
        const clientsList = await response.json();
        console.log("Lista de clientes recibida:", clientsList);
        
        // Mapear la lista de clientes para asegurar el formato correcto
        const mappedClients = clientsList.map((client: any) => ({
          id: client.id,
          name: client.name || `Cliente #${client.id}`,
          taxId: client.taxId || 'Sin NIF'
        }));
        
        setClients(mappedClients);
        
        // Si hay clientes y no se ha seleccionado ninguno, seleccionar el primero por defecto
        if (mappedClients.length > 0 && !selectedClientId) {
          const firstClientId = mappedClients[0].id.toString();
          setSelectedClientId(firstClientId);
          
          // Cargar los datos de este cliente
          fetchClientData(firstClientId);
        }
        
      } catch (err) {
        console.error("Error al cargar clientes:", err);
        setError("No se pudieron cargar los clientes asignados");
      } finally {
        setLoading(false);
      }
    };
    
    fetchClients();
  }, [user]);

  // Función para cargar datos de un cliente específico
  const fetchClientData = async (clientId: string) => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // La ruta debe coincidir con la API en el backend
      const apiUrl = `/api/libro-registros/client/${clientId}`;
      console.log(`Consultando datos del Libro de Registros del cliente desde: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error de API (${response.status}):`, errorText);
        throw new Error(`Error al obtener datos: ${response.status} ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      console.log("Datos del cliente recibidos correctamente:", jsonData);
      setData(jsonData);
    } catch (err) {
      console.error("Error al cargar datos del cliente:", err);
      setError(`No se pudieron cargar los datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar cambio de cliente seleccionado
  const handleClientChange = (clientId: string) => {
    if (!clientId) return;
    
    setSelectedClientId(clientId);
    fetchClientData(clientId);
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
    
    // Filtrado de facturas por fecha
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
    
    // Filtrado de transacciones por fecha
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
    
    // Filtrado de presupuestos por fecha
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
    
    // Obtener el cliente seleccionado
    const selectedClient = clients.find(c => c.id.toString() === selectedClientId);
    
    // Título
    doc.setFontSize(titleFontSize);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('LIBRO DE REGISTROS', 105, 20, { align: 'center' });
    
    // Subtítulo (Cliente)
    doc.setFontSize(subtitleFontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Cliente: ${selectedClient?.name || 'No seleccionado'}`, 105, 30, { align: 'center' });
    
    // Información de generación
    doc.setFontSize(textFontSize);
    doc.text(`Fecha de generación: ${currentDate} ${currentTime}`, 15, 40);
    
    // Filtros aplicados
    doc.text('Filtros aplicados:', 15, 50);
    doc.text(`Año: ${selectedYear !== 'all' ? selectedYear : 'Todos'}`, 15, 57);
    doc.text(`Trimestre: ${selectedQuarter !== 'all' ? selectedQuarter.replace('Q', '') : 'Todos'}`, 15, 64);
    doc.text(`Mes: ${selectedMonth !== 'all' ? selectedMonth : 'Todos'}`, 15, 71);
    
    // Resumen
    doc.setFontSize(headerFontSize);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Resumen', 15, 85);
    
    // Tabla de resumen
    doc.setFontSize(textFontSize);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    const summaryTableData = [
      ['Elemento', 'Cantidad', 'Importe'],
      ['Facturas', filteredData.summary.totalInvoices.toString(), formatCurrency(filteredData.summary.incomeTotal)],
      ['Gastos', filteredData.transactions.filter(t => t.type === 'expense').length.toString(), formatCurrency(filteredData.summary.expenseTotal)],
      ['Presupuestos', filteredData.summary.totalQuotes.toString(), ''],
      ['Balance', '', formatCurrency(filteredData.summary.incomeTotal - filteredData.summary.expenseTotal)]
    ];
    
    autoTable(doc, {
      head: [summaryTableData[0]],
      body: summaryTableData.slice(1),
      startY: 90,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [50, 50, 50],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      }
    });
    
    // Facturas
    if (filteredData.invoices.length > 0) {
      doc.addPage();
      doc.setFontSize(headerFontSize);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Facturas', 15, 20);
      
      const invoiceTableData = [
        ['Número', 'Fecha', 'Cliente', 'Base', 'IVA', 'Total', 'Estado']
      ];
      
      filteredData.invoices.forEach(invoice => {
        invoiceTableData.push([
          invoice.number,
          formatDate(invoice.issueDate),
          invoice.client,
          formatCurrency(invoice.baseAmount),
          formatCurrency(invoice.vatAmount),
          formatCurrency(invoice.total),
          invoice.status === 'paid' ? 'Pagada' : 
            invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'
        ]);
      });
      
      autoTable(doc, {
        head: [invoiceTableData[0]],
        body: invoiceTableData.slice(1),
        startY: 25,
        theme: 'grid',
        headStyles: {
          fillColor: [230, 240, 255],
          textColor: [30, 80, 150],
          fontStyle: 'bold'
        }
      });
    }
    
    // Transacciones
    if (filteredData.transactions.length > 0) {
      doc.addPage();
      doc.setFontSize(headerFontSize);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text('Transacciones', 15, 20);
      
      const transactionTableData = [
        ['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Importe']
      ];
      
      filteredData.transactions.forEach(transaction => {
        transactionTableData.push([
          formatDate(transaction.date),
          transaction.description,
          transaction.category || 'Sin categoría',
          transaction.type === 'income' ? 'Ingreso' : 'Gasto',
          formatCurrency(transaction.amount)
        ]);
      });
      
      autoTable(doc, {
        head: [transactionTableData[0]],
        body: transactionTableData.slice(1),
        startY: 25,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 240, 220],
          textColor: [150, 80, 30],
          fontStyle: 'bold'
        }
      });
    }
    
    // Presupuestos
    if (filteredData.quotes.length > 0) {
      doc.addPage();
      doc.setFontSize(headerFontSize);
      doc.setTextColor(tertiaryColor[0], tertiaryColor[1], tertiaryColor[2]);
      doc.text('Presupuestos', 15, 20);
      
      const quoteTableData = [
        ['Número', 'Fecha', 'Cliente', 'Total', 'Estado']
      ];
      
      filteredData.quotes.forEach(quote => {
        quoteTableData.push([
          quote.number,
          formatDate(quote.issueDate),
          quote.clientName,
          formatCurrency(quote.total),
          quote.status === 'accepted' ? 'Aceptado' : 
            quote.status === 'pending' ? 'Pendiente' : 'Rechazado'
        ]);
      });
      
      autoTable(doc, {
        head: [quoteTableData[0]],
        body: quoteTableData.slice(1),
        startY: 25,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 255, 240],
          textColor: [30, 150, 80],
          fontStyle: 'bold'
        }
      });
    }
    
    // Guardar el PDF
    const clientName = selectedClient?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cliente';
    doc.save(`libro-registros-${clientName}.pdf`);
  };
  
  // Función para descargar como CSV
  const handleDownloadCSV = () => {
    if (!filteredData) return;
    
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
    
    // Obtener el cliente seleccionado
    const selectedClient = clients.find(c => c.id.toString() === selectedClientId);
    
    // RESUMEN
    const summaryRows = [
      ['LIBRO DE REGISTROS - RESUMEN'],
      [`Cliente: ${selectedClient?.name || 'No seleccionado'}`],
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
        transaction.netAmount || (Math.abs(transaction.amount) / 1.21)
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
    const clientName = selectedClient?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cliente';
    link.setAttribute('download', `libro-registros-${clientName}.csv`);
    
    // Añadir el enlace al DOM, hacer clic en él y luego eliminarlo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar la URL del objeto
    URL.revokeObjectURL(url);
  };
  
  // Obtener los datos filtrados para mostrar en la interfaz
  const filteredData = data ? getFilteredData() : null;
  
  // Recuperar el cliente seleccionado
  const selectedClient = clients.find(c => c.id.toString() === selectedClientId);

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
              <li>El cliente seleccionado no tiene datos disponibles</li>
              <li>Problemas de autenticación (sesión expirada)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no hay datos filtrados, mostrar mensaje de que no hay datos
  if (!filteredData) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Libro de Registros
            </h1>
            <p className="text-gray-500 text-sm">
              Selecciona un cliente para ver su libro de registros
            </p>
          </div>
          
          {/* Selector de cliente */}
          <div className="flex items-center space-x-2 w-full lg:w-auto">
            <div className="flex-grow lg:flex-grow-0">
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full lg:w-[240px] flex items-center justify-between"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span className="flex-grow text-left">
                      {selectedClient ? selectedClient.name : "Seleccionar cliente"}
                    </span>
                    <Search className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="end">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar cliente..." 
                      className="h-9"
                      value={clientSearchTerm}
                      onValueChange={setClientSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                      <CommandGroup className="max-h-60 overflow-auto">
                        {clients
                          .filter(client => 
                            client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                            client.taxId.toLowerCase().includes(clientSearchTerm.toLowerCase())
                          )
                          .map((client) => (
                            <CommandItem
                              key={client.id}
                              value={client.id.toString()}
                              onSelect={() => {
                                handleClientChange(client.id.toString());
                                setClientPopoverOpen(false);
                              }}
                            >
                              <Users className="mr-2 h-4 w-4" />
                              <span>{client.name}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-500">No hay datos disponibles para mostrar</p>
            <p className="text-sm text-gray-400 mt-2">Selecciona un cliente o ajusta los filtros para ver información</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Encabezado con título y selector de cliente */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {selectedClient ? `Libro de Registros: ${selectedClient.name}` : "Libro de Registros"}
          </h1>
          <p className="text-gray-500 text-sm">
            {selectedClient?.taxId ? `NIF: ${selectedClient.taxId}` : ''}
          </p>
        </div>
        
        {/* Selector de cliente */}
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <div className="flex-grow lg:flex-grow-0">
            <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full lg:w-[240px] flex items-center justify-between"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="flex-grow text-left">
                    {selectedClient ? selectedClient.name : "Seleccionar cliente"}
                  </span>
                  <Search className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Buscar cliente..." 
                    className="h-9"
                    value={clientSearchTerm}
                    onValueChange={setClientSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                      {clients
                        .filter(client => 
                          client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
                          client.taxId.toLowerCase().includes(clientSearchTerm.toLowerCase())
                        )
                        .map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.id.toString()}
                            onSelect={() => {
                              handleClientChange(client.id.toString());
                              setClientPopoverOpen(false);
                            }}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            <span>{client.name}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Filtros y botones de descarga - estilo según la imagen de referencia */}
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
          
          {/* Botones de descarga alineados a la derecha, con el mismo tamaño */}
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
              onClick={handleDownloadCSV}
              className="flex items-center h-10 w-[150px]"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen - Ajustado a la imagen de referencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Tarjeta de Facturas - Diseño según imagen de referencia */}
        <Card className="bg-blue-50 border border-blue-100 hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-blue-500 mr-2" />
              <span className="font-medium">Facturas</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {filteredData.summary.totalInvoices}
            </div>
            <p className="text-xs text-gray-500">Total emitidas</p>
            <div className="mt-3 text-lg font-semibold">
              {formatCurrency(filteredData.summary.incomeTotal)}
            </div>
            <p className="text-xs text-gray-500">Importe total facturado</p>
          </CardContent>
        </Card>

        {/* Tarjeta de Gastos - Diseño según imagen de referencia */}
        <Card className="bg-amber-50 border border-amber-100 hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <ShoppingCart className="h-5 w-5 text-amber-500 mr-2" />
              <span className="font-medium">Gastos</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {filteredData.transactions.filter(t => t.type === 'expense').length}
            </div>
            <p className="text-xs text-gray-500">Transacciones</p>
            <div className="mt-3 text-lg font-semibold">
              {formatCurrency(filteredData.summary.expenseTotal)}
            </div>
            <p className="text-xs text-gray-500">Importe total gastado</p>
          </CardContent>
        </Card>

        {/* Tarjeta de Presupuestos - Diseño según imagen de referencia */}
        <Card className="bg-emerald-50 border border-emerald-100 hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <File className="h-5 w-5 text-emerald-500 mr-2" />
              <span className="font-medium">Presupuestos</span>
            </div>
            <div className="text-2xl font-bold mb-1">
              {filteredData.summary.totalQuotes}
            </div>
            <p className="text-xs text-gray-500">Total presupuestos</p>
            <div className="mt-3 text-sm font-medium">
              <span className="text-emerald-600">{filteredData.quotes.filter(q => q.status === 'accepted').length} aceptados</span>
              {filteredData.quotes.filter(q => q.status === 'pending').length > 0 && 
                <span className="text-amber-600 ml-2">{filteredData.quotes.filter(q => q.status === 'pending').length} pendientes</span>
              }
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta de Balance - Diseño según imagen de referencia */}
        <Card className="bg-purple-50 border border-purple-100 hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center mb-3">
              <span className="font-medium">Balance</span>
            </div>
            <div className={`text-2xl font-bold mb-1 ${filteredData.summary.incomeTotal - filteredData.summary.expenseTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(filteredData.summary.incomeTotal - filteredData.summary.expenseTotal)}
            </div>
            <p className="text-xs text-gray-500">Resultado</p>
            <div className="mt-3 text-sm font-medium">
              <div className="flex items-center justify-between">
                <span>Ingresos:</span>
                <span className="text-blue-600">{formatCurrency(filteredData.summary.incomeTotal)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Gastos:</span>
                <span className="text-amber-600">{formatCurrency(filteredData.summary.expenseTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secciones de datos - Siguiendo el diseño de la imagen de referencia */}
      <div className="space-y-6">
        {/* Sección de Facturas */}
        {filteredData.invoices.length > 0 && (
          <Card>
            <CardHeader className="bg-blue-50 border-b border-blue-100 py-3">
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                Facturas emitidas
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
                    {filteredData.invoices.map((invoice) => (
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
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Sección de Gastos y transacciones */}
        {filteredData.transactions.length > 0 && (
          <Card>
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
                    {filteredData.transactions.map((transaction) => (
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
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Sección de Presupuestos */}
        {filteredData.quotes.length > 0 && (
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
                    {filteredData.quotes.map((quote) => (
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}