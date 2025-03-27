import { useEffect, useState } from "react";
import { useRoute, Link as RouterLink } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Layout from "@/components/layout/Layout";
import { PageTitle } from "@/components/ui/page-title";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Send, FileCheck, ArrowLeft } from "lucide-react";

export default function QuoteDetailsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/quotes/:id");
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [convertAlertOpen, setConvertAlertOpen] = useState(false);

  if (!user || !params) {
    return <div>Cargando...</div>;
  }

  const quoteId = parseInt(params.id);

  const { data: quoteData, isLoading: isQuoteLoading } = useQuery({
    queryKey: ["/api/quotes", quoteId],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: clientsData = [], isLoading: isClientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Delete quote mutation
  const deleteQuoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/quotes/${quoteId}`);
      if (!res.ok) {
        throw new Error("Error eliminando presupuesto");
      }
      return quoteId;
    },
    onSuccess: () => {
      toast({
        title: "Presupuesto eliminado",
        description: "El presupuesto ha sido eliminado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      window.location.href = "/quotes";
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
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/convert`);
      if (!res.ok) {
        throw new Error("Error convirtiendo presupuesto a factura");
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
      window.location.href = `/invoices/${data.invoice.id}`;
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
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/quotes/${quoteId}`, {
        status: "sent"
      });
      if (!res.ok) {
        throw new Error("Error enviando presupuesto");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Presupuesto enviado",
        description: "El estado del presupuesto ha sido actualizado a 'enviado'.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", quoteId] });
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
    // Asegurar que amount es un número
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(numericAmount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES").format(date);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Borrador</Badge>;
      case "sent":
        return <Badge variant="secondary">Enviado</Badge>;
      case "accepted":
        return <Badge variant="success" className="bg-green-500 hover:bg-green-600">Aceptado</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rechazado</Badge>;
      case "expired":
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isQuoteLoading || isClientsLoading) {
    return (
      <Layout>
        <div>Cargando datos del presupuesto...</div>
      </Layout>
    );
  }

  if (!quoteData || !quoteData.quote) {
    return (
      <Layout>
        <div>No se encontró el presupuesto solicitado.</div>
      </Layout>
    );
  }

  const { quote, items } = quoteData;
  const client = clientsData.find((c: any) => c.id === quote.clientId);

  return (
    <Layout>
      <div className="flex items-center mb-6">
        <RouterLink href="/quotes">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </RouterLink>
        <PageTitle
          title={`Presupuesto #${quote.quoteNumber}`}
          description={`Emitido el ${formatDate(quote.issueDate)} • ${getStatusBadge(quote.status)}`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {client ? (
              <div className="space-y-2">
                <p className="font-semibold text-lg">{client.name}</p>
                <p>CIF/NIF: {client.taxId}</p>
                <p>{client.address}</p>
                <p>{client.postalCode} {client.city}</p>
                <p>{client.country}</p>
                {client.email && <p>Email: {client.email}</p>}
                {client.phone && <p>Teléfono: {client.phone}</p>}
              </div>
            ) : (
              <p>Cliente no encontrado</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalles del presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">Número:</dt>
                <dd>{quote.quoteNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Fecha emisión:</dt>
                <dd>{formatDate(quote.issueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Válido hasta:</dt>
                <dd>{formatDate(quote.validUntil)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">Estado:</dt>
                <dd>{getStatusBadge(quote.status)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="font-medium">Subtotal:</dt>
                <dd>{formatCurrency(quote.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium">IVA:</dt>
                <dd>{formatCurrency(quote.tax)}</dd>
              </div>
              {quote.additionalTaxes && quote.additionalTaxes.map((tax: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <dt className="font-medium">{tax.name}{tax.isPercentage ? " %" : ""}:</dt>
                  <dd>{tax.isPercentage 
                    ? `${tax.amount}% (${formatCurrency(quote.subtotal * tax.amount / 100)})`
                    : formatCurrency(tax.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t mt-2">
                <dt className="font-bold">Total:</dt>
                <dd className="font-bold">{formatCurrency(quote.total)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Partidas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items && items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right">{item.taxRate}%</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {quote.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div className="space-x-2">
          <RouterLink href={`/quotes/edit/${quoteId}`}>
            <Button
              variant="outline"
              disabled={quote.status === "accepted" || quote.status === "rejected"}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </RouterLink>

          <Button
            variant="outline"
            onClick={() => setDeleteAlertOpen(true)}
            disabled={quote.status === "accepted"}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>

        <div className="space-x-2">
          {quote.status === "draft" && (
            <Button onClick={() => sendQuoteMutation.mutate()}>
              <Send className="mr-2 h-4 w-4" />
              Marcar como enviado
            </Button>
          )}

          {(quote.status === "sent" || quote.status === "accepted") && (
            <Button 
              onClick={() => setConvertAlertOpen(true)}
              variant="default"
            >
              <FileCheck className="mr-2 h-4 w-4" />
              Convertir a factura
            </Button>
          )}
        </div>
      </div>

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
            <AlertDialogAction onClick={() => deleteQuoteMutation.mutate()}>
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
              ¿Deseas convertir este presupuesto en una factura? Se creará una nueva factura con los datos del presupuesto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => convertQuoteMutation.mutate()}>
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}