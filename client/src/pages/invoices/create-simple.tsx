// client/src/pages/invoices/create-simple.tsx

import { useLocation } from "wouter";
import InvoiceFormTwoCol from "@/components/invoices/InvoiceFormTwoCol";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function CreateInvoiceFixedPage() {
  const [, navigate] = useLocation();

  return (
    <div className="w-full px-4 py-6">
      {/* Header con estilo Apple */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/invoices")}
            className="mr-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </Button>
          <h1 className="text-2xl font-medium text-gray-800">Nueva factura</h1>
        </div>
      </div>

      {/* Formulario de factura con diseño de dos columnas equilibradas */}
      <InvoiceFormTwoCol />
    </div>
  );
}