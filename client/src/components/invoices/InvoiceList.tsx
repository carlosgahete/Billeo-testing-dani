import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Plus, 
  FileDown, 
  CheckCircle, 
  DollarSign, 
  Check, 
  MoreVertical,
  Mail,
  FileCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateInvoicePDF } from "@/lib/pdf";
import { SendInvoiceEmailDialog } from "./SendInvoiceEmailDialog";

// Función de utilidad para forzar la actualización de datos
const forceDataRefresh = () => {
  console.log("🔄 Iniciando actualización completa de datos...");
  
  // Eliminación completa de datos en caché para forzar recargas frescas
  queryClient.removeQueries({ queryKey: ["/api/stats/dashboard"] });
  queryClient.removeQueries({ queryKey: ["/api/invoices"] });
  queryClient.removeQueries({ queryKey: ["/api/invoices/recent"] });
  
  // Invalidar todas las consultas relevantes
  queryClient.invalidateQueries();
  
  // Dar tiempo al backend para procesar la acción
  setTimeout(() => {
    // Hacer peticiones manuales para asegurar datos frescos
    fetch("/api/stats/dashboard?nocache=" + Date.now(), { 
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } 
    })
    .then(() => {
      console.log("⚡ Forzando recarga de datos:", new Date().toISOString());
      
      // Refrescar explícitamente todas las consultas relevantes
      queryClient.refetchQueries({ queryKey: ["/api/stats/dashboard"] });
      queryClient.refetchQueries({ queryKey: ["/api/invoices"] });
      queryClient.refetchQueries({ queryKey: ["/api/invoices/recent"] });
      
      // Refrescar nuevamente después de un tiempo adicional con mayor retraso
      setTimeout(() => {
        queryClient.invalidateQueries();
        queryClient.refetchQueries({ queryKey: ["/api/stats/dashboard"] });
        console.log("🔄 Segunda actualización de datos completada");
      }, 1000);
    })
    .catch(err => console.error("Error al recargar dashboard:", err));
  }, 300);
};

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "pending" | "paid" | "overdue" | "canceled";
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

interface Company {
  id: number;
  name: string;
  taxId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  logo?: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  // Estilo Apple: colores más sofisticados y badges más redondeados
  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { 
      label: "Pendiente", 
      className: "bg-amber-50 text-amber-600 border border-amber-200" 
    },
    paid: { 
      label: "Pagada", 
      className: "bg-green-50 text-green-600 border border-green-200" 
    },
    overdue: { 
      label: "Vencida", 
      className: "bg-red-50 text-red-600 border border-red-200" 
    },
    canceled: { 
      label: "Cancelada", 
      className: "bg-gray-50 text-gray-600 border border-gray-200" 
    },
  };

  const { label, className } = statusMap[status] || { 
    label: status, 
    className: "bg-gray-50 text-gray-600 border border-gray-200" 
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
};

