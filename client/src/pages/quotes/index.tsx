import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuoteList } from "@/components/quotes/QuoteList";
import { PageTitle } from "@/components/ui/page-title";
import Layout from "@/components/layout/Layout";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  FileText, 
  FilePlus, 
  Send, 
  CheckSquare, 
  AlertCircle, 
  Loader2, 
  Info,
  PieChart,
  DollarSign,
  FileClock,
  ChevronLeft,
  Plus,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces para los datos
interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
}

interface Client {
  id: number;
  name: string;
  taxId: string;
  // otros campos necesarios
}

export default function QuotesPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [filter, setFilter] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Efecto para refrescar la lista cuando cambia el filtro
  useEffect(() => {
    console.log("Filtro aplicado:", filter);
  }, [filter]);

  // Obtener estadísticas de presupuestos
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });
  
  // Efecto para limpiar el filtro al cargar la página
  useEffect(() => {
    return () => setFilter(null);
  }, []);

  // Obtener estadísticas de clientes
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const isLoading = quotesLoading || clientsLoading || !user;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  // Estadísticas sobre presupuestos
  const totalQuotes = quotes.length;
  const draftQuotes = quotes.filter(q => q.status === "draft").length;
  const sentQuotes = quotes.filter(q => q.status === "sent").length;
  const acceptedQuotes = quotes.filter(q => q.status === "accepted").length;
  const rejectedQuotes = quotes.filter(q => q.status === "rejected").length;
  
  // Calcular total de presupuestos en valor
  const totalValue = quotes.reduce((acc: number, q: Quote) => {
    let total = 0;
    try {
      if (typeof q.total === 'string') {
        total = parseFloat(q.total);
      } else if (typeof q.total === 'number') {
        total = q.total;
      }
      if (isNaN(total)) {
        total = 0;
      }
    } catch (error) {
      total = 0;
    }
    return acc + total;
  }, 0);
  
  // Presupuestos aceptados
  const acceptedValue = quotes.filter(q => q.status === "accepted")
    .reduce((acc: number, q: Quote) => {
      let total = 0;
      try {
        if (typeof q.total === 'string') {
          total = parseFloat(q.total);
        } else if (typeof q.total === 'number') {
          total = q.total;
        }
        if (isNaN(total)) {
          total = 0;
        }
      } catch (error) {
        total = 0;
      }
      return acc + total;
    }, 0);
  
  // Tasa de conversión
  const conversionRate = totalQuotes > 0 
    ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1) 
    : "0.0";
  
  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      useGrouping: true
    }).format(amount);
  };
  
  // Función para generar PDF
  const generateQuotesSummaryPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    // Formatear fecha
    const today = new Date();
    const formattedDate = today.toLocaleDateString('es-ES', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    // Configurar estilos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(88, 86, 214);
    doc.text("Resumen de Presupuestos", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado el ${formattedDate}`, 105, 28, { align: "center" });
    
    // Guardar PDF
    doc.save("resumen_presupuestos.pdf");
  };

  return (
    <Layout>
      {/* Cabecera estilo Apple */}
      <div className="section-header fade-in mb-3 -mt-3 pt-0 flex items-center">
        <div className="flex items-center ml-8 md:ml-4">
          <div className="bg-[#FFF8E7] p-3 rounded-full mr-3 -mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF9500" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <line x1="10" y1="9" x2="8" y2="9"></line>
            </svg>
          </div>
          <div className="-mt-2">
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none mb-0.5">Presupuestos</h2>
            <p className="text-sm text-gray-500 mt-0 leading-tight">Gestiona tus propuestas comerciales</p>
          </div>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="mb-8 fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Dashboard cards content */}
        </div>
      </div>

      {/* Lista de presupuestos - Estilo Apple */}
      <div className="mt-8 fade-in">
        {!isMobile ? (
          <div className="glass-panel rounded-3xl border border-gray-200/50 scale-in mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-[#F3F3F3] p-2.5 rounded-full mr-3">
                    <FileText className="h-5 w-5 text-[#5856D6]" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800">Listado de presupuestos</h3>
                </div>
              </div>
              
              {/* Lista de presupuestos en escritorio/tablet con el fondo blanco */}
              <QuoteList userId={user.id} showActions={true} filter={filter} />
            </div>
          </div>
        ) : (
          <div className="scale-in mb-8">
            {/* En móvil, eliminamos el contenedor blanco y mostramos directamente la lista */}
            <div className="flex items-center mb-4 px-2">
              <div className="bg-[#F3F3F3] p-2.5 rounded-full mr-3">
                <FileText className="h-5 w-5 text-[#5856D6]" />
              </div>
              <h3 className="text-lg font-medium text-gray-800">Listado de presupuestos</h3>
            </div>
            
            {/* Lista de presupuestos en móvil sin contenedor con fondo blanco */}
            <QuoteList userId={user.id} showActions={true} filter={filter} />
          </div>
        )}
      </div>
    </Layout>
  );
}