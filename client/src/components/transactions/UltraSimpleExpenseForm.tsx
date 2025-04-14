import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface UltraSimpleExpenseFormProps {
  onSuccess?: () => void;
}

const UltraSimpleExpenseForm: React.FC<UltraSimpleExpenseFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Validación básica del formulario
  const isFormValid = () => {
    if (!description || description.trim().length < 3) {
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
    console.log('1. Formulario enviado - Iniciando validación');
    
    if (!isFormValid()) {
      console.log('2. ERROR: Validación fallida');
      return;
    }
    
    console.log('2. Validación exitosa');
    setIsSubmitting(true);
    
    try {
      // 1. Subir el archivo
      console.log('3. Preparando subida de archivo:', selectedFile?.name);
      const formData = new FormData();
      formData.append('file', selectedFile!);
      
      console.log('4. Enviando archivo al servidor');
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      });
      
      console.log('5. Respuesta de subida:', uploadResponse.status, uploadResponse.statusText);
      
      if (!uploadResponse.ok) {
        console.error('ERROR: Fallo al subir archivo');
        throw new Error('Error al subir el archivo');
      }
      
      const uploadResult = await uploadResponse.json();
      const filePath = uploadResult.filePath;
      console.log('6. Archivo subido correctamente. Ruta:', filePath);
      
      // 2. Crear el gasto usando el endpoint especializado
      let numericAmount = 0;
      try {
        // Asegurarnos de que el formato del número es correcto
        numericAmount = parseFloat(amount.replace(',', '.'));
        if (isNaN(numericAmount)) {
          throw new Error('El importe no es un número válido');
        }
      } catch (error) {
        console.error('Error al convertir el importe a número:', error);
        setError('El importe debe ser un número válido');
        throw error;
      }
      
      // Redondear a 2 decimales para evitar problemas de precisión
      numericAmount = Math.round(numericAmount * 100) / 100;
      
      const expenseData = {
        description: description.trim(),
        amount: numericAmount.toFixed(2), // Asegurar formato con 2 decimales
        attachments: filePath ? [filePath] : []
      };
      
      console.log('7. Enviando datos al servidor:', JSON.stringify(expenseData));
      
      // 3. Enviar la solicitud a la API especializada utilizando XMLHttpRequest
      console.log('8. Iniciando petición POST a /api/expenses/better con XMLHttpRequest');
      
      // Creamos una promesa para manejar XMLHttpRequest de forma asíncrona
      const sendExpenseXHR = () => {
        return new Promise<{success: boolean, transaction?: any}>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          // Usamos el endpoint simple que hemos creado
          xhr.open('POST', '/api/expenses/simple', true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Accept', 'application/json');
          
          xhr.onload = function() {
            console.log('9. Respuesta del servidor XHR:', xhr.status, xhr.statusText);
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const jsonData = JSON.parse(xhr.responseText);
                console.log('Respuesta JSON:', jsonData);
                resolve(jsonData);
              } catch (e) {
                console.log('La respuesta no es JSON válido, considerando éxito:', xhr.responseText);
                resolve({ success: true });
              }
            } else {
              console.error('ERROR: Respuesta negativa del servidor XHR:', xhr.status, xhr.responseText);
              reject(new Error(`Error al crear el gasto: ${xhr.status}`));
            }
          };
          
          xhr.onerror = function() {
            console.error('Error de red en la solicitud XHR');
            reject(new Error('Error de red al enviar la solicitud'));
          };
          
          // Datos ultra simples - formato extremadamente básico
          const ultraSimpleData = {
            description: description.trim(),
            amount: numericAmount.toFixed(2),
            // Asegurarse de que attachments sea un array válido
            attachments: filePath ? [filePath] : []
          };
          
          // Convertir y enviar los datos simplificados
          const jsonData = JSON.stringify(ultraSimpleData);
          console.log('Enviando datos ultra simplificados a endpoint simple:', jsonData);
          xhr.send(jsonData);
        });
      };
      
      // Ejecutar la promesa XHR
      const jsonResponse = await sendExpenseXHR();
      
      // Invalidar todas las consultas relacionadas para sincronización móvil-desktop
      console.log("Iniciando sincronización tras registro de gasto móvil (UltraSimple):", new Date().toISOString());
      
      const invalidatePromises = [
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/transactions/recent'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/public/stats/dashboard'] })
      ];
      
      // Ejecutar todas las invalidaciones en paralelo
      Promise.all(invalidatePromises).then(() => {
        console.log("Primera fase de sincronización completada (UltraSimple):", new Date().toISOString());
        
        // Forzar actualización adicional después de un breve retraso para garantizar datos frescos
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/stats/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
          console.log("Segunda fase de sincronización completada (UltraSimple):", new Date().toISOString());
        }, 500);
      });
      
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

export default UltraSimpleExpenseForm;