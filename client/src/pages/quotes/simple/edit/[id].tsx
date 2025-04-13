import React from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";
import SimpleMobileQuoteForm from "@/components/quotes/SimpleMobileQuoteForm";
import { useAuth } from "@/hooks/use-auth";

export default function EditSimpleQuotePage() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const quoteId = id ? parseInt(id, 10) : undefined;
  const { loading: authLoading } = useAuth();

  // Obtener los datos del presupuesto
  const { data: quoteData, isLoading } = useQuery({
    queryKey: ["/api/quotes", quoteId],
    enabled: !!quoteId,
  });
  
  // Extraer los items del presupuesto
  const { data: quoteItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/quotes", quoteId, "items"],
    enabled: !!quoteId,
  });
  
  // Preparar datos iniciales
  const initialData = quoteData && quoteItems ? {
    quote: quoteData,
    items: quoteItems
  } : undefined;

  const isPageLoading = authLoading || isLoading || itemsLoading;

  return (
    <Layout>
      <div className="max-w-full p-4">
        {/* Cabecera estilo móvil */}
        <div className="w-full flex items-center mb-4">
          <button 
            onClick={() => navigate("/quotes")}
            className="mr-3 flex items-center text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {isPageLoading ? "Cargando..." : "Editar presupuesto"}
            </h1>
            <p className="text-xs text-gray-500">
              Vista simplificada
            </p>
          </div>
        </div>
        
        {isPageLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin w-10 h-10 border-4 border-primary-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (
          <SimpleMobileQuoteForm quoteId={quoteId} initialData={initialData} />
        )}
      </div>
    </Layout>
  );
}