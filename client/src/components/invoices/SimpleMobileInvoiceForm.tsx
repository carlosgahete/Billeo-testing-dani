import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowLeft } from "lucide-react";

interface SimpleMobileInvoiceFormProps {
  invoiceId?: number;
  initialData?: any;
}

const SimpleMobileInvoiceForm = ({ invoiceId, initialData }: SimpleMobileInvoiceFormProps) => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Estado para datos básicos de la factura
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice?.invoiceNumber || "");
  const [status, setStatus] = useState(initialData?.invoice?.status || "pending");
  
  // Submit handler simplificado
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Crear objeto básico de factura
    const invoiceData = {
      invoiceNumber,
      status,
      clientId: initialData?.invoice?.clientId || 1, // Valor por defecto
      issueDate: initialData?.invoice?.issueDate || new Date().toISOString().split("T")[0],
      dueDate: initialData?.invoice?.dueDate || new Date().toISOString().split("T")[0],
      subtotal: initialData?.invoice?.subtotal || 0,
      tax: initialData?.invoice?.tax || 0,
      total: initialData?.invoice?.total || 0,
      notes: initialData?.invoice?.notes || "",
      items: initialData?.items || [{
        description: "Ítem ejemplo",
        quantity: 1,
        unitPrice: 100,
        taxRate: 21,
        subtotal: 100
      }]
    };
    
    // Mostrar mensaje de éxito simulado
    console.log("Datos a enviar:", invoiceData);
    toast({
      title: "Acción simulada",
      description: "Los datos se procesarían aquí en un entorno real",
    });
    
    // Redirigir a la lista de facturas
    navigate("/invoices");
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {invoiceId ? "Editar factura" : "Nueva factura"} 
        <span className="text-blue-500 ml-2">Simple</span>
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Número de factura
          </label>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="F-2023-001"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium mb-1">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="pending">Pendiente</option>
            <option value="paid">Pagada</option>
            <option value="overdue">Vencida</option>
            <option value="canceled">Cancelada</option>
          </select>
        </div>
        
        <div className="mt-6 flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate("/invoices")}
          >
            Cancelar
          </Button>
          <Button type="submit">
            {invoiceId ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SimpleMobileInvoiceForm;