/**
 * Solución específica para corregir problemas de cálculo con facturas de marzo
 * Este módulo provee funciones de utilidad para el componente InvoiceFormSimple
 */

// Función para convertir de forma segura a número
export function safeParseNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'number') return value;
  
  try {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch (e) {
    return defaultValue;
  }
}

// Función para actualizar subtotales
export function updateAllItemSubtotals(form: any) {
  try {
    const items = form.getValues().items || [];
    
    items.forEach((item: any, index: number) => {
      // Convertir valores a números
      const quantity = safeParseNumber(item.quantity);
      const unitPrice = safeParseNumber(item.unitPrice);
      
      // Calcular subtotal
      const subtotal = quantity * unitPrice;
      
      // Actualizar en el formulario
      form.setValue(`items.${index}.subtotal`, subtotal);
    });
    
    return true;
  } catch (error) {
    console.error("❌ Error al actualizar subtotales:", error);
    return false;
  }
}

// Función para recalcular todos los totales
export function recalculateTotals(form: any) {
  try {
    // 1. Asegurarse que los subtotales estén actualizados
    updateAllItemSubtotals(form);
    
    // 2. Obtener datos actualizados
    const items = form.getValues().items || [];
    const additionalTaxes = form.getValues().additionalTaxes || [];
    
    // 3. Calcular subtotal general
    let subtotalGeneral = 0;
    let ivaGeneral = 0;
    
    // Procesar cada ítem
    items.forEach((item: any) => {
      const subtotal = safeParseNumber(item.subtotal);
      const taxRate = safeParseNumber(item.taxRate);
      
      subtotalGeneral += subtotal;
      ivaGeneral += subtotal * (taxRate / 100);
    });
    
    // 4. Calcular impuestos adicionales
    let additionalTaxesTotal = 0;
    
    additionalTaxes.forEach((tax: any) => {
      if (!tax) return;
      
      const isPercentage = !!tax.isPercentage;
      const amount = safeParseNumber(tax.amount);
      
      if (isPercentage) {
        additionalTaxesTotal += subtotalGeneral * (amount / 100);
      } else {
        additionalTaxesTotal += amount;
      }
    });
    
    // 5. Calcular total final
    const total = subtotalGeneral + ivaGeneral + additionalTaxesTotal;
    
    // 6. Actualizar valores en el formulario
    form.setValue("subtotal", subtotalGeneral);
    form.setValue("tax", ivaGeneral);
    form.setValue("total", Math.max(0, total));
    
    // 7. Retornar resultados
    return {
      subtotal: subtotalGeneral,
      tax: ivaGeneral,
      additionalTaxesTotal,
      total: Math.max(0, total)
    };
  } catch (error) {
    console.error("❌ Error en recálculo de totales:", error);
    return {
      subtotal: 0,
      tax: 0,
      additionalTaxesTotal: 0,
      total: 0
    };
  }
}

// Función para forzar una actualización de todos los valores
export function forceUpdateAllValues(form: any, setCalculatedTotalSnapshot: any) {
  try {
    // Calcular todos los totales
    const result = recalculateTotals(form);
    
    // Actualizar el snapshot para forzar renderizado
    setCalculatedTotalSnapshot({
      subtotal: result.subtotal,
      tax: result.tax,
      total: result.total
    });
    
    // Programar una segunda actualización con delay
    setTimeout(() => {
      const finalResult = recalculateTotals(form);
      
      setCalculatedTotalSnapshot({
        subtotal: finalResult.subtotal,
        tax: finalResult.tax,
        total: finalResult.total
      });
    }, 50);
    
    return result;
  } catch (error) {
    console.error("❌ Error forzando actualización:", error);
    return null;
  }
}

// Detector de facturas de marzo (o cualquier fecha pasada)
export function isPastDateInvoice(form: any) {
  try {
    const issueDate = form.getValues().issueDate;
    if (!issueDate) return false;
    
    const date = new Date(issueDate);
    const today = new Date();
    
    // Verificar validez
    if (isNaN(date.getTime())) return false;
    
    // Verificar si es una fecha anterior al día actual
    return date < today;
  } catch (error) {
    console.error("Error verificando fecha:", error);
    return false;
  }
}

// Función para envolver cualquier manejador de eventos y asegurar cálculos correctos
export function withCorrectCalculation(originalHandler: any, form: any, setCalculatedTotalSnapshot: any) {
  return function(...args: any[]) {
    // Ejecutar el manejador original
    const result = originalHandler(...args);
    
    // Para facturas con fechas pasadas, forzar actualización adicional
    if (isPastDateInvoice(form)) {
      setTimeout(() => {
        forceUpdateAllValues(form, setCalculatedTotalSnapshot);
      }, 10);
    }
    
    return result;
  };
}