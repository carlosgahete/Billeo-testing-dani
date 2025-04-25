// client/src/pages/invoices/create-simple.tsx

import { useEffect } from "react";
import { useLocation } from "wouter";
import InvoiceFormFixed from "@/components/invoices/InvoiceFormFixed";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, AlertCircle } from "lucide-react";

export default function CreateInvoiceFixedPage() {
  const [, navigate] = useLocation();

  return (
    <div className="container max-w-7xl py-6">
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

      {/* Alerta sobre el nuevo flujo de trabajo */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Nuevo flujo de trabajo mejorado</h3>
            <p className="text-blue-700 mt-1">
              Para solucionar problemas anteriores, ahora el proceso es más claro:
            </p>
            <ol className="list-decimal ml-5 mt-2 space-y-1 text-blue-700">
              <li>Primero crea tus clientes en la sección de <strong>Clientes</strong></li>
              <li>Luego crea tus facturas seleccionando el cliente del desplegable</li>
              <li>Completa todos los campos y envía la factura</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Formulario de factura */}
      <InvoiceFormFixed />
    </div>
  );
}