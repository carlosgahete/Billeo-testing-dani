import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Función para convertir valores a números de forma segura
function toNumber(value: any, defaultValue = 0): number {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleanValue = value.replace(/[€$,\s]/g, "");
    const number = parseFloat(cleanValue);
    return isNaN(number) ? defaultValue : number;
  }
  return defaultValue;
}

// Definir el esquema de validación
const quoteSchema = z.object({
  quoteNumber: z.string().min(1, "El número de presupuesto es obligatorio"),
  clientId: z.string().min(1, "Debes seleccionar un cliente"),
  issueDate: z.date({
    required_error: "La fecha de emisión es obligatoria",
  }),
  validUntil: z.date({
    required_error: "La fecha de validez es obligatoria",
  }),
  status: z.string(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1, "La descripción es obligatoria"),
        quantity: z.union([z.string(), z.number()]),
        unitPrice: z.union([z.string(), z.number()]),
        taxRate: z.union([z.string(), z.number()]),
      })
    )
    .min(1, "Debes añadir al menos un concepto"),
  // Simplificamos los impuestos adicionales para evitar errores
  irpfRate: z.union([z.string(), z.number()]).optional(),
});

// Tipo para los valores del formulario
type QuoteFormValues = z.infer<typeof quoteSchema>;

// Props del componente
interface QuoteFormProps {
  quoteId?: number;
}

