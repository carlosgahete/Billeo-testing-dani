import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}

interface Client {
  id: number;
  name: string;
}

interface Props {
  userId: number;
}

export function MinimalQuoteList({ userId }: Props) {
  // Fetch quotes
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Minimal formatters
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Handle PDF generation
  const handlePdf = async (quoteId: number) => {
    try {
      window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
    } catch (error) {
      console.error("Error al generar PDF:", error);
    }
  };

  // Handle delete
  const handleDelete = async (quoteId: number) => {
    if (!confirm("¿Seguro que quieres borrar este presupuesto?")) return;
    
    try {
      await apiRequest("DELETE", `/api/quotes/${quoteId}`);
      window.location.reload();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("No se pudo eliminar el presupuesto");
    }
  };

  // Super simple status translation
  const getStatus = (status: string) => {
    switch (status) {
      case "draft": return "Borrador";
      case "sent": return "Enviado";
      case "accepted": return "Aceptado";
      case "rejected": return "Rechazado";
      case "expired": return "Vencido";
      default: return status;
    }
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">Presupuestos</h1>
      
      {quotes.length === 0 ? (
        <p className="text-center py-6">No hay presupuestos</p>
      ) : (
        <div className="space-y-3">
          {quotes.map(quote => {
            const client = clients.find(c => c.id === quote.clientId);
            
            return (
              <div key={quote.id} className="bg-white border rounded-lg p-3">
                <div className="flex justify-between mb-2">
                  <div>
                    <div className="font-medium">{quote.quoteNumber}</div>
                    <div className="text-sm text-gray-500">{client?.name || "Cliente desconocido"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatCurrency(quote.total)}</div>
                    <div className="text-sm text-gray-500">{getStatus(quote.status)}</div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Link href={`/quotes/simple/edit/${quote.id}`} className="flex-1">
                    <Button size="sm" className="w-full">Editar</Button>
                  </Link>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDelete(quote.id)}
                  >
                    Eliminar
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handlePdf(quote.id)}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="fixed bottom-20 right-6">
        <Link href="/quotes/simple/create">
          <Button className="h-14 w-14 rounded-full shadow-lg">+</Button>
        </Link>
      </div>
    </div>
  );
}