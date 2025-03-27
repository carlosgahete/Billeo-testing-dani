import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
import { Loader2 } from 'lucide-react';

// Interfaz mínima para las props
interface QuoteFormMinimalProps {
  quoteId?: number;
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
  
  // Estados para impuestos
  const [taxes, setTaxes] = useState<Array<{
    id: string;
    name: string;
    amount: string;
    isPercentage: boolean;
  }>>([]);
  const [taxName, setTaxName] = useState('');
  const [taxAmount, setTaxAmount] = useState('0');
  const [taxIsPercentage, setTaxIsPercentage] = useState(true);

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

  // Calcular los totales basados en el subtotal y los impuestos
  const calculateTotals = () => {
    const subtotal = parseFloat(amount) || 0;
    let taxesTotal = 0;
    
    taxes.forEach(tax => {
      if (tax.isPercentage) {
        taxesTotal += subtotal * parseFloat(tax.amount || '0') / 100;
      } else {
        taxesTotal += parseFloat(tax.amount || '0');
      }
    });
    
    return {
      subtotal,
      taxesTotal,
      total: subtotal + taxesTotal
    };
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
      const { subtotal, total } = calculateTotals();
      
      // Preparar datos para enviar
      const quoteData = {
        quoteNumber,
        clientId: parseInt(clientId),
        status,
        notes,
        subtotal: subtotal.toFixed(2),
        tax: '0.00', // Ya está incluido en additionalTaxes
        total: total.toFixed(2),
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        // Usar los impuestos introducidos por el usuario
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
            taxRate: '0', // Los impuestos se gestionan a nivel de presupuesto
            subtotal: subtotal.toFixed(2)
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

  const { subtotal, taxesTotal, total } = calculateTotals();

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{quoteId ? 'Editar Presupuesto' : 'Crear Presupuesto'}</CardTitle>
            <CardDescription>Introduce los datos básicos para el presupuesto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quoteNumber">Número de presupuesto</Label>
                <Input
                  id="quoteNumber"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="P-001"
                />
              </div>
              
              <div className="space-y-2">
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
            
            {/* Impuestos */}
            <div className="border-t border-b py-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Impuestos aplicables</h3>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (!taxName.trim()) {
                      toast({
                        title: 'Error',
                        description: 'Introduce un nombre para el impuesto',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    // Asegurarse de que el valor del impuesto sea un número válido
                    const parsedAmount = parseFloat(taxAmount);
                    if (isNaN(parsedAmount)) {
                      toast({
                        title: 'Error',
                        description: 'El valor del impuesto debe ser un número válido',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    console.log('Añadiendo impuesto:', {
                      name: taxName,
                      amount: taxAmount,
                      isPercentage: taxIsPercentage
                    });
                    
                    // Añadir el impuesto a la lista
                    setTaxes(prevTaxes => [
                      ...prevTaxes, 
                      {
                        id: Date.now().toString(),
                        name: taxName,
                        amount: taxAmount,
                        isPercentage: taxIsPercentage
                      }
                    ]);
                    
                    // Limpiar los campos
                    setTaxName('');
                    setTaxAmount('0');
                  }}
                >
                  Añadir impuesto
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="taxName">Nombre</Label>
                  <Input
                    id="taxName"
                    value={taxName}
                    onChange={(e) => setTaxName(e.target.value)}
                    placeholder="Ej: IVA, IRPF"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="taxAmount">Valor</Label>
                  <Input
                    id="taxAmount"
                    type="text"
                    inputMode="decimal"
                    value={taxAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.-]/g, '');
                      setTaxAmount(value);
                    }}
                    placeholder="Ej: 21, -15"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="taxType">Tipo</Label>
                  <Select
                    value={taxIsPercentage ? "percentage" : "fixed"}
                    onValueChange={(value) => setTaxIsPercentage(value === "percentage")}
                  >
                    <SelectTrigger id="taxType">
                      <SelectValue placeholder="Tipo de valor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Importe fijo (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Lista de impuestos añadidos */}
              {taxes.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-medium">Impuestos añadidos:</h4>
                  <div className="space-y-2">
                    {taxes.map((tax) => (
                      <div 
                        key={tax.id} 
                        className="flex justify-between items-center p-2 bg-muted rounded-md"
                      >
                        <div>
                          <span className="font-medium">{tax.name}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {tax.isPercentage ? `${tax.amount}%` : `${tax.amount}€`}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTaxes(taxes.filter((t) => t.id !== tax.id));
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} €</span>
                </div>
                
                {taxes.map((tax) => (
                  <div className="flex justify-between" key={tax.id}>
                    <span>{tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}:</span>
                    <span>
                      {tax.isPercentage 
                        ? (subtotal * parseFloat(tax.amount || '0') / 100).toFixed(2)
                        : parseFloat(tax.amount || '0').toFixed(2)} €
                    </span>
                  </div>
                ))}
                
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total:</span>
                  <span>{total.toFixed(2)} €</span>
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