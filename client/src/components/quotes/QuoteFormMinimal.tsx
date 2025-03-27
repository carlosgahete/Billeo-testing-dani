import React, { useState, useEffect } from 'react';
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
  
  // Estados para impuestos adicionales
  const [extraTaxName, setExtraTaxName] = useState('');
  const [extraTaxAmount, setExtraTaxAmount] = useState('0');
  const [extraTaxIsPercentage, setExtraTaxIsPercentage] = useState(true);
  const [hasExtraTax, setHasExtraTax] = useState(false);

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
      // Calcular IVA (21%)
      const subtotalValue = parseFloat(amount) || 0;
      const taxValue = subtotalValue * 0.21;
      // IRPF -15%
      const irpfValue = subtotalValue * -0.15;
      const totalValue = subtotalValue + taxValue + irpfValue;
      
      // Calcular valor del impuesto adicional si existe
      let extraTaxValue = 0;
      if (hasExtraTax && extraTaxName) {
        if (extraTaxIsPercentage) {
          extraTaxValue = subtotalValue * (parseFloat(extraTaxAmount) / 100);
        } else {
          extraTaxValue = parseFloat(extraTaxAmount);
        }
      }
      
      // Calcular total incluyendo el impuesto adicional
      const adjustedTotal = totalValue + extraTaxValue;
      
      // Preparar datos para enviar
      const quoteData = {
        quoteNumber,
        clientId: parseInt(clientId),
        status,
        notes,
        subtotal: subtotalValue.toFixed(2),
        tax: taxValue.toFixed(2),
        total: adjustedTotal.toFixed(2),
        issueDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        // Añadir IRPF como impuesto adicional y el impuesto extra si existe
        additionalTaxes: hasExtraTax && extraTaxName
          ? [
              {
                name: 'IRPF',
                amount: '-15',
                isPercentage: true
              },
              {
                name: extraTaxName,
                amount: extraTaxAmount,
                isPercentage: extraTaxIsPercentage
              }
            ]
          : [
              {
                name: 'IRPF',
                amount: '-15',
                isPercentage: true
              }
            ],
        // Añadir un solo ítem con la descripción y el monto
        items: [
          {
            description: description || 'Servicio profesional',
            quantity: '1',
            unitPrice: amount,
            taxRate: '21',
            subtotal: subtotalValue.toFixed(2)
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
                <Label htmlFor="amount">Importe (sin IVA)</Label>
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
            
            {/* Impuestos adicionales */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasExtraTax"
                  checked={hasExtraTax}
                  onChange={(e) => setHasExtraTax(e.target.checked)}
                  className="rounded border-gray-300 focus:ring-primary"
                />
                <Label htmlFor="hasExtraTax">Añadir impuesto adicional</Label>
              </div>
              
              {hasExtraTax && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="extraTaxName">Nombre del impuesto</Label>
                    <Input
                      id="extraTaxName"
                      value={extraTaxName}
                      onChange={(e) => setExtraTaxName(e.target.value)}
                      placeholder="Ej: Recargo"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="extraTaxAmount">Valor</Label>
                    <Input
                      id="extraTaxAmount"
                      type="text"
                      inputMode="decimal"
                      value={extraTaxAmount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.-]/g, '');
                        setExtraTaxAmount(value);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="extraTaxType">Tipo</Label>
                    <Select
                      value={extraTaxIsPercentage ? "percentage" : "fixed"}
                      onValueChange={(value) => setExtraTaxIsPercentage(value === "percentage")}
                    >
                      <SelectTrigger id="extraTaxType">
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed">Importe fijo (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t pt-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{parseFloat(amount || '0').toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (21%):</span>
                  <span>{(parseFloat(amount || '0') * 0.21).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>IRPF (-15%):</span>
                  <span>{(parseFloat(amount || '0') * -0.15).toFixed(2)} €</span>
                </div>
                
                {hasExtraTax && extraTaxName && (
                  <div className="flex justify-between">
                    <span>{extraTaxName} {extraTaxIsPercentage ? `(${extraTaxAmount}%)` : ''}:</span>
                    <span>
                      {extraTaxIsPercentage 
                        ? (parseFloat(amount || '0') * parseFloat(extraTaxAmount || '0') / 100).toFixed(2)
                        : parseFloat(extraTaxAmount || '0').toFixed(2)} €
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total:</span>
                  <span>
                    {(
                      parseFloat(amount || '0') + 
                      parseFloat(amount || '0') * 0.21 + 
                      parseFloat(amount || '0') * -0.15 +
                      (hasExtraTax && extraTaxName 
                        ? (extraTaxIsPercentage 
                          ? parseFloat(amount || '0') * parseFloat(extraTaxAmount || '0') / 100 
                          : parseFloat(extraTaxAmount || '0'))
                        : 0)
                    ).toFixed(2)} €
                  </span>
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