import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Loader2, ArrowLeft, Receipt, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { calculateInvoice } from "@/utils/invoiceEngine";

// Define schema for additional tax
const additionalTaxSchema = z.object({
  name: z.string().min(1, "El nombre del impuesto es obligatorio"),
  amount: z.coerce.number(), 
  isPercentage: z.boolean().default(true)
});

// Define schema for line items
const invoiceItemSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.coerce.number().min(0.01, "La cantidad debe ser mayor que cero"),
  unitPrice: z.coerce.number().min(0.01, "El precio debe ser mayor que cero"),
  taxRate: z.coerce.number().min(0, "El IVA no puede ser negativo"),
  subtotal: z.coerce.number().min(0).optional(),
});

// Define schema for the whole invoice
const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio"),
  clientId: z.coerce.number({
    required_error: "El cliente es obligatorio",
  }),
  issueDate: z.string().min(1, "La fecha de emisión es obligatoria"),
  dueDate: z.string().min(1, "La fecha de vencimiento es obligatoria"),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0),
  taxTotal: z.coerce.number().min(0).optional(),
  total: z.coerce.number().min(0),
  additionalTaxes: z.array(additionalTaxSchema).optional().default([]),
  status: z.string().min(1, "El estado es obligatorio"),
  notes: z.string().nullable().optional(),
  attachments: z.array(z.string()).nullable().optional(),
  items: z.array(invoiceItemSchema).min(1, "Agrega al menos un ítem a la factura"),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const CreateInvoiceTestPage = () => {
  const [, navigate] = useLocation();
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/auth/session"],
  });

  // Cliente para pruebas
  const { data: clients = [], isLoading: clientsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const defaultFormValues = {
    invoiceNumber: "",
    clientId: 0,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    subtotal: 0,
    tax: 0,
    taxTotal: 0,
    total: 0,
    additionalTaxes: [],
    status: "pending",
    notes: "",
    attachments: [],
    items: [
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 21,
        subtotal: 0,
      },
    ],
  };

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: defaultFormValues,
  });
  
  // Asegurarse de que los campos estén registrados en el formulario
  useEffect(() => {
    form.register('subtotal');
    form.register('taxTotal');
    form.register('total');
  }, [form.register]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const {
    fields: taxFields,
    append: appendTax,
    remove: removeTax
  } = useFieldArray({
    control: form.control,
    name: "additionalTaxes",
  });

  function onSubmit(data: InvoiceFormValues) {
    console.log("Datos del formulario enviados:", data);
    alert("Factura creada con éxito (simulado)");
  }

  const handleAddTax = (type?: string) => {
    if (type === 'irpf') {
      appendTax({
        name: "IRPF",
        amount: -15,
        isPercentage: true
      });
    } else {
      appendTax({
        name: "IVA",
        amount: 21,
        isPercentage: true
      });
    }
    
    // Recalcular después de añadir impuesto
    setTimeout(() => {
      calculateInvoice(form);
    }, 100);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-full p-4 md:p-6">
      <div className="w-full flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => navigate("/invoices")}
            className="mr-3 flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500 mr-3">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              Crear factura (formulario de prueba)
            </h1>
            <p className="text-gray-500 text-sm mt-1 ml-1">
              Prueba de la función calculateInvoice para actualizar los totales
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de factura</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de factura" {...field} />
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
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientsLoading ? (
                        <SelectItem value="loading">Cargando...</SelectItem>
                      ) : clients.length > 0 ? (
                        clients.map((client) => (
                          <SelectItem
                            key={client.id}
                            value={client.id.toString()}
                          >
                            {client.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none">
                          No hay clientes disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de emisión</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de vencimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Ítems de la factura</h3>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-md">
                  <div className="col-span-12 md:col-span-6">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Descripción
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Descripción del ítem"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Cantidad
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Cantidad"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                                // Calcular totales al cambiar cantidad
                                setTimeout(() => {
                                  calculateInvoice(form);
                                }, 10);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Precio
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Precio"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                                // Calcular totales al cambiar precio
                                setTimeout(() => {
                                  calculateInvoice(form);
                                }, 10);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.taxRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            IVA %
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="IVA %"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value));
                                // Calcular totales al cambiar IVA
                                setTimeout(() => {
                                  calculateInvoice(form);
                                }, 10);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.subtotal`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={index !== 0 ? "sr-only" : ""}>
                            Subtotal
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              disabled
                              value={
                                form.getValues(`items.${index}.quantity`) *
                                form.getValues(`items.${index}.unitPrice`)
                              }
                              placeholder="Subtotal"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        remove(index);
                        // Calcular totales después de eliminar
                        setTimeout(() => {
                          calculateInvoice(form);
                        }, 10);
                      }}
                      disabled={fields.length === 1}
                      className="h-10 w-10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar ítem</span>
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    append({
                      description: "",
                      quantity: 1,
                      unitPrice: 0,
                      taxRate: 21,
                      subtotal: 0,
                    });
                    // Calcular totales después de añadir ítem
                    setTimeout(() => {
                      calculateInvoice(form);
                    }, 10);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir ítem
                </Button>
                
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddTax('irpf')}
                    className="mr-2"
                  >
                    Añadir IRPF (-15%)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddTax()}
                  >
                    Añadir IVA (21%)
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Impuestos adicionales */}
          {taxFields.length > 0 && (
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-medium mb-2">Impuestos adicionales</h3>
              <div className="space-y-4">
                {taxFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`additionalTaxes.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre del impuesto" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`additionalTaxes.${index}.amount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Porcentaje</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Porcentaje"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value));
                                  // Calcular totales al cambiar porcentaje
                                  setTimeout(() => {
                                    calculateInvoice(form);
                                  }, 10);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2 pt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeTax(index);
                          // Calcular totales después de eliminar impuesto
                          setTimeout(() => {
                            calculateInvoice(form);
                          }, 10);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar impuesto</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-full md:w-1/3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{form.watch('subtotal')} €</span>
                </div>
                {form.watch('taxTotal') !== 0 && (
                  <div className="flex justify-between">
                    <span>Impuestos adicionales:</span>
                    <span>{form.watch('taxTotal')} €</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{form.watch('total')} €</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales para la factura"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
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
                    <SelectItem value="pending">Pendiente de pago</SelectItem>
                    <SelectItem value="paid">Pagada</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/invoices")}
            >
              Cancelar
            </Button>
            <Button type="submit">Crear factura</Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateInvoiceTestPage;