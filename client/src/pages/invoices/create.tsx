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
      {/* Cabecera estilo imagen de referencia */}
      <div className="w-full bg-gray-50 py-3 px-4 border-b flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/invoices")}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold text-neutral-800">
          Crear factura
        </h1>
      </div>
      
      <InvoiceForm />
    </div>
  );
};

export default CreateInvoicePage;
