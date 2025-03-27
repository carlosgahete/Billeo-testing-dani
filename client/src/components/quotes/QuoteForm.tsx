import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";

// Helper function to convert string to number
function toNumber(value: any, defaultValue = 0): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Define the form schema
const quoteSchema = z.object({
  quoteNumber: z.string().min(1, { message: "El número de presupuesto es obligatorio" }),
  clientId: z.string().min(1, { message: "El cliente es obligatorio" }),
  issueDate: z.date({ required_error: "La fecha de emisión es obligatoria" }),
  validUntil: z.date({ required_error: "La fecha de validez es obligatoria" }),
  status: z.string().default("draft"),
  notes: z.string().optional(),
  additionalTaxes: z.array(
    z.object({
      name: z.string().min(1, { message: "El nombre del impuesto es obligatorio" }),
      amount: z.preprocess(
        (val) => toNumber(val, 0),
        z.number()
      ),
      isPercentage: z.boolean().default(true),
    })
  ).optional(),
  items: z.array(
    z.object({
      description: z.string().min(1, { message: "La descripción es obligatoria" }),
      quantity: z.preprocess(
        (val) => toNumber(val, 0),
        z.number().min(0.01, { message: "La cantidad debe ser mayor que 0" })
      ),
      unitPrice: z.preprocess(
        (val) => toNumber(val, 0),
        z.number().min(0, { message: "El precio unitario no puede ser negativo" })
      ),
      taxRate: z.preprocess(
        (val) => toNumber(val, 0),
        z.number().min(0, { message: "El IVA no puede ser negativo" })
      ),
    })
  ).min(1, { message: "Debe agregar al menos un ítem al presupuesto" }),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
  quoteId?: number;
}

const QuoteForm = ({ quoteId }: QuoteFormProps) => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isEditMode = !!quoteId;
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  // Form setup
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      quoteNumber: "",
      clientId: "",
      issueDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days from now
      status: "draft",
      notes: "",
      additionalTaxes: [
        { name: "IRPF", amount: -15, isPercentage: true },
      ],
      items: [
        { description: "", quantity: 1, unitPrice: 0, taxRate: 21 },
      ],
    },
  });
  
  // Items field array
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Taxes field array
  const { fields: taxFields, append: appendTax, remove: removeTax } = useFieldArray({
    control: form.control,
    name: "additionalTaxes",
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch quote data for edit mode
  const { data: quoteData, isLoading: isQuoteLoading } = useQuery<any>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: isEditMode,
  });

  // Save/update quote mutation
  const quoteMutation = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      try {
        // Asegurar que los valores numéricos sean correctos y del tipo adecuado
        const formattedData = {
          ...data,
          // Asegurarnos de convertir strings a números explícitamente
          clientId: Number(data.clientId),
          subtotal: Number(subtotal.toFixed(2)),
          tax: Number(tax.toFixed(2)),
          total: Number(total.toFixed(2)),
          // Asegurar que las fechas estén en el formato correcto (ISO string)
          issueDate: data.issueDate.toISOString(),
          validUntil: data.validUntil.toISOString(),
          // Asegurar que additionalTaxes esté formateado correctamente
          additionalTaxes: data.additionalTaxes?.map(tax => ({
            ...tax,
            name: tax.name.trim(),
            amount: Number(tax.amount),
            isPercentage: Boolean(tax.isPercentage)
          })) || [],
          // Formatear los items para que todos los valores numéricos sean numbers
          items: data.items.map(item => ({
            ...item,
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate),
            subtotal: Number((Number(item.quantity) * Number(item.unitPrice)).toFixed(2))
          })),
        };
        
        console.log("Enviando datos formateados:", JSON.stringify(formattedData, null, 2));
        
        if (isEditMode) {
          const res = await apiRequest("PUT", `/api/quotes/${quoteId}`, formattedData);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Error desconocido" }));
            console.error("Error detallado:", errorData);
            throw new Error(`Error al actualizar el presupuesto: ${errorData.message || "Error desconocido"}`);
          }
          return await res.json();
        } else {
          const res = await apiRequest("POST", "/api/quotes", formattedData);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: "Error desconocido" }));
            console.error("Error detallado:", errorData);
            if (errorData.errors && errorData.errors.length > 0) {
              const errorDetails = errorData.errors.map((e: any) => 
                `${e.path?.join('.') || 'Campo'}: ${e.message || 'Error'}`
              ).join(', ');
              throw new Error(`Error de validación: ${errorDetails}`);
            }
            throw new Error(`Error al crear el presupuesto: ${errorData.message || "Error desconocido"}`);
          }
          return await res.json();
        }
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
    if (quoteData && quoteId && quoteData.quote && quoteData.items) {
      const quote = quoteData.quote;
      
      // Transform date strings to Date objects
      const formattedQuote = {
        ...quote,
        issueDate: new Date(quote.issueDate),
        validUntil: new Date(quote.validUntil),
        clientId: quote.clientId.toString(),
        additionalTaxes: quote.additionalTaxes || [],
      };
      
      // Reset the form with the quote data
      form.reset({
        ...formattedQuote,
        items: quoteData.items,
      });
    }
  }, [quoteData, quoteId, form]);

  // Calculate totals when items or taxes change
  useEffect(() => {
    const items = form.watch("items");
    const additionalTaxes = form.watch("additionalTaxes") || [];
    
    // Calculate subtotal and tax
    let calculatedSubtotal = 0;
    let calculatedTax = 0;
    
    items.forEach(item => {
      const quantity = toNumber(item.quantity);
      const unitPrice = toNumber(item.unitPrice);
      const taxRate = toNumber(item.taxRate);
      
      const itemSubtotal = quantity * unitPrice;
      const itemTax = itemSubtotal * (taxRate / 100);
      
      calculatedSubtotal += itemSubtotal;
      calculatedTax += itemTax;
    });
    
    // Calculate additional taxes
    let additionalTaxAmount = 0;
    additionalTaxes.forEach(tax => {
      if (tax.isPercentage) {
        additionalTaxAmount += calculatedSubtotal * (toNumber(tax.amount) / 100);
      } else {
        additionalTaxAmount += toNumber(tax.amount);
      }
    });
    
    // Update state
    setSubtotal(calculatedSubtotal);
    setTax(calculatedTax);
    setTotal(calculatedSubtotal + calculatedTax + additionalTaxAmount);
  }, [form.watch("items"), form.watch("additionalTaxes")]);

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
  
  // Add a new tax
  const addTax = () => {
    appendTax({ name: "", amount: 0, isPercentage: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic info */}
          <div className="space-y-6">
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
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de emisión</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="pl-3 text-left font-normal"
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Válido hasta</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className="pl-3 text-left font-normal"
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
                      <SelectItem value="expired">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales para el presupuesto"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Items and summary */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Partidas del presupuesto</h3>
              <p className="text-sm text-muted-foreground">
                Añade los diferentes conceptos, cantidades y precios
              </p>
            </div>
            
            {fields.map((field, index) => (
              <Card key={field.id} className="mb-4">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Input placeholder="Descripción del producto o servicio" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio unitario</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`items.${index}.taxRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IVA (%)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full mb-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir partida
            </Button>
            
            {/* Additional taxes */}
            <div className="mb-4">
              <h3 className="text-lg font-medium">Impuestos adicionales</h3>
              <p className="text-sm text-muted-foreground">
                Añade retenciones como IRPF, impuestos locales u otros
              </p>
            </div>
            
            {taxFields.map((field, index) => (
              <Card key={field.id} className="mb-4">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name={`additionalTaxes.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="IRPF, otro impuesto..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`additionalTaxes.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Importe / Porcentaje</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormDescription>
                              Usa valor negativo para retenciones
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`additionalTaxes.${index}.isPercentage`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="form-checkbox h-4 w-4"
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Es porcentaje (%)
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTax(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Button
              type="button"
              variant="outline"
              onClick={addTax}
              className="w-full mb-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir impuesto
            </Button>
            
            {/* Summary */}
            <div className="border rounded-lg p-4 mt-4 bg-muted/40">
              <div className="flex justify-between py-2">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span>IVA:</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between py-2 border-t mt-2 pt-2">
                <span className="font-bold">Total:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate("/quotes")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={quoteMutation.isPending}>
            {quoteMutation.isPending ? (
              <span>Guardando...</span>
            ) : isEditMode ? (
              "Actualizar presupuesto"
            ) : (
              "Crear presupuesto"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default QuoteForm;