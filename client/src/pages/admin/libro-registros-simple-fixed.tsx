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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  searchName?: string;      // Campo optimizado para búsqueda (nombre en minúsculas)
  searchUsername?: string;  // Campo optimizado para búsqueda (username en minúsculas)
}

interface LibroRegistrosSimpleProps {
  params?: {
    userId?: string;
  };
  forceOwnUser?: boolean; // Para forzar que solo vea sus propios datos
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
  const { user } = useAuth();
  
  // Estado para el selector de usuarios con búsqueda
  const [userSearchTerm, setUserSearchTerm] = useState<string>("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  
  // Verificación adicional de seguridad con acceso para usuarios a su propio libro
  // Esta es una protección redundante junto con la protección de ruta en App.tsx
  if (!user) {
    console.log("No hay usuario autenticado - Modo Debug");
    // En modo debug, permitimos continuar para pruebas
  }
  
  // Verificar si el usuario está intentando acceder a su propio libro de registros
  const isViewingSelf = params?.userId && user && parseInt(params.userId) === user.id;
  
  // Si se está forzando que solo vea sus propios datos (desde /mis-registros),
  // no necesitamos más comprobaciones de seguridad
  if (forceOwnUser) {
    console.log("Forzando acceso a los propios datos del usuario");
    // No redireccionamos ni bloqueamos - permitimos acceso
  }
  // Si no es un admin ni está viendo su propio libro, redireccionar
  else if (!isViewingSelf && user && (
    user.role !== 'superadmin' && 
    user.role !== 'SUPERADMIN' && 
    user.role !== 'admin' &&
    user.username !== 'Superadmin' &&
    user.username !== 'billeo_admin'
  )) {
    console.log("Acceso denegado - no es admin ni está viendo sus propios datos");
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
        
        // Log para depurar usuarios recibidos
        console.log("Lista de usuarios recibida:", usersList);
        
        const mappedUsers = usersList.map((u: any) => ({
          id: u.id,
          username: u.username,
          name: u.name || u.username,
          // Añadimos campos para búsqueda en minúsculas
          searchUsername: u.username.toLowerCase(),
          searchName: u.name ? u.name.toLowerCase() : u.username.toLowerCase()
        }));
        
        console.log("Lista de usuarios procesada:", mappedUsers);
        setUsers(mappedUsers);
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
        setError(null);
        
        // SIEMPRE usar primero el ID del usuario actual como prioridad
        let idToUse = user?.id.toString() || '1'; // Default: mostrar el usuario actual
        
        // Solo si explícitamente se pide ver otro usuario mediante URL, usamos ese ID
        if (userId && userId !== '' && (!user || user?.id.toString() !== userId)) {
          // Si la URL especifica otro usuario, verificamos si tiene permiso para verlo
          if (!user || user?.role === 'admin' || user?.role === 'superadmin' || user?.username === 'billeo_admin') {
            idToUse = userId;
            console.log("Admin accediendo a otro usuario ID:", idToUse);
          } else {
            console.log("Intento de acceso no autorizado. Redirigiendo a datos propios:", user?.id);
          }
        }
        
        if (!idToUse) {
          // Para propósitos de depuración, usamos un ID por defecto si no hay usuario ni ID especificado
          // Esto es temporal y debe ser removido una vez que la autenticación funcione correctamente
          console.warn("MODO DE DEPURACIÓN: No hay ID de usuario, usando ID por defecto");
          idToUse = "1"; // ID por defecto para pruebas
        }
        
        // La ruta debe coincidir con la API en el backend
        // Usando la ruta correcta que existe en el servidor
        const apiUrl = `/api/libro-registros/${idToUse}`;
        console.log("Consultando datos del Libro de Registros desde:", apiUrl);
        
        // Enviamos las credenciales para que incluya cookies de sesión
        const response = await fetch(apiUrl, {
          credentials: 'include'
        });
        
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
    
    // MODO DEPURACIÓN: Intentar cargar datos incluso sin usuario autenticado
    // Esto es temporal hasta resolver los problemas de autenticación
    try {
      // Iniciar la carga de datos, incluso sin usuario
      fetchData();
    } catch (error) {
      console.error("Error al iniciar la carga de datos:", error);
      setLoading(false);
      setError("No se pudieron cargar los datos del libro de registros");
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
  const getFilteredData = (): LibroRegistrosData | null => {
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
      totalTransactions: filteredData.transactions.filter(t => t.type === 'expense').length,
      totalQuotes: filteredData.quotes.length,
      incomeTotal: filteredData.invoices.reduce((sum, invoice) => sum + invoice.total, 0),
      expenseTotal: filteredData.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    };
    
    return filteredData;
  };
  
  // Función para descargar como PDF
  const handleDownloadPDF = () => {
    // Obtener los datos filtrados en el momento
    const filteredData = getFilteredData();
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
    
    // Guardar el PDF
    doc.save(`libro_registros_${userId || 'todos'}.pdf`);
  };
  
  // Función para descargar como Excel (CSV mejorado)
  const handleDownloadExcel = () => {
    // Obtener los datos filtrados en el momento
    const filteredData = getFilteredData();
    if (!filteredData) return;
    
    // Crear CSV
    let csvContent = '\uFEFF'; // BOM para facilitar apertura con caracteres especiales
    
    // Cabecera
    csvContent += `LIBRO DE REGISTROS - Usuario: ${userId || 'Todos'}\n`;
    csvContent += `Fecha de generación: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}\n\n`;
    
    // Resumen
    csvContent += `RESUMEN\n`;
    csvContent += `Concepto,Cantidad,Importe\n`;
    csvContent += `Facturas,${filteredData.summary.totalInvoices},${formatCurrency(filteredData.summary.incomeTotal)}\n`;
    csvContent += `Gastos,${filteredData.summary.totalTransactions},${formatCurrency(filteredData.summary.expenseTotal)}\n`;
    csvContent += `Presupuestos,${filteredData.summary.totalQuotes},\n`;
    csvContent += `Balance,,${formatCurrency(filteredData.summary.incomeTotal - filteredData.summary.expenseTotal)}\n\n`;
    
    // Facturas
    if (filteredData.invoices.length > 0) {
      csvContent += `FACTURAS EMITIDAS\n`;
      csvContent += `Número,Fecha,Cliente,Base Imponible,IVA,Total,Estado\n`;
      
      filteredData.invoices.forEach(invoice => {
        csvContent += `${invoice.number},${formatDate(invoice.issueDate)},${invoice.client},${invoice.baseAmount.toFixed(2)},${invoice.vatAmount.toFixed(2)},${invoice.total.toFixed(2)},${invoice.status === 'paid' ? 'Pagada' : invoice.status === 'pending' ? 'Pendiente' : 'Cancelada'}\n`;
      });
      csvContent += `\n`;
    }
    
    // Guardar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `libro_registros_${userId || 'todos'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obtener datos filtrados para mostrar en la interfaz
  const filteredData = getFilteredData();

  return (
    <div className="container-fluid px-4 py-6 w-full max-w-full">
      <div className="flex flex-row justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Libro de Registros</h1>
          <p className="text-sm text-gray-500">
            {user ? `${user.name} (${user.username})` : 'Usuario actual'}
          </p>
        </div>
        
        {/* Selector de usuarios para administradores (con búsqueda) - A LA DERECHA */}
        {user && (user.role === 'admin' || user.role === 'superadmin' || user.username === 'billeo_admin') && (
          <div className="flex items-center space-x-2">
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-auto justify-between" 
                  disabled={loadingUsers}
                >
                  <Users className="h-5 w-5 mr-2 text-blue-500" />
                  Ver otro cliente
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Buscar usuario..." 
                    className="h-9" 
                    value={userSearchTerm}
                    onValueChange={setUserSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron usuarios</CommandEmpty>
                    <CommandGroup>
                      {/* Opción para ver datos propios del admin */}
                      {user.username === 'billeo_admin' && (
                        <CommandItem
                          value="self"
                          onSelect={() => {
                            handleUserChange('self');
                            setUserPopoverOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          Mis registros ({user.username})
                        </CommandItem>
                      )}
                      
                      {/* Lista de todos los usuarios filtrados por búsqueda */}
                      {users
                          .filter(userOption => {
                            const searchTermLower = userSearchTerm.toLowerCase().trim();
                            // Si no hay término de búsqueda, mostrar todos
                            if (!searchTermLower) return true;
                            
                            // Usar los campos optimizados para búsqueda que ya están en minúsculas
                            const nameMatch = userOption.searchName 
                              ? userOption.searchName.includes(searchTermLower)
                              : (userOption.name?.toLowerCase().includes(searchTermLower) || false);
                            
                            const usernameMatch = userOption.searchUsername
                              ? userOption.searchUsername.includes(searchTermLower)
                              : (userOption.username?.toLowerCase().includes(searchTermLower) || false);
                            
                            return nameMatch || usernameMatch;
                          })
                          .map((userOption) => (
                            <CommandItem
                              key={userOption.id}
                              value={userOption.id.toString()}
                              onSelect={(value) => {
                                handleUserChange(value);
                                setUserPopoverOpen(false);
                              }}
                              className="cursor-pointer"
                            >
                              {userOption.name} ({userOption.username})
                            </CommandItem>
                          ))
                      }
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
          
          {/* Botones de descarga - exactamente 150px, alineados a la derecha */}
          <div className="flex items-end space-x-2 justify-end">
            <Button 
              variant="outline" 
              className="flex items-center bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 px-6 min-w-[150px] w-[150px]"
              onClick={handleDownloadPDF}
            >
              <FileText className="h-5 w-5 mr-2" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center bg-green-50 border-green-200 hover:bg-green-100 text-green-700 px-6 min-w-[150px] w-[150px]"
              onClick={handleDownloadExcel}
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Excel
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