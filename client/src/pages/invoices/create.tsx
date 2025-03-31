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

  return (
    <div className="max-w-full">
      {/* Cabecera mejorada */}
      <div className="w-full bg-gradient-to-r from-blue-50 to-gray-50 py-3 px-4 border-b flex items-center gap-3 mb-6 shadow-sm">
        <div className="w-12 ml-6 hidden sm:block"></div> {/* Espacio para la hamburguesa en desktop */}
        <div className="sm:hidden w-8"></div> {/* Espacio para la hamburguesa en móvil */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/invoices")}
          className="border-blue-200 bg-white hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2 text-blue-500" />
          <span className="text-blue-600">Volver</span>
        </Button>
        <h1 className="text-base font-semibold text-neutral-800 ml-2 flex items-center">
          <Receipt className="h-4 w-4 mr-2 text-blue-500" />
          Crear factura
        </h1>
      </div>
      
      <InvoiceForm />
    </div>
  );
};

export default CreateInvoicePage;
