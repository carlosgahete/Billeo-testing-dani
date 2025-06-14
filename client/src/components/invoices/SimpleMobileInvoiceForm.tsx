import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ArrowLeft, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [additionalTaxes, setAdditionalTaxes] = useState<any[]>([]);
  const [showAddTaxDialog, setShowAddTaxDialog] = useState(false);
  const [newTax, setNewTax] = useState({ name: "", amount: 0, isPercentage: true });
  
  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });
  
  // Actualizar estado cuando lleguen los datos iniciales
  useEffect(() => {
    if (initialData?.invoice) {
      console.log("Cargando datos iniciales:", initialData.invoice);
      setInvoiceNumber(initialData.invoice.invoiceNumber || "");
      setStatus(initialData.invoice.status || "pending");
      setSelectedClientId(initialData.invoice.clientId || 0);
      setSubtotal(parseFloat(String(initialData.invoice.subtotal || 0)));
      setTax(parseFloat(String(initialData.invoice.tax || 0)));
      
      // Procesamos los impuestos adicionales
      if (initialData.invoice.additionalTaxes) {
        let taxes = [];
        try {
          if (typeof initialData.invoice.additionalTaxes === 'string') {
            taxes = JSON.parse(initialData.invoice.additionalTaxes);
          } else if (Array.isArray(initialData.invoice.additionalTaxes)) {
            taxes = initialData.invoice.additionalTaxes;
          }
          setAdditionalTaxes(taxes);
        } catch (e) {
          console.error("Error al procesar impuestos adicionales:", e);
        }
      }
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
    onSuccess: (data) => {
      console.log("Factura guardada exitosamente:", data);
      
      // Invalidar consultas inmediatamente para actualizar los datos en todas las vistas
      const invalidatePromises = [
        queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }), 
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/public/stats/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/invoices/recent"] }),
      ];
      
      // Ejecutar todas las invalidaciones a la vez
      Promise.all(invalidatePromises).then(() => {
        console.log("Todas las consultas han sido invalidadas");
        
        // Forzar una actualización adicional para asegurar que los datos estén frescos
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
        }, 500);
      });
      
      // Mostrar mensaje y redirigir
      toast({
        title: invoiceId ? "Factura actualizada" : "Factura creada",
        description: "La operación se ha completado con éxito",
      });
      
      // Pequeño delay para asegurar que la navegación ocurra después de la actualización
      setTimeout(() => {
        navigate("/invoices");
      }, 1000);
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
  
  // Funciones para manejar impuestos adicionales
  const handleAddTax = () => {
    setShowAddTaxDialog(true);
  };
  
  const handleTaxChange = (field: string, value: any) => {
    setNewTax(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveTax = () => {
    if (!newTax.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del impuesto es obligatorio",
        variant: "destructive"
      });
      return;
    }
    
    setAdditionalTaxes(prev => [...prev, newTax]);
    setNewTax({ name: "", amount: 0, isPercentage: true });
    setShowAddTaxDialog(false);
  };
  
  const handleRemoveTax = (index: number) => {
    setAdditionalTaxes(prev => prev.filter((_, i) => i !== index));
  };
  
  // Calcular totales - usando useMemo para evitar recálculos innecesarios
  const total = React.useMemo(() => {
    let calculatedTotal = subtotal + tax;
    
    additionalTaxes.forEach(taxItem => {
      if (taxItem.isPercentage) {
        calculatedTotal += subtotal * (parseFloat(String(taxItem.amount)) / 100);
      } else {
        calculatedTotal += parseFloat(String(taxItem.amount));
      }
    });
    
    return calculatedTotal;
  }, [subtotal, tax, additionalTaxes]);
  
  // Función wrapper para mantener compatibilidad con el código existente
  const calculateTotal = () => total;
  
  // Submit handler mejorado para asegurar formato correcto de datos
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Usamos el total ya calculado mediante useMemo
    
    // Estructura de datos que espera el servidor
    const payload = {
      // El formato debe coincidir con lo que espera el backend
      invoice: {
        invoiceNumber,
        status,
        clientId: selectedClientId,
        issueDate: initialData?.invoice?.issueDate || new Date().toISOString().split("T")[0],
        dueDate: initialData?.invoice?.dueDate || new Date().toISOString().split("T")[0],
        // Convertimos los valores numéricos a strings
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        total: total.toString(),
        additionalTaxes: additionalTaxes,
        notes: initialData?.invoice?.notes || "",
        attachments: initialData?.invoice?.attachments || [],
        // Forzar creación de transacción si el estado es 'paid'
        createTransaction: status === 'paid'
      },
      // Incluir items de factura
      items: initialData?.items || [{
        description: "Servicio",
        quantity: "1",
        unitPrice: "100",
        taxRate: "21",
        subtotal: "100"
      }]
    };
    
    console.log("Enviando datos al servidor:", payload);
    
    // Llamar a la mutación con los datos correctamente formateados
    updateMutation.mutate(payload);
  };
  
  return (
    <>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          {invoiceId ? "Editar factura" : "Nueva factura"} 
          <span className="text-blue-500 ml-2">Simple</span>
        </h2>
        
        {/* Selector de cliente */}
        <div className="form-group mb-4">
          <label className="block text-sm font-medium mb-1">
            Cliente
          </label>
          <select
            className="w-full p-2 border rounded"
            value={selectedClientId || ""}
            onChange={(e) => setSelectedClientId(Number(e.target.value))}
            required
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((client: any) => (
              <option key={client.id} value={client.id}>
                {client.name} {client.taxId ? `(${client.taxId})` : ''}
              </option>
            ))}
          </select>
        </div>
        
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
          
          {/* Campos para subtotal e IVA */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                Subtotal (€)
              </label>
              <input
                type="number"
                value={subtotal}
                onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                IVA (€)
              </label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border rounded"
                step="0.01"
              />
            </div>
            
            <div className="col-span-2">
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium">Total estimado:</span>
                <span className="text-blue-600 font-semibold">{calculateTotal().toFixed(2)}€</span>
              </div>
            </div>
          </div>
          
          {/* Impuestos adicionales */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Otros impuestos</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddTax}
                className="h-7 px-2"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">Añadir</span>
              </Button>
            </div>
            
            {additionalTaxes.length > 0 ? (
              <div className="space-y-2 bg-gray-50 p-2 rounded">
                {additionalTaxes.map((tax, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-1 border-b">
                    <div>
                      <span className="font-medium">{tax.name}:</span>
                      <span className="ml-1">
                        {tax.amount}{tax.isPercentage ? '%' : '€'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTax(idx)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No hay impuestos adicionales</p>
            )}
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

      {/* Diálogo para añadir impuesto */}
      <Dialog open={showAddTaxDialog} onOpenChange={setShowAddTaxDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Añadir impuesto</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax-name" className="text-right">
                Nombre
              </Label>
              <input
                id="tax-name"
                value={newTax.name}
                onChange={(e) => handleTaxChange('name', e.target.value)}
                className="col-span-3 p-2 border rounded"
                placeholder="IRPF"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax-amount" className="text-right">
                Valor
              </Label>
              <input
                id="tax-amount"
                type="number"
                value={newTax.amount}
                onChange={(e) => handleTaxChange('amount', parseFloat(e.target.value) || 0)}
                className="col-span-3 p-2 border rounded"
                placeholder="15"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tax-percentage" className="text-right">
                Es porcentaje
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="tax-percentage"
                  checked={newTax.isPercentage}
                  onCheckedChange={(checked) => handleTaxChange('isPercentage', checked)}
                />
                <Label htmlFor="tax-percentage" className="cursor-pointer">
                  {newTax.isPercentage ? "Sí" : "No"}
                </Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddTaxDialog(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveTax}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleMobileInvoiceForm;