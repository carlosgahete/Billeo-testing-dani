import { useQuery } from "@tanstack/react-query";
import QuoteFormApple from "@/components/quotes/QuoteFormApple";
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import { useLocation } from "wouter";
import Layout from "@/components/layout/Layout";

export default function CreateQuotePage() {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });
  
  const [, navigate] = useLocation();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-full p-4 md:p-6">
        {/* Cabecera estilo Apple */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => navigate("/quotes")}
              className="button-apple-secondary button-apple-sm mr-3 flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Volver</span>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-orange-500" />
                {authLoading ? "Cargando..." : "Crear nuevo presupuesto"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Completa los detalles para generar un presupuesto profesional
              </p>
            </div>
          </div>
        </div>
        
        <QuoteFormApple />
      </div>
    </Layout>
  );
}