import React, { useState, useEffect } from 'react';
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
import { Loader2, X } from 'lucide-react';

// Interfaz mínima para las props
interface QuoteFormMinimalProps {
  quoteId?: number;
}

// Interfaz para un impuesto
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
  
  // Impuestos preestablecidos comunes
  const [ivaEnabled, setIvaEnabled] = useState(true);
  const [irpfEnabled, setIrpfEnabled] = useState(true);
  
  // Cálculos de impuestos y totales
  const [subtotal, setSubtotal] = useState(0);
  const [totalIVA, setTotalIVA] = useState(0);
  const [totalIRPF, setTotalIRPF] = useState(0);
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

  // Calcular totales cuando cambia el importe o los impuestos
  useEffect(() => {
    const subtotalValue = parseFloat(amount) || 0;
    setSubtotal(subtotalValue);
    
    // Calcular IVA (21%) si está habilitado
    const ivaValue = ivaEnabled ? subtotalValue * 0.21 : 0;
    setTotalIVA(ivaValue);
    
    // Calcular IRPF (-15%) si está habilitado
    const irpfValue = irpfEnabled ? subtotalValue * -0.15 : 0;
    setTotalIRPF(irpfValue);
    
    // Calcular total
    const totalValue = subtotalValue + ivaValue + irpfValue;
    setTotal(totalValue);
    
    console.log(`Subtotal: ${subtotalValue}€, IVA: ${ivaValue}€, IRPF: ${irpfValue}€, Total: ${totalValue}€`);
  }, [amount, ivaEnabled, irpfEnabled]);

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
      // Preparar lista de impuestos adicionales
      const additionalTaxes = [];
      
      if (ivaEnabled) {
        additionalTaxes.push({
          name: 'IVA',
          amount: '21',
          isPercentage: true
        });
      }
      
      if (irpfEnabled) {
        additionalTaxes.push({
          name: 'IRPF',
          amount: '-15',
          isPercentage: true
        });
      }
      
      // Preparar datos para enviar
      const quoteData = {
        quoteNumber,
        clientId: parseInt(clientId),
        status,
        notes,
        subtotal: subtotal.toFixed(2),
        tax: totalIVA.toFixed(2), // Solo IVA como impuesto principal
        total: total.toFixed(2),
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        additionalTaxes,
        // Añadir un solo ítem con la descripción y el monto
        items: [
          {
            description: description || 'Servicio profesional',
            quantity: '1',
            unitPrice: amount,
            taxRate: ivaEnabled ? '21' : '0',
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
            
            {/* Impuestos simplificados */}
            <div className="border-t border-b py-4">
              <h3 className="text-sm font-medium mb-3">Impuestos aplicables</h3>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="ivaEnabled"
                    checked={ivaEnabled}
                    onChange={(e) => setIvaEnabled(e.target.checked)}
                    className="mr-2 rounded border-gray-300"
                  />
                  <Label htmlFor="ivaEnabled" className="text-sm">IVA (21%)</Label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="irpfEnabled"
                    checked={irpfEnabled}
                    onChange={(e) => setIrpfEnabled(e.target.checked)}
                    className="mr-2 rounded border-gray-300"
                  />
                  <Label htmlFor="irpfEnabled" className="text-sm">IRPF (-15%)</Label>
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
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} €</span>
                </div>
                
                {ivaEnabled && (
                  <div className="flex justify-between">
                    <span>IVA (21%):</span>
                    <span>{totalIVA.toFixed(2)} €</span>
                  </div>
                )}
                
                {irpfEnabled && (
                  <div className="flex justify-between">
                    <span>IRPF (-15%):</span>
                    <span>{totalIRPF.toFixed(2)} €</span>
                  </div>
                )}
                
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