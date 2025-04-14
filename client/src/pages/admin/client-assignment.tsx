import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserCheck, Users, ShieldAlert, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Tipos
type Client = {
  id: number;
  name: string;
  email: string | null;
  taxId: string;
};

type Admin = {
  id: number;
  name: string;
  username: string;
  email: string;
};

type Assignment = {
  clientId: number;
  adminId: number;
};

const ClientAssignmentPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados
  const [loading, setLoading] = useState<boolean>(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Verificación de permisos - solo superadmin tiene acceso
  if (!user || (user.role !== "superadmin" && user.role !== "SUPERADMIN")) {
    return <Redirect to="/auth" />;
  }
  
  // Cargar administradores, clientes y asignaciones actuales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Cargar administradores
        const adminsRes = await apiRequest("GET", "/api/admin/users");
        if (!adminsRes.ok) {
          throw new Error("Error al cargar administradores");
        }
        const adminsData = await adminsRes.json();
        // Filtrar solo administradores (no superadmins)
        const onlyAdmins = adminsData.filter((admin: any) => 
          admin.role === "admin" && admin.id !== user.id
        );
        setAdmins(onlyAdmins);
        
        // 2. Cargar clientes
        const clientsRes = await apiRequest("GET", "/api/admin/assignable-clients");
        if (!clientsRes.ok) {
          throw new Error("Error al cargar clientes asignables");
        }
        const clientsData = await clientsRes.json();
        setClients(clientsData.allClients);
        setFilteredClients(clientsData.allClients);
        setAssignments(clientsData.assignedClients);
        
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de asignación de clientes",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Filtrar clientes según término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.taxId.toLowerCase().includes(term)
    );
    
    setFilteredClients(filtered);
  }, [searchTerm, clients]);
  
  // Verificar si un cliente está asignado a un admin específico
  const isClientAssignedToAdmin = (clientId: number, adminId: number): boolean => {
    return assignments.some(
      assignment => assignment.clientId === clientId && assignment.adminId === adminId
    );
  };
  
  // Manejar asignación/desasignación de cliente
  const handleAssignmentToggle = async (clientId: number, adminId: number) => {
    if (!adminId) return;
    
    setSaving(true);
    
    try {
      const isCurrentlyAssigned = isClientAssignedToAdmin(clientId, adminId);
      
      if (isCurrentlyAssigned) {
        // Eliminar asignación - Usamos POST con un parámetro adicional para indicar que es eliminación
        // Este enfoque es más confiable que DELETE con body en algunos entornos
        const res = await apiRequest("POST", "/api/admin/manage-assignment", {
          adminId,
          clientId,
          action: "remove"
        });
        
        if (!res.ok) {
          throw new Error("Error al eliminar asignación");
        }
        
        // Actualizar estado local
        setAssignments(prev => 
          prev.filter(a => !(a.clientId === clientId && a.adminId === adminId))
        );
        
        toast({
          title: "Asignación eliminada",
          description: "Cliente desasignado correctamente del administrador",
        });
      } else {
        // Crear asignación
        const res = await apiRequest("POST", "/api/admin/manage-assignment", {
          adminId,
          clientId,
          action: "assign"
        });
        
        if (!res.ok) {
          throw new Error("Error al crear asignación");
        }
        
        // Actualizar estado local
        setAssignments(prev => [...prev, { clientId, adminId }]);
        
        toast({
          title: "Asignación creada",
          description: "Cliente asignado correctamente al administrador",
        });
      }
    } catch (error) {
      console.error("Error al gestionar asignación:", error);
      toast({
        title: "Error",
        description: "No se pudo gestionar la asignación del cliente",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Asignación de Clientes</h1>
          <p className="text-sm text-gray-500">
            Asigne clientes a administradores para permisos de libro de registros
          </p>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Administradores</CardTitle>
          <CardDescription>
            Seleccione un administrador para gestionar sus clientes asignados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Cargando datos...</span>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">No hay administradores</h3>
              <p className="text-sm text-gray-500 mt-2">
                No se encontraron usuarios con rol de administrador en el sistema.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {admins.map(admin => (
                <Card
                  key={admin.id}
                  className={`cursor-pointer transition-colors ${
                    selectedAdmin === admin.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedAdmin(admin.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start">
                      <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mr-3">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{admin.name}</h3>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                        <p className="text-xs text-gray-400 mt-1">@{admin.username}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {assignments.filter(a => a.adminId === admin.id).length} cliente(s) asignado(s)
                      </div>
                      {selectedAdmin === admin.id && (
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedAdmin && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <CardTitle className="text-xl">Clientes Asignables</CardTitle>
                <CardDescription>
                  Gestione qué clientes puede ver el administrador seleccionado
                </CardDescription>
              </div>
              <div className="mt-4 md:mt-0 w-full md:w-64">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar cliente..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Cargando datos...</span>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium">No hay clientes</h3>
                <p className="text-sm text-gray-500 mt-2">
                  No se encontraron clientes en el sistema para asignar.
                </p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium">No hay resultados</h3>
                <p className="text-sm text-gray-500 mt-2">
                  No se encontraron clientes que coincidan con la búsqueda.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Asignado</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden md:table-cell">CIF/NIF</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="w-24 text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Checkbox
                            checked={isClientAssignedToAdmin(client.id, selectedAdmin)}
                            onCheckedChange={() => handleAssignmentToggle(client.id, selectedAdmin)}
                            disabled={saving}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="hidden md:table-cell">{client.taxId}</TableCell>
                        <TableCell className="hidden md:table-cell">{client.email || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={isClientAssignedToAdmin(client.id, selectedAdmin) ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleAssignmentToggle(client.id, selectedAdmin)}
                            disabled={saving}
                          >
                            {isClientAssignedToAdmin(client.id, selectedAdmin) ? (
                              <>Quitar</>
                            ) : (
                              <>Asignar</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientAssignmentPage;