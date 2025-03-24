import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, Download, Plus, FileDown, CheckCircle, DollarSign } from "lucide-react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { generateInvoicePDF } from "@/lib/pdf";

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
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" | "secondary" }> = {
    pending: { label: "Pendiente", variant: "warning" },
    paid: { label: "Pagada", variant: "success" },
    overdue: { label: "Vencida", variant: "destructive" },
    canceled: { label: "Cancelada", variant: "outline" },
  };

  const { label, variant } = statusMap[status] || { label: status, variant: "default" };

  return <Badge variant={variant}>{label}</Badge>;
};

// Componente para marcar una factura como pagada
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
      // Actualizar el estado de la factura a "paid"
      await apiRequest("PUT", `/api/invoices/${invoice.id}`, {
        status: "paid"
      });
      
      toast({
        title: "Factura marcada como pagada",
        description: `La factura ${invoice.invoiceNumber} ha sido marcada como pagada y se ha registrado en los ingresos totales.`,
      });
      
      // Invalidar las consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
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
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      toast({
        title: "Factura eliminada",
        description: `La factura ${invoiceNumber} ha sido eliminada con éxito`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      onConfirm();
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
        <Button variant="ghost" size="icon">
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

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
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
      const { data } = await apiRequest("GET", `/api/invoices/${invoice.id}`);
      
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

  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Nº Factura",
      cell: ({ row }) => (
        <div className="font-medium text-primary-600">
          {row.getValue("invoiceNumber")}
        </div>
      ),
    },
    {
      accessorKey: "clientId",
      header: "Cliente",
      cell: ({ row }) => getClientName(row.getValue("clientId")),
    },
    {
      accessorKey: "issueDate",
      header: "Fecha emisión",
      cell: ({ row }) => formatDate(row.getValue("issueDate")),
    },
    {
      accessorKey: "dueDate",
      header: "Vencimiento",
      cell: ({ row }) => formatDate(row.getValue("dueDate")),
    },
    {
      accessorKey: "subtotal",
      header: "Base",
      cell: ({ row }) => `${Number(row.getValue("subtotal")).toFixed(2)} €`,
    },
    {
      accessorKey: "tax",
      header: "IVA",
      cell: ({ row }) => `${Number(row.getValue("tax")).toFixed(2)} €`,
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => (
        <div className="font-medium">
          {Number(row.getValue("total")).toFixed(2)} €
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const invoice = row.original;
        
        return (
          <div className="flex justify-end space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/invoices/${invoice.id}?edit=true`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleExportInvoicePDF(invoice)}
            >
              <FileDown className="h-4 w-4" />
            </Button>
            {/* Botón para marcar factura como pagada */}
            <MarkAsPaidButton invoice={invoice} />
            <DeleteInvoiceDialog
              invoiceId={invoice.id}
              invoiceNumber={invoice.invoiceNumber}
              onConfirm={() => {
                // Invalidate queries after deletion
                queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
              }}
            />
          </div>
        );
      },
    },
  ];

  if (invoicesLoading || clientsLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            Gestión de Facturas
          </h1>
          <p className="text-neutral-500">
            Crea, edita y gestiona todas tus facturas en un solo lugar.
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            className="flex items-center"
            onClick={() => navigate("/invoices/create")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva factura
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoicesData || []}
        searchPlaceholder="Buscar facturas..."
      />
    </div>
  );
};

export default InvoiceList;
