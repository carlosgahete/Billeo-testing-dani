import React, { useState, useEffect } from "react";
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
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [status, setStatus] = useState("pending");
  
  // Actualizar estado cuando lleguen los datos iniciales
  useEffect(() => {
    if (initialData?.invoice) {
      console.log("Cargando datos iniciales:", initialData.invoice);
      setInvoiceNumber(initialData.invoice.invoiceNumber || "");
      setStatus(initialData.invoice.status || "pending");
    }
  }, [initialData]);
  
  // Mutation para actualizar la factura
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (invoiceId) {
        return await apiRequest("PATCH", `/api/invoices/${invoiceId}`, data);
      } else {
        return await apiRequest("POST", "/api/invoices", data);
      }
    },
    onSuccess: () => {
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/stats/dashboard"] });
      
      // Mostrar mensaje y redirigir
      toast({
        title: invoiceId ? "Factura actualizada" : "Factura creada",
        description: "La operación se ha completado con éxito",
      });
      
      navigate("/invoices");
    },
    onError: (error: any) => {
      console.error("Error al guardar factura:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la factura. Inténtalo nuevamente.",
        variant: "destructive",
      });
    }
  });
  
  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Crear objeto de factura preservando los datos originales
    const invoiceData = {
      invoiceNumber,
      status,
      clientId: initialData?.invoice?.clientId || 1,
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
    
    console.log("Enviando datos:", invoiceData);
    updateMutation.mutate(invoiceData);
  };
  
  // Obtener información del cliente
  const clientId = initialData?.invoice?.clientId;
  const { data: clientData } = useQuery({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {invoiceId ? "Editar factura" : "Nueva factura"} 
        <span className="text-blue-500 ml-2">Simple</span>
      </h2>
      
      {/* Información básica del cliente */}
      {clientData && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700">Cliente:</h3>
          <p className="text-sm">{clientData?.name || 'Cliente'}</p>
          {clientData?.taxId && <p className="text-xs text-gray-500">CIF/NIF: {clientData.taxId}</p>}
        </div>
      )}
      
      {/* Información básica de la factura */}
      {initialData?.invoice && (
        <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Subtotal:</span>
            <span className="ml-1 font-medium">{parseFloat(String(initialData.invoice.subtotal || 0)).toFixed(2)}€</span>
          </div>
          <div>
            <span className="text-gray-500">IVA:</span>
            <span className="ml-1 font-medium">{parseFloat(String(initialData.invoice.tax || 0)).toFixed(2)}€</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Total:</span>
            <span className="ml-1 font-semibold text-blue-600">{parseFloat(String(initialData.invoice.total || 0)).toFixed(2)}€</span>
          </div>
        </div>
      )}
      
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
        
        {/* Mostrar los ítems de la factura (solo lectura) */}
        {initialData?.items && initialData.items.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Ítems de la factura:</h3>
            <div className="max-h-60 overflow-y-auto">
              {initialData.items.map((item: any, idx: number) => (
                <div key={idx} className="p-2 border-b text-sm">
                  <div className="font-medium">{item.description}</div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{item.quantity} x {parseFloat(String(item.unitPrice || 0)).toFixed(2)}€</span>
                    <span>IVA: {parseFloat(String(item.taxRate || 0))}%</span>
                  </div>
                  <div className="text-right text-xs font-medium">
                    Subtotal: {parseFloat(String(item.subtotal || 0)).toFixed(2)}€
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-6 flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate("/invoices")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              invoiceId ? "Actualizar" : "Crear"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SimpleMobileInvoiceForm;