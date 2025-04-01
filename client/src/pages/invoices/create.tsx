import { useQuery } from "@tanstack/react-query";
import InvoiceForm from "@/components/invoices/InvoiceFormFixed";
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
            {authLoading ? "Cargando..." : "Crear nueva factura"}
          </h1>
          <p className="text-blue-100 text-sm mt-1">
            Completa los detalles para generar un documento profesional
          </p>
        </div>
      </div>
      
      <InvoiceForm />
    </div>
  );
};

export default CreateInvoicePage;
