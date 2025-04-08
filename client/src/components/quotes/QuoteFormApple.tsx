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
import { Loader2, Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import QuoteHeader from './QuoteHeader';

// Interfaz mínima para las props
interface QuoteFormProps {
  quoteId?: number;
}

// Interfaz para un impuesto personalizado
interface Tax {
  id: string;
  name: string;
  amount: string;
  isPercentage: boolean;
}

const QuoteFormApple: React.FC<QuoteFormProps> = ({ quoteId }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Estados para los campos básicos
  const [quoteNumber, setQuoteNumber] = useState('P-001');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('draft');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [validUntil, setValidUntil] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  
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
  
  // Cargar datos del presupuesto existente, si estamos en modo edición
  const { data: quoteData, isLoading: isLoadingQuote } = useQuery({
    queryKey: ['/api/quotes', quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      try {
        const res = await fetch(`/api/quotes/${quoteId}`);
        if (!res.ok) throw new Error('Error al cargar el presupuesto');
        return await res.json();
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar el presupuesto',
          variant: 'destructive',
        });
        return null;
      }
    },
    enabled: !!quoteId,
  });

  // Cuando se cargan los datos del presupuesto, actualizar el formulario
  useEffect(() => {
    if (quoteData && quoteId) {
      console.log('Cargando datos del presupuesto:', quoteData);
      
      const { quote, client, items } = quoteData;
      
      if (quote) {
        // Datos básicos
        setQuoteNumber(quote.quoteNumber || 'P-001');
        setClientId(quote.clientId?.toString() || '');
        setStatus(quote.status || 'draft');
        setNotes(quote.notes || '');
        
        // Ver si hay logo
        if (quote.logoUrl) {
          setLogoPreview(quote.logoUrl);
        }
        
        // Cargar fechas
        if (quote.issueDate) {
          try {
            const issueDateObj = new Date(quote.issueDate);
            if (!isNaN(issueDateObj.getTime())) {
              setIssueDate(issueDateObj);
            }
          } catch (error) {
            console.error('Error al procesar fecha de emisión:', error);
          }
        }
        
        if (quote.validUntil) {
          try {
            const validUntilObj = new Date(quote.validUntil);
            if (!isNaN(validUntilObj.getTime())) {
              setValidUntil(validUntilObj);
            }
          } catch (error) {
            console.error('Error al procesar fecha de validez:', error);
          }
        }
        
        // Items (en este formulario simplificado solo usamos un ítem)
        if (items && items.length > 0) {
          setDescription(items[0].description || '');
          // Asegurarnos de que el importe es un valor numérico válido
          const unitPrice = items[0].unitPrice || '0';
          setAmount(typeof unitPrice === 'string' ? unitPrice : '0');
        }
        
        // Impuestos
        if (quote.additionalTaxes && Array.isArray(quote.additionalTaxes)) {
          try {
            const formattedTaxes = quote.additionalTaxes.map((tax: any, index: number) => {
              // Asegurarnos de que el importe del impuesto es un valor válido
              let taxAmount = '0';
              if (tax.amount !== undefined && tax.amount !== null) {
                taxAmount = typeof tax.amount === 'number' 
                  ? tax.amount.toString() 
                  : (typeof tax.amount === 'string' ? tax.amount : '0');
              }
              
              return {
                id: (index + 1).toString(),
                name: tax.name || '',
                amount: taxAmount,
                isPercentage: tax.isPercentage === false ? false : true
              };
            });
            
            if (formattedTaxes.length > 0) {
              setTaxes(formattedTaxes);
            }
          } catch (error) {
            console.error('Error al procesar impuestos:', error);
            // Si hay algún error, mantener los impuestos por defecto
          }
        }
        
        // Después de cargar los datos, forzar un recálculo de totales
        setTimeout(() => {
          calculateTotals();
        }, 100);
      }
    }
  }, [quoteData, quoteId]);

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
    try {
      // Asegurarse de que amount es un número válido
      const subtotalValue = parseFloat(amount) || 0;
      
      // Calcular el valor de cada impuesto
      let totalTaxAmount = 0;
      taxes.forEach(tax => {
        try {
          const taxAmount = parseFloat(tax.amount) || 0;
          if (tax.isPercentage) {
            // Si es porcentaje, calcular sobre el subtotal
            totalTaxAmount += (subtotalValue * taxAmount / 100);
          } else {
            // Si es valor fijo, simplemente sumar
            totalTaxAmount += taxAmount;
          }
        } catch (err) {
          console.error('Error al calcular impuesto:', err);
          // Si falla un impuesto, continuamos con el siguiente
        }
      });
      
      // Verificar que los valores son números válidos antes de actualizar el estado
      if (isNaN(subtotalValue)) {
        setSubtotal(0);
      } else {
        setSubtotal(subtotalValue);
      }
      
      if (isNaN(totalTaxAmount)) {
        setTotal(subtotalValue);
      } else {
        setTotal(subtotalValue + totalTaxAmount);
      }
      
      console.log(`Subtotal: ${subtotalValue.toFixed(2)}€, Impuestos: ${totalTaxAmount.toFixed(2)}€, Total: ${(subtotalValue + totalTaxAmount).toFixed(2)}€`);
    } catch (error) {
      console.error('Error en calculateTotals:', error);
      // Si falla todo, establecemos valores por defecto
      setSubtotal(0);
      setTotal(0);
    }
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
  
  // Manejar selección de archivo de logo
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Manejar el cambio en el input de archivo
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato no válido",
          description: "Por favor, sube un archivo de imagen válido (JPEG, PNG, etc.)",
          variant: "destructive"
        });
        return;
      }
      
      // Guardar el archivo para enviarlo posteriormente
      setLogoFile(file);
      
      // Crear una URL para previsualizar la imagen
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      
      toast({
        title: "Logo seleccionado",
        description: "Se usará este logo al crear el presupuesto.",
      });
    }
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
      const quoteDataToSend = {
        quoteNumber,
        clientId: parseInt(clientId),
        status,
        notes,
        subtotal: Number(subtotal).toFixed(2),
        tax: "0.00", // Lo gestionamos con additionalTaxes
        total: Number(total).toFixed(2),
        issueDate: issueDate,
        validUntil: validUntil,
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
      
      const res = await apiRequest(method, endpoint, quoteDataToSend);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al guardar el presupuesto');
      }
      
      const responseData = await res.json();
      const newQuoteId = responseData.id || quoteId;
      
      // Si hay un logo seleccionado, subirlo
      if (logoFile && newQuoteId) {
        setIsUploading(true);
        
        try {
          const formData = new FormData();
          formData.append('quoteLogo', logoFile);
          
          const logoRes = await fetch(`/api/quotes/${newQuoteId}/logo`, {
            method: 'POST',
            body: formData,
          });
          
          if (!logoRes.ok) {
            const errorData = await logoRes.json();
            throw new Error(errorData.message || 'Error subiendo el logo');
          }
          
          toast({
            title: "Logo subido",
            description: "El logo se ha guardado correctamente",
          });
        } catch (error) {
          toast({
            title: "Error al subir logo",
            description: error instanceof Error ? error.message : 'Error desconocido',
            variant: "destructive",
          });
        } finally {
          setIsUploading(false);
        }
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

  // Mostrar indicador de carga durante la carga de datos del presupuesto
  if (isLoadingQuote && quoteId) {
    return (
      <div className="w-full px-4 flex items-center justify-center py-12">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <span className="text-lg">Cargando datos del presupuesto...</span>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-3">
      <form onSubmit={handleSubmit} className="fade-in">
        {/* Encabezado estilo Apple */}
        <QuoteHeader
          title={quoteId ? 'Editar Presupuesto' : 'Crear Presupuesto'}
          subtitle="Introduce los datos básicos para el presupuesto"
          isEdit={!!quoteId}
          logoPreview={logoPreview}
          isUploading={isUploading}
          onSelectFile={handleSelectFile}
        />
        
        {/* Contenido del formulario con estilo Apple */}
        <div className="dashboard-card mb-6 p-6">
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

            {/* Fecha de validez */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="validUntil">Fecha de validez</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="validUntil"
                    className={`w-full justify-start text-left font-normal`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, "d 'de' MMMM 'de' yyyy", { locale: es }) : <span>Selecciona una fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={(date) => date && setValidUntil(date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Este presupuesto será válido hasta esta fecha</p>
            </div>
          </div>
          
          <div className="space-y-2 mt-4">
            <Label htmlFor="description">Descripción del servicio</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Servicios de consultoría"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
          <div className="border p-4 rounded-md bg-gray-50/50 mt-6">
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
          
          <div className="space-y-2 mt-6">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condiciones, plazos, etc."
              className="min-h-[80px]"
            />
          </div>
          
          <div className="border-t pt-4 mt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {(isNaN(subtotal) ? 0 : subtotal).toFixed(2)} €
                </span>
              </div>
              
              {taxes.map(tax => {
                try {
                  // Asegurarse de que los cálculos son con números válidos
                  const taxAmountValue = parseFloat(tax.amount || '0') || 0;
                  const safeSubtotal = isNaN(subtotal) ? 0 : subtotal;
                  const taxValue = tax.isPercentage 
                    ? (safeSubtotal * taxAmountValue / 100)
                    : taxAmountValue;
                  
                  return (
                    <div className="flex justify-between" key={tax.id}>
                      <span>
                        {tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}:
                      </span>
                      <span>
                        {(isNaN(taxValue) ? 0 : taxValue).toFixed(2)} €
                      </span>
                    </div>
                  );
                } catch (err) {
                  console.error('Error al renderizar impuesto:', err);
                  // En caso de error, mostrar 0
                  return (
                    <div className="flex justify-between" key={tax.id}>
                      <span>{tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}:</span>
                      <span>0.00 €</span>
                    </div>
                  );
                }
              })}
              
              <div className="flex justify-between border-t pt-2 mt-2 text-xl font-bold">
                <span>Total:</span>
                <span>{(isNaN(total) ? 0 : total).toFixed(2)} €</span>
              </div>
            </div>
          </div>
          
          {/* Input oculto para el logo */}
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
          
          <div className="flex justify-end space-x-4 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/quotes')}>
              Cancelar
            </Button>
            <Button type="submit" className="button-apple" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? 'Subiendo logo...' : 'Guardando...'}
                </span>
              ) : quoteId ? (
                'Actualizar presupuesto'
              ) : (
                'Crear presupuesto'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QuoteFormApple;