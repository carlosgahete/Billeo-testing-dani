import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Loader2, 
  Download, 
  FileText, 
  Filter, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown,
  Info,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "../../components/ui/date-range-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";

// Interfaces
type RecordType = "invoice" | "transaction" | "quote";

interface Record {
  id: number;
  type: RecordType;
  date: Date;
  number?: string;  // Para facturas/presupuestos
  clientName?: string;  // Para facturas/presupuestos
  concept: string;
  amount: string;
  tax: string;
  total: string;
  status?: string;  // Para facturas/presupuestos
  category?: string;  // Para transacciones
  rawData: any;  // Los datos originales completos
}

const LibroRegistrosPage = ({ params }: { params: { userId: string } }) => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = params.userId;
  
  // Estado para controlar la carga de datos
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [recordType, setRecordType] = useState<RecordType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 1), // 1 de enero del año actual
    to: new Date()
  });
  
  // Estado para la ordenación
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Verificación de permisos usando la función centralizada que considera originalAdmin
  const { hasAdminPrivileges } = useAuth();
  if (!hasAdminPrivileges()) {
    return <Redirect to="/auth" />;
  }
  
  // Variable para determinar si el usuario actual es superadmin usando la función centralizada
  const isSuperAdmin = hasAdminPrivileges();
  
  // Estado para clientes asignados (solo para administradores no superadmin)
  const [assignedClients, setAssignedClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [hasPermissionForUser, setHasPermissionForUser] = useState<boolean>(true);
  const [userIsChecking, setUserIsChecking] = useState<boolean>(true);

  // Cargar clientes asignados al administrador
  useEffect(() => {
    const loadAssignedClients = async () => {
      try {
        // Obtener los clientes asignados al administrador actual
        const response = await apiRequest("GET", "/api/admin/assigned-clients");
        if (response.ok) {
          const clientsData = await response.json();
          setAssignedClients(clientsData);
          
          // Si hay clientes asignados y no hay un cliente seleccionado,
          // seleccionar el primero por defecto
          if (clientsData.length > 0 && !selectedClientId) {
            setSelectedClientId(String(clientsData[0].id));
          }
        }
      } catch (error) {
        console.error("Error al cargar clientes asignados:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes asignados",
          variant: "destructive"
        });
      } finally {
        setUserIsChecking(false);
      }
    };
    
    if (user?.role === "admin") {
      loadAssignedClients();
    } else {
      // Para superadmin, no es necesario verificar permisos
      setUserIsChecking(false);
      setHasPermissionForUser(true);
    }
  }, [user]);

  // Primero verificar si el admin tiene acceso a este usuario
  useEffect(() => {
    const checkPermissionForClient = async () => {
      // Si es superadmin, tiene acceso a todos los clientes
      if (isSuperAdmin) {
        setHasPermissionForUser(true);
        setUserIsChecking(false);
        return;
      }
      
      // Si no hay ID de usuario especificado pero hay clientes asignados,
      // consideramos que tiene permiso (mostrará el selector de clientes)
      if (!userId && assignedClients.length > 0) {
        setHasPermissionForUser(true);
        setUserIsChecking(false);
        return;
      }
      
      try {
        // Verificar si el usuario actual tiene permiso para ver este cliente
        if (userId) {
          const targetUserResponse = await apiRequest("GET", `/api/client/by-user/${userId}`);
          
          if (targetUserResponse.ok) {
            const userClient = await targetUserResponse.json();
            
            // Verificar si el cliente del usuario está en la lista de clientes asignados
            const clientIds = assignedClients.map((client: any) => client.id);
            const hasPermission = userClient && clientIds.includes(userClient.id);
            setHasPermissionForUser(hasPermission);
          } else {
            // Si no hay cliente para el usuario o hay un error, no tiene permiso
            setHasPermissionForUser(false);
          }
        }
      } catch (error) {
        console.error("Error al verificar clientes asignados:", error);
        setHasPermissionForUser(false);
      } finally {
        setUserIsChecking(false);
      }
    };
    
    checkPermissionForClient();
  }, [userId, isSuperAdmin, user, assignedClients]);

  // Carga de datos
  useEffect(() => {
    // No cargar datos si estamos verificando el permiso o si no hay permiso
    if (userIsChecking || !hasPermissionForUser) {
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar facturas
        const invoicesRes = await apiRequest("GET", `/api/invoices/user/${userId}`);
        const invoicesResponse = await invoicesRes.json();
        
        // Cargar transacciones
        const transactionsRes = await apiRequest("GET", `/api/transactions/user/${userId}`);
        const transactionsResponse = await transactionsRes.json();
        
        // Cargar presupuestos
        const quotesRes = await apiRequest("GET", `/api/quotes/user/${userId}`);
        const quotesResponse = await quotesRes.json();
        
        // Convertir a formato unificado
        const allRecords: Record[] = [
          ...invoicesResponse.map((invoice: any) => ({
            id: invoice.id,
            type: "invoice" as RecordType,
            date: new Date(invoice.issueDate),
            number: invoice.invoiceNumber,
            clientName: invoice.clientName || "Cliente sin nombre",
            concept: invoice.description || "Factura",
            amount: invoice.subtotal,
            tax: invoice.tax,
            total: invoice.total,
            status: invoice.status,
            rawData: invoice
          })),
          ...transactionsResponse.map((transaction: any) => ({
            id: transaction.id,
            type: "transaction" as RecordType,
            date: new Date(transaction.date),
            concept: transaction.description || transaction.title || "Transacción",
            amount: (() => {
              if (transaction.fiscalData?.netAmount && transaction.fiscalData.netAmount > 0) {
                return transaction.type === "expense" ? "-" + transaction.fiscalData.netAmount : transaction.fiscalData.netAmount;
              }
              const total = parseFloat(transaction.amount || '0');
              const baseImponible = total / 1.21;
              return transaction.type === "expense" ? "-" + baseImponible.toFixed(2) : baseImponible.toFixed(2);
            })(),
            tax: transaction.additionalTaxes || "0",
            total: transaction.amount,
            category: transaction.categoryName,
            rawData: transaction
          })),
          ...quotesResponse.map((quote: any) => ({
            id: quote.id,
            type: "quote" as RecordType,
            date: new Date(quote.issueDate),
            number: quote.quoteNumber,
            clientName: quote.clientName || "Cliente sin nombre",
            concept: quote.description || "Presupuesto",
            amount: quote.subtotal,
            tax: quote.tax,
            total: quote.total,
            status: quote.status,
            rawData: quote
          }))
        ];
        
        setRecords(allRecords);
        setFilteredRecords(allRecords);
      } catch (error) {
        console.error("Error al cargar los datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del libro de registros",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, hasPermissionForUser, userIsChecking]);
  
  // Aplicar filtros
  useEffect(() => {
    let filtered = [...records];
    
    // Filtrar por tipo
    if (recordType !== "all") {
      filtered = filtered.filter(record => record.type === recordType);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.concept.toLowerCase().includes(term) ||
        (record.clientName && record.clientName.toLowerCase().includes(term)) ||
        (record.number && record.number.toLowerCase().includes(term)) ||
        record.amount.includes(term) ||
        record.total.includes(term)
      );
    }
    
    // Filtrar por rango de fechas
    if (dateRange?.from) {
      filtered = filtered.filter(record => record.date >= dateRange.from!);
    }
    if (dateRange?.to) {
      // Ajustar la fecha final para incluir todo el día
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(record => record.date <= endDate);
    }
    
    // Ordenar resultados
    filtered.sort((a, b) => {
      if (sortColumn === "date") {
        return sortDirection === "asc" 
          ? a.date.getTime() - b.date.getTime() 
          : b.date.getTime() - a.date.getTime();
      } else if (sortColumn === "amount") {
        const amountA = parseFloat(a.amount.replace(/[^0-9.-]+/g, ""));
        const amountB = parseFloat(b.amount.replace(/[^0-9.-]+/g, ""));
        return sortDirection === "asc" ? amountA - amountB : amountB - amountA;
      } else {
        const valA = a[sortColumn as keyof Record] || "";
        const valB = b[sortColumn as keyof Record] || "";
        if (typeof valA === "string" && typeof valB === "string") {
          return sortDirection === "asc" 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        return 0;
      }
    });
    
    setFilteredRecords(filtered);
  }, [records, recordType, searchTerm, dateRange, sortColumn, sortDirection]);
  
  // Función para exportar a CSV
  const exportToCSV = () => {
    // Crear cabeceras del CSV
    const headers = ["Fecha", "Tipo", "Número", "Cliente", "Concepto", "Base Imponible", "IVA", "Total", "Estado/Categoría"];
    
    // Convertir registros a filas CSV
    const rows = filteredRecords.map(record => [
      format(record.date, "dd/MM/yyyy"),
      record.type === "invoice" ? "Factura" : record.type === "quote" ? "Presupuesto" : "Transacción",
      record.number || "",
      record.clientName || "",
      record.concept,
      record.amount,
      record.tax,
      record.total,
      record.status || record.category || ""
    ]);
    
    // Combinar cabeceras y filas
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.join(";"))
    ].join("\n");
    
    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `libro-registros-${userId}-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Función para manejar el cambio de ordenación
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  // Renderizar detalles según el tipo de registro
  const renderRecordDetails = (record: Record) => {
    const formatAmount = (amount: string) => {
      // Asegurar que se muestra correctamente con 2 decimales
      const numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ""));
      return isNaN(numericAmount) ? amount : numericAmount.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + " €";
    };
    
    switch (record.type) {
      case "invoice":
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium">Cliente:</p>
                <p className="text-sm">{record.clientName}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Número:</p>
                <p className="text-sm">{record.number}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Concepto:</p>
              <p className="text-sm">{record.concept}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-sm font-medium">Base Imponible:</p>
                <p className="text-sm">{formatAmount(record.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">IVA:</p>
                <p className="text-sm">{formatAmount(record.tax)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total:</p>
                <p className="text-sm font-bold">{formatAmount(record.total)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Estado:</p>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                record.status === "paid" ? "bg-green-100 text-green-800" :
                record.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                record.status === "overdue" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {record.status === "paid" ? "Pagada" :
                record.status === "pending" ? "Pendiente" :
                record.status === "overdue" ? "Vencida" :
                record.status}
              </div>
            </div>
          </div>
        );
      
      case "transaction":
        return (
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Concepto:</p>
              <p className="text-sm">{record.concept}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium">Categoría:</p>
                <p className="text-sm">{record.category || "Sin categoría"}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Tipo:</p>
                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  record.amount.startsWith("-") ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"
                }`}>
                  {record.amount.startsWith("-") ? "Gasto" : "Ingreso"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium">Importe:</p>
                <p className={`text-sm font-bold ${record.amount.startsWith("-") ? "text-red-600" : "text-green-600"}`}>
                  {formatAmount(record.amount)}
                </p>
              </div>
              {record.rawData.invoiceId && (
                <div>
                  <p className="text-sm font-medium">Factura asociada:</p>
                  <p className="text-sm">{record.rawData.invoiceNumber || record.rawData.invoiceId}</p>
                </div>
              )}
            </div>
          </div>
        );
      
      case "quote":
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium">Cliente:</p>
                <p className="text-sm">{record.clientName}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Número:</p>
                <p className="text-sm">{record.number}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Concepto:</p>
              <p className="text-sm">{record.concept}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-sm font-medium">Base Imponible:</p>
                <p className="text-sm">{formatAmount(record.amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">IVA:</p>
                <p className="text-sm">{formatAmount(record.tax)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total:</p>
                <p className="text-sm font-bold">{formatAmount(record.total)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Estado:</p>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                record.status === "accepted" ? "bg-green-100 text-green-800" :
                record.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                record.status === "rejected" ? "bg-red-100 text-red-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {record.status === "accepted" ? "Aceptado" :
                 record.status === "pending" ? "Pendiente" :
                 record.status === "rejected" ? "Rechazado" :
                 record.status}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Mostrar selector de clientes para administradores normales cuando no hay userId
  if (!userIsChecking && user?.role === "admin" && (!userId || userId === '') && assignedClients.length > 0) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Libro de Registros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label htmlFor="client-select" className="mb-2 block">
                Selecciona un cliente para ver su libro de registros:
              </Label>
              <Select 
                onValueChange={(value) => {
                  // Encontrar el cliente seleccionado
                  const selectedClient = assignedClients.find(c => c.id.toString() === value);
                  if (selectedClient && selectedClient.userId) {
                    // Navegar a la página con el ID del usuario asociado al cliente
                    navigate(`/admin/libro-registros/${selectedClient.userId}`);
                  }
                }}
              >
                <SelectTrigger id="client-select" className="w-full md:w-80">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {assignedClients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name} ({client.taxId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Como administrador, puedes ver el libro de registros de los clientes que tienes asignados.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Mostrar mensaje cuando no hay clientes asignados para admins regulares
  if (!userIsChecking && user?.role === "admin" && (!userId || userId === '') && assignedClients.length === 0) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center">
              <Info className="mr-2 h-5 w-5" />
              Sin clientes asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              No tienes clientes asignados para ver su libro de registros.
            </p>
            <p className="text-sm text-yellow-800 mb-4">
              Contacta con un superadministrador para que te asigne clientes.
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
            >
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Mostrar mensaje cuando el admin no tiene permiso para ver este usuario
  if (!userIsChecking && !hasPermissionForUser && !isSuperAdmin) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              No tiene permisos para ver el libro de registros de este usuario ya que no tiene acceso a su cliente asociado.
            </p>
            <Button
              onClick={() => navigate("/admin/libro-registros")}
              variant="outline"
            >
              Volver a selección de cliente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Libro de Registros</h1>
          <p className="text-sm text-gray-500">
            Visualizando registros del usuario ID: {userId}
          </p>
        </div>
        
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Button 
            variant="outline" 
            onClick={exportToCSV}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-md flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Buscar..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="record-type">Tipo de registro</Label>
              <Select
                value={recordType}
                onValueChange={(value) => setRecordType(value as RecordType | "all")}
              >
                <SelectTrigger id="record-type">
                  <SelectValue placeholder="Todos los registros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los registros</SelectItem>
                  <SelectItem value="invoice">Facturas</SelectItem>
                  <SelectItem value="transaction">Transacciones</SelectItem>
                  <SelectItem value="quote">Presupuestos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <Label>Rango de fechas</Label>
              <DatePickerWithRange
                date={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabla de registros */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Cargando datos...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-24 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No hay registros</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                No se encontraron registros que coincidan con los filtros seleccionados. Prueba a modificar los filtros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort("date")}>
                      <div className="flex items-center">
                        Fecha
                        {sortColumn === "date" && (
                          <ChevronDown className={`ml-1 h-4 w-4 ${sortDirection === "desc" ? "transform rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("type")}>
                      <div className="flex items-center">
                        Tipo
                        {sortColumn === "type" && (
                          <ChevronDown className={`ml-1 h-4 w-4 ${sortDirection === "desc" ? "transform rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort("amount")}>
                      <div className="flex items-center justify-end">
                        Importe
                        {sortColumn === "amount" && (
                          <ChevronDown className={`ml-1 h-4 w-4 ${sortDirection === "desc" ? "transform rotate-180" : ""}`} />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={`${record.type}-${record.id}`}>
                      <TableCell className="font-medium">
                        {format(record.date, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.type === "invoice" ? "bg-blue-100 text-blue-800" :
                          record.type === "transaction" ? 
                            (record.amount.startsWith("-") ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800") :
                          "bg-purple-100 text-purple-800"
                        }`}>
                          {record.type === "invoice" ? "Factura" :
                           record.type === "transaction" ? 
                             (record.amount.startsWith("-") ? "Gasto" : "Ingreso") :
                           "Presupuesto"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.number || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.concept}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        record.type === "transaction" && record.amount.startsWith("-") 
                          ? "text-red-600" 
                          : "text-green-600"
                      }`}>
                        {parseFloat(record.amount.replace(/[^0-9.-]+/g, "")).toLocaleString('es-ES', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} €
                      </TableCell>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Info className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Detalles del registro</DialogTitle>
                              <DialogDescription>
                                {format(record.date, "dd MMMM yyyy", { locale: es })}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {renderRecordDetails(record)}
                            
                            <DialogFooter>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  // Navegar a la página de edición del registro según su tipo
                                  const editPath = record.type === "invoice" 
                                    ? `/invoices/${record.id}/edit` 
                                    : record.type === "transaction"
                                      ? `/transactions/${record.id}/edit`
                                      : `/quotes/${record.id}/edit`;
                                  
                                  navigate(editPath);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibroRegistrosPage;