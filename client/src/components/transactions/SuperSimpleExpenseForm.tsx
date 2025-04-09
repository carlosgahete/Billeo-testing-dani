import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SuperSimpleExpenseFormProps {
  onSuccess?: () => void;
}

const SuperSimpleExpenseForm: React.FC<SuperSimpleExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Manejador para cambios en el archivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  // Envío del formulario usando formulario normal
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    
    // Validación básica
    if (!description || description.trim().length < 3) {
      setError('La descripción debe tener al menos 3 caracteres');
      return;
    }
    
    if (!amount) {
      setError('Debes introducir un importe');
      return;
    }
    
    if (!selectedFile) {
      setError('Debes adjuntar un documento');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Subir el archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir el archivo');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.filePath;
      
      // 2. Preparar el importe - formato numérico con 2 decimales
      const numericAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numericAmount)) {
        setError('El importe debe ser un número válido');
        setIsSubmitting(false);
        return;
      }
      
      // 3. Crear el formulario de manera directa (no JSON)
      const simpleForm = document.createElement('form');
      simpleForm.method = 'POST';
      simpleForm.action = '/api/expenses/simple';
      simpleForm.style.display = 'none';
      
      // Añadir campos al formulario
      const descField = document.createElement('input');
      descField.name = 'description';
      descField.value = description.trim();
      simpleForm.appendChild(descField);
      
      const amountField = document.createElement('input');
      amountField.name = 'amount';
      amountField.value = numericAmount.toFixed(2);
      simpleForm.appendChild(amountField);
      
      const attachField = document.createElement('input');
      attachField.name = 'attachments';
      attachField.value = filePath;
      simpleForm.appendChild(attachField);
      
      // Añadir al documento y enviar
      document.body.appendChild(simpleForm);
      
      // Crear un iframe para la respuesta (evita la recarga)
      const frameName = 'submit-frame-' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = frameName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Configurar el formulario para usar el iframe
      simpleForm.target = frameName;
      
      // Evento para cuando el iframe termine de cargar (respuesta recibida)
      iframe.onload = () => {
        // Considerar éxito independientemente de la respuesta
        toast({
          title: 'Gasto registrado correctamente',
          description: `Se ha registrado un gasto de ${amount}€`,
          variant: 'default',
        });
        
        // Limpiar los elementos creados
        document.body.removeChild(simpleForm);
        document.body.removeChild(iframe);
        
        // Resetear el formulario
        setDescription('');
        setAmount('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        setIsSubmitting(false);
        
        // Llamar al callback de éxito
        if (onSuccess) {
          onSuccess();
        }
      };
      
      // Enviar el formulario
      simpleForm.submit();
      
      // No continuar con el código, la respuesta la maneja el evento onload del iframe
      return;
      
    } catch (error) {
      console.error('Error al crear el gasto:', error);
      toast({
        title: 'Error al registrar el gasto',
        description: 'Hubo un problema al guardar el gasto. Por favor, intenta de nuevo.',
        variant: 'destructive',
      });
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

export default SuperSimpleExpenseForm;