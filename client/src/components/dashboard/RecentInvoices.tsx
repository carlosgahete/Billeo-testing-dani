import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  total: number;
  status: "pending" | "paid" | "overdue" | "canceled";
}

interface Client {
  id: number;
  name: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  // Definir los tipos de variantes disponibles basados en los que Badge acepta
  const statusMap: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
    pending: { label: "Pendiente", variant: "default" },
    paid: { label: "Pagada", variant: "outline" },
    overdue: { label: "Vencida", variant: "destructive" },
    canceled: { label: "Cancelada", variant: "secondary" },
  };

  const { label, variant } = statusMap[status] || { label: status, variant: "default" };

  // Aplicar clases personalizadas para manejar colores específicos
  const badgeClasses = status === 'paid' ? "border-green-500 text-green-600 bg-green-50" : "";

  return <Badge variant={variant} className={badgeClasses}>{label}</Badge>;
};

const RecentInvoices = () => {
  const [, navigate] = useLocation();
  
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices/recent"],
  });
  
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
  });
  
  const isLoading = invoicesLoading || clientsLoading;

  const getClientName = (clientId: number) => {
    if (!clients) return "Cargando...";
    const client = clients.find((c: Client) => c.id === clientId);
    return client ? client.name : "Cliente no encontrado";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200 p-4 flex-row justify-between items-center space-y-0">
        <CardTitle className="font-medium text-neutral-800">Facturas recientes</CardTitle>
        <Button 
          variant="link"
          className="text-primary-600 text-sm px-0"
          onClick={() => navigate("/invoices")}
        >
          Ver todas
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-neutral-50">
                <TableHead className="font-medium">Nº Factura</TableHead>
                <TableHead className="font-medium">Cliente</TableHead>
                <TableHead className="font-medium">Fecha</TableHead>
                <TableHead className="font-medium">Importe</TableHead>
                <TableHead className="font-medium">Estado</TableHead>
                <TableHead className="sr-only">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : invoices?.length > 0 ? (
                invoices.map((invoice: Invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-neutral-50">
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getClientName(invoice.clientId)}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(invoice.total))}</TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                        <MoreVertical className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-neutral-500">
                    No hay facturas recientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentInvoices;
