import { useQuery } from "@tanstack/react-query";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { Loader2, ArrowLeft, Receipt } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const CreateInvoicePage = () => {
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

  const isMobile = window.innerWidth < 768;

  return (
    <div className="max-w-full p-4 md:p-6">
      {/* Cabecera estilo Apple - visible solo en desktop */}
      <div className={`w-full flex items-center justify-between mb-6 ${isMobile ? 'mobile-invoice-header' : ''}`}>
        <div className="flex items-center">
          <button 
            onClick={() => navigate("/invoices")}
            className="button-apple-secondary button-apple-sm mr-3 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center">
              <Receipt className="h-5 w-5 mr-2 text-blue-500" />
              {authLoading ? "Cargando..." : "Crear nueva factura"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Completa los detalles para generar un documento profesional
            </p>
          </div>
        </div>
      </div>
      
      <InvoiceForm />
    </div>
  );
};

export default CreateInvoicePage;
