import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { QuoteList } from "@/components/quotes/QuoteList";
import { Loader2, Plus, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function QuotesPage() {
  const { user } = useAuth();
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
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

  if (authLoading || quotesLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="-mt-20">
        <div className="flex justify-center space-x-8 mx-auto max-w-xs mb-3">
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

        <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
          <h2 className="text-xl font-semibold mb-1">Tus presupuestos</h2>
          <p className="text-gray-500 mb-6">Empieza a crear presupuestos profesionales para tus clientes</p>
          
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