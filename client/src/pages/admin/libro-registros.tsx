import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Download, FileText, Filter, Search, Plus, Edit, Trash2, ChevronDown } from "lucide-react";
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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Interfaces
interface Transaction {
  id: number;
  date: string;
  title: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  categoryId: number;
  categoryName?: string;
  attachmentUrl?: string;
  userId: number;
}

interface Invoice {
  id: number;
  date: string;
  dueDate: string;
  invoiceNumber: string;
  clientName: string;
  amount: string;
  status: string;
  attachmentUrl?: string;
  userId: number;
}

interface Category {
  id: number;
  name: string;
  type: string;
  color: string;
  icon: string;
}

interface User {
  id: number;
  name: string;
  username: string;
}

// Tipo unión para representar cualquier registro
type Record = Transaction | Invoice;

// Interface para el registro editado o nuevo
interface EditableRecord {
  id?: number;
  date: string;
  type: string;
  description: string;
  amount: string;
  categoryId?: number | null;
  attachmentUrl?: string;
  userId?: number;
}

export default function LibroRegistros() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{from: Date | undefined, to: Date | undefined}>({
    from: undefined,
    to: undefined,
  });
  
  // Estados para edición y creación
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EditableRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Obtener el ID del usuario de la URL
  const userId = window.location.pathname.split('/').pop();

  useEffect(() => {
    if (user && user.role === "admin" && userId) {
      fetchUserDetails();
      fetchRecords();
      fetchCategories();
    }
  }, [user, userId]);

  // Filtrar registros cuando cambian los criterios de búsqueda o el rango de fechas
  useEffect(() => {
    filterRecords();
  }, [searchTerm, records, dateRange]);

  const fetchUserDetails = async () => {
    try {
      const response = await apiRequest("GET", `/api/admin/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setSelectedUser(userData);
      } else {
        toast({
          title: "Error",
          description: "No se pudo obtener la información del usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      
      // Obtener transacciones
      const transactionsResponse = await apiRequest("GET", `/api/admin/users/${userId}/transactions`);
      const transactionsData = await transactionsResponse.json();
      
      // Obtener facturas
      const invoicesResponse = await apiRequest("GET", `/api/admin/users/${userId}/invoices`);
      const invoicesData = await invoicesResponse.json();
      
      // Combinar y ordenar por fecha
      const allRecords = [
        ...transactionsData.map((t: any) => ({
          ...t,
          recordType: 'transaction'
        })),
        ...invoicesData.map((i: any) => ({
          ...i,
          recordType: 'invoice',
          description: `Factura ${i.invoiceNumber} - ${i.clientName}`
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRecords(allRecords);
      setFilteredRecords(allRecords);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiRequest("GET", `/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const filterRecords = () => {
    let filtered = [...records];
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.description?.toLowerCase().includes(search) ||
        ('title' in record && record.title?.toLowerCase().includes(search)) ||
        ('clientName' in record && record.clientName?.toLowerCase().includes(search)) ||
        ('invoiceNumber' in record && record.invoiceNumber?.toLowerCase().includes(search))
      );
    }
    
    // Filtrar por rango de fechas
    if (dateRange.from) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= dateRange.from!;
      });
    }
    
    if (dateRange.to) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate <= dateRange.to!;
      });
    }
    
    setFilteredRecords(filtered);
  };

  const handleAddRecord = () => {
    setEditingRecord({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      description: '',
      amount: '',
      categoryId: null,
      userId: Number(userId)
    });
    setShowAddDialog(true);
  };

  const handleEditRecord = (record: Record) => {
    const isTransaction = 'type' in record;
    
    setEditingRecord({
      id: record.id,
      date: new Date(record.date).toISOString().split('T')[0],
      type: isTransaction ? record.type : 'invoice',
      description: record.description,
      amount: record.amount,
      categoryId: isTransaction ? (record as Transaction).categoryId : null,
      attachmentUrl: 'attachmentUrl' in record ? record.attachmentUrl : undefined,
      userId: Number(userId)
    });
    
    setShowEditDialog(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    
    try {
      setActionLoading(true);
      
      // Determinar si es transacción o factura
      const recordToRemove = records.find(r => r.id === recordToDelete);
      const isTransaction = 'type' in recordToRemove!;
      
      const endpoint = isTransaction
        ? `/api/transactions/${recordToDelete}`
        : `/api/invoices/${recordToDelete}`;
      
      const response = await apiRequest("DELETE", endpoint);
      
      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Registro eliminado correctamente",
        });
        
        // Actualizar la lista
        setRecords(records.filter(r => r.id !== recordToDelete));
        setFilteredRecords(filteredRecords.filter(r => r.id !== recordToDelete));
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo eliminar el registro",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setRecordToDelete(null);
    }
  };

  const saveRecord = async (isEdit: boolean) => {
    if (!editingRecord) return;
    
    try {
      setActionLoading(true);
      
      const isTransaction = editingRecord.type === 'income' || editingRecord.type === 'expense';
      
      let endpoint;
      let method;
      let data;
      
      if (isTransaction) {
        // Es una transacción
        if (isEdit && editingRecord.id) {
          endpoint = `/api/transactions/${editingRecord.id}`;
          method = "PUT";
        } else {
          endpoint = "/api/transactions";
          method = "POST";
        }
        
        data = {
          date: editingRecord.date,
          type: editingRecord.type,
          description: editingRecord.description,
          amount: editingRecord.amount,
          categoryId: editingRecord.categoryId,
          userId: Number(userId)
        };
      } else {
        // Es una factura (más simple ya que aquí solo permitimos edición básica)
        if (isEdit && editingRecord.id) {
          endpoint = `/api/invoices/${editingRecord.id}`;
          method = "PUT";
          
          // Para facturas, solo permitimos cambiar fecha, monto y descripción
          data = {
            date: editingRecord.date,
            amount: editingRecord.amount,
            notes: editingRecord.description
          };
        } else {
          // No deberíamos crear facturas desde aquí, pero por si acaso
          toast({
            title: "Error",
            description: "La creación de facturas debe hacerse desde el módulo de facturas",
            variant: "destructive",
          });
          return;
        }
      }
      
      const response = await apiRequest(method, endpoint, data);
      
      if (response.ok) {
        const savedRecord = await response.json();
        
        if (isEdit) {
          // Actualizar el registro en las listas
          const updatedRecords = records.map(r => 
            r.id === editingRecord.id ? { ...r, ...savedRecord } : r
          );
          setRecords(updatedRecords);
          
          toast({
            title: "Éxito",
            description: "Registro actualizado correctamente",
          });
        } else {
          // Añadir el nuevo registro a las listas
          setRecords([savedRecord, ...records]);
          
          toast({
            title: "Éxito",
            description: "Registro creado correctamente",
          });
        }
        
        // Cerrar diálogos
        setShowAddDialog(false);
        setShowEditDialog(false);
        setEditingRecord(null);
        
        // Recargar para asegurar consistencia
        fetchRecords();
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo guardar el registro",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el registro",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const exportData = async (format: 'pdf' | 'excel') => {
    try {
      setActionLoading(true);
      
      // Preparar los parámetros de fecha si existen
      let dateParams = '';
      if (dateRange.from) {
        dateParams += `&from=${dateRange.from.toISOString()}`;
      }
      if (dateRange.to) {
        dateParams += `&to=${dateRange.to.toISOString()}`;
      }
      
      const endpoint = `/api/admin/users/${userId}/export?format=${format}${dateParams}`;
      const response = await apiRequest("GET", endpoint);
      
      if (response.ok) {
        // Es un archivo, así que tenemos que procesarlo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `libro-registros-${selectedUser?.name || userId}-${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Éxito",
          description: `Libro de registros exportado en formato ${format.toUpperCase()}`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || `No se pudo exportar en formato ${format}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo exportar en formato ${format}`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Verificar si es administrador
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">
              Libro de Registros - {selectedUser ? selectedUser.name : 'Usuario'}
            </CardTitle>
            
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportData('pdf')}>
                    <FileText className="mr-2 h-4 w-4" /> Exportar como PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('excel')}>
                    <FileText className="mr-2 h-4 w-4" /> Exportar como Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button onClick={handleAddRecord}>
                <Plus className="mr-2 h-4 w-4" /> Añadir Registro
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar por descripción..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex-1">
              <DatePickerWithRange 
                onChange={setDateRange} 
                value={dateRange}
                className="w-full"
                align="end"
              />
            </div>
          </div>
          
          {/* Tabla de registros */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>Registros contables del usuario</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Archivo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => {
                      const isTransaction = 'type' in record;
                      const recordType = isTransaction 
                        ? (record as Transaction).type === 'income' ? 'Ingreso' : 'Gasto' 
                        : 'Factura';
                      
                      // Obtener nombre de categoría
                      const categoryName = isTransaction
                        ? categories.find(c => c.id === (record as Transaction).categoryId)?.name || 'Sin categoría'
                        : 'Factura';
                        
                      return (
                        <TableRow key={`${isTransaction ? 'trans' : 'inv'}-${record.id}`}>
                          <TableCell>
                            {format(new Date(record.date), 'dd/MM/yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              recordType === 'Ingreso' 
                                ? 'bg-green-100 text-green-800' 
                                : recordType === 'Gasto'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {recordType}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {record.description}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {parseFloat(record.amount).toLocaleString('es-ES', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </TableCell>
                          <TableCell>
                            {categoryName}
                          </TableCell>
                          <TableCell>
                            {record.attachmentUrl ? (
                              <a 
                                href={record.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Ver archivo
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">Sin archivo</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditRecord(record)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setRecordToDelete(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron registros con los criterios de búsqueda actuales
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog para añadir registro */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Registro</DialogTitle>
            <DialogDescription>
              Ingrese los datos del nuevo registro contable
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="record-date" className="text-right">
                Fecha
              </Label>
              <Input
                id="record-date"
                type="date"
                value={editingRecord?.date || ''}
                onChange={(e) => setEditingRecord({
                  ...editingRecord!,
                  date: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="record-type" className="text-right">
                Tipo
              </Label>
              <Select
                value={editingRecord?.type || 'expense'}
                onValueChange={(value) => setEditingRecord({
                  ...editingRecord!,
                  type: value
                })}
              >
                <SelectTrigger id="record-type" className="col-span-3">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="record-description" className="text-right">
                Descripción
              </Label>
              <Input
                id="record-description"
                value={editingRecord?.description || ''}
                onChange={(e) => setEditingRecord({
                  ...editingRecord!,
                  description: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="record-amount" className="text-right">
                Importe
              </Label>
              <Input
                id="record-amount"
                type="number"
                step="0.01"
                value={editingRecord?.amount || ''}
                onChange={(e) => setEditingRecord({
                  ...editingRecord!,
                  amount: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="record-category" className="text-right">
                Categoría
              </Label>
              <Select
                value={editingRecord?.categoryId?.toString() || ''}
                onValueChange={(value) => setEditingRecord({
                  ...editingRecord!,
                  categoryId: parseInt(value)
                })}
              >
                <SelectTrigger id="record-category" className="col-span-3">
                  <SelectValue placeholder="Seleccione una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(c => c.type === (editingRecord?.type === 'income' ? 'income' : 'expense'))
                    .map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingRecord(null);
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveRecord(false)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para editar registro */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>
              Modifique los datos del registro contable
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right">
                Fecha
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={editingRecord?.date || ''}
                onChange={(e) => setEditingRecord({
                  ...editingRecord!,
                  date: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Descripción
              </Label>
              <Input
                id="edit-description"
                value={editingRecord?.description || ''}
                onChange={(e) => setEditingRecord({
                  ...editingRecord!,
                  description: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-amount" className="text-right">
                Importe
              </Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editingRecord?.amount || ''}
                onChange={(e) => setEditingRecord({
                  ...editingRecord!,
                  amount: e.target.value
                })}
                className="col-span-3"
              />
            </div>
            
            {(editingRecord?.type === 'income' || editingRecord?.type === 'expense') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Categoría
                </Label>
                <Select
                  value={editingRecord?.categoryId?.toString() || ''}
                  onValueChange={(value) => setEditingRecord({
                    ...editingRecord!,
                    categoryId: parseInt(value)
                  })}
                >
                  <SelectTrigger id="edit-category" className="col-span-3">
                    <SelectValue placeholder="Seleccione una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(c => c.type === (editingRecord?.type === 'income' ? 'income' : 'expense'))
                      .map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {editingRecord?.attachmentUrl && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Archivo
                </Label>
                <div className="col-span-3">
                  <a 
                    href={editingRecord.attachmentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Ver archivo adjunto
                  </a>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingRecord(null);
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => saveRecord(true)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* AlertDialog para confirmar eliminación */}
      <AlertDialog 
        open={!!recordToDelete} 
        onOpenChange={(open) => !open && setRecordToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este registro
              del libro contable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecord}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}