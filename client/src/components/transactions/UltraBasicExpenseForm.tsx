import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UltraBasicExpenseFormProps {
  onSuccess?: () => void;
}

const UltraBasicExpenseForm: React.FC<UltraBasicExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Validación básica del formulario
  const isFormValid = () => {
    if (!description || description.length < 3) {
      setError('La descripción debe tener al menos 3 caracteres');
      return false;
    }
    
    if (!amount || isNaN(parseFloat(amount.replace(',', '.')))) {
      setError('Debes introducir un importe válido');
      return false;
    }
    
    if (!selectedFile) {
      setError('Debes adjuntar un documento del gasto');
      return false;
    }
    
    setError(null);
    return true;
  };

  // Manejador para cambios en el archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  // Envío del formulario
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!isFormValid()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Subir el archivo
      const formData = new FormData();
      formData.append('file', selectedFile!);
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.path;
      
      // 2. Crear la transacción con los datos mínimos
      const numericAmount = parseFloat(amount.replace(',', '.'));
      
      const expenseData = {
        description,
        amount: numericAmount.toString(),
        attachments: [filePath]
      };
      
      console.log('Enviando datos al servidor simplificado:', expenseData);
      
      // 3. Enviar la transacción al servidor usando el nuevo endpoint específico
      const response = await fetch('/api/expenses/basic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(expenseData),
        credentials: 'include'
      });
      
      console.log('Respuesta del servidor:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error del servidor:', errorText);
        throw new Error(`Error al crear el gasto: ${response.status}`);
      }
      
      // 4. Notificar éxito
      toast({
        title: 'Gasto registrado correctamente',
        description: `Se ha registrado un gasto de ${amount}€`,
        variant: 'default',
      });
      
      // 5. Resetear formulario
      setDescription('');
      setAmount('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 6. Llamar al callback de éxito
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error al crear el gasto:', error);
      toast({
        title: 'Error al registrar el gasto',
        description: 'Hubo un problema al guardar el gasto. Por favor, intenta de nuevo.',
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
          onChange={handleFileChange}
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

export default UltraBasicExpenseForm;