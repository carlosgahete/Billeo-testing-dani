import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { generateQuotePDF } from "@/lib/pdf";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Trash2, Download, FileText, Send, FileCheck } from "lucide-react";
import { Link } from "wouter";

interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  notes?: string;
  attachments?: string[];
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
}

interface QuoteListProps {
  userId: number;
  showActions?: boolean;
  limit?: number;
}

export function QuoteList({ userId, showActions = true, limit }: QuoteListProps) {
  const { toast } = useToast();
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [convertAlertOpen, setConvertAlertOpen] = useState(false);

  // Fetch quotes
  const { data: quotes = [], isLoading: isQuotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch clients
  const { data: clientsData = [], isLoading: isClientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("DELETE", `/api/quotes/${quoteId}`);
      if (!res.ok) {
        throw new Error("Error deleting quote");
      }
      return quoteId;
    },
    onSuccess: () => {
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto ha sido eliminado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Convert quote to invoice mutation
  const convertQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/convert`);
      if (!res.ok) {
        throw new Error("Error converting quote to invoice");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Presupuesto convertido",
        description: "El presupuesto ha sido convertido a factura correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send quote mutation (changes status to sent)
  const sendQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("PUT", `/api/quotes/${quoteId}`, {
        status: "sent"
      });
      if (!res.ok) {
        throw new Error("Error sending quote");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Presupuesto enviado",
        description: "El estado del presupuesto ha sido actualizado a 'enviado'.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Format currency
  const formatCurrency = (amount: number | string) => {
    try {
      // Validar y convertir amount a un número válido
      let numericAmount = 0;
      
      if (typeof amount === 'string') {
        // Intentar convertir el string a número
        numericAmount = parseFloat(amount) || 0;
      } else if (typeof amount === 'number' && !isNaN(amount)) {
        // Si ya es un número, usarlo directamente
        numericAmount = amount;
      }
      
      // Validación final para asegurar que no es NaN
      if (isNaN(numericAmount)) {
        numericAmount = 0;
        console.warn("Se ha detectado un valor NaN en formatCurrency, usando 0 como fallback");
      }
      
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
      }).format(numericAmount);
    } catch (error) {
      console.error("Error en formatCurrency:", error);
      return "0,00 €"; // Valor por defecto en caso de error
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES").format(date);
  };

  // Get status color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Borrador</Badge>;
      case "sent":
        return <Badge variant="secondary">Enviado</Badge>;
      case "accepted":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Aceptado</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rechazado</Badge>;
      case "expired":
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Handle download PDF
  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const client = clientsData?.find((c: Client) => c.id === quote.clientId);
      
      if (!client) {
        toast({
          title: "Error",
          description: "No se pudo encontrar la información del cliente",
          variant: "destructive",
        });
        return;
      }
      
      // Get complete quote details including items and attachments
      const response = await apiRequest("GET", `/api/quotes/${quote.id}`);
      if (!response.ok) {
        throw new Error("Error al obtener los detalles del presupuesto");
      }
      
      const data = await response.json();
      
      // Crear un objeto de imagen para el logo si existe
      if (data.quote && data.quote.attachments && data.quote.attachments.length > 0) {
        const logoUrl = `${window.location.origin}${data.quote.attachments[0]}`;
        console.log("Logo URL para PDF:", logoUrl);
        
        try {
          // Crear un elemento de imagen y cargarlo
          const img = new Image();
          img.crossOrigin = "Anonymous";
          
          // Esperar a que se cargue la imagen
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoUrl;
          });
          
          console.log("Logo cargado correctamente para PDF");
        } catch (imgError) {
          console.error("Error precargando imagen:", imgError);
        }
      }
      
      // Generate and download PDF with complete data
      await generateQuotePDF(
        { ...quote, ...data.quote }, // Combinar propiedades para asegurar que los attachments estén incluidos
        client, 
        data.items
      );
      
      toast({
        title: "PDF generado",
        description: `El presupuesto ${quote.quoteNumber} ha sido exportado a PDF`,
      });
    } catch (error: any) {
      console.error("Error generando PDF:", error);
      toast({
        title: "Error",
        description: `No se pudo generar el PDF: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setDeleteAlertOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedQuoteId) {
      deleteQuoteMutation.mutate(selectedQuoteId);
      setDeleteAlertOpen(false);
      setSelectedQuoteId(null);
    }
  };

  // Handle convert
  const handleConvert = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setConvertAlertOpen(true);
  };

  // Confirm convert
  const confirmConvert = () => {
    if (selectedQuoteId) {
      convertQuoteMutation.mutate(selectedQuoteId);
      setConvertAlertOpen(false);
      setSelectedQuoteId(null);
    }
  };

  // Handle send
  const handleSend = (quoteId: number) => {
    sendQuoteMutation.mutate(quoteId);
  };

  if (isQuotesLoading || isClientsLoading) {
    return (
      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Tus presupuestos</CardTitle>
          <CardDescription>Cargando presupuestos...</CardDescription>
        </CardHeader>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-12 w-12 rounded-full border-4 border-primary-100 border-t-primary-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayQuotes = limit && typeof limit === 'number' ? quotes.slice(0, limit) : quotes;

  if (displayQuotes.length === 0) {
    return (
      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Tus presupuestos</CardTitle>
          <CardDescription>
            Empieza a crear presupuestos profesionales para tus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="text-center">
            <div className="bg-primary-50 p-4 rounded-full inline-block mb-4">
              <FileText className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">Sin presupuestos</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              No has creado ningún presupuesto todavía. Presupuesta tus servicios antes de facturar.
            </p>
            <Link href="/quotes/create">
              <Button className="px-8 shadow-sm">Crear presupuesto</Button>
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-2">
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Tus presupuestos</CardTitle>
          <CardDescription>
            Listado completo de tus presupuestos emitidos. Puedes enviarlos a tus clientes, convertirlos en facturas o editarlos según tus necesidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Válido hasta</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  {showActions && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayQuotes.map((quote: Quote) => {
                  const client = clientsData.find((c: Client) => c.id === quote.clientId);
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                      <TableCell>{client?.name || "Cliente no encontrado"}</TableCell>
                      <TableCell>{formatDate(quote.issueDate)}</TableCell>
                      <TableCell>{formatDate(quote.validUntil)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(quote.total)}</TableCell>
                      <TableCell>{getStatusBadge(quote.status)}</TableCell>
                      {showActions && (
                        <TableCell>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Descargar PDF"
                              onClick={() => handleDownloadPDF(quote)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {quote.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Enviar presupuesto"
                                onClick={() => handleSend(quote.id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {(quote.status === "sent" || quote.status === "accepted") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Convertir a factura"
                                onClick={() => handleConvert(quote.id)}
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Link href={`/quotes/edit/${quote.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar"
                                disabled={quote.status === "accepted" || quote.status === "rejected"}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              onClick={() => handleDelete(quote.id)}
                              disabled={quote.status === "accepted"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-6">
          {showActions && (
            <Link href="/quotes/create">
              <Button>Crear presupuesto</Button>
            </Link>
          )}
          {!showActions && limit && typeof limit === 'number' && displayQuotes.length >= limit && (
            <Link href="/quotes">
              <Button variant="outline">Ver todos los presupuestos</Button>
            </Link>
          )}
        </CardFooter>
      </Card>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El presupuesto será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertAlertOpen} onOpenChange={setConvertAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir a factura</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas convertir este presupuesto en una factura? Se creará una nueva factura con todos los datos del presupuesto, incluyendo cliente, conceptos, importes e impuestos. Esta es la manera más rápida de facturar un trabajo previamente presupuestado y aceptado por el cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert}>
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}