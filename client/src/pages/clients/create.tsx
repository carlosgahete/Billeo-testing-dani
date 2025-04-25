import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientForm } from "@/components/clients/ClientForm";
import { useToast } from "@/hooks/use-toast";

export default function CreateClientPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(true);

  // Función para manejar el cliente creado
  const handleClientCreated = (client: any) => {
    toast({
      title: "Cliente creado",
      description: "El cliente ha sido creado correctamente",
    });

    // Redirigir a la lista de clientes después de crear
    setTimeout(() => {
      navigate("/clients");
    }, 500);
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo cliente</CardTitle>
          <CardDescription>
            Añade un nuevo cliente a tu base de datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            open={showForm}
            onOpenChange={(open) => {
              setShowForm(open);
              if (!open) {
                // Si se cierra el formulario sin guardar, redirigir a la lista de clientes
                navigate("/clients");
              }
            }}
            onClientCreated={handleClientCreated}
            clientToEdit={null}
          />
        </CardContent>
      </Card>
    </div>
  );
}