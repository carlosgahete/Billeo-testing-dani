import React, { useState, useRef, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MiniExpenseFormProps {
  onSuccess?: () => void;
}

const MiniExpenseForm: React.FC<MiniExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gestiona el envío del formulario usando Fetch API directamente
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // 1. VALIDACIÓN DE DATOS
    
    // Validar descripción
    if (!description || description.trim().length < 3) {
      setError('La descripción debe tener al menos 3 caracteres');
      return;
    }
    
    // Validar importe con expresión regular (patrón exacto para números con 2 decimales máximo)
    const amountString = amount.replace(',', '.');
    const amountPattern = /^\d+(\.\d{1,2})?$/;
    if (!amountPattern.test(amountString)) {
      setError('El importe no es válido. Debe ser un número con máximo dos decimales.');
      return;
    }
    
    const numericAmount = parseFloat(amountString);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('El importe debe ser mayor que cero');
      return;
    }
    
    // Validar archivo adjunto (tipo y presencia)
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Debes adjuntar un documento del gasto');
      return;
    }
    
    // Validar el tipo de archivo permitido
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedMimeTypes.includes(file.type)) {
      setError('El archivo debe ser un PDF, PNG o JPG');
      return;
    }
    
    // Log para depuración
    console.log("Datos a enviar para crear gasto:", { 
      description: description.trim(),
      amount: numericAmount.toFixed(2),
      file: {
        name: file.name,
        type: file.type,
        size: file.size
      }
    });
    
    setIsSubmitting(true);
    
    try {
      // 2. SUBIR EL ARCHIVO
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo. Por favor, intenta con otro archivo.');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.filePath;
      
      if (!filePath) {
        throw new Error('No se pudo obtener la ruta del archivo subido');
      }
      
      // 3. CREAR EL GASTO CON FORMDATA (más compatible)
      const expenseFormData = new FormData();
      expenseFormData.append('description', description.trim());
      expenseFormData.append('amount', numericAmount.toFixed(2));
      expenseFormData.append('attachments', filePath);
      expenseFormData.append('date', new Date().toISOString()); // Fecha actual
      
      // Registro de lo que se va a enviar
      console.log('Enviando gasto con datos:', {
        description: description.trim(),
        amount: numericAmount.toFixed(2),
        attachments: filePath,
        date: new Date().toISOString()
      });
      
      // Enviar usando FormData
      const expenseResponse = await fetch('/api/expenses/simple', {
        method: 'POST',
        body: expenseFormData
      });
      
      if (!expenseResponse.ok) {
        const errorText = await expenseResponse.text();
        console.error('Error del servidor:', errorText);
        throw new Error(`Error al crear el gasto: ${errorText}`);
      }
      
      // 4. NOTIFICAR ÉXITO
      toast({
        title: 'Gasto registrado correctamente',
        description: `Se ha registrado un gasto de ${numericAmount.toFixed(2)}€`,
        variant: 'default'
      });
      
      // 5. RESETEAR FORMULARIO
      setDescription('');
      setAmount('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 6. EJECUTAR CALLBACK
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      console.error('Error detallado al crear el gasto:', error);
      toast({
        title: 'Error al registrar el gasto',
        description: error.message || 'Hubo un problema al guardar el gasto',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div>
        <Label htmlFor="description">Descripción del gasto</Label>
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
        <Label htmlFor="amount">Importe total (€)</Label>
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
          inputMode="decimal"
        />
        <p className="text-xs text-gray-500 mt-1">Formato válido: 123,45 o 123.45</p>
      </div>
      
      <div>
        <Label htmlFor="file">Documento del gasto <span className="text-red-500">*</span></Label>
        <Input
          id="file"
          type="file"
          ref={fileInputRef}
          required
          accept=".pdf,.jpg,.jpeg,.png"
        />
        <p className="text-xs text-gray-500 mt-1">Formatos permitidos: PDF, JPG, PNG</p>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md border border-red-200">{error}</div>
      )}
      
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
};

export default MiniExpenseForm;