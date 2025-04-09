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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileType, Info, Receipt } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Category } from '@/types';
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";

// Definimos el esquema de validación con el archivo requerido
const formSchema = z.object({
  description: z.string().min(3, {
    message: 'La descripción debe tener al menos 3 caracteres',
  }),
  amount: z.string().min(1, {
    message: 'El importe es requerido',
  }),
  categoryId: z.string().optional(),
  hasVat: z.boolean().default(true),
  vatRate: z.string().min(1, {
    message: 'Se requiere el porcentaje de IVA',
  }).default("21"),
  hasIRPF: z.boolean().default(false),
  irpfRate: z.string().default("15"),
  // No podemos validar el archivo con zod directamente, lo haremos manualmente
});

type FormValues = z.infer<typeof formSchema>;

interface QuickExpenseFormProps {
  onSuccess?: () => void;
}

const QuickExpenseForm: React.FC<QuickExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

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
      hasVat: true,
      vatRate: "21",
      hasIRPF: false,
      irpfRate: "15",
    },
  });

  // Observar si se ha seleccionado "hasVat" para mostrar el campo de porcentaje
  const hasVat = form.watch("hasVat");
  const hasIRPF = form.watch("hasIRPF");

  // Manejar la selección de archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const fileType = file.type;
      // Validar que sea un tipo permitido
      if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(fileType)) {
        setFileError('El archivo debe ser PDF, JPG o PNG');
        setSelectedFile(null);
        return;
      }
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
      setFileError('Debes adjuntar un documento del gasto (factura, ticket, etc.)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Primero, subimos el archivo
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
      
      // Preparar los impuestos adicionales
      let additionalTaxes = [];
      
      if (data.hasVat) {
        additionalTaxes.push({
          name: 'IVA',
          amount: parseInt(data.vatRate, 10),
          isPercentage: true
        });
      }
      
      if (data.hasIRPF) {
        additionalTaxes.push({
          name: 'IRPF',
          amount: -parseInt(data.irpfRate, 10), // Negativo porque reduce el importe
          isPercentage: true
        });
      }

      // Calcular la base imponible (sin IVA)
      const amount = parseFloat(data.amount.replace(',', '.'));
      const vatRate = data.hasVat ? parseInt(data.vatRate, 10) / 100 : 0;
      const baseAmount = data.hasVat ? (amount / (1 + vatRate)).toFixed(2) : amount.toFixed(2);

      // Formatear los datos para la API
      const transactionData = {
        type: 'expense',
        title: `Gasto: ${data.description.substring(0, 30)}${data.description.length > 30 ? '...' : ''}`,
        description: data.description,
        amount: baseAmount, // Base imponible (sin IVA)
        date: new Date().toISOString(),
        categoryId: data.categoryId && data.categoryId !== "0" ? parseInt(data.categoryId, 10) : null,
        attachments: [filePath], // Adjuntar el documento
        additionalTaxes: JSON.stringify(additionalTaxes) // Incluir los impuestos
      };

      // Enviar a la API
      await apiRequest('POST', '/api/transactions', {
        body: JSON.stringify(transactionData),
      });

      // Mostrar mensaje de éxito
      toast({
        title: 'Gasto registrado correctamente',
        description: `Se ha registrado un gasto de ${data.amount}€ con su documento adjunto`,
        variant: 'default',
      });

      // Resetear el formulario
      form.reset();
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

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
              <FormLabel>Importe total (€) (con IVA si corresponde)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="0,00" 
                  type="text" 
                  {...field} 
                  inputMode="decimal"
                />
              </FormControl>
              <FormDescription className="text-xs">
                Introduce el importe total del gasto tal como aparece en la factura.
              </FormDescription>
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

        {/* Adjuntar documento (requerido) */}
        <div className="space-y-2">
          <Label htmlFor="fileUpload" className="flex items-center gap-1">
            Documento del gasto <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="fileUpload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="max-w-sm"
            />
            {selectedFile && (
              <div className="text-xs text-green-600 flex items-center">
                <FileType className="h-3 w-3 mr-1" />
                {selectedFile.name.length > 20 ? selectedFile.name.substring(0, 20) + '...' : selectedFile.name}
              </div>
            )}
          </div>
          {fileError && <p className="text-sm text-red-500 mt-1">{fileError}</p>}
          <p className="text-xs text-gray-500">Adjunta la factura o ticket del gasto (PDF, JPG o PNG)</p>
        </div>

        <Accordion type="single" collapsible className="w-full bg-gray-50 rounded-md px-4">
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="py-3 text-sm">
              <div className="flex items-center">
                <Receipt className="h-4 w-4 mr-2 text-amber-500" />
                <span>Detalles de impuestos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pb-2">
                {/* Campo IVA */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="hasVat"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="m-0">
                            El gasto incluye IVA
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {hasVat && (
                    <FormField
                      control={form.control}
                      name="vatRate"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2 w-full">
                            <FormLabel className="text-xs shrink-0 w-[100px]">Porcentaje IVA:</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleccionar %" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="4">4%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="21">21%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                {/* Campo IRPF */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="hasIRPF"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="m-0">
                            El gasto tiene retención IRPF
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {hasIRPF && (
                    <FormField
                      control={form.control}
                      name="irpfRate"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2 w-full">
                            <FormLabel className="text-xs shrink-0 w-[100px]">Porcentaje IRPF:</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleccionar %" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="7">7%</SelectItem>
                                <SelectItem value="15">15%</SelectItem>
                                <SelectItem value="19">19%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <div className="mt-2 flex items-start text-gray-500">
                  <Info className="h-4 w-4 mt-0.5 mr-1.5 text-blue-400" />
                  <p className="text-xs">
                    Estos datos son necesarios para el cálculo correcto de tus obligaciones fiscales.
                    La aplicación calculará automáticamente la base imponible (sin IVA) y registrará los impuestos correctamente.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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