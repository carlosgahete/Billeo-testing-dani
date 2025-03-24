import { useState } from "react";
import { useForm } from "react-hook-form";
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
import FileUpload from "../common/FileUpload";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const transactionSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  amount: z.coerce.number().min(0.01, "El importe debe ser mayor que cero"),
  date: z.date(),
  type: z.enum(["income", "expense"]),
  categoryId: z.coerce.number().optional().nullable(),
  paymentMethod: z.string().min(1, "El método de pago es obligatorio"),
  notes: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transactionId?: number;
}

const TransactionForm = ({ transactionId }: TransactionFormProps) => {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<string[]>([]);
  const [location, navigate] = useLocation();
  
  const isEditMode = !!transactionId;

  // Fetch categories for dropdown
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch transaction data if in edit mode
  const { data: transactionData, isLoading: transactionLoading } = useQuery({
    queryKey: ["/api/transactions", transactionId],
    enabled: isEditMode,
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date(),
      type: "expense",
      categoryId: null,
      paymentMethod: "bank_transfer",
      notes: "",
      attachments: [],
    },
  });

  // Initialize form with transaction data when loaded
  useState(() => {
    if (transactionData && !transactionLoading) {
      form.reset({
        ...transactionData,
        date: new Date(transactionData.date),
        amount: Number(transactionData.amount),
      });
      
      if (transactionData.attachments) {
        setAttachments(transactionData.attachments);
      }
    }
  }, [transactionData, transactionLoading, form]);

  // Create or update transaction mutation
  const mutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const payload = {
        ...data,
        attachments,
      };
      
      if (isEditMode) {
        return apiRequest("PUT", `/api/transactions/${transactionId}`, payload);
      } else {
        return apiRequest("POST", "/api/transactions", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditMode ? "Movimiento actualizado" : "Movimiento creado",
        description: isEditMode
          ? "El movimiento se ha actualizado correctamente"
          : "El movimiento se ha creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      navigate("/transactions");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Ha ocurrido un error: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: TransactionFormValues) => {
    mutation.mutate(data);
  };

  const handleFileUpload = (path: string) => {
    setAttachments([...attachments, path]);
  };

  if ((isEditMode && transactionLoading) || categoriesLoading) {
    return <div className="flex justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditMode ? "Editar movimiento" : "Nuevo movimiento"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción del movimiento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importe</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de movimiento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Ingreso</SelectItem>
                        <SelectItem value="expense">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
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
                      onValueChange={(value) => 
                        field.onChange(value ? parseInt(value) : null)
                      }
                      defaultValue={
                        field.value ? field.value.toString() : undefined
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin categoría</SelectItem>
                        {categories
                          ?.filter(
                            (cat: any) => 
                              cat.type === form.getValues("type")
                          )
                          .map((category: any) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id.toString()}
                            >
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Archivos adjuntos</FormLabel>
              <div className="mt-2">
                <FileUpload onUpload={handleFileUpload} />
                
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <span className="flex-1 truncate">
                          {attachment.split('/').pop()}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newAttachments = [...attachments];
                            newAttachments.splice(index, 1);
                            setAttachments(newAttachments);
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/transactions")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransactionForm;
