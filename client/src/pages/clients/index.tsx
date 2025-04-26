import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Users, ArrowLeft, FileText, Info } from "lucide-react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientForm } from "@/components/clients/ClientForm";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface Client {
  id: number;
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
}

export default function ClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isFromInvoice, setIsFromInvoice] = useState(false);
  
  // Determinar si llegamos desde la página de creación de facturas
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromInvoice = searchParams.get('from') === 'invoice';
    console.log("URL search params:", searchParams.toString());
    console.log("fromInvoice detectado:", fromInvoice);
    
    // Durante el desarrollo, forzamos la visualización de los botones
    // para facilitar las pruebas y demostración
    setIsFromInvoice(true);
    
    // Cuando esté listo para producción, descomenta la siguiente línea
    // y comenta la línea anterior
    // setIsFromInvoice(fromInvoice);
  }, []);

  // Query para obtener clientes
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await fetch("/api/clients");
      if (!response.ok) {
        throw new Error("Error al obtener clientes");
      }
      return response.json();
    },
  });

  // Mutación para eliminar cliente
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowDeleteDialog(false);
      setClientToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar el cliente: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Filtrar clientes según término de búsqueda
  const filteredClients = clients.filter((client: Client) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(searchLower) ||
      client.taxId?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.city?.toLowerCase().includes(searchLower)
    );
  });

  // Funciones para gestionar el formulario de clientes
  const handleOpenCreateForm = () => {
    setClientToEdit(null);
    setShowClientForm(true);
  };

  const handleOpenEditForm = (client: Client) => {
    setClientToEdit(client);
    setShowClientForm(true);
  };

  const handleClientCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
  };

  const handleConfirmDelete = (client: Client) => {
    setClientToDelete(client);
    setShowDeleteDialog(true);
  };

  const handleDeleteClient = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
    }
  };
  
  const handleGoBack = () => {
    if (isFromInvoice) {
      navigate('/invoices/create');
    } else {
      navigate('/');
    }
  };
  
  const handleSelectClientForInvoice = (client: Client) => {
    // Guardamos el cliente seleccionado en sessionStorage para recuperarlo en la página de facturas
    sessionStorage.setItem('selectedClient', JSON.stringify(client));
    navigate('/invoices/create');
    
    toast({
      title: "Cliente seleccionado",
      description: `Se ha seleccionado a ${client.name} para la nueva factura`,
    });
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center w-full">
            <div className="flex items-center">
              {isFromInvoice && (
                <Button 
                  variant="outline" 
                  onClick={handleGoBack}
                  className="flex items-center mr-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> 
                  Volver a crear factura
                </Button>
              )}
              
              <div>
                <CardTitle className="text-2xl">Clientes</CardTitle>
                <CardDescription>
                  Gestiona la información de tus clientes
                </CardDescription>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 mt-4 md:mt-0">
              <div className="relative">
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64"
                />
              </div>
              <Button onClick={handleOpenCreateForm}>
                <Plus className="h-4 w-4 mr-2" /> Nuevo cliente
              </Button>
            </div>
          </div>
          
          {isFromInvoice && (
            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-blue-700 text-sm">
              <p className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Selecciona un cliente para incluirlo en tu factura
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p>Cargando clientes...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay clientes</h3>
              <p className="text-muted-foreground mt-2">
                {searchTerm
                  ? "No se encontraron clientes con ese criterio de búsqueda"
                  : "Comienza añadiendo tu primer cliente"}
              </p>
              {!searchTerm && (
                <Button onClick={handleOpenCreateForm} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" /> Añadir cliente
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>NIF/CIF</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Ciudad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: Client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.taxId}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.email || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {client.city || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isFromInvoice && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectClientForInvoice(client)}
                              className="text-blue-500 border-blue-500 hover:bg-blue-50"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              <span className="hidden md:inline">Seleccionar</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditForm(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirmDelete(client)}
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
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> 
            Volver {isFromInvoice ? 'a crear factura' : 'al dashboard'}
          </Button>
          
          {isFromInvoice && (
            <div className="text-sm text-muted-foreground">
              Selecciona un cliente para incluirlo en tu factura
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Formulario para crear/editar cliente */}
      <ClientForm
        open={showClientForm}
        onOpenChange={setShowClientForm}
        onClientCreated={handleClientCreated}
        clientToEdit={clientToEdit}
      />

      {/* Diálogo de confirmación para eliminar cliente */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar el cliente{" "}
              <span className="font-medium">{clientToDelete?.name}</span>?
              <br />
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}