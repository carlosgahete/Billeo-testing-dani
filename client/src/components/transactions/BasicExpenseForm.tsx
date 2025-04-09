import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

interface BasicExpenseFormProps {
  onSuccess?: () => void;
}

export default function BasicExpenseForm({ onSuccess }: BasicExpenseFormProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Función de sanitización para garantizar datos válidos
  const sanitizeData = (amount: string, date: string, description: string, attachment: File | null) => {
    // Limpiar el 'amount' (reemplazar coma por punto y convertir a número)
    const cleanedAmount = amount.replace(',', '.');
    const numericAmount = parseFloat(cleanedAmount);

    // Validar si el 'amount' es un número válido
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Importe inválido",
        description: "El importe no es válido. Debe ser un número positivo.",
        variant: "destructive"
      });
      return null;  // Si no es válido, retorna null para indicar error
    }

    // Validar el formato del importe (máximo 2 decimales)
    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (!amountPattern.test(cleanedAmount)) {
      toast({
        title: "Formato incorrecto",
        description: "El importe debe tener máximo dos decimales.",
        variant: "destructive"
      });
      return null;
    }

    // Validar la fecha (asegurarse de que sea una fecha válida)
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      toast({
        title: "Fecha inválida",
        description: "La fecha introducida no es válida.",
        variant: "destructive"
      });
      return null;  // Si no es válida, retorna null para indicar error
    }

    // Validar la descripción (asegúrate que no esté vacía)
    if (!description.trim() || description.trim().length < 3) {
      toast({
        title: "Descripción requerida",
        description: "Debes incluir una descripción con al menos 3 caracteres.",
        variant: "destructive"
      });
      return null;  // Si no es válida, retorna null para indicar error
    }

    // Validar archivo adjunto (asegurarse de que existe)
    if (!attachment) {
      toast({
        title: "Archivo requerido",
        description: "Debes adjuntar un documento para el gasto.",
        variant: "destructive"
      });
      return null;
    }

    // Validar el tipo de archivo
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (attachment && !allowedMimeTypes.includes(attachment.type)) {
      toast({
        title: "Formato no soportado",
        description: "El archivo debe ser un PDF, PNG o JPG.",
        variant: "destructive"
      });
      return null;  // Si no es válido, retorna null para indicar error
    }

    // Si todo está bien, devolver los datos sanitizados
    return {
      amount: numericAmount.toString(),
      date: parsedDate.toISOString(),
      description: description.trim(),
      attachment
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Utilizamos la función de sanitización
    const sanitizedData = sanitizeData(amount, date, description, attachment);
    if (!sanitizedData) {
      return; // Si algún dato no es válido, detenemos la ejecución
    }
    
    const { amount: cleanedAmount, date: cleanedDate, description: cleanedDescription, attachment: cleanedAttachment } = sanitizedData;

    console.log('Gasto a enviar:', { 
      amount: cleanedAmount, 
      date: cleanedDate, 
      description: cleanedDescription, 
      attachment: cleanedAttachment ? {
        name: cleanedAttachment.name,
        type: cleanedAttachment.type,
        size: cleanedAttachment.size
      } : null
    });

    setIsSubmitting(true);

    try {
      // 2. SUBIR ARCHIVO
      const formData = new FormData();
      formData.append('file', cleanedAttachment);
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.filePath;
      
      // 3. CREAR GASTO
      const expenseData = {
        description: cleanedDescription,
        amount: cleanedAmount, // Enviar como string, sin parseFloat
        date: cleanedDate,
        attachments: [filePath]
      };
      
      console.log('Enviando datos del gasto:', expenseData);
      console.log('Tipo de amount antes de enviar:', typeof expenseData.amount);
      
      const expenseResponse = await fetch('/api/expenses/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData)
      });
      
      if (!expenseResponse.ok) {
        const errorText = await expenseResponse.text();
        throw new Error(`Error al crear el gasto: ${errorText}`);
      }
      
      const result = await expenseResponse.json();
      console.log('Respuesta de creación de gasto:', result);
      
      // 4. ÉXITO
      toast({
        title: "Gasto creado",
        description: `Se ha registrado un gasto de ${parseFloat(cleanedAmount).toFixed(2)}€`,
      });
      
      // 5. RESETEAR FORMULARIO
      setAmount('');
      setDescription('');
      setAttachment(null);
      
      // 6. ACTUALIZAR DATOS
      if (onSuccess) {
        onSuccess();
      } else {
        // Actualizar las consultas si no hay callback
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      }
      
    } catch (error: any) {
      console.error('Error detallado:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al crear el gasto",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div>
        <Label htmlFor="amount">Importe (€)</Label>
        <Input
          id="amount"
          value={amount}
          onChange={(e) => {
            // Solo permitir números, coma y punto
            const value = e.target.value.replace(/[^0-9.,]/g, '');
            // Reemplazar múltiples comas o puntos
            const cleaned = value.replace(/[.,](?=.*[.,])/g, '');
            setAmount(cleaned);
          }}
          placeholder="0,00"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Formato: 123,45 o 123.45</p>
      </div>

      <div>
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Material de oficina"
          required
          minLength={3}
        />
      </div>

      <div>
        <Label htmlFor="file">Documento del gasto</Label>
        <Input
          id="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setAttachment(e.target.files[0]);
            }
          }}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Formatos: PDF, PNG o JPG</p>
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-[#FF3B30] hover:bg-red-600 text-white"
        >
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
  );
}