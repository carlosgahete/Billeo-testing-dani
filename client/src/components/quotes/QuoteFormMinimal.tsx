import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Loader2, Plus, X, Image } from 'lucide-react';

// Interfaz mínima para las props
interface QuoteFormMinimalProps {
  quoteId?: number;
}

// Interfaz para un impuesto personalizado
interface Tax {
  id: string;
  name: string;
  amount: string;
  isPercentage: boolean;
}

const QuoteFormMinimal: React.FC<QuoteFormMinimalProps> = ({ quoteId }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para los campos básicos
  const [quoteNumber, setQuoteNumber] = useState('P-001');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('draft');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  
  // Estado para impuestos personalizados
  const [taxes, setTaxes] = useState<Tax[]>([
    { id: '1', name: 'IVA', amount: '21', isPercentage: true },
    { id: '2', name: 'IRPF', amount: '-15', isPercentage: true }
  ]);
  
  // Estado para nuevos impuestos
  const [newTaxName, setNewTaxName] = useState('');
  const [newTaxAmount, setNewTaxAmount] = useState('');
  const [newTaxIsPercentage, setNewTaxIsPercentage] = useState(true);
  
  // Cálculos de impuestos y totales
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Cargar clientes de manera segura
  const { data: clientsData } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/clients');
        if (!res.ok) return [];
        return await res.json();
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    },
  });

  // Asegurar que clientsData sea un array
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Función para calcular los totales
  const calculateTotals = () => {
    const subtotalValue = parseFloat(amount) || 0;
    
    // Calcular el valor de cada impuesto
    let totalTaxAmount = 0;
    taxes.forEach(tax => {
      const taxAmount = parseFloat(tax.amount) || 0;
      if (tax.isPercentage) {
        // Si es porcentaje, calcular sobre el subtotal
        totalTaxAmount += (subtotalValue * taxAmount / 100);
      } else {
        // Si es valor fijo, simplemente sumar
        totalTaxAmount += taxAmount;
      }
    });
    
    // Actualizar estados (asegurándonos de que son números)
    setSubtotal(Number(subtotalValue));
    setTotal(Number(subtotalValue) + Number(totalTaxAmount));
    
    console.log(`Subtotal: ${Number(subtotalValue).toFixed(2)}€, Impuestos: ${Number(totalTaxAmount).toFixed(2)}€, Total: ${Number(subtotalValue + totalTaxAmount).toFixed(2)}€`);
  };

  // Recalcular cuando cambian los valores relevantes
  useEffect(() => {
    calculateTotals();
  }, [amount, taxes]);

  // Añadir un nuevo impuesto
  const addTax = () => {
    if (!newTaxName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre del impuesto es obligatorio',
        variant: 'destructive',
      });
      return;
    }
    
    if (!newTaxAmount.trim() || isNaN(parseFloat(newTaxAmount))) {
      toast({
        title: 'Error',
        description: 'El importe del impuesto debe ser un número válido',
        variant: 'destructive',
      });
      return;
    }
    
    // Crear nuevo impuesto
    const newTax: Tax = {
      id: Date.now().toString(), // ID único
      name: newTaxName,
      amount: newTaxAmount,
      isPercentage: newTaxIsPercentage
    };
    
    // Añadir al array de impuestos
    setTaxes(prevTaxes => [...prevTaxes, newTax]);
    
    // Limpiar campos
    setNewTaxName('');
    setNewTaxAmount('');
    setNewTaxIsPercentage(true);
  };

  // Eliminar un impuesto
  const removeTax = (id: string) => {
    console.log('Eliminando impuesto con id:', id);
    setTaxes(prevTaxes => prevTaxes.filter(tax => tax.id !== id));
  };

  // Actualizar un impuesto existente
  const updateTax = (id: string, field: keyof Tax, value: string | boolean) => {
    setTaxes(prevTaxes => 
      prevTaxes.map(tax => 
        tax.id === id 
          ? { ...tax, [field]: value } 
          : tax
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quoteNumber.trim()) {
      toast({
        title: 'Error',
        description: 'El número de presupuesto es obligatorio',
        variant: 'destructive',
      });
      return;
    }
    
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar un cliente',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Preparar datos para enviar
      const quoteData = {
        quoteNumber,
        clientId: parseInt(clientId),
        status,
        notes,
        subtotal: Number(subtotal).toFixed(2),
        tax: "0.00", // Lo gestionamos con additionalTaxes
        total: Number(total).toFixed(2),
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        additionalTaxes: taxes.map(tax => ({
          name: tax.name,
          amount: tax.amount,
          isPercentage: tax.isPercentage
        })),
        // Añadir un solo ítem con la descripción y el monto
        items: [
          {
            description: description || 'Servicio profesional',
            quantity: '1',
            unitPrice: amount,
            taxRate: '0', // Lo gestionamos con additionalTaxes
            subtotal: Number(subtotal).toFixed(2)
          }
        ]
      };
      
      // Enviar petición
      const endpoint = quoteId ? `/api/quotes/${quoteId}` : '/api/quotes';
      const method = quoteId ? 'PUT' : 'POST';
      
      const res = await apiRequest(method, endpoint, quoteData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al guardar el presupuesto');
      }
      
      // Éxito
      toast({
        title: quoteId ? 'Presupuesto actualizado' : 'Presupuesto creado',
        description: quoteId 
          ? 'El presupuesto ha sido actualizado correctamente'
          : 'El presupuesto ha sido creado correctamente',
      });
      
      // Invalidar consultas de presupuestos para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      
      // Navegar de vuelta a la lista de presupuestos
      navigate('/quotes');
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4">
      <form onSubmit={handleSubmit}>
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{quoteId ? 'Editar Presupuesto' : 'Crear Presupuesto'}</CardTitle>
              <CardDescription>Introduce los datos básicos para el presupuesto</CardDescription>
            </div>
            <Button 
              type="button"
              variant="outline" 
              className="flex items-center h-9"
              size="sm"
              onClick={() => toast({
                title: "Información",
                description: "El logo se puede subir después de crear el presupuesto, en la vista de detalles."
              })}
            >
              <Image className="mr-2 h-4 w-4" />
              Subir logo
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quoteNumber">Número de presupuesto</Label>
                <Input
                  id="quoteNumber"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="P-001"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientId">Cliente</Label>
                <Select
                  value={clientId}
                  onValueChange={setClientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                    <SelectItem value="accepted">Aceptado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descripción del servicio</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Servicios de consultoría"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Importe (sin impuestos)</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setAmount(value);
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            {/* Sección de impuestos */}
            <div className="border p-4 rounded-md bg-gray-50/50">
              <h3 className="text-base font-medium mb-3">Impuestos aplicables</h3>
              
              {/* Lista de impuestos actuales */}
              {taxes.length > 0 && (
                <div className="space-y-3 mb-4">
                  {taxes.map(tax => (
                    <div key={tax.id} className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor={`tax-name-${tax.id}`} className="text-xs">Nombre</Label>
                          <Input 
                            id={`tax-name-${tax.id}`}
                            value={tax.name}
                            onChange={(e) => updateTax(tax.id, 'name', e.target.value)}
                            placeholder="Nombre"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tax-amount-${tax.id}`} className="text-xs">Importe</Label>
                          <Input 
                            id={`tax-amount-${tax.id}`}
                            value={tax.amount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.-]/g, '');
                              updateTax(tax.id, 'amount', value);
                            }}
                            placeholder="Importe"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center h-8">
                            <input
                              id={`tax-percentage-${tax.id}`}
                              type="checkbox"
                              checked={tax.isPercentage}
                              onChange={(e) => updateTax(tax.id, 'isPercentage', e.target.checked)}
                              className="mr-2"
                            />
                            <Label htmlFor={`tax-percentage-${tax.id}`} className="text-xs">
                              Porcentaje
                            </Label>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTax(tax.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Formulario para añadir nuevo impuesto */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div>
                  <Label htmlFor="new-tax-name" className="text-xs">Nombre</Label>
                  <Input
                    id="new-tax-name"
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                    placeholder="Ej: IVA, IRPF"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="new-tax-amount" className="text-xs">Importe</Label>
                  <Input
                    id="new-tax-amount"
                    value={newTaxAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.-]/g, '');
                      setNewTaxAmount(value);
                    }}
                    placeholder="Ej: 21, -15"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex space-x-2">
                  <div className="flex items-center">
                    <input
                      id="new-tax-percentage"
                      type="checkbox"
                      checked={newTaxIsPercentage}
                      onChange={(e) => setNewTaxIsPercentage(e.target.checked)}
                      className="mr-2"
                    />
                    <Label htmlFor="new-tax-percentage" className="text-xs">
                      Porcentaje
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTax}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Añadir
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condiciones, plazos, etc."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="border-t pt-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>Subtotal:</span>
                  <span className="font-medium">{Number(subtotal).toFixed(2)} €</span>
                </div>
                
                {taxes.map(tax => (
                  <div className="flex justify-between" key={tax.id}>
                    <span>
                      {tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}:
                    </span>
                    <span>
                      {tax.isPercentage 
                        ? Number(subtotal * parseFloat(tax.amount || '0') / 100).toFixed(2)
                        : Number(parseFloat(tax.amount || '0')).toFixed(2)} €
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between border-t pt-2 mt-2 text-xl font-bold">
                  <span>Total:</span>
                  <span>{Number(total).toFixed(2)} €</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => navigate('/quotes')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : quoteId ? (
                'Actualizar presupuesto'
              ) : (
                'Crear presupuesto'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default QuoteFormMinimal;