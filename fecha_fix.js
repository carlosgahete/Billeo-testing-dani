// SOLUCIÓN PARA EL PROBLEMA DE CÁLCULO DE TOTALES EN FECHAS DE MARZO
// Integrar esta función en el componente InvoiceFormSimple.tsx

// Modifica la función handleNumericChange para:
//  1. Manejar mejor la conversión de strings a números
//  2. Actualizar inmediatamente los cálculos con cada cambio
//  3. Forzar una actualización del estado para que React vuelva a renderizar

function handleNumericChange(field, index, fieldName) {
  return function(e) {
    // 1. Capturar el valor directamente
    const inputValue = e.target.value;
    
    // 2. Aplicar la actualización básica primero
    field.onChange(inputValue);
    
    // 3. Forzar actualización de cálculos después de un breve momento
    setTimeout(function() {
      try {
        // Obtener los valores actualizados del formulario
        const formItems = form.getValues().items || [];
        
        // Si estamos cambiando cantidad o precio unitario, actualizar el subtotal del ítem
        if (index !== undefined && (fieldName === 'quantity' || fieldName === 'unitPrice')) {
          if (formItems[index]) {
            // Convertir a números de forma segura
            const quantity = Number(formItems[index].quantity) || 0;
            const unitPrice = Number(formItems[index].unitPrice) || 0;
            
            // Calcular subtotal
            const subtotal = quantity * unitPrice;
            
            // Actualizar el subtotal en el formulario
            form.setValue(`items.${index}.subtotal`, subtotal);
          }
        }
        
        // Recalcular todos los totales
        const totals = calculateTotals();
        
        // Actualizar el estado local para forzar renderizado
        setCalculatedTotalSnapshot({
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total
        });
      } catch (error) {
        console.error("Error en actualización automática:", error);
      }
    }, 0);
  };
}

// También añadir esta función para manejar cambios en las fechas:
function handleDateChange(field, name) {
  return function(date) {
    field.onChange(date);
    
    // Forzar actualización de totales cuando cambian las fechas
    // Esto es importante especialmente para fechas de marzo
    setTimeout(function() {
      calculateTotals();
    }, 10);
  };
}