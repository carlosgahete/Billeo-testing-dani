import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, useRoute } from "wouter";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileDown, 
  Printer, 
  Loader2, 
  Edit, 
  Calendar, 
  Building, 
  Receipt, 
  CreditCard 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { generateInvoicePDF } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const [location, navigate] = useLocation();
  const [, params] = useRoute("/invoices/:id");
  const { toast } = useToast();
  
  const searchParams = new URLSearchParams(window.location.search);
  const isEditMode = searchParams.get('edit') === 'true';
  
  const invoiceId = parseInt(id as string);
  
  const { data = { invoice: null, items: [] }, isLoading, isError, error } = useQuery({
    queryKey: ["/api/invoices", invoiceId],
    retry: 2,
    retryDelay: 1000,
    onError: (err) => {
      console.error("Error al cargar factura:", err);
      toast({
        title: "Error al cargar factura",
        description: "No se pudo obtener los datos de la factura. Por favor, intenta nuevamente.",
        variant: "destructive"
      });
    }
  });
  
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ["/api/clients", data?.invoice?.clientId],
    enabled: !!data?.invoice?.clientId,
  });
  
  const isLoadingAll = isLoading || (data?.invoice?.clientId && clientLoading);
  
  if (isEditMode) {
    return (
      <div className="max-w-full">
        {/* Cabecera con degradado */}
        <div className="w-full bg-gradient-to-r from-blue-600 to-blue-400 py-4 px-5 flex items-center mb-6 shadow-md rounded-lg mx-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/invoices")}
            className="border-white bg-transparent hover:bg-blue-500 text-white hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Volver</span>
          </Button>
          <div className="ml-4 flex-1">
            <h1 className="text-xl font-bold text-white flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              {isLoadingAll ? "Cargando..." : "Editar factura"}
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Modifica los detalles de la factura {data?.invoice?.invoiceNumber || ""}
            </p>
          </div>
        </div>
        <InvoiceForm invoiceId={invoiceId} initialData={data} />
      </div>
    );
  }
  
  if (isLoadingAll) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  if (isError || !data?.invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Factura no encontrada</h2>
        <p className="text-neutral-500 mb-6">No se pudo cargar la información de la factura</p>
        <Button onClick={() => navigate("/invoices")}>Volver a facturas</Button>
      </div>
    );
  }
  
  const { invoice, items } = data;
  const client = clientData;
  
  const handleExportPDF = async () => {
    try {
      await generateInvoicePDF(invoice, client, items);
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
  
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" | "secondary" }> = {
      pending: { label: "Pendiente", variant: "warning" },
      paid: { label: "Pagada", variant: "success" },
      overdue: { label: "Vencida", variant: "destructive" },
      canceled: { label: "Cancelada", variant: "outline" },
    };

    const { label, variant } = statusMap[status] || { label: status, variant: "default" };

    return <Badge variant={variant}>{label}</Badge>;
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/invoices")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">
              Factura: {invoice.invoiceNumber}
            </h1>
            <div className="flex items-center mt-1">
              <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-sm text-muted-foreground mr-3">
                {formatDate(invoice.issueDate)}
              </span>
              {getStatusBadge(invoice.status)}
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleExportPDF}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            className="flex items-center"
            onClick={() => navigate(`/invoices/${id}?edit=true`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Building className="h-4 w-4 mr-2 text-primary-600" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p className="font-medium">{client?.name}</p>
              <p>{client?.taxId}</p>
              <p>{client?.address}</p>
              <p>{client?.city}, {client?.postalCode}</p>
              <p>{client?.country}</p>
              {client?.email && <p className="mt-2">{client?.email}</p>}
              {client?.phone && <p>{client?.phone}</p>}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <Receipt className="h-4 w-4 mr-2 text-primary-600" />
              Detalles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número:</span>
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de emisión:</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de vencimiento:</span>
                <span>{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <span>{getStatusBadge(invoice.status)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-primary-600" />
              Importe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA:</span>
                <span>{formatCurrency(Number(invoice.tax))}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Total:</span>
                <span className="text-lg">{formatCurrency(Number(invoice.total))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Conceptos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Precio unitario
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    IVA %
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 text-right">
                      {Number(item.quantity).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 text-right">
                      {formatCurrency(Number(item.unitPrice))}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 text-right">
                      {Number(item.taxRate).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 text-right">
                      {formatCurrency(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-50">
                  <th 
                    scope="row" 
                    colSpan={4} 
                    className="px-6 py-3 text-sm font-medium text-neutral-500 text-right"
                  >
                    Subtotal:
                  </th>
                  <td className="px-6 py-3 text-sm text-neutral-900 text-right">
                    {formatCurrency(Number(invoice.subtotal))}
                  </td>
                </tr>
                <tr className="bg-neutral-50">
                  <th 
                    scope="row" 
                    colSpan={4} 
                    className="px-6 py-3 text-sm font-medium text-neutral-500 text-right"
                  >
                    IVA:
                  </th>
                  <td className="px-6 py-3 text-sm text-neutral-900 text-right">
                    {formatCurrency(Number(invoice.tax))}
                  </td>
                </tr>
                <tr className="bg-neutral-50">
                  <th 
                    scope="row" 
                    colSpan={4} 
                    className="px-6 py-3 text-base font-medium text-neutral-900 text-right"
                  >
                    Total:
                  </th>
                  <td className="px-6 py-3 text-base font-medium text-neutral-900 text-right">
                    {formatCurrency(Number(invoice.total))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 whitespace-pre-line">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceDetailPage;
