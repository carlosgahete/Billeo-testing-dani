import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

export default function SelectUserPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Consulta para obtener los usuarios
  const { data: users, isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Filtrar usuarios según el término de búsqueda
  const filteredUsers = users?.filter((user: any) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchTermLower) ||
      user.email.toLowerCase().includes(searchTermLower) ||
      user.username.toLowerCase().includes(searchTermLower)
    );
  });

  // Función para obtener las iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Función para seleccionar un usuario
  const selectUser = (userId: number) => {
    setLocation(`/admin/libro-registros/${userId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Seleccionar Cliente</CardTitle>
          <CardDescription>
            Selecciona un cliente para acceder a su Libro de Registros
          </CardDescription>
          
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o usuario..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              {filteredUsers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron clientes.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers?.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-md hover:bg-accent">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      
                      <Button onClick={() => selectUser(user.id)}>
                        Seleccionar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={() => setLocation('/dashboard')}>
            Cancelar
          </Button>
          <div className="text-sm text-muted-foreground">
            Se mostrarán todos los usuarios registrados en el sistema.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}