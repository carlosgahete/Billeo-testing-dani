import React from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";
import SimpleMobileQuoteForm from "@/components/quotes/SimpleMobileQuoteForm";
import { useAuth } from "@/hooks/use-auth";

export default function CreateSimpleQuotePage() {
  const [, navigate] = useLocation();
  const { loading: authLoading } = useAuth();

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
              {authLoading ? "Cargando..." : "Nuevo presupuesto"}
            </h1>
            <p className="text-xs text-gray-500">
              Vista simplificada
            </p>
          </div>
        </div>
        
        <SimpleMobileQuoteForm />
      </div>
    </Layout>
  );
}