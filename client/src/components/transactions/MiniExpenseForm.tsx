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
    
    // Validación básica
    if (!description || description.trim().length < 3) {
      setError('La descripción debe tener al menos 3 caracteres');
      return;
    }
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Debes introducir un importe válido');
      return;
    }
    
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Debes adjuntar un documento');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 1. Subir el archivo
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.filePath;
      
      // 2. Crear el gasto con el archivo subido
      const expenseResponse = await fetch('/api/expenses/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: numericAmount.toFixed(2),
          attachments: [filePath]
        })
      });
      
      if (!expenseResponse.ok) {
        const errorText = await expenseResponse.text();
        throw new Error(`Error al crear el gasto: ${errorText}`);
      }
      
      // 3. Notificar éxito
      toast({
        title: 'Gasto registrado correctamente',
        description: `Se ha registrado un gasto de ${amount}€`,
      });
      
      // 4. Resetear formulario
      setDescription('');
      setAmount('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 5. Ejecutar callback
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      console.error('Error al crear el gasto:', error);
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
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          required
          inputMode="decimal"
        />
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
      </div>
      
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
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