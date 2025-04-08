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
import { Loader2, Plus, X, Calendar as CalendarIcon, Image } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Props del componente
interface QuoteFormProps {
  quoteId?: number;
}

// Interfaz para un impuesto
interface Tax {
  id: string;
  name: string;
  amount: string;
  isPercentage: boolean;
}

const QuoteFormSimple: React.FC<QuoteFormProps> = ({ quoteId }) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Estado para los campos básicos
  const [quoteNumber, setQuoteNumber] = useState('P-001');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState('draft');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [validUntil, setValidUntil] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  
  // Estado para impuestos (IVA, IRPF)
  const [taxes, setTaxes] = useState<Tax[]>([
    { id: '1', name: 'IVA', amount: '21', isPercentage: true },
    { id: '2', name: 'IRPF', amount: '-15', isPercentage: true }
  ]);
  
  // Cálculos de impuestos y totales
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Cargar datos del presupuesto existente (en modo edición)
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
      const { quote, items } = quoteData;
      
      if (quote) {
        // Datos básicos
        setQuoteNumber(quote.quoteNumber || 'P-001');
        setClientId(quote.clientId?.toString() || '');
        setStatus(quote.status || 'draft');
        setNotes(quote.notes || '');
        
        // Logo
        if (quote.logoUrl) {
          setLogoPreview(quote.logoUrl);
        }
        
        // Fechas
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
          setAmount(typeof items[0].unitPrice === 'string' ? items[0].unitPrice : '0');
        }
        
        // Impuestos
        if (quote.additionalTaxes && Array.isArray(quote.additionalTaxes)) {
          try {
            const formattedTaxes = quote.additionalTaxes.map((tax: any, index: number) => ({
              id: (index + 1).toString(),
              name: tax.name || '',
              amount: typeof tax.amount === 'number' ? tax.amount.toString() : tax.amount || '0',
              isPercentage: tax.isPercentage === false ? false : true
            }));
            
            if (formattedTaxes.length > 0) {
              setTaxes(formattedTaxes);
            }
          } catch (error) {
            console.error('Error al procesar impuestos:', error);
          }
        }
        
        // Recalcular totales
        setTimeout(calculateTotals, 100);
      }
    }
  }, [quoteData, quoteId]);

  // Cargar clientes
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
  const clients = Array.isArray(clientsData) ? clientsData : [];

  // Función para calcular los totales
  const calculateTotals = () => {
    try {
      const subtotalValue = parseFloat(amount) || 0;
      
      // Calcular impuestos
      let totalTaxAmount = 0;
      taxes.forEach(tax => {
        try {
          const taxAmount = parseFloat(tax.amount) || 0;
          if (tax.isPercentage) {
            totalTaxAmount += (subtotalValue * taxAmount / 100);
          } else {
            totalTaxAmount += taxAmount;
          }
        } catch (err) {
          console.error('Error al calcular impuesto:', err);
        }
      });
      
      setSubtotal(subtotalValue);
      setTotal(subtotalValue + totalTaxAmount);
    } catch (error) {
      console.error('Error en calculateTotals:', error);
      setSubtotal(0);
      setTotal(0);
    }
  };

  // Recalcular cuando cambian los valores relevantes
  useEffect(() => {
    calculateTotals();
  }, [amount, taxes]);

  // Manejar selección de archivo de logo
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Manejar el cambio en el input de archivo
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato no válido",
          description: "Por favor, sube un archivo de imagen válido (JPEG, PNG, etc.)",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
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
        // Añadir un solo ítem
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
      
      toast({
        title: quoteId ? 'Presupuesto actualizado' : 'Presupuesto creado',
        description: quoteId 
          ? 'El presupuesto ha sido actualizado correctamente'
          : 'El presupuesto ha sido creado correctamente',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
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

  // Mostrar indicador de carga
  if (isLoadingQuote && quoteId) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
        <span>Cargando datos del presupuesto...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="fade-in max-w-4xl mx-auto">
      {/* Cabecera con estilo Apple */}
      <div className="bg-white rounded-lg p-6 mb-5 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="bg-[#FFF6F0] p-3 rounded-full mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#FF9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800 tracking-tight leading-none">
              {quoteId ? 'Editar Presupuesto' : 'Crear Presupuesto'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 leading-tight">
              Introduce los datos básicos para el presupuesto
            </p>
          </div>
        </div>
        
        <div className="flex items-center mt-4">
          {logoPreview && (
            <div className="relative h-10 w-10 rounded-full overflow-hidden border shadow-sm mr-3">
              <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain bg-white" />
            </div>
          )}
          <Button 
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSelectFile}
            disabled={isUploading}
            className="flex items-center text-xs rounded-full h-8"
          >
            {isUploading ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Image className="mr-1 h-3 w-3" />
            )}
            {logoPreview ? "Cambiar logo" : "Subir logo"}
          </Button>
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>
      
      {/* Formulario principal */}
      <div className="bg-white rounded-lg p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Número y Cliente */}
          <div className="space-y-2">
            <Label htmlFor="quoteNumber" className="text-sm font-medium">Número de presupuesto</Label>
            <Input
              id="quoteNumber"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="P-001"
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientId" className="text-sm font-medium">Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="h-9">
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
          
          {/* Estado y Fecha de validez */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">Estado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9">
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
          <div className="space-y-2">
            <Label htmlFor="validUntil" className="text-sm font-medium">Válido hasta</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="validUntil"
                  className={`w-full justify-start text-left font-normal h-9`}
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
          </div>
        </div>
        
        {/* Descripción y Cantidad */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Descripción del servicio</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Servicios de consultoría"
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium">Importe (sin impuestos)</Label>
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
            className="h-9"
          />
        </div>
        
        {/* Notas adicionales */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">Notas adicionales</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condiciones, plazos, etc."
            className="min-h-[80px] resize-none"
          />
        </div>
        
        {/* Resumen de impuestos */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            
            {taxes.map(tax => {
              try {
                const taxAmountValue = parseFloat(tax.amount) || 0;
                const taxValue = tax.isPercentage 
                  ? (subtotal * taxAmountValue / 100)
                  : taxAmountValue;
                
                return (
                  <div className="flex justify-between text-sm" key={tax.id}>
                    <span className="text-gray-500">
                      {tax.name} {tax.isPercentage ? `(${tax.amount}%)` : ''}:
                    </span>
                    <span>{taxValue.toFixed(2)} €</span>
                  </div>
                );
              } catch (err) {
                return null;
              }
            })}
            
            <div className="flex justify-between pt-1.5 mt-1.5 border-t border-gray-100 font-medium">
              <span>Total:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex justify-end space-x-3 pt-4 mt-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/quotes')}
            className="rounded-full px-4 h-9"
          >
            Cancelar
          </Button>
          <Button 
            type="submit"  
            disabled={isSubmitting}
            className="rounded-full bg-[#007AFF] hover:bg-blue-600 px-4 h-9"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </span>
            ) : (
              quoteId ? 'Actualizar' : 'Crear presupuesto'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default QuoteFormSimple;