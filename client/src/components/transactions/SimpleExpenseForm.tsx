import React, { useState, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

// Esquema simple para el formulario
const formSchema = z.object({
  description: z.string().min(3, {
    message: 'La descripción debe tener al menos 3 caracteres',
  }),
  amount: z.string().min(1, {
    message: 'El importe es requerido',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface SimpleExpenseFormProps {
  onSuccess?: () => void;
}

const SimpleExpenseForm: React.FC<SimpleExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Configuración del formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
      amount: '',
    },
  });

  // Manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      setFileError(null);
    } else {
      setSelectedFile(null);
    }
  };

  // Manejar el envío del formulario
  const handleSubmit = async (data: FormValues) => {
    // Validar que se haya seleccionado un archivo
    if (!selectedFile) {
      setFileError('Debes adjuntar un documento del gasto');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Subir el archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.path;
      
      // 2. Crear la transacción con datos mínimos
      const amount = parseFloat(data.amount.replace(',', '.'));
      
      const transactionData = {
        description: data.description,
        title: `Gasto: ${data.description.substring(0, 30)}`,
        type: 'expense',
        amount: amount.toString(),
        date: new Date().toISOString(),
        attachments: [filePath]
      };
      
      // 3. Enviar la transacción al servidor
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error al crear el gasto: ${response.status}`);
      }
      
      // 4. Actualizar la UI si todo fue bien
      toast({
        title: 'Gasto registrado correctamente',
        description: `Se ha registrado un gasto de ${data.amount}€`,
        variant: 'default',
      });
      
      // Resetear formulario
      form.reset();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Actualizar la lista de transacciones
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
      
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
              <FormLabel>Importe total (€)</FormLabel>
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

        {/* Adjuntar documento (requerido) */}
        <div className="space-y-2">
          <FormLabel htmlFor="fileUpload" className="flex items-center gap-1">
            Documento del gasto <span className="text-red-500">*</span>
          </FormLabel>
          <Input
            id="fileUpload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          {fileError && <p className="text-sm text-red-500 mt-1">{fileError}</p>}
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

export default SimpleExpenseForm;