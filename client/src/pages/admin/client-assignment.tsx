import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { 
  Loader2, 
  UserCog, 
  Users, 
  Link as LinkIcon, 
  Unlink, 
  Check, 
  X, 
  CircleAlert 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";

// Interfaces
interface Admin {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  email: string | null;
}

interface AdminClientAssignment {
  clientId: number;
  adminId: number;
}

export default function ClientAssignmentPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<AdminClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAssignment, setConfirmAssignment] = useState<{adminId: number, clientId: number} | null>(null);
  const [confirmUnassignment, setConfirmUnassignment] = useState<{adminId: number, clientId: number} | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<number | null>(null);

  // Verificar si el usuario actual es superadmin
  const isSuperAdmin = user && (user.role === 'superadmin' || user.role === 'SUPERADMIN');

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Obtener todos los usuarios con rol admin
        const usersResponse = await apiRequest("GET", "/api/admin/users");
        const usersData = await usersResponse.json();
        
        // Filtrar solo administradores (no superadmins)
        const adminUsers = usersData.filter((u: any) => 
          u.role === 'admin' || u.role === 'superadmin' || u.role === 'SUPERADMIN'
        );
        setAdmins(adminUsers);
        
        // 2. Obtener clientes asignables
        const clientsResponse = await apiRequest("GET", "/api/admin/assignable-clients");
        const clientsData = await clientsResponse.json();
        
        setClients(clientsData.allClients);
        setAssignments(clientsData.assignedClients);
        setDataLoaded(true);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de administradores y clientes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (user && isSuperAdmin) {
      fetchData();
    }
  }, [user, isSuperAdmin]);

  // Manejar asignación de cliente a admin
  const handleAssignClient = async (adminId: number, clientId: number) => {
    try {
      setActionLoading(true);
      
      const response = await apiRequest("POST", "/api/admin/assign-client", {
        adminId,
        clientId
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Actualizar el estado local con la nueva asignación
        setAssignments([
          ...assignments,
          { adminId, clientId }
        ]);
        
        toast({
          title: "Éxito",
          description: "Cliente asignado correctamente al administrador",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo asignar el cliente al administrador",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al asignar cliente:", error);
      toast({
        title: "Error",
        description: "No se pudo asignar el cliente al administrador",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setConfirmAssignment(null);
    }
  };

  // Manejar eliminación de asignación
  const handleUnassignClient = async (adminId: number, clientId: number) => {
    try {
      setActionLoading(true);
      
      const response = await apiRequest("DELETE", "/api/admin/assign-client", {
        adminId,
        clientId
      });
      
      if (response.ok) {
        // Eliminar la asignación del estado local
        setAssignments(
          assignments.filter(
            a => !(a.adminId === adminId && a.clientId === clientId)
          )
        );
        
        toast({
          title: "Éxito",
          description: "Cliente desasignado correctamente del administrador",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo desasignar el cliente del administrador",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al desasignar cliente:", error);
      toast({
        title: "Error",
        description: "No se pudo desasignar el cliente del administrador",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setConfirmUnassignment(null);
    }
  };

  // Verificar si el cliente está asignado a un administrador
  const isClientAssignedToAdmin = (adminId: number, clientId: number) => {
    return assignments.some(
      a => a.adminId === adminId && a.clientId === clientId
    );
  };

  // Obtener los clientes asignados a un administrador específico
  const getClientsAssignedToAdmin = (adminId: number) => {
    const assignedClientIds = assignments
      .filter(a => a.adminId === adminId)
      .map(a => a.clientId);
      
    return clients.filter(client => assignedClientIds.includes(client.id));
  };

  // Obtener los administradores asignados a un cliente específico
  const getAdminsAssignedToClient = (clientId: number) => {
    const assignedAdminIds = assignments
      .filter(a => a.clientId === clientId)
      .map(a => a.adminId);
      
    return admins.filter(admin => assignedAdminIds.includes(admin.id));
  };

  // Verificar permisos
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Requerir que sea superadmin
  if (!user || !(user.role === 'superadmin' || user.role === 'SUPERADMIN')) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Asignación de Clientes</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lista de Administradores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCog className="mr-2 h-5 w-5" />
                Administradores
              </CardTitle>
              <CardDescription>
                Seleccione un administrador para ver o asignar clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {admins.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No hay administradores disponibles
                    </div>
                  ) : (
                    admins.map(admin => (
                      <div 
                        key={admin.id}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${
                          selectedAdmin === admin.id 
                            ? 'bg-primary/10 border-l-4 border-primary' 
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => setSelectedAdmin(admin.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{admin.name}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mr-2">
                              {getClientsAssignedToAdmin(admin.id).length} clientes
                            </span>
                            <div className={`h-2 w-2 rounded-full ${
                              getClientsAssignedToAdmin(admin.id).length > 0 
                                ? 'bg-green-500' 
                                : 'bg-gray-300'
                            }`}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Lista de Clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Clientes
              </CardTitle>
              <CardDescription>
                {selectedAdmin 
                  ? `Clientes asignados al administrador: ${admins.find(a => a.id === selectedAdmin)?.name}`
                  : "Seleccione un administrador para ver sus clientes asignados"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedAdmin ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Seleccione un administrador de la lista para ver o asignar clientes
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {clients.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No hay clientes disponibles para asignar
                      </div>
                    ) : (
                      clients.map(client => {
                        const isAssigned = isClientAssignedToAdmin(selectedAdmin, client.id);
                        return (
                          <div key={client.id} className="p-3 rounded-md border border-border">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {client.taxId} {client.email && `• ${client.email}`}
                                </p>
                              </div>
                              
                              {isAssigned ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                                  onClick={() => setConfirmUnassignment({
                                    adminId: selectedAdmin,
                                    clientId: client.id
                                  })}
                                  disabled={actionLoading}
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  Desasignar
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700"
                                  onClick={() => setConfirmAssignment({
                                    adminId: selectedAdmin,
                                    clientId: client.id
                                  })}
                                  disabled={actionLoading}
                                >
                                  <LinkIcon className="h-4 w-4 mr-1" />
                                  Asignar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Diálogo de confirmación para asignar cliente */}
      <AlertDialog 
        open={!!confirmAssignment} 
        onOpenChange={(open) => !open && setConfirmAssignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar asignación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea asignar este cliente al administrador seleccionado?
              {confirmAssignment && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p><span className="font-medium">Cliente:</span> {clients.find(c => c.id === confirmAssignment.clientId)?.name}</p>
                  <p><span className="font-medium">Administrador:</span> {admins.find(a => a.id === confirmAssignment.adminId)?.name}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                if (confirmAssignment) {
                  handleAssignClient(confirmAssignment.adminId, confirmAssignment.clientId);
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación para desasignar cliente */}
      <AlertDialog 
        open={!!confirmUnassignment} 
        onOpenChange={(open) => !open && setConfirmUnassignment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desasignación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la asignación de este cliente al administrador?
              {confirmUnassignment && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p><span className="font-medium">Cliente:</span> {clients.find(c => c.id === confirmUnassignment.clientId)?.name}</p>
                  <p><span className="font-medium">Administrador:</span> {admins.find(a => a.id === confirmUnassignment.adminId)?.name}</p>
                </div>
              )}
              <div className="mt-3 flex items-center text-amber-600 bg-amber-50 p-2 rounded-md">
                <CircleAlert className="h-4 w-4 mr-2" />
                <span className="text-sm">El administrador ya no podrá acceder al libro de registros de este cliente.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (confirmUnassignment) {
                  handleUnassignClient(confirmUnassignment.adminId, confirmUnassignment.clientId);
                }
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
              Desasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}