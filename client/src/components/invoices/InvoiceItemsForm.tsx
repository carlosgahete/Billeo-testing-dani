import React from 'react';
import { useFormContext } from 'react-hook-form';
import { calculateInvoice } from './invoiceEngine';

const InvoiceItemsForm: React.FC = () => {
  const form = useFormContext();
  const { register, getValues, setValue, watch } = form;
  const items = watch('items') || [];
  const additionalTaxes = watch('additionalTaxes') || [];
  const subtotal = watch('subtotal') || 0;
  const taxTotal = watch('taxTotal') || 0;
  const total = watch('total') || 0;

  // Función para añadir un nuevo ítem
  const addItem = () => {
    const currentItems = getValues('items') || [];
    setValue('items', [...currentItems, { name: '', quantity: 1, price: 0 }]);
    calculateInvoice(form);
  };

  // Función para eliminar un ítem
  const removeItem = (index: number) => {
    const currentItems = getValues('items') || [];
    if (currentItems.length > 1) {
      setValue('items', currentItems.filter((_, i) => i !== index));
      calculateInvoice(form);
    }
  };

  // Función para añadir un nuevo impuesto adicional
  const addTax = () => {
    const currentTaxes = getValues('additionalTaxes') || [];
    setValue('additionalTaxes', [...currentTaxes, { name: 'IVA', rate: 21 }]);
    calculateInvoice(form);
  };

  // Función para eliminar un impuesto
  const removeTax = (index: number) => {
    const currentTaxes = getValues('additionalTaxes') || [];
    setValue('additionalTaxes', currentTaxes.filter((_, i) => i !== index));
    calculateInvoice(form);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h2>📋 Artículos o servicios</h2>
      
      {items.map((_, index) => (
        <div key={index} style={{ display: 'flex', marginBottom: 10, gap: 10 }}>
          <input 
            placeholder="Descripción" 
            {...register(`items.${index}.name`)} 
            style={{ flex: 3 }}
            onChange={() => calculateInvoice(form)}
          />
          <input 
            type="number" 
            placeholder="Cantidad" 
            {...register(`items.${index}.quantity`)} 
            style={{ flex: 1 }}
            onChange={() => calculateInvoice(form)}
          />
          <input 
            type="number" 
            placeholder="Precio" 
            {...register(`items.${index}.price`)} 
            style={{ flex: 1 }}
            onChange={() => calculateInvoice(form)}
          />
          <button 
            type="button" 
            onClick={() => removeItem(index)}
            style={{ padding: '0 10px' }}
            disabled={items.length <= 1}
          >
            🗑️
          </button>
        </div>
      ))}
      
      <button 
        type="button" 
        onClick={addItem}
        style={{ marginBottom: 20 }}
      >
        + Añadir artículo
      </button>

      <h2>💰 Impuestos adicionales</h2>
      
      {additionalTaxes.map((_, index) => (
        <div key={index} style={{ display: 'flex', marginBottom: 10, gap: 10 }}>
          <input 
            placeholder="Nombre del impuesto" 
            {...register(`additionalTaxes.${index}.name`)} 
            style={{ flex: 2 }}
          />
          <input 
            type="number" 
            placeholder="Porcentaje (%)" 
            {...register(`additionalTaxes.${index}.rate`)} 
            style={{ flex: 1 }}
            onChange={() => calculateInvoice(form)}
          />
          <button 
            type="button" 
            onClick={() => removeTax(index)}
            style={{ padding: '0 10px' }}
          >
            🗑️
          </button>
        </div>
      ))}
      
      <button 
        type="button" 
        onClick={addTax}
        style={{ marginBottom: 20 }}
      >
        + Añadir impuesto
      </button>

      <div style={{ marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>Subtotal:</strong>
          <span>{subtotal.toFixed(2)}€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>Total impuestos:</strong>
          <span>{taxTotal.toFixed(2)}€</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', marginTop: 10 }}>
          <strong>TOTAL:</strong>
          <strong>{total.toFixed(2)}€</strong>
        </div>
      </div>

      <button 
        type="submit" 
        style={{ 
          marginTop: 30, 
          padding: '10px 20px', 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          border: 'none', 
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        Guardar factura
      </button>
    </div>
  );
};

export default InvoiceItemsForm;