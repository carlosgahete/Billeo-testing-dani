// client/src/pages/invoices/create-simple.tsx

import { useEffect } from "react";
import { useLocation } from "wouter";
import InvoiceFormFixed2 from "@/components/invoices/InvoiceFormFixed2";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, AlertCircle } from "lucide-react";

export default function CreateInvoiceFixedPage() {
  const [, navigate] = useLocation();

  return (
    <div className="container w-full px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/invoices")}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Nueva Factura</h1>
        </div>
      </div>

      {/* Espacio intencionalmente eliminado para optimizar el espacio en pantalla */}

      {/* Formulario de factura mejorado que gestiona correctamente múltiples impuestos adicionales */}
      <InvoiceFormFixed2 />
    </div>
  );
}