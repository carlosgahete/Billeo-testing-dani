import React, { useState } from "react";

// DeleteQuoteDialog component
const DeleteQuoteDialog = ({ 
  quoteId, 
  quoteNumber, 
  onConfirm 
}: { 
  quoteId: number; 
  quoteNumber: string; 
  onConfirm: () => void; 
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      // Eliminar el presupuesto
      await apiRequest("DELETE", `/api/quotes/${quoteId}`);
      
      // Notificar al usuario
      toast({
        title: "Presupuesto eliminado",
        description: `El presupuesto ${quoteNumber} ha sido eliminado con éxito`,
      });
      
      // Cerrar el diálogo y actualizar datos
      onConfirm();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar el presupuesto: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-red-600 transition-colors"
          aria-label="Eliminar presupuesto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar presupuesto</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que quieres eliminar el presupuesto {quoteNumber}? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  // Estados para filtrado, ordenación y búsqueda
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filtering quotes based on status and search query
  const filteredQuotes = quotes.filter(quote => {
    // Filtro por estado
    if (statusFilter !== "all" && quote.status !== statusFilter) {
      return false;
    }
    
    // Filtro por texto de búsqueda
    if (searchQuery.trim() !== "") {
      const client = clients.find(c => c.id === quote.clientId);
      const searchLower = searchQuery.toLowerCase();
      
      // Buscar en número de presupuesto
      if (quote.quoteNumber.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Buscar en nombre de cliente
      if (client?.name?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Buscar en fecha
      if (new Date(quote.issueDate).toLocaleDateString("es-ES").includes(searchLower)) {
        return true;
      }
      
      // Si no coincide con ningún criterio de búsqueda
      return false;
    }
    
    return true;
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
  
  // Handle summary download - Generamos un PDF con los datos actuales
  const handleDownloadSummary = async () => {
    try {
      // Mostrar notificación de que se está generando el resumen
      toast({
        title: "Generando informe",
        description: "Estamos preparando el informe de presupuestos"
      });
      
      // Generar un reporte simple cliente-side
      // Obtener fecha actual formateada
      const today = new Date();
      const dateStr = today.toLocaleDateString('es-ES');
      
      // Crear iframe temporal para impresión o generar PDF con browser
      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      document.body.appendChild(printFrame);
      
      // Crear contenido HTML para el reporte
      let reportHTML = `
        <html>
        <head>
          <title>Resumen de Presupuestos - ${dateStr}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { color: #2563eb; text-align: center; }
            .date { text-align: center; margin-bottom: 30px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f1f5f9; text-align: left; padding: 10px; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .summary { margin-top: 30px; border-top: 2px solid #2563eb; padding-top: 20px; }
            .total { font-weight: bold; color: #2563eb; }
            .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .status-draft { background-color: #f1f5f9; color: #64748b; }
            .status-sent { background-color: #dbeafe; color: #2563eb; }
            .status-accepted { background-color: #dcfce7; color: #16a34a; }
            .status-rejected { background-color: #fee2e2; color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Resumen de Presupuestos</h1>
          <div class="date">Generado el ${dateStr}</div>
          
          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      // Añadir filas con los datos de los presupuestos
      let totalAmount = 0;
      let countByStatus = {
        draft: 0,
        sent: 0,
        accepted: 0,
        rejected: 0
      };
      
      // Función para obtener clase de estado
      const getStatusClass = (status) => {
        switch(status) {
          case 'draft': return 'status-draft';
          case 'sent': return 'status-sent';
          case 'accepted': return 'status-accepted';
          case 'rejected': return 'status-rejected';
          default: return 'status-draft';
        }
      };
      
      // Función para obtener texto de estado
      const getStatusText = (status) => {
        switch(status) {
          case 'draft': return 'Borrador';
          case 'sent': return 'Enviado';
          case 'accepted': return 'Aceptado';
          case 'rejected': return 'Rechazado';
          default: return status;
        }
      };
      
      // Añadir filas de datos
      sortedQuotes.forEach(quote => {
        const client = clients.find(c => c.id === quote.clientId) || { name: 'Cliente desconocido' };
        const dateFormatted = formatDate(quote.issueDate);
        const statusText = getStatusText(quote.status);
        const statusClass = getStatusClass(quote.status);
        
        // Contabilizar por estado
        if (countByStatus.hasOwnProperty(quote.status)) {
          countByStatus[quote.status]++;
        }
        
        // Sumar al total
        totalAmount += Number(quote.total);
        
        reportHTML += `
          <tr>
            <td>${quote.quoteNumber}</td>
            <td>${client.name}</td>
            <td>${dateFormatted}</td>
            <td><span class="status ${statusClass}">${statusText}</span></td>
            <td>${formatCurrency(Number(quote.total))}</td>
          </tr>
        `;
      });
      
      // Añadir resumen
      reportHTML += `
            </tbody>
          </table>
          
          <div class="summary">
            <p><strong>Total Presupuestos:</strong> ${sortedQuotes.length}</p>
            <p><strong>Borradores:</strong> ${countByStatus.draft}</p>
            <p><strong>Enviados:</strong> ${countByStatus.sent}</p>
            <p><strong>Aceptados:</strong> ${countByStatus.accepted}</p>
            <p><strong>Rechazados:</strong> ${countByStatus.rejected}</p>
            <p class="total"><strong>Valor total:</strong> ${formatCurrency(totalAmount)}</p>
          </div>
        </body>
        </html>
      `;
      
      // Escribir HTML en el iframe y mandar a imprimir
      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();
      frameDoc.write(reportHTML);
      frameDoc.close();
      
      // Esperar un momento para que se cargue el contenido
      setTimeout(() => {
        printFrame.contentWindow.print();
        // Eliminar el iframe después de imprimir
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 500);
      
    } catch (error) {
      console.error("Error al generar informe:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el informe de presupuestos",
        variant: "destructive"
      });
    }
  };

  // PDF and status update functions

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
    <div className="pb-32 overflow-y-auto min-h-full h-full -mt-16 max-w-md mx-auto">
      {/* Componente de filtro de presupuestos */}
      <div className="px-4">
        {/* Botones superiores - Nuevo y Descargar Resumen */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Link href="/quotes/simple/create" className="w-full">
            <Button 
              size="sm" 
              variant="default" 
              className="flex items-center justify-center gap-1 w-full bg-[#007AFF] hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </Link>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center justify-center gap-1 w-full border-[#007AFF] text-[#007AFF] hover:bg-blue-50"
            onClick={() => handleDownloadSummary()}
          >
            <Download className="h-4 w-4" />
            Descargar resumen
          </Button>
        </div>
        
        {/* 1. Barra de búsqueda estilo iOS */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full px-10 py-2 search-field-apple text-sm rounded-xl bg-[#F7F9FA] border-0 text-[#8A8F98]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          </div>
          {searchQuery && (
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* 2. Botones de filtro de estado */}
        <div className="w-full bg-gray-100 p-1 rounded-lg flex mb-4">
          <button 
            onClick={() => setStatusFilter('all')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors text-center ${statusFilter === 'all' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setStatusFilter('draft')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors text-center ${statusFilter === 'draft' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
          >
            Borradores
          </button>
          <button 
            onClick={() => setStatusFilter('sent')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors text-center ${statusFilter === 'sent' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
          >
            Enviados
          </button>
          <button 
            onClick={() => setStatusFilter('accepted')} 
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors text-center ${statusFilter === 'accepted' ? 'bg-white shadow-sm text-[#007AFF]' : 'text-gray-600'}`}
          >
            Aceptados
          </button>
        </div>
      </div>
      
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
        <ul className="space-y-2 px-4">
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
                      
                      <DeleteQuoteDialog
                        quoteId={quote.id}
                        quoteNumber={quote.quoteNumber}
                        onConfirm={() => queryClient.invalidateQueries({ queryKey: ["/api/quotes"] })}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      
      {/* Eliminamos el botón flotante ya que ahora tenemos el botón "Nuevo" arriba */}
      

    </div>
  );
}