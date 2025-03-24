import { useQuery } from "@tanstack/react-query";
import InvoiceForm from "@/components/invoices/InvoiceForm";
import { Loader2 } from "lucide-react";

const CreateInvoicePage = () => {
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">Crear nueva factura</h1>
      <InvoiceForm />
    </div>
  );
};

export default CreateInvoicePage;
