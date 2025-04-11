import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, FileEdit, Trash2, ArrowLeft } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

// Tipo para los registros del libro
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
  const params = useParams();
  const clienteId = parseInt(params.clienteId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estado para el formulario
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [currentRegistro, setCurrentRegistro] = useState<Partial<LibroRegistro> | null>(null);
  const [activeTab, setActiveTab] = useState("emitidas");

  // Estados para el formulario
  const [fecha, setFecha] = useState<Date | undefined>(new Date());
  const [numeroFactura, setNumeroFactura] = useState("");
  const [clienteProveedor, setClienteProveedor] = useState("");
  const [concepto, setConcepto] = useState("");
  const [baseImponible, setBaseImponible] = useState("");
  const [ivaPorcentaje, setIvaPorcentaje] = useState("21");
  const [cuotaIva, setCuotaIva] = useState("");
  const [totalFactura, setTotalFactura] = useState("");

  // Consulta para obtener los datos del cliente
  const { data: cliente, isLoading: clienteLoading } = useQuery({
    queryKey: [`/api/clients/${clienteId}`],
    enabled: !!clienteId,
  });

  // Consulta para obtener los registros del libro
  const { data: registros, isLoading: registrosLoading } = useQuery({
    queryKey: [`/api/admin/libro-registros/${clienteId}`],
    enabled: !!clienteId,
  });

  // Filtrar registros por tipo (emitidas/recibidas)
  const filteredRegistros = registros?.filter((registro: LibroRegistro) => 
    registro.tipo === activeTab
  ) || [];

  // Mutación para crear un nuevo registro
  const createMutation = useMutation({
    mutationFn: (registro: Partial<LibroRegistro>) => 
      apiRequest(`/api/admin/libro-registros`, {
        method: "POST",
        data: registro,
      }),
    onSuccess: () => {
      toast({
        title: "Registro creado",
        description: "El registro ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/libro-registros/${clienteId}`] 
      });
      resetForm();
      setFormDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al crear el registro",
        variant: "destructive",
      });
      console.error("Error al crear registro:", error);
    },
  });

  // Mutación para actualizar un registro
  const updateMutation = useMutation({
    mutationFn: (registro: Partial<LibroRegistro>) => 
      apiRequest(`/api/admin/libro-registros/${registro.id}`, {
        method: "PATCH",
        data: registro,
      }),
    onSuccess: () => {
      toast({
        title: "Registro actualizado",
        description: "El registro ha sido actualizado correctamente",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/libro-registros/${clienteId}`] 
      });
      resetForm();
      setFormDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al actualizar el registro",
        variant: "destructive",
      });
      console.error("Error al actualizar registro:", error);
    },
  });

  // Mutación para eliminar un registro
  const deleteMutation = useMutation({
    mutationFn: (registroId: number) => 
      apiRequest(`/api/admin/libro-registros/${registroId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast({
        title: "Registro eliminado",
        description: "El registro ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/admin/libro-registros/${clienteId}`] 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al eliminar el registro",
        variant: "destructive",
      });
      console.error("Error al eliminar registro:", error);
    },
  });

  // Efecto para actualizar la cuota IVA y el total
  useEffect(() => {
    if (baseImponible) {
      const base = parseFloat(baseImponible.replace(',', '.'));
      const porcentaje = parseFloat(ivaPorcentaje || "0");
      
      if (!isNaN(base) && !isNaN(porcentaje)) {
        const cuota = (base * porcentaje / 100).toFixed(2).replace('.', ',');
        const total = (base + (base * porcentaje / 100)).toFixed(2).replace('.', ',');
        
        setCuotaIva(cuota);
        setTotalFactura(total);
      }
    }
  }, [baseImponible, ivaPorcentaje]);

  // Resetear el formulario
  const resetForm = () => {
    setCurrentRegistro(null);
    setFecha(new Date());
    setNumeroFactura("");
    setClienteProveedor("");
    setConcepto("");
    setBaseImponible("");
    setIvaPorcentaje("21");
    setCuotaIva("");
    setTotalFactura("");
  };

  // Abrir el formulario para editar
  const handleEdit = (registro: LibroRegistro) => {
    setCurrentRegistro(registro);
    setFecha(new Date(registro.fecha));
    setNumeroFactura(registro.numeroFactura || "");
    setClienteProveedor(registro.clienteProveedor || "");
    setConcepto(registro.concepto || "");
    setBaseImponible(registro.baseImponible || "");
    setIvaPorcentaje(registro.ivaPorcentaje || "21");
    setCuotaIva(registro.cuotaIva || "");
    setTotalFactura(registro.totalFactura || "");
    setFormDialogOpen(true);
  };

  // Abrir el formulario para crear
  const handleCreate = () => {
    resetForm();
    setFormDialogOpen(true);
  };

  // Manejar el guardado del formulario
  const handleSaveForm = () => {
    if (!fecha) {
      toast({
        title: "Error",
        description: "La fecha es obligatoria",
        variant: "destructive",
      });
      return;
    }

    const registro: Partial<LibroRegistro> = {
      clienteId,
      tipo: activeTab,
      fecha: fecha,
      numeroFactura: numeroFactura || null,
      clienteProveedor: clienteProveedor || null,
      concepto: concepto || null,
      baseImponible: baseImponible || null,
      ivaPorcentaje: ivaPorcentaje || null,
      cuotaIva: cuotaIva || null,
      totalFactura: totalFactura || null,
    };

    if (currentRegistro?.id) {
      // Actualizar registro existente
      updateMutation.mutate({
        ...registro,
        id: currentRegistro.id,
      });
    } else {
      // Crear nuevo registro
      createMutation.mutate(registro);
    }
  };

  // Formatear la moneda para mostrarla en la tabla
  const formatCurrency = (value: string | null) => {
    if (!value) return "0,00 €";
    return `${value} €`;
  };

  if (clienteLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setLocation('/admin/select-user')}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Libro de Registros</h1>
          {cliente && (
            <p className="text-muted-foreground">
              Cliente: {cliente.name}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Registros</CardTitle>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Registro
            </Button>
          </div>
          <CardDescription>
            Gestiona las facturas emitidas y recibidas del cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="emitidas" onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="emitidas">Facturas Emitidas</TabsTrigger>
              <TabsTrigger value="recibidas">Facturas Recibidas</TabsTrigger>
            </TabsList>

            <TabsContent value="emitidas" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">% IVA</TableHead>
                      <TableHead className="text-right">Cuota IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredRegistros.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          No hay registros disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRegistros.map((registro: LibroRegistro) => (
                        <TableRow key={registro.id}>
                          <TableCell>
                            {format(new Date(registro.fecha), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{registro.numeroFactura || '-'}</TableCell>
                          <TableCell>{registro.clienteProveedor || '-'}</TableCell>
                          <TableCell>{registro.concepto || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(registro.baseImponible)}</TableCell>
                          <TableCell className="text-right">{registro.ivaPorcentaje || '0'}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(registro.cuotaIva)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(registro.totalFactura)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleEdit(registro)}
                              >
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => deleteMutation.mutate(registro.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="recibidas" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                      <TableHead className="text-right">% IVA</TableHead>
                      <TableHead className="text-right">Cuota IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredRegistros.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-muted-foreground">
                          No hay registros disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRegistros.map((registro: LibroRegistro) => (
                        <TableRow key={registro.id}>
                          <TableCell>
                            {format(new Date(registro.fecha), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{registro.numeroFactura || '-'}</TableCell>
                          <TableCell>{registro.clienteProveedor || '-'}</TableCell>
                          <TableCell>{registro.concepto || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(registro.baseImponible)}</TableCell>
                          <TableCell className="text-right">{registro.ivaPorcentaje || '0'}%</TableCell>
                          <TableCell className="text-right">{formatCurrency(registro.cuotaIva)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(registro.totalFactura)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleEdit(registro)}
                              >
                                <FileEdit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => deleteMutation.mutate(registro.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Diálogo para crear/editar registros */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentRegistro?.id ? "Editar Registro" : "Nuevo Registro"}
            </DialogTitle>
            <DialogDescription>
              {activeTab === "emitidas" 
                ? "Añade una nueva factura emitida al libro de registros."
                : "Añade una nueva factura recibida al libro de registros."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <DatePicker date={fecha} onSelect={setFecha} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroFactura">Número de Factura</Label>
                <Input
                  id="numeroFactura"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clienteProveedor">
                {activeTab === "emitidas" ? "Cliente" : "Proveedor"}
              </Label>
              <Input
                id="clienteProveedor"
                value={clienteProveedor}
                onChange={(e) => setClienteProveedor(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="concepto">Concepto</Label>
              <Input
                id="concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseImponible">Base Imponible</Label>
                <Input
                  id="baseImponible"
                  value={baseImponible}
                  onChange={(e) => setBaseImponible(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ivaPorcentaje">% IVA</Label>
                <Select 
                  value={ivaPorcentaje} 
                  onValueChange={setIvaPorcentaje}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona IVA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuotaIva">Cuota IVA</Label>
                <Input
                  id="cuotaIva"
                  value={cuotaIva}
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalFactura">Total Factura</Label>
              <Input
                id="totalFactura"
                value={totalFactura}
                readOnly
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveForm}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}