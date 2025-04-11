import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import billeoLogo from '../../assets/billeo-logo.png';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

export default function SelectUser() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/admin/users");
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
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

  const handleLoginAsUser = async (userId: number) => {
    try {
      setLoading(true);
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
        navigate("/");
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
      setLoading(false);
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <img src={billeoLogo} alt="Billeo Logo" className="h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Seleccione el usuario</h1>
            <p className="text-neutral-500">Elija la cuenta a la que desea acceder</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <Input
              placeholder="Buscar por nombre, usuario o email"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((userItem) => (
                  <Button
                    key={userItem.id}
                    variant="outline"
                    className="w-full justify-start p-3 h-auto"
                    onClick={() => handleLoginAsUser(userItem.id)}
                  >
                    <div className="flex items-center w-full">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={userItem.profileImage || undefined} alt={userItem.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {userItem.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{userItem.name}</span>
                        <span className="text-sm text-neutral-500">{userItem.email}</span>
                      </div>
                      <span 
                        className={`ml-auto text-xs px-2 py-1 rounded-full ${
                          userItem.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {userItem.role === 'admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  No se encontraron usuarios con ese criterio de búsqueda
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-neutral-200">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/admin/users")}
            >
              Ir a Gestión de Usuarios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}