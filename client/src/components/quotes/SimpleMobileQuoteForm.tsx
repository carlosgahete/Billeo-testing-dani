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

interface ClientData {
  id: number;
  name: string;
  taxId: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

interface ClientResponse {
  id: number;
  [key: string]: any;
}

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
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [newTax, setNewTax] = useState({ name: "", amount: 0, isPercentage: true });
  const [newClient, setNewClient] = useState({
    name: "",
    taxId: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "España",
  });
  
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
  
  // Mutation para crear un nuevo cliente
  const createClientMutation = useMutation<any, Error, typeof newClient>({
    mutationFn: async (data) => {
      return await apiRequest("POST", "/api/clients", data);
    },
    onSuccess: (response) => {
      // Actualizar la lista de clientes
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      
      // Seleccionar el cliente recién creado
      if (response && response.id) {
        setSelectedClientId(response.id);
      }
      
      // Cerrar el diálogo y mostrar mensaje
      setShowAddClientDialog(false);
      toast({
        title: "Cliente creado",
        description: "El cliente se ha creado correctamente",
      });
      
      // Limpiar el formulario
      setNewClient({
        name: "",
        taxId: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postalCode: "",
        country: "España",
      });
    },
    onError: (error: any) => {
      console.error("Error al crear cliente:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente. Verifica los datos e inténtalo nuevamente.",
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
  
  // Función para guardar un nuevo cliente
  const handleSaveClient = () => {
    // Validar datos del cliente
    if (!newClient.name.trim() || !newClient.taxId.trim() || !newClient.address.trim() || 
        !newClient.city.trim() || !newClient.postalCode.trim() || !newClient.country.trim()) {
      toast({
        title: "Error",
        description: "Por favor, completa todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }
    
    // Crear el cliente
    createClientMutation.mutate(newClient);
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
      <div className="bg-white min-h-screen pb-32 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4 px-4 pt-6 -mt-28">
          {/* Botón de volver estilo Apple iOS */}
          <div className="mb-0">
            <button 
              type="button"
              onClick={() => navigate("/quotes")} 
              className="text-[#007AFF] text-sm flex items-center -mt-1"
            >
              <ChevronLeft className="h-4 w-4 mr-0.5" />
              <span>Volver</span>
            </button>
          </div>
          {/* Selector de cliente con estilo iOS */}
          <div className="form-group mb-5">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-600 font-medium">
                Cliente
              </label>
              <span className="text-xs text-[#007AFF]">Obligatorio</span>
            </div>
            <div className="relative">
              <select
                className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 appearance-none text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                value={selectedClientId || ""}
                onChange={(e) => {
                  if (e.target.value === "new") {
                    setShowAddClientDialog(true);
                    return;
                  }
                  setSelectedClientId(Number(e.target.value));
                }}
                required
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client: any) => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.taxId ? `(${client.taxId})` : ''}
                  </option>
                ))}
                <option value="new" className="text-[#007AFF] font-medium">+ Añadir nuevo cliente</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          
          {/* Número de presupuesto */}
          <div className="form-group mb-5">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-600 font-medium">
                Número de presupuesto
              </label>
              <span className="text-xs text-[#007AFF]">Obligatorio</span>
            </div>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="P-2023-001"
              required
            />
          </div>
          
          {/* Fechas con estilo iOS */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm text-gray-600 font-medium mb-3">Fechas</h3>
            <div className="space-y-3">
              <div className="form-group">
                <label className="text-sm text-gray-600 block mb-1">
                  Fecha emisión
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
              <div className="form-group">
                <label className="text-sm text-gray-600 block mb-1">
                  Válido hasta
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>
            </div>
          </div>
          
          {/* Estado del presupuesto */}
          <div className="form-group mb-5">
            <label className="text-sm text-gray-600 block mb-2">
              Estado
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 appearance-none text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              >
                <option value="draft">Borrador</option>
                <option value="sent">Enviado</option>
                <option value="accepted">Aceptado</option>
                <option value="rejected">Rechazado</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
          
          {/* Campos para importes */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm text-gray-600 font-medium mb-3">Importes</h3>
            <div className="space-y-4">
              <div className="form-group">
                <label className="text-sm text-gray-600 block mb-2">
                  Subtotal (€)
                </label>
                <input
                  type="number"
                  value={subtotal}
                  onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="text-sm text-gray-600 block mb-2">
                  IVA (€)
                </label>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  step="0.01"
                />
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Total estimado:</span>
                  <span className="text-lg font-semibold text-[#007AFF]">{calculateTotal().toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Impuestos adicionales */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm text-gray-600 font-medium">Impuestos adicionales</h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAddTax}
                className="h-8 px-3 text-[#007AFF] hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="text-xs">Añadir</span>
              </Button>
            </div>
            
            {additionalTaxes.length > 0 ? (
              <div className="space-y-2 bg-white p-3 rounded-xl">
                {additionalTaxes.map((tax, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm py-2 px-1 border-b border-gray-100">
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
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl flex items-center justify-center h-16">
                <p className="text-sm text-gray-400">No hay impuestos adicionales</p>
              </div>
            )}
          </div>
          
          {/* Notas */}
          <div className="form-group mb-6">
            <label className="text-sm text-gray-600 block mb-2">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              rows={4}
              placeholder="Información adicional para el cliente..."
            />
          </div>
          
          {/* Mostrar los ítems del presupuesto (solo lectura) */}
          {initialData?.items && initialData.items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm text-gray-600 font-medium mb-3">Ítems del presupuesto</h3>
              <div className="max-h-72 overflow-y-auto">
                {initialData.items.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 mb-2 bg-white rounded-xl border border-gray-100 text-sm">
                    <div className="font-medium mb-1">{item.description}</div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{item.quantity} x {parseFloat(String(item.unitPrice || 0)).toFixed(2)}€</span>
                      <span>IVA: {parseFloat(String(item.taxRate || 0))}%</span>
                    </div>
                    <div className="text-right text-xs font-medium mt-1">
                      Subtotal: {parseFloat(String(item.subtotal || 0)).toFixed(2)}€
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Botones de acción */}
          <div className="fixed bottom-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur-sm py-4 px-4 border-t border-gray-100">
            <div className="flex justify-between max-w-md mx-auto">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate("/quotes")}
                className="w-[48%] border-gray-300 text-gray-600"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="w-[48%] bg-[#007AFF] hover:bg-blue-600"
              >
                {updateMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
          </div>
        </form>
      </div>

      {/* Diálogo para añadir impuesto con estilo iOS */}
      <Dialog open={showAddTaxDialog} onOpenChange={setShowAddTaxDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-0 p-0 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-center text-base">Añadir impuesto</DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tax-name" className="text-sm text-gray-600">
                Nombre
              </Label>
              <input
                id="tax-name"
                value={newTax.name}
                onChange={(e) => handleTaxChange('name', e.target.value)}
                className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                placeholder="IRPF"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tax-amount" className="text-sm text-gray-600">
                Valor
              </Label>
              <input
                id="tax-amount"
                type="number"
                value={newTax.amount}
                onChange={(e) => handleTaxChange('amount', parseFloat(e.target.value) || 0)}
                className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                placeholder="15"
                step="0.01"
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="tax-percentage" className="text-sm text-gray-600">
                Es porcentaje
              </Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="tax-percentage"
                  checked={newTax.isPercentage}
                  onCheckedChange={(checked) => handleTaxChange('isPercentage', checked)}
                />
                <Label htmlFor="tax-percentage" className="cursor-pointer text-sm">
                  {newTax.isPercentage ? "Sí" : "No"}
                </Label>
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddTaxDialog(false)}
              className="text-[#007AFF] hover:bg-blue-50"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveTax}
              className="bg-[#007AFF] hover:bg-blue-600"
            >
              Añadir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para añadir nuevo cliente */}
      {showAddClientDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4" style={{overflowY: 'auto', WebkitOverflowScrolling: 'touch'}}>
          <div className="bg-white rounded-xl w-full max-w-md mx-auto mb-10 mt-4">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 sticky top-0 rounded-t-xl">
              <h3 className="text-center text-base font-medium">Añadir nuevo cliente</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name" className="text-sm text-gray-600">
                  Nombre <span className="text-[#007AFF] text-xs">*</span>
                </Label>
                <input
                  id="client-name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  placeholder="Nombre de la empresa o cliente"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-taxId" className="text-sm text-gray-600">
                  CIF/NIF <span className="text-[#007AFF] text-xs">*</span>
                </Label>
                <input
                  id="client-taxId"
                  value={newClient.taxId}
                  onChange={(e) => setNewClient({...newClient, taxId: e.target.value})}
                  className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  placeholder="B12345678"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-email" className="text-sm text-gray-600">
                  Email
                </Label>
                <input
                  id="client-email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-phone" className="text-sm text-gray-600">
                  Teléfono
                </Label>
                <input
                  id="client-phone"
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  placeholder="600123456"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-address" className="text-sm text-gray-600">
                  Dirección <span className="text-[#007AFF] text-xs">*</span>
                </Label>
                <input
                  id="client-address"
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  placeholder="Calle, número, piso..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client-city" className="text-sm text-gray-600">
                    Ciudad <span className="text-[#007AFF] text-xs">*</span>
                  </Label>
                  <input
                    id="client-city"
                    value={newClient.city}
                    onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                    className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                    placeholder="Madrid"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client-postalCode" className="text-sm text-gray-600">
                    Código Postal <span className="text-[#007AFF] text-xs">*</span>
                  </Label>
                  <input
                    id="client-postalCode"
                    value={newClient.postalCode}
                    onChange={(e) => setNewClient({...newClient, postalCode: e.target.value})}
                    className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                    placeholder="28001"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client-country" className="text-sm text-gray-600">
                  País <span className="text-[#007AFF] text-xs">*</span>
                </Label>
                <input
                  id="client-country"
                  value={newClient.country}
                  onChange={(e) => setNewClient({...newClient, country: e.target.value})}
                  className="w-full p-3 bg-[#F7F9FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  placeholder="España"
                  required
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between sticky bottom-0 bg-white rounded-b-xl">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddClientDialog(false)}
                className="text-[#007AFF] hover:bg-blue-50"
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleSaveClient}
                className="bg-[#007AFF] hover:bg-blue-600"
              >
                Guardar Cliente
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SimpleMobileQuoteForm;