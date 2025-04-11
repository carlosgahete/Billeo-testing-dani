import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Cliente {
  id: number;
  name: string;
  email: string;
}

export default function SelectUserPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Error al obtener usuarios");
      }
      return response.json();
    },
  });

  const filteredClientes = clientes?.filter((cliente: Cliente) => 
    cliente.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectClient = (clienteId: number) => {
    setLocation(`/admin/libro-registros/${clienteId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="w-full border border-gray-200 bg-white/50 backdrop-blur-md shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-t-lg">
          <CardTitle className="text-xl font-bold text-center text-gray-800">
            Seleccionar Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 relative">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-300px)] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClientes?.length > 0 ? (
                filteredClientes.map((cliente: Cliente) => (
                  <Card 
                    key={cliente.id}
                    className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer"
                    onClick={() => handleSelectClient(cliente.id)}
                  >
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {cliente.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {cliente.email}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        Ver
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-gray-500">
                  No se encontraron clientes con esos criterios
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}