const QuoteFormSimple = ({ quoteId }: QuoteFormProps) => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEditMode = !!quoteId;
  
  // Estado para cálculos derivados
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [irpfAmount, setIrpfAmount] = useState(0);
  const [total, setTotal] = useState(0);
  
  // Cargar datos del presupuesto si estamos en modo edición
  const { data: quoteData } = useQuery({
    queryKey: ["/api/quotes", quoteId],
    queryFn: quoteId ? getQueryFn() : () => undefined,
    enabled: !!quoteId,
  });
  
  // Cargar clientes
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn(),
  });
  
  // Inicializar el formulario
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quoteNumber: "",
      clientId: "",
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "draft",
      notes: "",
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 21,
        },
      ],
      irpfRate: -15, // IRPF por defecto a -15%
    },
  });
  
  // Field arrays para items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Calcular subtotal, IVA, IRPF y total cuando cambian los items o el IRPF
  useEffect(() => {
    const watchItems = form.watch("items");
    const irpfRate = toNumber(form.watch("irpfRate"));
    
    // Calcular subtotal sumando todos los items
    let calculatedSubtotal = 0;
    let calculatedTax = 0;
    
    if (watchItems && Array.isArray(watchItems)) {
      calculatedSubtotal = watchItems.reduce((acc, item) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);
        return acc + quantity * unitPrice;
      }, 0);
      
      // Calcular IVA
      calculatedTax = watchItems.reduce((acc, item) => {
        const quantity = toNumber(item.quantity);
        const unitPrice = toNumber(item.unitPrice);
        const taxRate = toNumber(item.taxRate) / 100;
        return acc + quantity * unitPrice * taxRate;
      }, 0);
    }
    
    // Calcular IRPF (siempre como porcentaje del subtotal)
    const calculatedIrpf = calculatedSubtotal * (irpfRate / 100);
    
    // Calcular total (subtotal + IVA + IRPF)
    const calculatedTotal = calculatedSubtotal + calculatedTax + calculatedIrpf;
    
    setSubtotal(calculatedSubtotal);
    setTax(calculatedTax);
    setIrpfAmount(calculatedIrpf);
    setTotal(calculatedTotal);
  }, [form.watch("items"), form.watch("irpfRate")]);
  
  // Mutación para guardar/actualizar el presupuesto
  const quoteMutation = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      try {
        const endpoint = isEditMode
          ? `/api/quotes/${quoteId}`
          : "/api/quotes";
        const method = isEditMode ? "PUT" : "POST";
        
        // Construir los impuestos adicionales (solo IRPF por ahora)
        const additionalTaxes = [];
        if (data.irpfRate) {
          additionalTaxes.push({
            name: "IRPF",
            amount: data.irpfRate.toString(),
            isPercentage: true
          });
        }
        
        // Asegurar que los valores numéricos sean correctos
        const formattedData = {
          ...data,
          // Eliminar irpfRate que no es parte del modelo en el servidor
          irpfRate: undefined,
          // Convertir clientId a número
          clientId: Number(data.clientId),
          // Calcular y usar estos valores
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          // Configurar impuestos adicionales
          additionalTaxes: additionalTaxes,
          // Formatear los items
          items: data.items.map(item => ({
            ...item,
            description: item.description.trim(),
            quantity: toNumber(item.quantity).toString(),
            unitPrice: toNumber(item.unitPrice).toString(),
            taxRate: toNumber(item.taxRate).toString(),
            subtotal: (toNumber(item.quantity) * toNumber(item.unitPrice)).toFixed(2)
          }))
        };
        
        const res = await apiRequest(method, endpoint, formattedData);
        
        if (!res.ok) {
          const errorData = await res.json();
          if (errorData.errors) {
            const errorDetails = errorData.errors.map((e: any) => 
              `${e.path?.join('.') || 'Campo'}: ${e.message || 'Error'}`
            ).join(', ');
            throw new Error(`Error de validación: ${errorDetails}`);
          }
          throw new Error(`Error al crear el presupuesto: ${errorData.message || "Error desconocido"}`);
        }
        return await res.json();
      } catch (error) {
        console.error("Error en mutación:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Presupuesto actualizado" : "Presupuesto creado",
        description: isEditMode
          ? "El presupuesto ha sido actualizado correctamente."
          : "El presupuesto ha sido creado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate("/quotes");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load quote data into form if editing
  useEffect(() => {
    if (quoteData && quoteId) {
      try {
        const quote = quoteData.quote || {};
        const items = quoteData.items || [];
        
        // Buscar el IRPF en additionalTaxes si existe
        let irpfRate = -15; // valor por defecto
        if (quote.additionalTaxes && Array.isArray(quote.additionalTaxes)) {
          const irpfTax = quote.additionalTaxes.find(tax => 
            tax.name === "IRPF" && tax.isPercentage);
          if (irpfTax) {
            irpfRate = Number(irpfTax.amount);
          }
        }
        
        // Transform date strings to Date objects
        const formattedQuote = {
          ...quote,
          issueDate: quote.issueDate ? new Date(quote.issueDate) : new Date(),
          validUntil: quote.validUntil ? new Date(quote.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          clientId: quote.clientId?.toString() || "",
          irpfRate: irpfRate,
        };
        
        // Reset the form with the quote data
        form.reset({
          ...formattedQuote,
          items: items.length > 0 ? items : [{ description: "", quantity: 1, unitPrice: 0, taxRate: 21 }],
        });
      } catch (error) {
        console.error("Error al cargar datos del presupuesto:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del presupuesto",
          variant: "destructive",
        });
      }
    }
  }, [quoteData, quoteId, form, toast]);

  // Handle form submission
  const handleSubmit = (data: QuoteFormValues) => {
    quoteMutation.mutate(data);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };
  
  // Add a new item
  const addItem = () => {
    append({ description: "", quantity: 1, unitPrice: 0, taxRate: 21 });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 max-w-4xl mx-auto">
        
        {/* Cabecera del presupuesto */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-primary">
              {isEditMode ? "Editar presupuesto" : "Nuevo presupuesto"}
            </h2>
            <p className="text-muted-foreground">
              Completa la información básica del presupuesto
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="quoteNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de presupuesto</FormLabel>
                    <FormControl>
                      <Input placeholder="P-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="accepted">Aceptado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Columna derecha */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de emisión</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          locale={es}
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="validUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Válido hasta</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: es })
                            ) : (
                              <span>Selecciona una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          locale={es}
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Por ejemplo: Las condiciones de pago son 50% por adelantado, resto a la entrega..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
          
        {/* Partidas del presupuesto */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-primary">Conceptos a facturar</h3>
              <p className="text-sm text-muted-foreground">
                Añade los diferentes productos o servicios
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              size="sm"
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Títulos de la tabla */}
            <div className="grid grid-cols-12 gap-4 font-medium text-sm px-2 py-2 bg-muted border-b">
              <div className="col-span-6">Descripción</div>
              <div className="col-span-2 text-center">Cantidad</div>
              <div className="col-span-2 text-center">Precio</div>
              <div className="col-span-1 text-center">IVA</div>
              <div className="col-span-1 text-right"></div>
            </div>
            
            {/* Filas de conceptos */}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-4 items-center text-sm px-2 py-2 rounded-md bg-white border">
                <div className="col-span-6">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input 
                            placeholder="Ej: Diseño web, Consultoría, etc." 
                            {...field} 
                            className="border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            className="text-center border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={() => {
                              const items = form.getValues("items");
                              if (Array.isArray(items)) {
                                form.setValue("items", [...items], { shouldValidate: false });
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input 
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00" 
                            className="text-center border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                            {...field} 
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/[€$,\s]/g, '');
                              field.onChange(cleanValue);
                            }} 
                            onBlur={() => {
                              const items = form.getValues("items");
                              if (Array.isArray(items)) {
                                form.setValue("items", [...items], { shouldValidate: false });
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name={`items.${index}.taxRate`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input 
                            type="text"
                            inputMode="numeric"
                            className="text-center border-none shadow-none focus-visible:ring-0 px-0 py-1 h-9"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={() => {
                              const items = form.getValues("items");
                              if (Array.isArray(items)) {
                                form.setValue("items", [...items], { shouldValidate: false });
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Impuestos y retenciones */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-primary">Retención IRPF</h3>
              <p className="text-sm text-muted-foreground">
                Configura la retención de IRPF aplicable
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="irpfRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porcentaje de retención IRPF (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="text"
                      inputMode="decimal"
                      placeholder="-15" 
                      {...field} 
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[€$,\s]/g, '');
                        field.onChange(cleanValue);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Usa valor negativo para retenciones (ej: -15 para el 15% de IRPF)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Resumen y totales */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <div className="w-full md:w-1/2 ml-auto space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">IVA:</span>
              <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">IRPF:</span>
              <span className="font-medium">{formatCurrency(irpfAmount)}</span>
            </div>
            <div className="flex justify-between py-3 border-t mt-2 pt-3">
              <span className="text-lg font-bold">Total:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        
        {/* Acciones del formulario */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button type="button" variant="outline" onClick={() => navigate("/quotes")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={quoteMutation.isPending} className="px-8">
            {quoteMutation.isPending ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </span>
            ) : isEditMode ? (
              "Guardar cambios"
            ) : (
              "Crear presupuesto"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default QuoteFormSimple;