import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  FilePlus, 
  FileText, 
  Filter, 
  Check, 
  X, 
  Calendar, 
  ArrowDown, 
  ArrowUp,
  Download,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Trash2
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  taxId?: string;
  email?: string;
}

interface Props {
  userId: number;
}

export function MinimalQuoteList({ userId }: Props) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch quotes
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Filtering quotes based on status
  const filteredQuotes = quotes.filter(quote => {
    if (statusFilter === "all") return true;
    return quote.status === statusFilter;
  });

  // Sorting quotes by date
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    const dateA = new Date(a.issueDate).getTime();
    const dateB = new Date(b.issueDate).getTime();
    return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
  });

  // Minimal formatters
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      return dateString;
    }
  };

  // Handle PDF generation
  const handlePdf = async (quoteId: number) => {
    try {
      window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
      toast({
        title: "Abriendo PDF",
        description: "El PDF se está generando y abrirá en una nueva pestaña"
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive"
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (quoteToDelete === null) return;
    
    try {
      await apiRequest("DELETE", `/api/quotes/${quoteToDelete}`);
      
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto ha sido eliminado correctamente"
      });
      
      // Refresh the quotes list
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto",
        variant: "destructive"
      });
    }
  };

  // Update quote status
  const updateQuoteStatus = async (quoteId: number, newStatus: string) => {
    try {
      // Get current quote data first
      const response = await apiRequest("GET", `/api/quotes/${quoteId}`);
      const quoteData = await response.json();
      
      // Update the status
      await apiRequest("PATCH", `/api/quotes/${quoteId}`, {
        ...quoteData,
        status: newStatus
      });
      
      // Show success message
      const statusLabels: Record<string, string> = {
        "accepted": "aceptado",
        "rejected": "rechazado",
        "sent": "marcado como enviado"
      };
      
      toast({
        title: "Estado actualizado",
        description: `El presupuesto ha sido ${statusLabels[newStatus] || newStatus}`
      });
      
      // Refresh the quotes list
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del presupuesto",
        variant: "destructive"
      });
    }
  };

  // Super simple status translation and styling
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "draft": 
        return { 
          label: "Borrador", 
          className: "bg-gray-100 text-gray-600",
          icon: <FileText className="h-3 w-3 mr-1" /> 
        };
      case "sent": 
        return { 
          label: "Enviado", 
          className: "bg-blue-100 text-blue-600",
          icon: <Send className="h-3 w-3 mr-1" /> 
        };
      case "accepted": 
        return { 
          label: "Aceptado", 
          className: "bg-green-100 text-green-600",
          icon: <CheckCircle className="h-3 w-3 mr-1" /> 
        };
      case "rejected": 
        return { 
          label: "Rechazado", 
          className: "bg-red-100 text-red-600",
          icon: <XCircle className="h-3 w-3 mr-1" /> 
        };
      case "expired": 
        return { 
          label: "Vencido", 
          className: "bg-amber-100 text-amber-600",
          icon: <Clock className="h-3 w-3 mr-1" /> 
        };
      default: 
        return { 
          label: status, 
          className: "bg-gray-100 text-gray-600",
          icon: <FileText className="h-3 w-3 mr-1" /> 
        };
    }
  };

  // Loading state
  if (quotesLoading || clientsLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="animate-pulse text-center">
          <div className="h-6 w-32 bg-gray-200 rounded mx-auto mb-4"></div>
          <div className="h-20 w-full bg-gray-200 rounded mb-3"></div>
          <div className="h-20 w-full bg-gray-200 rounded mb-3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20">
      {/* Header with filters */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Presupuestos</h1>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <Filter className="h-5 w-5" />
        </button>
      </div>
      
      {/* Filters section */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4 border">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Estado</label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borradores</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="accepted">Aceptados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Orden</label>
              <button
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center justify-between w-full px-3 h-9 rounded-md border text-sm"
              >
                <span>Fecha {sortOrder === "desc" ? "reciente" : "antigua"}</span>
                {sortOrder === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 mt-2">
            {sortedQuotes.length} presupuestos encontrados
          </div>
        </div>
      )}
      
      {/* Quotes list */}
      {sortedQuotes.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed">
          <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 mb-2">No hay presupuestos</p>
          <Link href="/quotes/simple/create">
            <Button size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Crear presupuesto
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedQuotes.map(quote => {
            const client = clients.find(c => c.id === quote.clientId);
            const statusInfo = getStatusInfo(quote.status);
            const issueDate = formatDate(quote.issueDate);
            const validUntil = formatDate(quote.validUntil);
            
            return (
              <li key={quote.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200/80">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-800">#{quote.quoteNumber}</h3>
                    <div className={`text-xs px-2 py-1 rounded-md ${statusInfo.className}`}>
                      {statusInfo.icon}
                      {statusInfo.label}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-1">
                    {client?.name || "Cliente desconocido"}
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-500 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {issueDate}
                    </div>
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(Number(quote.total))}
                    </div>
                  </div>
                  
                  {/* Acciones rápidas */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePdf(quote.id)}
                        className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-blue-600 transition-colors"
                        aria-label="Descargar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      {/* Botón para cambiar estado */}
                      {quote.status !== "accepted" && (
                        <button
                          onClick={() => updateQuoteStatus(quote.id, "accepted")}
                          className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-green-600 transition-colors"
                          aria-label="Aceptar presupuesto"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      
                      {quote.status !== "sent" && quote.status !== "accepted" && (
                        <button
                          onClick={() => updateQuoteStatus(quote.id, "sent")}
                          className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-blue-600 transition-colors"
                          aria-label="Marcar como enviado"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/quotes/simple/edit/${quote.id}`}>
                        <button
                          className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-blue-600 transition-colors"
                          aria-label="Editar presupuesto"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      </Link>
                      
                      <button
                        onClick={() => {
                          setQuoteToDelete(quote.id);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-red-600 transition-colors"
                        aria-label="Eliminar presupuesto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      
      {/* Floating action button */}
      <div className="fixed bottom-20 right-6">
        <Link href="/quotes/simple/create">
          <Button className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      </div>
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar presupuesto</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este presupuesto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}