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

interface SimpleEditFormProps {
  transaction: any;
  extractedData: any;
  categories: Category[];
  onCreateCategory: () => void;
  onSave: () => void;
  onSaveAndNavigate: () => void;
  onUpdateCategory: (categoryId: string | null, formData?: any) => void;
}

export const SimpleEditForm: React.FC<SimpleEditFormProps> = ({
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
  
  // Referencias directas a los campos del formulario (no controlados)
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
    // Limpiar todos los campos primero para evitar valores por defecto no deseados
    if (amountRef.current) amountRef.current.value = '';
    if (baseAmountRef.current) baseAmountRef.current.value = '';
    if (taxRef.current) taxRef.current.value = '';
    if (irpfRef.current) irpfRef.current.value = '';
    if (dateRef.current) dateRef.current.value = '';
    if (providerRef.current) providerRef.current.value = '';
    if (descriptionRef.current) descriptionRef.current.value = '';
    
    // Verificar primero si hay datos válidos antes de mostrar cualquier valor
    const hasTransactionData = transaction && Object.keys(transaction).length > 0 && transaction.id;
    const hasExtractedData = extractedData && Object.keys(extractedData).length > 0;
    
    console.log('Estado inicial del formulario:', { 
      hasTransactionData, 
      hasExtractedData,
      transaction,
      extractedData
    });
    
    // Solo mostrar valores cuando hay datos reales extraídos del documento
    if (hasTransactionData && hasExtractedData) {
      console.log('Inicializando formulario con datos extraídos');
      
      if (amountRef.current) {
        // Solo establecer el valor si realmente existe un valor válido
        const amountValue = transaction.amount?.toString();
        if (amountValue && amountValue !== '0') {
          amountRef.current.value = amountValue;
          console.log('Estableciendo amount:', amountValue);
        }
      }
      
      if (baseAmountRef.current) {
        const baseValue = extractedData?.baseAmount?.toString();
        if (baseValue && baseValue !== '0') {
          baseAmountRef.current.value = baseValue;
          console.log('Estableciendo baseAmount:', baseValue);
        }
      }
      
      if (taxRef.current) {
        const taxValue = extractedData?.tax?.toString();
        if (taxValue && taxValue !== '0') {
          taxRef.current.value = taxValue;
          console.log('Estableciendo tax:', taxValue);
        }
      }
      
      if (irpfRef.current) {
        const irpfValue = extractedData?.irpf?.toString();
        if (irpfValue && irpfValue !== '0') {
          irpfRef.current.value = irpfValue;
          console.log('Estableciendo irpf:', irpfValue);
        }
      }
      
      if (dateRef.current && transaction.date) {
        const dateValue = format(new Date(transaction.date), "yyyy-MM-dd");
        dateRef.current.value = dateValue;
        console.log('Estableciendo date:', dateValue);
      }
      
      if (providerRef.current && extractedData?.provider) {
        providerRef.current.value = extractedData.provider;
        console.log('Estableciendo provider:', extractedData.provider);
      }
      
      if (descriptionRef.current && transaction.description) {
        descriptionRef.current.value = transaction.description;
        console.log('Estableciendo description:', transaction.description);
      }
      
      // Mostrar los montos de impuestos iniciales solo si hay datos
      updateTaxDisplay();
      updateIrpfDisplay();
    } else {
      console.log('No hay datos reales para mostrar - manteniendo campos vacíos');
    }
  }, [transaction, extractedData]);
  
  // Funciones para actualizar los valores calculados
  const updateTaxDisplay = () => {
    if (!baseAmountRef.current || !taxRef.current || !taxAmountRef.current) return;
    
    const baseAmount = parseFloat(baseAmountRef.current.value || '0');
    const taxRate = parseFloat(taxRef.current.value || '0');
    
    if (!isNaN(baseAmount) && !isNaN(taxRate)) {
      const taxAmount = (baseAmount * taxRate / 100).toFixed(2);
      if (taxAmountRef.current) {
        taxAmountRef.current.textContent = `${taxAmount}€`;
      }
      
      // También actualizar el total
      updateTotal();
    } else {
      if (taxAmountRef.current) {
        taxAmountRef.current.textContent = '';
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
      }
      
      // También actualizar el total
      updateTotal();
    } else {
      if (irpfAmountRef.current) {
        irpfAmountRef.current.textContent = '';
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
    }
  };
  
  // Función para guardar los cambios
  const handleSave = async () => {
    if (!formRef.current) return;
    
    try {
      // Capturar todos los valores actuales del formulario
      const formData = {
        amount: amountRef.current?.value ? parseFloat(amountRef.current.value) : transaction.amount,
        baseAmount: baseAmountRef.current?.value ? parseFloat(baseAmountRef.current.value) : null,
        tax: taxRef.current?.value ? parseFloat(taxRef.current.value) : null,
        irpf: irpfRef.current?.value ? parseFloat(irpfRef.current.value) : null,
        date: dateRef.current?.value ? new Date(dateRef.current.value) : new Date(transaction.date),
        provider: providerRef.current?.value || '',
        description: descriptionRef.current?.value || ''
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
      
      // Guardar una copia de los valores actuales para restaurarlos después
      const savedFormValues = {
        amount: amountRef.current?.value || '',
        baseAmount: baseAmountRef.current?.value || '',
        tax: taxRef.current?.value || '',
        irpf: irpfRef.current?.value || '',
        date: dateRef.current?.value || '',
        provider: providerRef.current?.value || '',
        description: descriptionRef.current?.value || ''
      };
      
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
      
      // Restaurar los valores del formulario después de la actualización
      setTimeout(() => {
        if (amountRef.current) amountRef.current.value = savedFormValues.amount;
        if (baseAmountRef.current) baseAmountRef.current.value = savedFormValues.baseAmount;
        if (taxRef.current) taxRef.current.value = savedFormValues.tax;
        if (irpfRef.current) irpfRef.current.value = savedFormValues.irpf;
        if (dateRef.current) dateRef.current.value = savedFormValues.date;
        if (providerRef.current) providerRef.current.value = savedFormValues.provider;
        if (descriptionRef.current) descriptionRef.current.value = savedFormValues.description;
        
        // Actualizar los displays de impuestos
        updateTaxDisplay();
        updateIrpfDisplay();
        updateTotal();
      }, 100);
      
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
          // Eliminamos el defaultValue para evitar valores por defecto
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
            type="text"
            inputMode="decimal"
            className="w-full h-9"
            onChange={() => {}} // Formulario no controlado
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="transaction-base" className="text-sm">Base imponible:</Label>
          <Input
            id="transaction-base"
            ref={baseAmountRef}
            type="text"
            inputMode="decimal"
            className="w-full h-9"
            onChange={() => {
              updateTaxDisplay();
              updateIrpfDisplay();
              updateTotal();
            }}
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
              type="text"
              inputMode="numeric"
              className="w-full h-9"
              onChange={() => {
                updateTaxDisplay();
                updateTotal();
              }}
            />
            <div ref={taxAmountRef} className="w-1/2 text-sm text-muted-foreground"></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="transaction-irpf" className="text-sm">IRPF (%):</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="transaction-irpf"
              ref={irpfRef}
              type="text"
              inputMode="numeric"
              className="w-full h-9"
              onChange={() => {
                updateIrpfDisplay();
                updateTotal();
              }}
            />
            <div ref={irpfAmountRef} className="w-1/2 text-sm text-muted-foreground"></div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="transaction-date" className="text-sm">Fecha:</Label>
          <Input
            id="transaction-date"
            ref={dateRef}
            type="date"
            className="w-full h-9"
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="transaction-provider" className="text-sm">Proveedor:</Label>
          <Input
            id="transaction-provider"
            ref={providerRef}
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
              // Capturar todos los valores actuales del formulario
              const formData = {
                amount: amountRef.current?.value,
                baseAmount: baseAmountRef.current?.value,
                tax: taxRef.current?.value,
                irpf: irpfRef.current?.value,
                date: dateRef.current?.value,
                provider: providerRef.current?.value,
                description: descriptionRef.current?.value,
                // Guardar valores calculados (importante para el contexto)
                taxAmount: taxAmountRef.current?.textContent,
                irpfAmount: irpfAmountRef.current?.textContent
              };
              
              console.log("Guardando datos de formulario antes de cambiar categoría:", formData);
              
              // Pasar los datos del formulario al actualizar la categoría
              onUpdateCategory(value, formData);
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

export default SimpleEditForm;