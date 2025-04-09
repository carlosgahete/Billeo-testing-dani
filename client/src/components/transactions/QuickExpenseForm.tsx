import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Category } from '@/types';

// Definimos el esquema de validación
const formSchema = z.object({
  description: z.string().min(3, {
    message: 'La descripción debe tener al menos 3 caracteres',
  }),
  amount: z.string().min(1, {
    message: 'El importe es requerido',
  }),
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface QuickExpenseFormProps {
  onSuccess?: () => void;
}

const QuickExpenseForm: React.FC<QuickExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener las categorías
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Filtrar solo las categorías de tipo expense
  const expenseCategories = categories.filter(
    (category) => category.type === 'expense'
  );

  // Configuración del formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: '',
      categoryId: '',
    },
  });

  // Manejar el envío del formulario
  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Formatear los datos para la API
      const transactionData = {
        type: 'expense',
        description: data.description,
        amount: data.amount.replace(',', '.'), // Asegurar formato correcto
        date: new Date().toISOString(),
        categoryId: data.categoryId && data.categoryId !== "0" ? parseInt(data.categoryId, 10) : null,
      };

      // Enviar a la API
      await apiRequest('POST', '/api/transactions', {
        body: JSON.stringify(transactionData),
      });

      // Mostrar mensaje de éxito
      toast({
        title: 'Gasto registrado correctamente',
        description: `Se ha registrado un gasto de ${data.amount}€`,
        variant: 'default',
      });

      // Resetear el formulario
      form.reset();

      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });

      // Llamar al callback de éxito si está definido
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error al crear el gasto:', error);
      toast({
        title: 'Error al registrar el gasto',
        description: 'Hubo un problema al guardar el gasto. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción del gasto</FormLabel>
              <FormControl>
                <Input placeholder="Compra material oficina" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Importe (€)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0,00" 
                  type="text" 
                  {...field} 
                  inputMode="decimal"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label htmlFor="categorySelect">Categoría (opcional)</Label>
          <Select
            onValueChange={(value) => form.setValue('categoryId', value)}
            value={form.watch('categoryId')}
          >
            <SelectTrigger id="categorySelect">
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Sin categoría</SelectItem>
              {expenseCategories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end pt-3">
          <Button type="submit" disabled={isSubmitting} className="bg-[#FF3B30] hover:bg-red-600 text-white">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar gasto'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default QuickExpenseForm;