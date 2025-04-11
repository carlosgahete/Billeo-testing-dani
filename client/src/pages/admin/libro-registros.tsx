import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogClose 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react";

interface LibroRegistro {
  id: number;
  clienteId: number;
  tipo: string;
  fecha: Date;
  numeroFactura: string | null;
  clienteProveedor: string | null;
  concepto: string | null;
  baseImponible: string | null;
  ivaPorcentaje: string | null;
  cuotaIva: string | null;
  totalFactura: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Cliente {
  id: number;
  name: string;
  email: string;
}

export default function LibroRegistrosPage() {
  const params = useParams<{ clienteId: string }>();
  const clienteId = parseInt(params.clienteId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<LibroRegistro>>({
    clienteId,
    tipo: "ingreso",
    fecha: new Date(),
    numeroFactura: "",
    clienteProveedor: "",
    concepto: "",
    baseImponible: "",
    ivaPorcentaje: "",
    cuotaIva: "",
    totalFactura: ""
  });
  
  const [editingRegistro, setEditingRegistro] = useState<LibroRegistro | null>(null);
  const [registroToDelete, setRegistroToDelete] = useState<number | null>(null);
  const [openAlertDialog, setOpenAlertDialog] = useState(false);
  
  // Obtener los registros del libro
  const { data: registros, isLoading } = useQuery({
    queryKey: ["/api/admin/libro-registros", clienteId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/libro-registros/${clienteId}`);
      if (!response.ok) {
        throw new Error("Error al obtener registros del libro");
      }
      return response.json();
    },
  });
  
  // Obtener información del cliente
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ["/api/admin/users", clienteId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${clienteId}`);
      if (!response.ok) {
        throw new Error("Error al obtener información del cliente");
      }
      return response.json();
    },
  });
  
  // Mutación para crear un nuevo registro
  const createRegistro = useMutation({
    mutationFn: async (data: Partial<LibroRegistro>) => {
      const response = await fetch("/api/admin/libro-registros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Error al crear el registro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/libro-registros", clienteId] });
      toast({
        title: "Registro creado",
        description: "El registro se ha creado correctamente",
      });
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para actualizar un registro
  const updateRegistro = useMutation({
    mutationFn: async (data: Partial<LibroRegistro>) => {
      const response = await fetch(`/api/admin/libro-registros/${data.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Error al actualizar el registro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/libro-registros", clienteId] });
      toast({
        title: "Registro actualizado",
        description: "El registro se ha actualizado correctamente",
      });
      setEditingRegistro(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para eliminar un registro
  const deleteRegistro = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/libro-registros/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Error al eliminar el registro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/libro-registros", clienteId] });
      toast({
        title: "Registro eliminado",
        description: "El registro se ha eliminado correctamente",
      });
      setRegistroToDelete(null);
      setOpenAlertDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  // Filtrar registros por tipo
  const filteredRegistros = registros?.filter((registro: LibroRegistro) => 
    true // En el futuro se puede implementar un filtro
  );
  
  // Manejadores de eventos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newValue = name === "ivaPorcentaje" && value ? value.replace("%", "") + "%" : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    
    // Calcular cuota IVA si tenemos base imponible y porcentaje de IVA
    if ((name === "baseImponible" || name === "ivaPorcentaje") && 
        formData.baseImponible && 
        (name === "ivaPorcentaje" ? value : formData.ivaPorcentaje)) {
      
      const base = parseFloat(name === "baseImponible" ? value : formData.baseImponible || "0");
      const ivaStr = name === "ivaPorcentaje" ? value : formData.ivaPorcentaje || "0";
      const ivaPorcentaje = parseFloat(ivaStr.replace("%", "")) / 100;
      
      // Calculamos la cuota IVA
      const cuotaIva = (base * ivaPorcentaje).toFixed(2);
      // Calculamos el total
      const total = (base + parseFloat(cuotaIva)).toFixed(2);
      
      setFormData((prev) => ({
        ...prev,
        cuotaIva,
        totalFactura: total
      }));
    }
  };
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        fecha: date,
      }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRegistro) {
      updateRegistro.mutate({
        ...formData,
        id: editingRegistro.id
      });
    } else {
      createRegistro.mutate(formData);
    }
  };
  
  const handleEdit = (registro: LibroRegistro) => {
    setEditingRegistro(registro);
    setFormData({
      ...registro,
      fecha: new Date(registro.fecha)
    });
  };
  
  const handleDelete = (id: number) => {
    setRegistroToDelete(id);
    setOpenAlertDialog(true);
  };
  
  const confirmDelete = () => {
    if (registroToDelete !== null) {
      deleteRegistro.mutate(registroToDelete);
    }
  };
  
  const resetForm = () => {
    setFormData({
      clienteId,
      tipo: "ingreso",
      fecha: new Date(),
      numeroFactura: "",
      clienteProveedor: "",
      concepto: "",
      baseImponible: "",
      ivaPorcentaje: "",
      cuotaIva: "",
      totalFactura: ""
    });
    setEditingRegistro(null);
  };
  
  const goBackToSelection = () => {
    setLocation("/admin/select-user");
  };
  
  if (isLoading || isLoadingCliente) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={goBackToSelection}
          className="mr-3"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">
          Libro de Registros - {cliente?.name || "Cliente"}
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario */}
        <Card className="lg:col-span-1 border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-t-lg">
            <CardTitle className="text-xl font-semibold">
              {editingRegistro ? "Editar Registro" : "Nuevo Registro"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select
                  name="tipo"
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({...formData, tipo: value})}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">Ingreso</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <DatePicker 
                  date={formData.fecha ? new Date(formData.fecha) : undefined} 
                  onSelect={handleDateChange} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numeroFactura">Número de Factura</Label>
                <Input
                  id="numeroFactura"
                  name="numeroFactura"
                  value={formData.numeroFactura || ""}
                  onChange={handleInputChange}
                  placeholder="Ej: F-2025-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clienteProveedor">Cliente/Proveedor</Label>
                <Input
                  id="clienteProveedor"
                  name="clienteProveedor"
                  value={formData.clienteProveedor || ""}
                  onChange={handleInputChange}
                  placeholder="Nombre del cliente o proveedor"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto</Label>
                <Input
                  id="concepto"
                  name="concepto"
                  value={formData.concepto || ""}
                  onChange={handleInputChange}
                  placeholder="Descripción breve"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseImponible">Base Imponible (€)</Label>
                <Input
                  id="baseImponible"
                  name="baseImponible"
                  value={formData.baseImponible || ""}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ivaPorcentaje">IVA %</Label>
                <Input
                  id="ivaPorcentaje"
                  name="ivaPorcentaje"
                  value={formData.ivaPorcentaje || ""}
                  onChange={handleInputChange}
                  placeholder="21%"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cuotaIva">Cuota IVA (€)</Label>
                <Input
                  id="cuotaIva"
                  name="cuotaIva"
                  value={formData.cuotaIva || ""}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalFactura">Total Factura (€)</Label>
                <Input
                  id="totalFactura"
                  name="totalFactura"
                  value={formData.totalFactura || ""}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                {editingRegistro && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={createRegistro.isPending || updateRegistro.isPending}>
                  {createRegistro.isPending || updateRegistro.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {editingRegistro ? "Actualizar" : "Guardar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Tabla de registros */}
        <Card className="lg:col-span-2 border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-t-lg">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold">Registros</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {filteredRegistros?.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Cliente/Proveedor</TableHead>
                      <TableHead>Base Imp.</TableHead>
                      <TableHead>IVA</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistros.map((registro: LibroRegistro) => (
                      <TableRow key={registro.id}>
                        <TableCell>
                          {format(new Date(registro.fecha), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            registro.tipo === "ingreso" 
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {registro.tipo.charAt(0).toUpperCase() + registro.tipo.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>{registro.numeroFactura || "-"}</TableCell>
                        <TableCell>{registro.clienteProveedor || "-"}</TableCell>
                        <TableCell>{registro.baseImponible ? `${registro.baseImponible} €` : "-"}</TableCell>
                        <TableCell>{registro.ivaPorcentaje || "-"}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            registro.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                          }`}>
                            {registro.totalFactura ? `${registro.totalFactura} €` : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(registro)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(registro.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                No hay registros disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={openAlertDialog} onOpenChange={setOpenAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro del libro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}