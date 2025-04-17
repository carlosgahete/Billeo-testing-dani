import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2, Edit, Trash2, UserCheck, UserPlus, ShieldCheck, User as UserIcon, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

export default function UsersManagement() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [confirmPromoteUser, setConfirmPromoteUser] = useState<number | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    name: "",
    lastName: "",
    email: "",
    password: "",
    role: "user",
    businessType: "autonomo"
  });
  
  // Verificar si el usuario actual es superadmin
  const isSuperAdmin = user && (
    user.role === 'superadmin' || 
    user.role === 'SUPERADMIN' || 
    user.role === 'Superadmin' || 
    user.username === 'Superadmin' ||
    user.username === 'billeo_admin' ||
    user.role.toLowerCase() === 'superadmin' ||
    user.username.toLowerCase() === 'billeo_admin'
  );
  
  // Para debugging
  console.log("Usuario actual:", user);
  console.log("Es superadmin:", isSuperAdmin);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/admin/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      setActionLoading(true);
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      
      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Usuario eliminado correctamente",
        });
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo eliminar el usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setConfirmDeleteUser(null);
    }
  };

  const handleLoginAsUser = async (userId: number) => {
    try {
      setActionLoading(true);
      const response = await apiRequest("POST", `/api/admin/login-as/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Éxito",
          description: `Sesión iniciada como ${data.user.name}`,
        });
        
        // Actualizar el usuario en la caché de react-query
        queryClient.setQueryData(["/api/user"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        window.location.href = "/"; // Redireccionar al inicio
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo iniciar sesión como usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo iniciar sesión como usuario",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    
    try {
      setActionLoading(true);
      const { id, username, name, email, role } = editUser;
      const response = await apiRequest("PUT", `/api/admin/users/${id}`, {
        username, name, email, role
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => u.id === id ? updatedUser : u));
        toast({
          title: "Éxito",
          description: "Usuario actualizado correctamente",
        });
        setEditUser(null);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo actualizar el usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Función para promover a un usuario a superadmin
  // Función para cambiar el rol de un usuario
  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      setActionLoading(true);
      
      if (newRole === 'superadmin') {
        // Si el nuevo rol es superadmin, usar la ruta específica
        const response = await apiRequest("POST", `/api/admin/users/${userId}/promote-to-superadmin`);
        
        if (response.ok) {
          const data = await response.json();
          // Actualizar la lista de usuarios
          setUsers(users.map(u => u.id === userId ? data.user : u));
          toast({
            title: "Éxito",
            description: `Usuario promovido a superadmin correctamente`,
          });
          setConfirmPromoteUser(null);
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "No se pudo promover al usuario a superadmin",
            variant: "destructive",
          });
        }
      } else {
        // Para otros roles, actualizar normalmente
        const response = await apiRequest("PUT", `/api/admin/users/${userId}`, {
          role: newRole
        });
        
        if (response.ok) {
          const updatedUser = await response.json();
          setUsers(users.map(u => u.id === userId ? updatedUser : u));
          toast({
            title: "Éxito",
            description: `Rol del usuario actualizado a ${newRole} correctamente`,
          });
        } else {
          const errorData = await response.json();
          toast({
            title: "Error",
            description: errorData.message || "No se pudo actualizar el rol del usuario",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Para mantener compatibilidad con el código existente
  const handlePromoteToSuperAdmin = (userId: number) => {
    handleChangeRole(userId, 'superadmin');
  };

  const handleCreateUser = async () => {
    try {
      setActionLoading(true);
      // Combinamos el nombre y apellido en un solo campo name
      const userData = {
        ...newUser,
        name: newUser.name + (newUser.lastName ? " " + newUser.lastName : "")
      };
      const response = await apiRequest("POST", "/api/admin/users", userData);
      
      if (response.ok) {
        const createdUser = await response.json();
        setUsers([...users, createdUser]);
        toast({
          title: "Éxito",
          description: "Usuario creado correctamente",
        });
        setShowCreateDialog(false);
        setNewUser({
          username: "",
          name: "",
          lastName: "",
          email: "",
          password: "",
          role: "user",
          businessType: "autonomo"
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "No se pudo crear el usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el usuario",
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

  // Permitir acceso a usuarios admin, superadmin o billeo_admin
  if (!user || (
    user.role !== "admin" && 
    user.role !== "superadmin" && 
    user.role !== "SUPERADMIN" && 
    user.username !== "Superadmin" && 
    user.username !== "billeo_admin"
  )) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableCaption>Lista de usuarios del sistema</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                    (user.role === 'superadmin' || user.role === 'SUPERADMIN' || user.username === 'Superadmin' || user.username === 'billeo_admin') ? 'bg-amber-100 text-amber-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrador' : 
                     (user.role === 'superadmin' || user.role === 'SUPERADMIN' || user.username === 'Superadmin' || user.username === 'billeo_admin') ? 'Superadmin' : 
                     'Usuario'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditUser(user)}
                      title="Editar usuario"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleLoginAsUser(user.id)}
                      disabled={actionLoading}
                      title="Iniciar sesión como este usuario"
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setConfirmDeleteUser(user.id)}
                      disabled={actionLoading}
                      title="Eliminar usuario"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    {/* Dropdown para cambiar rol del usuario */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={actionLoading}
                          title="Configurar rol de usuario"
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <UserCog className="h-4 w-4 text-blue-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(user.id, 'user')}
                          disabled={user.role === 'user'}
                          className={user.role === 'user' ? 'bg-blue-50 font-semibold' : ''}
                        >
                          <UserIcon className="mr-2 h-4 w-4" /> Usuario
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(user.id, 'admin')}
                          disabled={user.role === 'admin'}
                          className={user.role === 'admin' ? 'bg-red-50 font-semibold' : ''}
                        >
                          <UserCog className="mr-2 h-4 w-4" /> Administrador
                        </DropdownMenuItem>
                        {/* Solo superadmins pueden promover a otros usuarios a superadmin */}
                        {isSuperAdmin && (
                          <DropdownMenuItem
                            onClick={() => setConfirmPromoteUser(user.id)}
                            disabled={user.role === 'superadmin' || user.role === 'SUPERADMIN' || user.username === 'Superadmin' || user.username === 'billeo_admin'}
                            className={(user.role === 'superadmin' || user.role === 'SUPERADMIN' || user.username === 'Superadmin' || user.username === 'billeo_admin') ? 'bg-amber-50 font-semibold' : ''}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4" /> Superadmin
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Dialog para editar usuario */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario. El cambio se reflejará inmediatamente.
            </DialogDescription>
          </DialogHeader>
          
          {editUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="name"
                  value={editUser.name}
                  onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Usuario
                </Label>
                <Input
                  id="username"
                  value={editUser.username}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Rol
                </Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({...editUser, role: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    {isSuperAdmin && (
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditUser(null)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateUser} 
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
        open={!!confirmDeleteUser} 
        onOpenChange={(open) => !open && setConfirmDeleteUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este usuario
              y toda su información del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteUser && handleDeleteUser(confirmDeleteUser)}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para crear usuario */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Ingresa los datos para crear un nuevo usuario en el sistema.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="new-name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-lastName" className="text-right">
                Apellido
              </Label>
              <Input
                id="new-lastName"
                value={newUser.lastName}
                onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-username" className="text-right">
                Usuario
              </Label>
              <Input
                id="new-username"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-email" className="text-right">
                Email
              </Label>
              <Input
                id="new-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                Contraseña
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-role" className="text-right">
                Rol
              </Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
              >
                <SelectTrigger id="new-role" className="col-span-3">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  {/* Siempre mostrar la opción Superadmin */}
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Solo mostrar tipo de negocio para usuarios normales, no para administradores */}
            {newUser.role === 'user' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-business-type" className="text-right">
                  Tipo de negocio
                </Label>
                <RadioGroup
                  id="new-business-type"
                  value={newUser.businessType}
                  onValueChange={(value) => setNewUser({...newUser, businessType: value})}
                  className="flex col-span-3 space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="autonomo" id="create-autonomo" />
                    <Label htmlFor="create-autonomo" className="font-normal">Autónomo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="empresa" id="create-empresa" />
                    <Label htmlFor="create-empresa" className="font-normal">Empresa</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={actionLoading || !newUser.username || !newUser.password}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar promoción a superadmin */}
      <AlertDialog 
        open={!!confirmPromoteUser} 
        onOpenChange={(open) => !open && setConfirmPromoteUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover a Superadmin</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas promover a este usuario a Superadministrador?
              <p className="mt-2 font-semibold text-amber-700">
                Los Superadministradores tienen acceso total al sistema y pueden gestionar
                a otros usuarios, incluyendo promover a otros a Superadministradores.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmPromoteUser && handlePromoteToSuperAdmin(confirmPromoteUser)}
              disabled={actionLoading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Promover a Superadmin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}