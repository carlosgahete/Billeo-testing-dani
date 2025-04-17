/**
 * Solución específica para corregir problemas de cálculo con facturas de marzo
 * 
 * Este archivo contiene funciones que ayudan a garantizar que los cálculos
 * en tiempo real de facturas con fechas de marzo se realicen correctamente.
 */

// Aplica esta función después de cualquier cálculo de subtotales
function ensureCorrectTotals(form, setSnapshotFn) {
  // 1. Forzar la actualización de todos los subtotales
  const items = form.getValues().items || [];
  let subtotalGeneral = 0;
  let ivaGeneral = 0;
  
  // Recalcular todos los valores manualmente
  items.forEach((item, index) => {
    // Conversión segura a números
    const quantity = typeof item.quantity === 'string' 
                   ? parseFloat(item.quantity) || 0 
                   : item.quantity || 0;
                   
    const unitPrice = typeof item.unitPrice === 'string'
                    ? parseFloat(item.unitPrice) || 0
                    : item.unitPrice || 0;
                    
    const taxRate = typeof item.taxRate === 'string'
                  ? parseFloat(item.taxRate) || 0
                  : item.taxRate || 0;
    
    // Calcular subtotal del ítem
    const subtotalItem = quantity * unitPrice;
    console.log(`📊 Ítem ${index+1}: ${quantity} × ${unitPrice} = ${subtotalItem}`);
    
    // Establecer subtotal en el formulario
    form.setValue(`items.${index}.subtotal`, subtotalItem);
    
    // Acumular valores
    subtotalGeneral += subtotalItem;
    ivaGeneral += subtotalItem * (taxRate / 100);
  });
  
  // 2. Calcular impuestos adicionales
  const additionalTaxes = form.getValues().additionalTaxes || [];
  let additionalTaxesTotal = 0;
  
  additionalTaxes.forEach(tax => {
    if (!tax) return;
    
    const isPercentage = !!tax.isPercentage;
    const amount = typeof tax.amount === 'string'
                 ? parseFloat(tax.amount) || 0
                 : tax.amount || 0;
    
    if (isPercentage) {
      additionalTaxesTotal += subtotalGeneral * (amount / 100);
    } else {
      additionalTaxesTotal += amount;
    }
  });
  
  // 3. Calcular el total final
  const totalFinal = subtotalGeneral + ivaGeneral + additionalTaxesTotal;
  
  // 4. Actualizar valores en el formulario
  form.setValue("subtotal", subtotalGeneral);
  form.setValue("tax", ivaGeneral);
  form.setValue("total", Math.max(0, totalFinal));
  
  console.log(`🧮 TOTALES RECALCULADOS MANUALMENTE: Base=${subtotalGeneral}, IVA=${ivaGeneral}, Total=${totalFinal}`);
  
  // 5. Actualizar el snapshot para forzar el renderizado
  setSnapshotFn({
    subtotal: subtotalGeneral,
    tax: ivaGeneral,
    total: Math.max(0, totalFinal)
  });
  
  // 6. Devolver los totales calculados
  return {
    subtotal: subtotalGeneral,
    tax: ivaGeneral,
    additionalTaxesTotal,
    total: Math.max(0, totalFinal)
  };
}

// Esta función detecta si la fecha de la factura es de marzo
function isMarchInvoice(form) {
  try {
    const issueDate = form.getValues().issueDate;
    if (!issueDate) return false;
    
    // Convertir a objeto Date
    const date = new Date(issueDate);
    
    // Verificar si es válido
    if (isNaN(date.getTime())) return false;
    
    // Verificar si es marzo (mes 2 en JavaScript - los meses van de 0 a 11)
    return date.getMonth() === 2;
  } catch (error) {
    console.error("Error al verificar fecha de marzo:", error);
    return false;
  }
}

// Función principal para aplicar la corrección
export function applyMarchInvoiceFix(form, setCalculatedTotalSnapshot) {
  // Verificar si es una factura de marzo
  if (isMarchInvoice(form)) {
    console.log("📅 FACTURA DE MARZO DETECTADA - Aplicando corrección especial");
    
    // Aplicar corrección forzada
    const result = ensureCorrectTotals(form, setCalculatedTotalSnapshot);
    
    // Forzar una segunda actualización después de un breve retraso
    setTimeout(() => {
      const secondResult = ensureCorrectTotals(form, setCalculatedTotalSnapshot);
      console.log("🔄 Segunda corrección aplicada para factura de marzo");
    }, 100);
    
    return result;
  }
  
  return null; // No es una factura de marzo, no se aplica corrección
}

// Función para usar en el evento onChange
export function createMarchAwareChangeHandler(originalHandler, form, setCalculatedTotalSnapshot) {
  return function(...args) {
    // Llamar al manejador original
    const result = originalHandler.apply(this, args);
    
    // Aplicar corrección para facturas de marzo
    setTimeout(() => {
      if (isMarchInvoice(form)) {
        ensureCorrectTotals(form, setCalculatedTotalSnapshot);
      }
    }, 50);
    
    return result;
  };
}