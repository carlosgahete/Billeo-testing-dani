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

interface SimpleMobileQuoteFormProps {
  quoteId?: number;
  initialData?: any;
}

const SimpleMobileQuoteForm = ({ quoteId, initialData }: SimpleMobileQuoteFormProps) => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Estado para datos básicos del presupuesto
  const [quoteNumber, setQuoteNumber] = useState("");
  const [status, setStatus] = useState("draft");
  const [selectedClientId, setSelectedClientId] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [additionalTaxes, setAdditionalTaxes] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [showAddTaxDialog, setShowAddTaxDialog] = useState(false);
  const [newTax, setNewTax] = useState({ name: "", amount: 0, isPercentage: true });
  
  // Fechas
  const [issueDate, setIssueDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  
  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });
  
  // Actualizar estado cuando lleguen los datos iniciales
  useEffect(() => {
    if (initialData?.quote) {
      console.log("Cargando datos iniciales:", initialData.quote);
      setQuoteNumber(initialData.quote.quoteNumber || "");
      setStatus(initialData.quote.status || "draft");
      setSelectedClientId(initialData.quote.clientId || 0);
      setSubtotal(parseFloat(String(initialData.quote.subtotal || 0)));
      setTax(parseFloat(String(initialData.quote.tax || 0)));
      setNotes(initialData.quote.notes || "");
      
      // Fechas
      if (initialData.quote.issueDate) {
        const date = new Date(initialData.quote.issueDate);
        setIssueDate(date.toISOString().split("T")[0]);
      }
      
      if (initialData.quote.validUntil) {
        const date = new Date(initialData.quote.validUntil);
        setValidUntil(date.toISOString().split("T")[0]);
      }
      
      // Procesamos los impuestos adicionales
      if (initialData.quote.additionalTaxes) {
        let taxes = [];
        try {
          if (typeof initialData.quote.additionalTaxes === 'string') {
            taxes = JSON.parse(initialData.quote.additionalTaxes);
          } else if (Array.isArray(initialData.quote.additionalTaxes)) {
            taxes = initialData.quote.additionalTaxes;
          }
          setAdditionalTaxes(taxes);
        } catch (e) {
          console.error("Error al procesar impuestos adicionales:", e);
        }
      }
    }
  }, [initialData]);
  
  // Mutation para actualizar el presupuesto
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (quoteId) {
        return await apiRequest("PATCH", `/api/quotes/${quoteId}`, data);
      } else {
        return await apiRequest("POST", "/api/quotes", data);
      }
    },
    onSuccess: () => {
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/stats/dashboard"] });
      
      // Mostrar mensaje y redirigir
      toast({
        title: quoteId ? "Presupuesto actualizado" : "Presupuesto creado",
        description: "La operación se ha completado con éxito",
      });
      
      navigate("/quotes");
    },
    onError: (error: any) => {
      console.error("Error al guardar presupuesto:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el presupuesto. Inténtalo nuevamente.",
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
  
  // Calcular totales 
  const calculateTotal = () => {
    let total = subtotal + tax;
    
    additionalTaxes.forEach(taxItem => {
      if (taxItem.isPercentage) {
        total += subtotal * (parseFloat(String(taxItem.amount)) / 100);
      } else {
        total += parseFloat(String(taxItem.amount));
      }
    });
    
    return total;
  };
  
  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Crear objeto de presupuesto con los datos actualizados
    const total = calculateTotal();
    
    const quoteData = {
      quoteNumber,
      status,
      clientId: selectedClientId,
      issueDate,
      validUntil,
      subtotal: subtotal,
      tax: tax,
      total: total,
      additionalTaxes: additionalTaxes,
      notes: notes,
      items: initialData?.items || [{
        description: "Ítem ejemplo",
        quantity: 1,
        unitPrice: 100,
        taxRate: 21,
        subtotal: 100
      }]
    };
    
    console.log("Enviando datos:", quoteData);
    updateMutation.mutate(quoteData);
  };
  
  return (
    <>
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          {quoteId ? "Editar presupuesto" : "Nuevo presupuesto"} 
          <span className="text-indigo-500 ml-2">Simple</span>
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
              Número de presupuesto
            </label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="P-2023-001"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                Fecha emisión
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium mb-1">
                Válido hasta
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
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
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="accepted">Aceptado</option>
              <option value="rejected">Rechazado</option>
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
                <span className="text-indigo-600 font-semibold">{calculateTotal().toFixed(2)}€</span>
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
          
          {/* Notas */}
          <div className="form-group">
            <label className="block text-sm font-medium mb-1">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Información adicional para el cliente..."
            />
          </div>
          
          {/* Mostrar los ítems del presupuesto (solo lectura) */}
          {initialData?.items && initialData.items.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Ítems del presupuesto:</h3>
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
              onClick={() => navigate("/quotes")}
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
                quoteId ? "Actualizar" : "Crear"
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

export default SimpleMobileQuoteForm;