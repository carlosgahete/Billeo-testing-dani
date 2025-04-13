import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { generateQuotePDF } from "@/lib/pdf";
import { SendQuoteEmailDialog } from "./SendQuoteEmailDialog";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Pencil, Trash2, Download, FileText, Send, FileCheck, XCircle, Mail, CheckCircle, FileEdit, Clock, HelpCircle, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";

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
  filter?: string | null;
}

export function QuoteList({ userId, showActions = true, limit, filter }: QuoteListProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [convertAlertOpen, setConvertAlertOpen] = useState(false);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);

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
      
      // Redirigir a la sección de facturas
      setTimeout(() => {
        setLocation("/invoices");
      }, 500);
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
  
  // Reject quote mutation (changes status to rejected)
  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("PUT", `/api/quotes/${quoteId}`, {
        status: "rejected"
      });
      if (!res.ok) {
        throw new Error("Error rejecting quote");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Presupuesto rechazado",
        description: "El estado del presupuesto ha sido actualizado a 'rechazado'.",
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
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            <Badge variant="outline" className="font-normal text-slate-600 border-slate-200">
              Borrador
            </Badge>
          </div>
        );
      case "sent":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <Badge variant="secondary" className="font-normal text-blue-600 bg-blue-100">
              Enviado
            </Badge>
          </div>
        );
      case "accepted":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <Badge className="bg-green-100 text-green-600 hover:bg-green-200 font-normal">
              Aceptado
            </Badge>
          </div>
        );
      case "rejected":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <Badge variant="destructive" className="bg-red-100 text-red-600 hover:bg-red-200 font-normal">
              Rechazado
            </Badge>
          </div>
        );
      case "expired":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <Badge className="bg-amber-100 text-amber-600 hover:bg-amber-200 font-normal">
              Vencido
            </Badge>
          </div>
        );
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
  
  // Handle reject
  const handleReject = (quoteId: number) => {
    rejectQuoteMutation.mutate(quoteId);
  };
  
  // Handle email quote
  const handleEmailQuote = async (quote: Quote) => {
    try {
      // Buscar la información del cliente
      const client = clientsData.find((c: Client) => c.id === quote.clientId);
      if (!client) {
        toast({
          title: "Error",
          description: "No se pudo encontrar la información del cliente",
          variant: "destructive",
        });
        return;
      }
      
      // Obtener información completa del presupuesto y sus elementos
      const response = await apiRequest("GET", `/api/quotes/${quote.id}`);
      if (!response.ok) {
        throw new Error("Error al obtener los detalles del presupuesto");
      }
      
      const data = await response.json();
      
      // Obtener información de la empresa
      const companyResponse = await apiRequest("GET", "/api/company");
      if (!companyResponse.ok) {
        throw new Error("Error al obtener los datos de la empresa");
      }
      
      const companyData = await companyResponse.json();
      
      // Configurar los datos para el diálogo de envío de correo
      setSelectedQuote(quote);
      setSelectedClient(client);
      setQuoteItems(data.items || []);
      setSendEmailOpen(true);
      
    } catch (error: any) {
      console.error("Error preparando el envío de correo:", error);
      toast({
        title: "Error",
        description: `No se pudo preparar el envío: ${error.message}`,
        variant: "destructive",
      });
    }
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

  // Aplicar filtros a los presupuestos si se especifica
  let filteredQuotes = quotes;
  
  if (filter === "accepted") {
    filteredQuotes = quotes.filter(q => q.status === "accepted");
  } else if (filter === "pending") {
    filteredQuotes = quotes.filter(q => q.status === "draft" || q.status === "sent");
  }
  
  const displayQuotes = limit && typeof limit === 'number' ? filteredQuotes.slice(0, limit) : filteredQuotes;

  if (displayQuotes.length === 0) {
    let emptyMessage = "No has creado ningún presupuesto todavía. Presupuesta tus servicios antes de facturar.";
    let emptyTitle = "Sin presupuestos";
    
    // Mensaje personalizado según el filtro
    if (filter === "accepted") {
      emptyTitle = "Sin presupuestos aceptados";
      emptyMessage = "No tienes presupuestos que hayan sido aceptados por tus clientes.";
    } else if (filter === "pending") {
      emptyTitle = "Sin presupuestos pendientes";
      emptyMessage = "No tienes presupuestos en borrador o pendientes de respuesta.";
    }
    
    return (
      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Tus presupuestos</CardTitle>
          <CardDescription>
            {filter ? "Filtros aplicados" : "Empieza a crear presupuestos profesionales para tus clientes"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="text-center">
            <div className="bg-primary-50 p-4 rounded-full inline-block mb-4">
              <FileText className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">{emptyTitle}</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {emptyMessage}
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
      <div className="md:hidden px-1 pt-2">
        <h1 className="text-lg font-bold mb-3 pl-2">Presupuestos</h1>
      </div>
      
      <Card className="w-full border-none shadow-sm">
        <CardHeader className="pb-3 border-b px-2 sm:px-6 hidden md:block">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary-700">
                {filter === "accepted" 
                  ? "Presupuestos aceptados" 
                  : filter === "pending" 
                    ? "Presupuestos pendientes" 
                    : "Tus presupuestos"}
              </CardTitle>
              <CardDescription>
                {filter 
                  ? `Mostrando presupuestos ${filter === "accepted" ? "aceptados" : "pendientes"}` 
                  : "Listado completo de tus presupuestos emitidos. Puedes enviarlos a tus clientes, convertirlos en facturas o editarlos según tus necesidades."}
              </CardDescription>
            </div>
            <div className="hidden md:block">
              <div className="flex space-x-2">
                <Link href="/quotes/create">
                  <Button className="gap-1">
                    <span>+</span> Nuevo presupuesto
                  </Button>
                </Link>
                <Link href="/quotes/simple/create">
                  <Button variant="outline" className="gap-1">
                    <span>+</span> Versión simple
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-1 sm:px-6">
          {/* Tabla para vista de escritorio */}
          <div className="hidden md:block overflow-x-auto -mx-1 sm:mx-0">
            <Table className="w-full min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] md:w-[100px]">Núm.</TableHead>
                  <TableHead className="w-[120px] md:w-[180px]">Cliente</TableHead>
                  <TableHead className="hidden md:table-cell w-[120px]">Fecha</TableHead>
                  <TableHead className="hidden md:table-cell w-[120px]">Válido hasta</TableHead>
                  <TableHead className="w-[100px] md:w-[120px]">Total</TableHead>
                  <TableHead className="w-[80px] md:w-[120px]">Estado</TableHead>
                  {showActions && <TableHead className="text-right w-[120px] md:w-[200px]">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayQuotes.map((quote: Quote) => {
                  const client = clientsData.find((c: Client) => c.id === quote.clientId);
                  return (
                    <TableRow 
                      key={quote.id}
                      className={quote.status === "accepted" ? "bg-green-50" : 
                                quote.status === "rejected" ? "bg-red-50" : 
                                quote.status === "expired" ? "bg-gray-50" : ""}
                    >
                      <TableCell className="font-medium py-2 px-1 sm:px-4">{quote.quoteNumber}</TableCell>
                      <TableCell className="truncate max-w-[100px] md:max-w-[180px] py-2 px-1 sm:px-4">{client?.name || "Cliente no encontrado"}</TableCell>
                      <TableCell className="hidden md:table-cell py-2 px-4">{formatDate(quote.issueDate)}</TableCell>
                      <TableCell className="hidden md:table-cell py-2 px-4">{formatDate(quote.validUntil)}</TableCell>
                      <TableCell className="font-medium py-2 px-1 sm:px-4">{formatCurrency(quote.total)}</TableCell>
                      <TableCell className="py-2 px-1 sm:px-4">{getStatusBadge(quote.status)}</TableCell>
                      {showActions && (
                        <TableCell className="py-2 px-1 sm:px-4">
                          <div className="flex justify-end items-center gap-0.5 sm:gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownloadPDF(quote)}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-primary-50"
                                  >
                                    <Download className="h-4 w-4 text-primary-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Descargar PDF</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {quote.status === "draft" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSend(quote.id)}
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-blue-50"
                                    >
                                      <Send className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Enviar presupuesto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {quote.status === "sent" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleReject(quote.id)}
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-red-50"
                                    >
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Rechazar presupuesto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            {(quote.status === "sent" || quote.status === "accepted") && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleConvert(quote.id)}
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-green-50"
                                    >
                                      <FileCheck className="h-4 w-4 text-green-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Convertir a factura</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Link href={`/quotes/edit/${quote.id}`}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={quote.status === "accepted" || quote.status === "rejected"}
                                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-amber-50"
                                      >
                                        <Pencil className="h-4 w-4 text-amber-600" />
                                      </Button>
                                    </Link>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar presupuesto</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Botón de correo electrónico */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEmailQuote(quote)}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-blue-50"
                                  >
                                    <Mail className="h-4 w-4 text-blue-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Enviar por correo</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Botón de eliminar */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(quote.id)}
                                    disabled={quote.status === "accepted" || quote.status === "rejected"}
                                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Eliminar presupuesto</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Vista móvil súper simple */}
          <div className="md:hidden p-2 pb-16">
            {displayQuotes.length === 0 ? (
              <div className="text-center py-12">
                <p>No se encontraron presupuestos</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {displayQuotes.map((quote) => {
                  const client = clientsData?.find((c) => c.id === quote.clientId);
                  
                  // Texto para el estado
                  let statusText = "";
                  switch(quote.status) {
                    case 'accepted': statusText = "Aceptado"; break;
                    case 'draft': statusText = "Borrador"; break;
                    case 'sent': statusText = "Enviado"; break;
                    case 'rejected': statusText = "Rechazado"; break;
                    case 'expired': statusText = "Expirado"; break;
                    default: statusText = "Desconocido";
                  }
                  
                  return (
                    <div key={quote.id} className="bg-white p-4 border rounded-xl shadow-sm">
                      <div className="flex justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{quote.quoteNumber}</h3>
                          <p className="text-sm text-gray-600">{client?.name || "Cliente no encontrado"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(quote.total)}</p>
                          <p className="text-sm">{statusText}</p>
                        </div>
                      </div>
                      
                      {showActions && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <Link href={`/quotes/simple/edit/${quote.id}`}>
                            <Button size="sm" variant="outline">Editar</Button>
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
                            onClick={() => handleDownloadPDF(quote)}
                          >
                            PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Botón para crear nuevo */}
            {showActions && (
              <div className="fixed bottom-16 right-4">
                <Link href="/quotes/simple/create">
                  <Button className="rounded-full h-12 w-12 shadow-md">
                    +
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-6 border-t px-2 sm:px-6 hidden md:flex">
          {!showActions && limit && typeof limit === 'number' && displayQuotes.length >= limit && (
            <Link href="/quotes" className="ml-auto">
              <Button variant="outline">Ver todos</Button>
            </Link>
          )}
          {quotes.length > 0 && (
            <p className="text-muted-foreground text-sm ml-auto">
              Total: {quotes.length} presupuestos
            </p>
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
              ¿Deseas convertir este presupuesto en una factura? Se creará una nueva factura con todos los datos del presupuesto, incluyendo cliente, conceptos, importes e impuestos. Una vez convertido, serás redirigido a la sección de facturas para ver y gestionar la factura recién creada.
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
      
      {/* Diálogo para enviar correo electrónico */}
      {selectedQuote && selectedClient && (
        <SendQuoteEmailDialog
          open={sendEmailOpen}
          onOpenChange={setSendEmailOpen}
          quote={selectedQuote}
          client={selectedClient}
          quoteItems={quoteItems}
          companyInfo={null} // Se obtendrá dentro del componente
        />
      )}
    </>
  );
}