import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { CalendarIcon, Calculator, Building2, Receipt, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// Esquema del formulario mejorado
const enhancedExpenseSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  expenseDate: z.date(),
  categoryId: z.coerce.number().optional().nullable(),
  paymentMethod: z.string().min(1, "El método de pago es obligatorio"),
  
  // Información del proveedor
  supplierName: z.string().optional(),
  supplierTaxId: z.string().optional().refine(
    (val) => !val || /^[A-Z]?\d{8}[A-Z]?$/i.test(val),
    "El CIF/NIF debe tener un formato válido"
  ),
  
  // Información fiscal
  netAmount: z.coerce.number().min(0.01, "El importe neto debe ser mayor que 0"),
  vatRate: z.coerce.number().min(0).max(100).default(21),
  vatAmount: z.coerce.number().min(0).optional(),
  vatDeductiblePercent: z.coerce.number().min(0).max(100).default(100),
  irpfRate: z.coerce.number().min(0).max(100).default(0),
  irpfAmount: z.coerce.number().min(0).optional(),
  totalAmount: z.coerce.number().min(0.01, "El importe total debe ser mayor que 0"),
  
  // Deducibilidad
  deductibleForCorporateTax: z.boolean().default(true),
  deductibleForIrpf: z.boolean().default(true),
  deductiblePercent: z.coerce.number().min(0).max(100).default(100),
  
  // Información adicional
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type EnhancedExpenseFormValues = z.infer<typeof enhancedExpenseSchema>;

interface EnhancedExpenseFormProps {
  expenseId?: number;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
}

interface ExpenseType {
  id: number;
  name: string;
  defaultVatRate: number;
  defaultVatDeductiblePercent: number;
  defaultDeductibleForCorporateTax: boolean;
  defaultDeductibleForIrpf: boolean;
  defaultDeductiblePercent: number;
}

const EnhancedExpenseForm = ({ expenseId }: EnhancedExpenseFormProps) => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [autoCalculate, setAutoCalculate] = useState(true);
  
  const isEditMode = !!expenseId;

  // Fetch categories for dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Fetch expense types for quick setup
  const { data: expenseTypes, isLoading: expenseTypesLoading } = useQuery<ExpenseType[]>({
    queryKey: ["/api/expense-types"],
  });

  // Initialize form
  const form = useForm<EnhancedExpenseFormValues>({
    resolver: zodResolver(enhancedExpenseSchema),
    defaultValues: {
      description: "",
      expenseDate: new Date(),
      categoryId: null,
      paymentMethod: "bank_transfer",
      supplierName: "",
      supplierTaxId: "",
      netAmount: 0,
      vatRate: 21,
      vatAmount: 0,
      vatDeductiblePercent: 100,
      irpfRate: 0,
      irpfAmount: 0,
      totalAmount: 0,
      deductibleForCorporateTax: true,
      deductibleForIrpf: true,
      deductiblePercent: 100,
      invoiceNumber: "",
      notes: "",
    },
  });

  // Watch values for automatic calculations
  const netAmount = useWatch({ control: form.control, name: "netAmount" });
  const vatRate = useWatch({ control: form.control, name: "vatRate" });
  const irpfRate = useWatch({ control: form.control, name: "irpfRate" });

  // Auto-calculate taxes when values change
  useEffect(() => {
    if (autoCalculate && netAmount > 0) {
      const vatAmount = (netAmount * vatRate) / 100;
      const irpfAmount = (netAmount * irpfRate) / 100;
      const totalAmount = netAmount + vatAmount - irpfAmount;
      
      form.setValue("vatAmount", Number(vatAmount.toFixed(2)));
      form.setValue("irpfAmount", Number(irpfAmount.toFixed(2)));
      form.setValue("totalAmount", Number(totalAmount.toFixed(2)));
    }
  }, [netAmount, vatRate, irpfRate, autoCalculate, form]);

  // Apply expense type configuration
  const applyExpenseType = (expenseTypeId: number) => {
    const expenseType = expenseTypes?.find(et => et.id === expenseTypeId);
    if (expenseType) {
      form.setValue("vatRate", expenseType.defaultVatRate);
      form.setValue("vatDeductiblePercent", expenseType.defaultVatDeductiblePercent);
      form.setValue("deductibleForCorporateTax", expenseType.defaultDeductibleForCorporateTax);
      form.setValue("deductibleForIrpf", expenseType.defaultDeductibleForIrpf);
      form.setValue("deductiblePercent", expenseType.defaultDeductiblePercent);
      
      toast({
        title: "Configuración aplicada",
        description: `Se ha aplicado la configuración fiscal para: ${expenseType.name}`,
      });
    }
  };

  // Create or update expense mutation
  const mutation = useMutation({
    mutationFn: async (data: EnhancedExpenseFormValues) => {
      const payload = {
        ...data,
        expenseDate: data.expenseDate.toISOString(),
        // Calculate derived fields
        vatDeductibleAmount: (data.vatAmount || 0) * ((data.vatDeductiblePercent || 100) / 100),
        createdFromOcr: false,
        requiresReview: false,
      };
      
      if (isEditMode) {
        return apiRequest("PUT", `/api/expenses/${expenseId}`, payload);
      } else {
        return apiRequest("POST", "/api/expenses", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      
      toast({
        title: isEditMode ? "Gasto actualizado" : "Gasto creado",
        description: isEditMode
          ? "El gasto se ha actualizado correctamente"
          : "El gasto se ha creado correctamente",
      });
      navigate("/expenses");
    },
    onError: (error: any) => {
      console.error("Error al guardar gasto:", error);
      toast({
        title: "Error al guardar",
        description: "Ha ocurrido un error al guardar el gasto",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: EnhancedExpenseFormValues) => {
    mutation.mutate(data);
  };

  // Calculate summary information
  const vatDeductibleAmount = (form.watch("vatAmount") || 0) * ((form.watch("vatDeductiblePercent") || 100) / 100);
  const deductibleAmountCorporate = form.watch("deductibleForCorporateTax") 
    ? (netAmount || 0) * ((form.watch("deductiblePercent") || 100) / 100)
    : 0;
  const deductibleAmountIrpf = form.watch("deductibleForIrpf")
    ? (netAmount || 0) * ((form.watch("deductiblePercent") || 100) / 100)
    : 0;

  if (categoriesLoading || expenseTypesLoading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Configuración rápida */}
        {expenseTypes && expenseTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-sm">
                <Calculator className="h-4 w-4 mr-2" />
                Configuración rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {expenseTypes.map((expenseType) => (
                  <Button
                    key={expenseType.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyExpenseType(expenseType.id)}
                    className="text-xs"
                  >
                    {expenseType.name}
                    {expenseType.defaultVatDeductiblePercent < 100 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {expenseType.defaultVatDeductiblePercent}% IVA
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Información básica del gasto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del gasto</FormLabel>
                  <FormControl>
                    <Input placeholder="Describe el gasto..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha del gasto</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
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
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value !== "null" ? parseInt(value) : null)}
                      defaultValue={field.value ? field.value.toString() : "null"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Sin categoría</SelectItem>
                        {categories && categories
                          .filter((cat) => cat.type === "expense")
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método de pago" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                      <SelectItem value="credit_card">Tarjeta de crédito</SelectItem>
                      <SelectItem value="debit_card">Tarjeta de débito</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Información del proveedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Información del proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón social</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del proveedor..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierTaxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CIF/NIF</FormLabel>
                    <FormControl>
                      <Input placeholder="A12345678" {...field} />
                    </FormControl>
                    <FormDescription>
                      Formato: A12345678 o 12345678A
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de factura</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de factura del proveedor..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Información fiscal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Información fiscal
              <div className="flex items-center ml-auto">
                <Checkbox
                  id="autoCalculate"
                  checked={autoCalculate}
                  onCheckedChange={setAutoCalculate}
                />
                <label htmlFor="autoCalculate" className="ml-2 text-sm">
                  Cálculo automático
                </label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="netAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe neto (Base imponible)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo IVA (%)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo IVA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0% (Exento)</SelectItem>
                        <SelectItem value="4">4% (Superreducido)</SelectItem>
                        <SelectItem value="10">10% (Reducido)</SelectItem>
                        <SelectItem value="21">21% (General)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vatAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe IVA</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        disabled={autoCalculate}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="vatDeductiblePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>% IVA deducible</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="% deducible" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0% (No deducible)</SelectItem>
                        <SelectItem value="50">50% (Combustible, etc.)</SelectItem>
                        <SelectItem value="100">100% (Totalmente deducible)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {vatDeductibleAmount > 0 && `IVA deducible: ${vatDeductibleAmount.toFixed(2)}€`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="irpfRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retención IRPF (%)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="% IRPF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0% (Sin retención)</SelectItem>
                        <SelectItem value="7">7%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                        <SelectItem value="19">19%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="irpfAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe IRPF</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field}
                        disabled={autoCalculate}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Importe total</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field}
                      disabled={autoCalculate}
                      className="font-bold text-lg"
                    />
                  </FormControl>
                  <FormDescription>
                    Neto + IVA - IRPF = Total
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Deducibilidad fiscal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Deducibilidad fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deductibleForCorporateTax"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Deducible en Impuesto de Sociedades
                      </FormLabel>
                      <FormDescription>
                        {deductibleAmountCorporate > 0 && field.value && 
                          `Importe deducible: ${deductibleAmountCorporate.toFixed(2)}€`}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deductibleForIrpf"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Deducible en IRPF (autónomos)
                      </FormLabel>
                      <FormDescription>
                        {deductibleAmountIrpf > 0 && field.value && 
                          `Importe deducible: ${deductibleAmountIrpf.toFixed(2)}€`}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="deductiblePercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porcentaje de deducibilidad</FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="% deducible" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">0% (No deducible)</SelectItem>
                      <SelectItem value="50">50% (Parcialmente deducible)</SelectItem>
                      <SelectItem value="100">100% (Totalmente deducible)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Algunos gastos tienen limitaciones en su deducibilidad
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Información adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales sobre el gasto..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/expenses")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar" : "Crear gasto"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EnhancedExpenseForm; 