const MarkAsPaidButton = ({ 
  invoice
}: { 
  invoice: Invoice
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  
  // Si la factura ya está pagada, no mostrar el botón
  if (invoice.status === 'paid') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" disabled className="text-green-600">
              <CheckCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Esta factura ya está marcada como pagada</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const handleMarkAsPaid = async () => {
    setIsPending(true);
    try {
      // Primero obtener los ítems actuales de la factura
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      const invoiceData = await response.json();
      
      // Actualizar el estado de la factura a "paid"
      await apiRequest("PUT", `/api/invoices/${invoice.id}`, {
        invoice: { status: "paid" },
        items: invoiceData?.items || [] // Mantener los items existentes
      });
      
      toast({
        title: "Factura marcada como pagada",
        description: `La factura ${invoice.invoiceNumber} ha sido marcada como pagada y se ha registrado en los ingresos totales.`,
      });
      
      // Usar un enfoque más seguro, dirigiendo directamente a la página de facturas
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo marcar la factura como pagada: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-green-600 hover:bg-green-50"
            onClick={handleMarkAsPaid}
            disabled={isPending}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Marcar como pagada</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const DeleteInvoiceDialog = ({ 
  invoiceId, 
  invoiceNumber, 
  onConfirm 
}: { 
  invoiceId: number; 
  invoiceNumber: string; 
  onConfirm: () => void; 
}) => {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      // Eliminar la factura
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      
      // Notificar al usuario
      toast({
        title: "Factura eliminada",
        description: `La factura ${invoiceNumber} ha sido eliminada con éxito`,
      });
      
      // Cerrar el diálogo
      onConfirm();
      
      // Redireccionar a la página de facturas
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo eliminar la factura: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="flex items-center justify-center w-8 h-8 p-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la factura {invoiceNumber} y no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const InvoiceList = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoicesData = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: clientsData = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  
  // Obtener información de la empresa para los PDFs y emails
  const { data: companyData } = useQuery<Company>({
    queryKey: ["/api/company"],
  });

  const handleExportInvoicePDF = async (invoice: Invoice) => {
    try {
      const client = clientsData?.find((c: Client) => c.id === invoice.clientId);
      
      if (!client) {
        toast({
          title: "Error",
          description: "No se pudo encontrar la información del cliente",
          variant: "destructive",
        });
        return;
      }
      
      // Get invoice items
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      const data = await response.json();
      
      await generateInvoicePDF(invoice, client, data.items);
      
      toast({
        title: "PDF generado",
        description: `La factura ${invoice.invoiceNumber} ha sido exportada a PDF`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo generar el PDF: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const getClientName = (clientId: number) => {
    if (!clientsData) return "Cargando...";
    const client = clientsData.find((c: Client) => c.id === clientId);
    return client ? client.name : "Cliente no encontrado";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };
  
  // Función para exportar todas las facturas a PDF
  const exportAllInvoices = async () => {
    try {
      toast({
        title: "Exportando facturas",
        description: "Preparando la exportación de todas las facturas...",
      });
      
      // Si hay muchas facturas, esto podría tomar tiempo
      for (const invoice of invoicesData || []) {
        const client = clientsData?.find((c: Client) => c.id === invoice.clientId);
        
        if (!client) continue;
        
        // Get invoice items
        const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
        const data = await response.json();
        
        await generateInvoicePDF(invoice, client, data.items);
      }
      
      toast({
        title: "Exportación completada",
        description: `Se han exportado ${invoicesData?.length || 0} facturas a PDF`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo completar la exportación: ${error.message}`,
        variant: "destructive",
      });
    }
  };
  
  // Función para manejar "Marcar como pagada" en el menú móvil
  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      // Primero obtener los ítems actuales de la factura
      const response = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      const invoiceData = await response.json();
      
      // Actualizar el estado de la factura a "paid"
      await apiRequest("PUT", `/api/invoices/${invoice.id}`, {
        invoice: { status: "paid" },
        items: invoiceData?.items || []
      });
      
      toast({
        title: "Factura marcada como pagada",
        description: `La factura ${invoice.invoiceNumber} ha sido marcada como pagada`,
      });
      
      // Redireccionar a la página de facturas
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo marcar la factura como pagada: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Nº",
      size: 60,
      cell: ({ row }) => (
        <div className="font-medium text-primary-600 px-3 py-3 text-sm">
          {row.getValue("invoiceNumber")}
        </div>
      ),
    },
    {
      accessorKey: "clientId",
      header: "Cliente",
      size: 180,
      cell: ({ row }) => (
        <div className="px-3 py-3 text-sm">
          {getClientName(row.getValue("clientId"))}
        </div>
      ),
    },
    {
      accessorKey: "issueDate",
      header: "Emisión",
      size: 100,
      cell: ({ row }) => (
        <div className="px-3 py-3 text-sm">
          {formatDate(row.getValue("issueDate"))}
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: "Venc.",
      size: 100,
      cell: ({ row }) => (
        <div className="px-3 py-3 text-sm">
          {formatDate(row.getValue("dueDate"))}
        </div>
      ),
    },
    {
      accessorKey: "subtotal",
      header: "Base",
      size: 100,
      cell: ({ row }) => (
        <div className="px-3 py-3 text-sm">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            useGrouping: true
          }).format(Number(row.getValue("subtotal")))}
        </div>
      ),
    },
    {
      accessorKey: "tax",
      header: "IVA",
      size: 80,
      cell: ({ row }) => (
        <div className="px-3 py-3 text-sm">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            useGrouping: true
          }).format(Number(row.getValue("tax")))}
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      size: 100,
      cell: ({ row }) => (
        <div className="font-medium px-3 py-3 text-sm">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0,
            useGrouping: true
          }).format(Number(row.getValue("total")))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      size: 100,
      cell: ({ row }) => (
        <div className="px-3 py-3">
          <StatusBadge status={row.getValue("status")} />
        </div>
      ),
    },
    {
      id: "actions",
      size: 170,
      cell: ({ row }) => {
        const invoice = row.original;
        
        return (
          <>
            {/* Versión móvil: Menú dropdown */}
            <div className="flex justify-end md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <Eye className="h-4 w-4 mr-2" /> Ver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/invoices/edit/${invoice.id}`)}>
                    <Edit className="h-4 w-4 mr-2" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportInvoicePDF(invoice)}>
                    <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      // Abrir el modal de enviar email (buscar y hacer clic en el diálogo)
                      const emailButton = document.querySelector(`[data-invoice-id="${invoice.id}"] button[aria-label="Enviar por email"]`);
                      if (emailButton) {
                        (emailButton as HTMLButtonElement).click();
                      }
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" /> Enviar por email
                  </DropdownMenuItem>
                  {invoice.status !== 'paid' && (
                    <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>
                      <Check className="h-4 w-4 mr-2" /> Marcar como pagada
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      // Modal de confirmación para eliminar
                      if (confirm(`¿Estás seguro de eliminar la factura ${invoice.invoiceNumber}?`)) {
                        apiRequest("DELETE", `/api/invoices/${invoice.id}`).then(() => {
                          toast({
                            title: "Factura eliminada",
                            description: `La factura ${invoice.invoiceNumber} ha sido eliminada con éxito`,
                          });
                          
                          // Redireccionar a la página de facturas
                          setTimeout(() => {
                            window.location.href = '/invoices';
                          }, 500);
                        });
                      }
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Versión desktop: Botones individuales */}
            <div className="hidden md:flex justify-end space-x-2" data-invoice-id={invoice.id}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ver detalles</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar factura</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExportInvoicePDF(invoice)}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Exportar PDF</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Botón para marcar factura como pagada */}
              <MarkAsPaidButton invoice={invoice} />
              
              {/* Botón para enviar factura por email */}
              {clientsData?.find(c => c.id === invoice.clientId) && (
                <SendInvoiceEmailDialog 
                  invoice={invoice} 
                  client={clientsData?.find(c => c.id === invoice.clientId) as Client}
                  company={companyData || null}
                />
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center">
                      <DeleteInvoiceDialog
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoiceNumber}
                        onConfirm={() => {
                          // Invalidar consultas después de eliminar
                          forceDataRefresh();
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Eliminar factura</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </>
        );
      },
    },
  ];

  if (invoicesLoading || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="w-full fade-in">
      {/* Encabezado estilo Apple */}
      <div className="glass-panel overflow-hidden rounded-3xl bg-gradient-to-r from-[#007AFF]/10 to-[#007AFF]/5 p-4 flex justify-between items-center mx-4 md:ml-0 mb-4 border border-[#007AFF]/20">
        <div className="flex items-center">
          <div className="bg-[#F0F7FF] p-2.5 rounded-full mr-3">
            <FileCheck className="h-4 w-4 text-[#007AFF]" />
          </div>
          <div>
            <h3 className="font-medium text-gray-800 mb-0.5">Facturas emitidas</h3>
            <p className="text-sm text-gray-500">
              {invoicesData?.length || 0} facturas en total
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="button-apple-secondary button-apple-sm flex items-center"
            onClick={exportAllInvoices}
          >
            <Download className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Exportar todo</span>
            <span className="sm:hidden">Exportar</span>
          </button>
          <button
            className="button-apple button-apple-sm flex items-center"
            onClick={() => navigate("/invoices/create")}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Nueva factura</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      <div className="glass-panel w-full overflow-auto rounded-2xl border border-gray-200/50 shadow-sm mx-4 md:ml-0 scale-in">
        <div className="min-w-full">
          <DataTable
            columns={columns}
            data={invoicesData || []}
            searchPlaceholder="Buscar facturas por número, cliente o fecha..."
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;