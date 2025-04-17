import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Check, Plus } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: number;
  userId: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
}

interface PersistentEditFormProps {
  transaction: any;
  extractedData: any;
  categories: Category[];
  onCreateCategory: () => void;
  onSave: () => void;
  onSaveAndNavigate: () => void;
  onUpdateCategory: (categoryId: string | null, formData?: any) => void;
}

const PersistentEditForm: React.FC<PersistentEditFormProps> = ({
  transaction,
  extractedData,
  categories,
  onCreateCategory,
  onSave,
  onSaveAndNavigate,
  onUpdateCategory,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  
  // Estado local para todos los campos para evitar problemas de reinicio
  const [formState, setFormState] = useState({
    amount: '',
    baseAmount: '',
    tax: '',
    taxAmount: '',
    irpf: '',
    irpfAmount: '',
    date: '',
    provider: '',
    description: '',
    initialized: false
  });
  
  // Referencias directas a los campos del formulario
  const amountRef = useRef<HTMLInputElement>(null);
  const baseAmountRef = useRef<HTMLInputElement>(null);
  const taxRef = useRef<HTMLInputElement>(null);
  const taxAmountRef = useRef<HTMLDivElement>(null);
  const irpfRef = useRef<HTMLInputElement>(null);
  const irpfAmountRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const providerRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  
  // Inicializar los valores una sola vez al montar
  useEffect(() => {
    // Solo inicializar si no se ha hecho antes y si hay datos válidos
    if (!formState.initialized && transaction && Object.keys(transaction).length > 0 && transaction.id) {
      console.log('Inicializando formulario con datos de transacción');
      
      // Preparar los valores iniciales
      const newFormState = {
        amount: transaction.amount?.toString() || '',
        baseAmount: extractedData?.baseAmount?.toString() || '',
        tax: extractedData?.tax?.toString() || '',
        taxAmount: '',
        irpf: extractedData?.irpf?.toString() || '',
        irpfAmount: '',
        date: transaction.date ? format(new Date(transaction.date), "yyyy-MM-dd") : '',
        provider: extractedData?.provider || '',
        description: transaction.description || '',
        initialized: true
      };
      
      // Actualizar el estado
      setFormState(newFormState);
      
      console.log('Estado inicial del formulario:', newFormState);
    }
  }, [transaction, extractedData, formState.initialized]);
  
  // Sincronizar el estado con los campos del formulario
  useEffect(() => {
    if (formState.initialized) {
      // Asignar valores a los campos
      if (amountRef.current) amountRef.current.value = formState.amount;
      if (baseAmountRef.current) baseAmountRef.current.value = formState.baseAmount;
      if (taxRef.current) taxRef.current.value = formState.tax;
      if (irpfRef.current) irpfRef.current.value = formState.irpf;
      if (dateRef.current) dateRef.current.value = formState.date;
      if (providerRef.current) providerRef.current.value = formState.provider;
      if (descriptionRef.current) descriptionRef.current.value = formState.description;
      
      // Actualizar los displays de impuestos
      updateTaxDisplay();
      updateIrpfDisplay();
    }
  }, [formState]);
  
  // Funciones para actualizar los valores calculados
  const updateTaxDisplay = () => {
    if (!baseAmountRef.current || !taxRef.current || !taxAmountRef.current) return;
    
    const baseAmount = parseFloat(baseAmountRef.current.value || '0');
    const taxRate = parseFloat(taxRef.current.value || '0');
    
    if (!isNaN(baseAmount) && !isNaN(taxRate)) {
      const taxAmount = (baseAmount * taxRate / 100).toFixed(2);
      if (taxAmountRef.current) {
        taxAmountRef.current.textContent = `${taxAmount}€`;
        
        // Actualizar el estado sin triggear el efecto de sincronización
        setFormState(prev => ({
          ...prev,
          taxAmount: `${taxAmount}€`
        }));
      }
      
      // También actualizar el total
      updateTotal();
    } else {
      if (taxAmountRef.current) {
        taxAmountRef.current.textContent = '';
        
        // Actualizar el estado
        setFormState(prev => ({
          ...prev,
          taxAmount: ''
        }));
      }
    }
  };
  
  const updateIrpfDisplay = () => {
    if (!baseAmountRef.current || !irpfRef.current || !irpfAmountRef.current) return;
    
    const baseAmount = parseFloat(baseAmountRef.current.value || '0');
    const irpfRate = parseFloat(irpfRef.current.value || '0');
    
    if (!isNaN(baseAmount) && !isNaN(irpfRate)) {
      const irpfAmount = (baseAmount * irpfRate / 100).toFixed(2);
      if (irpfAmountRef.current) {
        irpfAmountRef.current.textContent = `${irpfAmount}€`;
        
        // Actualizar el estado
        setFormState(prev => ({
          ...prev,
          irpfAmount: `${irpfAmount}€`
        }));
      }
      
      // También actualizar el total
      updateTotal();
    } else {
      if (irpfAmountRef.current) {
        irpfAmountRef.current.textContent = '';
        
        // Actualizar el estado
        setFormState(prev => ({
          ...prev,
          irpfAmount: ''
        }));
      }
    }
  };
  
  const updateTotal = () => {
    if (!baseAmountRef.current || !amountRef.current) return;
    
    const baseAmount = parseFloat(baseAmountRef.current.value || '0');
    const taxRate = parseFloat(taxRef.current?.value || '0');
    const irpfRate = parseFloat(irpfRef.current?.value || '0');
    
    if (!isNaN(baseAmount)) {
      const taxAmount = !isNaN(taxRate) ? (baseAmount * taxRate / 100) : 0;
      const irpfAmount = !isNaN(irpfRate) ? (baseAmount * irpfRate / 100) : 0;
      
      // El total es la base más IVA menos IRPF
      const totalAmount = (baseAmount + taxAmount - irpfAmount).toFixed(2);
      amountRef.current.value = totalAmount;
      
      // Actualizar el estado
      setFormState(prev => ({
        ...prev,
        amount: totalAmount
      }));
    }
  };
  
  // Manejadores para mantener el estado actualizado
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      amount: e.target.value
    }));
  };
  
  const handleBaseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      baseAmount: e.target.value
    }));
    
    updateTaxDisplay();
    updateIrpfDisplay();
    updateTotal();
  };
  
  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      tax: e.target.value
    }));
    
    updateTaxDisplay();
    updateTotal();
  };
  
  const handleIrpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      irpf: e.target.value
    }));
    
    updateIrpfDisplay();
    updateTotal();
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      date: e.target.value
    }));
  };
  
  const handleProviderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      provider: e.target.value
    }));
  };
  
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      description: e.target.value
    }));
  };
  
  // Función para guardar los cambios
  const handleSave = async () => {
    if (!formRef.current) return;
    
    try {
      // Capturar todos los valores actuales del formulario
      const formData = {
        amount: parseFloat(formState.amount) || transaction.amount,
        baseAmount: formState.baseAmount ? parseFloat(formState.baseAmount) : null,
        tax: formState.tax ? parseFloat(formState.tax) : null,
        irpf: formState.irpf ? parseFloat(formState.irpf) : null,
        date: formState.date ? new Date(formState.date) : new Date(transaction.date),
        provider: formState.provider,
        description: formState.description
      };
      
      console.log('Guardando datos del formulario:', formData);
      
      // Calcular montos de impuestos
      const taxAmount = formData.baseAmount && formData.tax 
        ? formData.baseAmount * formData.tax / 100 
        : null;
        
      const irpfAmount = formData.baseAmount && formData.irpf 
        ? formData.baseAmount * formData.irpf / 100 
        : null;
      
      // Preparar los impuestos para la actualización
      const taxes = [];
      
      // Usar tax (IVA) del formulario
      if (formData.tax) {
        taxes.push({
          name: "IVA",
          amount: formData.tax,
          value: taxAmount
        });
      }
      
      // Usar irpf del formulario
      if (formData.irpf) {
        taxes.push({
          name: "IRPF",
          amount: -formData.irpf, // IRPF siempre negativo
          value: irpfAmount
        });
      }
      
      // Título y descripción
      const providerName = formData.provider || extractedData?.provider || 'Proveedor';
      const updatedTitle = transaction.title || `Factura - ${providerName}`;
      const updatedDescription = formData.description || "";
      
      // Crear el objeto de actualización
      const updatedTransaction = {
        userId: transaction.userId,
        amount: formData.amount.toString(),
        title: updatedTitle,
        description: updatedDescription,
        date: formData.date,
        type: transaction.type || 'expense',
        categoryId: transaction.categoryId,
        additionalTaxes: JSON.stringify(taxes),
        notes: transaction.notes || `Datos fiscales actualizados manualmente:
Base Imponible: ${formData.baseAmount || 0} €
IVA (${formData.tax || 0}%): ${taxAmount || 0} €
IRPF (${formData.irpf || 0}%): ${irpfAmount || 0} €
Total: ${formData.amount} €
Proveedor: ${formData.provider || ""}`
      };
      
      console.log('Actualizando transacción:', updatedTransaction);
      
      // Enviar la actualización al servidor
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTransaction),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Invalidar las consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/recent"] });
      queryClient.invalidateQueries();
      
      toast({
        title: "Cambios guardados",
        description: "Los cambios en los datos han sido guardados correctamente",
      });
      
      // Llamar al callback de guardado
      onSave();
    } catch (error: any) {
      toast({
        title: "Error al guardar los cambios",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="transaction-description" className="text-sm">Descripción:</Label>
        <Input
          id="transaction-description"
          ref={descriptionRef}
          value={formState.description}
          onChange={handleDescriptionChange}
          className="w-full h-9"
          placeholder="Añade una descripción para este gasto"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="transaction-amount" className="text-sm">Importe total:</Label>
          <Input
            id="transaction-amount"
            ref={amountRef}
            value={formState.amount}
            onChange={handleAmountChange}
            type="text"
            inputMode="decimal"
            className="w-full h-9"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="transaction-base" className="text-sm">Base imponible:</Label>
          <Input
            id="transaction-base"
            ref={baseAmountRef}
            value={formState.baseAmount}
            onChange={handleBaseAmountChange}
            type="text"
            inputMode="decimal"
            className="w-full h-9"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="transaction-iva" className="text-sm">IVA (%):</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="transaction-iva"
              ref={taxRef}
              value={formState.tax}
              onChange={handleTaxChange}
              type="text"
              inputMode="numeric"
              className="w-full h-9"
            />
            <div ref={taxAmountRef} className="w-1/2 text-sm text-muted-foreground">
              {formState.taxAmount}
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="transaction-irpf" className="text-sm">IRPF (%):</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="transaction-irpf"
              ref={irpfRef}
              value={formState.irpf}
              onChange={handleIrpfChange}
              type="text"
              inputMode="numeric"
              className="w-full h-9"
            />
            <div ref={irpfAmountRef} className="w-1/2 text-sm text-muted-foreground">
              {formState.irpfAmount}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="transaction-date" className="text-sm">Fecha:</Label>
          <Input
            id="transaction-date"
            ref={dateRef}
            value={formState.date}
            onChange={handleDateChange}
            type="date"
            className="w-full h-9"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="transaction-provider" className="text-sm">Proveedor:</Label>
          <Input
            id="transaction-provider"
            ref={providerRef}
            value={formState.provider}
            onChange={handleProviderChange}
            className="w-full h-9"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="transaction-category" className="text-sm">Categoría:</Label>
        <div className="flex items-center space-x-2">
          <Select
            value={transaction.categoryId ? String(transaction.categoryId) : "null"}
            onValueChange={(value) => {
              // Pasar los datos del formulario al actualizar la categoría
              onUpdateCategory(value, formState);
            }}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Seleccionar categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Sin categoría</SelectItem>
              {categories
                .filter(cat => cat.type === 'expense')
                .map(category => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    <div className="flex items-center">
                      <span 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      ></span>
                      {category.icon && <span className="mr-1">{category.icon}</span>}
                      {category.name}
                    </div>
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
          
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onCreateCategory}
            className="whitespace-nowrap h-9"
          >
            <Plus className="h-3 w-3 mr-1" />
            Nueva
          </Button>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={handleSave}
          className="h-9"
        >
          <Check className="h-4 w-4 mr-2" />
          Guardar
        </Button>
        <Button
          type="button"
          onClick={() => {
            handleSave()
              .then(() => onSaveAndNavigate());
          }}
          className="bg-[#34C759] hover:bg-[#2fb350] text-white h-9"
        >
          Guardar y volver
        </Button>
      </div>
    </form>
  );
};

export default PersistentEditForm;