import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { QuoteList } from "@/components/quotes/QuoteList";
import { Loader2, Plus, Download, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getQueryFn } from "@/lib/queryClient";

export default function QuotesPage() {
  const { user } = useAuth();
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
    enabled: !!user,
  });
  
  // Obtener estadísticas del dashboard
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Generar PDF resumen
  const generateQuotesSummaryPDF = () => {
    const doc = new jsPDF();
    
    // Título del documento
    doc.setFontSize(20);
    doc.text("Resumen de Presupuestos", 105, 15, { align: "center" });
    
    // Información general
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 30);
    doc.text(`Total de presupuestos: ${quotes.length}`, 14, 38);
    
    // Tabla de presupuestos
    autoTable(doc, {
      startY: 50,
      head: [['Nº', 'Cliente', 'Fecha', 'Valor', 'Estado']],
      body: quotes.map((quote: any) => {
        const status = 
          quote.status === "draft" ? "Borrador" :
          quote.status === "sent" ? "Enviado" :
          quote.status === "accepted" ? "Aceptado" :
          quote.status === "rejected" ? "Rechazado" : "Expirado";
        
        return [
          quote.quoteNumber,
          quote.clientName || "Cliente no encontrado",
          new Date(quote.issueDate).toLocaleDateString('es-ES'),
          formatCurrency(quote.total),
          status
        ];
      }),
      theme: 'striped',
      headStyles: {
        fillColor: [88, 86, 214],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      }
    });
    
    // Guardar el PDF
    doc.save("resumen_presupuestos.pdf");
  };

  if (authLoading || quotesLoading || statsLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }
  
  // Calcular estadísticas para mostrar
  const totalQuotes = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === "accepted").length;
  const pendingQuotes = quotes.filter(q => q.status === "draft" || q.status === "sent").length;
  const rejectedQuotes = quotes.filter(q => q.status === "rejected").length;

  return (
    <Layout>
      <div className="-mt-20">
        <div className="flex justify-center space-x-2 mx-auto mb-3">
          <Link href="/quotes/create">
            <Button className="bg-[#FF9500] hover:bg-[#F08300] text-white px-3 py-1 h-9">
              <Plus className="h-4 w-4 mr-1" />
              Nuevo presupuesto
            </Button>
          </Link>
          <Button 
            className="bg-[#34C759] hover:bg-[#2EB350] text-white px-3 py-1 h-9" 
            onClick={generateQuotesSummaryPDF}
          >
            <Download className="h-4 w-4 mr-1" />
            Descargar resumen
          </Button>
        </div>

        {/* Panel de resumen estadístico */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-xl shadow-sm p-6 mb-4">
          <div className="hidden md:block">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold">{totalQuotes}</span>
                <span className="text-sm text-muted-foreground">Total de presupuestos</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex flex-col items-center p-2 border rounded-md">
                  <div className="flex items-center mb-1">
                    <FileText className="h-4 w-4 text-purple-500 mr-1" />
                    <p className="text-sm font-medium">Valor total</p>
                  </div>
                  <p className="text-xl font-medium text-purple-500">
                    {formatCurrency(quotes.reduce((acc, quote) => acc + Number(quote.total), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="flex flex-col items-center p-2 border rounded-md h-full">
              <div className="flex items-center mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-sm font-medium">Aceptados</p>
              </div>
              <p className="text-3xl font-medium text-green-500 mb-2">{acceptedQuotes}</p>
              {totalQuotes > 0 && (
                <div className="mt-2 w-full">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${Math.round((acceptedQuotes / totalQuotes) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-1">
                    {Math.round((acceptedQuotes / totalQuotes) * 100)}% de aceptación
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="flex flex-col items-center p-2 border rounded-md h-full">
              <div className="flex items-center mb-1">
                <Clock className="h-4 w-4 text-amber-500 mr-1" />
                <p className="text-sm font-medium">Pendientes</p>
              </div>
              <p className="text-3xl font-medium text-amber-500 mb-2">{pendingQuotes}</p>
              {totalQuotes > 0 && (
                <div className="mt-2 w-full">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${Math.round((pendingQuotes / totalQuotes) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-1">
                    {Math.round((pendingQuotes / totalQuotes) * 100)}% pendientes
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="flex flex-col items-center p-2 border rounded-md h-full">
              <div className="flex items-center mb-1">
                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                <p className="text-sm font-medium">Rechazados</p>
              </div>
              <p className="text-3xl font-medium text-red-500 mb-2">{rejectedQuotes}</p>
              {totalQuotes > 0 && (
                <div className="mt-2 w-full">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${Math.round((rejectedQuotes / totalQuotes) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-1">
                    {Math.round((rejectedQuotes / totalQuotes) * 100)}% de rechazo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-xl font-semibold mb-6">Tus presupuestos</h2>
          
          {quotes.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Sin presupuestos</h3>
              <p className="text-gray-500 mb-4">No has creado ningún presupuesto todavía. Presupuesta tus servicios antes de facturar.</p>
              <Link href="/quotes/create">
                <Button>Crear presupuesto</Button>
              </Link>
            </div>
          ) : (
            <QuoteList userId={user?.id} showActions={true} filter={null} />
          )}
        </div>
      </div>
    </Layout>
  );
}