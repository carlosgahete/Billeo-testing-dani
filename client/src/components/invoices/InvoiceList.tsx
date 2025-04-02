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
  const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
    pending: { label: "Pendiente", variant: "secondary" },
    paid: { label: "Pagada", variant: "default" },
    overdue: { label: "Vencida", variant: "destructive" },
    canceled: { label: "Cancelada", variant: "outline" },
  };

  const { label, variant } = statusMap[status] || { label: status, variant: "default" };

  return <Badge variant={variant}>{label}</Badge>;
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
      
      // Método más radical: recargar la página completamente
      // Esto garantiza que todos los datos se vuelvan a cargar frescos desde el servidor
      setTimeout(() => {
        window.location.href = '/dashboard?refresh=' + Date.now();
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
      
      // Recargar para asegurar actualización completa
      setTimeout(() => {
        window.location.href = '/dashboard?refresh=' + Date.now();
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
        <Button variant="ghost" size="icon" className="text-gray-600 hover:text-red-600 hover:bg-red-50">
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
      
      // Usar el mismo método de actualización radical para ambas versiones (móvil y desktop)
      setTimeout(() => {
        window.location.href = '/dashboard?refresh=' + Date.now();
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
      header: "Nº Factura",
      cell: ({ row }) => (
        <div className="font-medium text-primary-600 px-2 py-3">
          {row.getValue("invoiceNumber")}
        </div>
      ),
    },
    {
      accessorKey: "clientId",
      header: () => <span className="hidden md:inline px-2">Cliente</span>,
      cell: ({ row }) => (
        <div className="hidden md:table-cell px-2 py-3">
          {getClientName(row.getValue("clientId"))}
        </div>
      ),
    },
    {
      accessorKey: "issueDate",
      header: () => <span className="hidden sm:inline px-2">Fecha emisión</span>,
      cell: ({ row }) => (
        <div className="hidden sm:table-cell px-2 py-3">
          {formatDate(row.getValue("issueDate"))}
        </div>
      ),
    },
    {
      accessorKey: "dueDate",
      header: () => <span className="hidden lg:inline px-2">Vencimiento</span>,
      cell: ({ row }) => (
        <div className="hidden lg:table-cell px-2 py-3">
          {formatDate(row.getValue("dueDate"))}
        </div>
      ),
    },
    {
      accessorKey: "subtotal",
      header: () => <span className="hidden lg:inline px-2">Base</span>,
      cell: ({ row }) => (
        <div className="hidden lg:table-cell px-2 py-3">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          }).format(Number(row.getValue("subtotal")))}
        </div>
      ),
    },
    {
      accessorKey: "tax",
      header: () => <span className="hidden xl:inline px-2">IVA</span>,
      cell: ({ row }) => (
        <div className="hidden xl:table-cell px-2 py-3">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          }).format(Number(row.getValue("tax")))}
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium px-2 py-3">
          {new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
            useGrouping: true
          }).format(Number(row.getValue("total")))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <div className="px-2 py-3">
          <StatusBadge status={row.getValue("status")} />
        </div>
      ),
    },
    {
      id: "actions",
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
                          
                          // Recargar completamente para garantizar actualización
                          setTimeout(() => {
                            window.location.href = '/dashboard?refresh=' + Date.now();
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
            <div className="hidden md:flex justify-end space-x-1" data-invoice-id={invoice.id}>
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
                    <div>
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
    <div className="w-full">
      {/* Encabezado de Facturas Emitidas con ambos botones a la derecha */}
      <div className="overflow-hidden rounded-xl bg-blue-600 text-white p-3 flex justify-between items-center mx-4 md:ml-0 mb-1">
        <div className="flex items-center">
          <FileCheck className="h-5 w-5 mr-2" />
          <h2 className="font-medium">Facturas emitidas</h2>
          <span className="ml-2 bg-white text-blue-600 text-xs font-semibold rounded-full px-2 py-0.5">
            {invoicesData?.length || 0} facturas
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="apple-style-secondary flex items-center mr-2"
            onClick={exportAllInvoices}
          >
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Exportar todo</span>
            <span className="sm:hidden">Exportar</span>
          </button>
          <button
            className="apple-style flex items-center"
            onClick={() => navigate("/invoices/create")}
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Nueva factura</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-blue-100 shadow-sm mx-4 md:ml-0">
        <DataTable
          columns={columns}
          data={invoicesData || []}
          searchPlaceholder="Buscar facturas por número, cliente o fecha..."
        />
      </div>
    </div>
  );
};

export default InvoiceList;