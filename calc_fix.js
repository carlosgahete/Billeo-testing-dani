// SOLUCIÓN DE CÁLCULO PARA FORMULARIO DE FACTURAS

// Función de conversión segura a número
function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  
  const parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

// Función para actualizar los subtotales de cada ítem
function updateItemSubtotals(form) {
  const formItems = form.getValues().items || [];
  
  let subtotalGeneral = 0;
  let ivaGeneral = 0;
  
  // Recorrer cada ítem y calcular su subtotal
  formItems.forEach((item, index) => {
    const quantity = toNumber(item.quantity, 0);
    const unitPrice = toNumber(item.unitPrice, 0);
    const taxRate = toNumber(item.taxRate, 0);
    
    // Calcular subtotal del ítem
    const subtotal = quantity * unitPrice;
    
    // Actualizar subtotal en el formulario
    form.setValue(`items.${index}.subtotal`, subtotal);
    
    // Acumular totales
    subtotalGeneral += subtotal;
    ivaGeneral += subtotal * (taxRate / 100);
  });
  
  // Calcular impuestos adicionales
  const additionalTaxes = form.getValues().additionalTaxes || [];
  let additionalTaxesTotal = 0;
  
  additionalTaxes.forEach((tax) => {
    if (!tax) return;
    
    const amount = toNumber(tax.amount, 0);
    const isPercentage = !!tax.isPercentage;
    
    if (isPercentage) {
      additionalTaxesTotal += subtotalGeneral * (amount / 100);
    } else {
      additionalTaxesTotal += amount;
    }
  });
  
  // Calcular total final
  const totalFinal = subtotalGeneral + ivaGeneral + additionalTaxesTotal;
  
  // Actualizar los campos de totales en el formulario
  form.setValue("subtotal", subtotalGeneral);
  form.setValue("tax", ivaGeneral);
  form.setValue("total", Math.max(0, totalFinal));
  
  // Devolver los totales calculados
  return {
    subtotal: subtotalGeneral,
    tax: ivaGeneral,
    additionalTaxesTotal,
    total: Math.max(0, totalFinal)
  };
}

// Función para forzar un recálculo de totales
function forceRecalculateTotals(form, setCalculatedTotalSnapshot) {
  console.log("🔄 Forzando recálculo de totales...");
  
  try {
    // Realizar el cálculo
    const result = updateItemSubtotals(form);
    console.log("✅ Totales recalculados:", result);
    
    // Actualizar el snapshot para forzar el renderizado
    setCalculatedTotalSnapshot({
      subtotal: result.subtotal,
      tax: result.tax,
      total: result.total
    });
    
    return result;
  } catch (error) {
    console.error("❌ Error al recalcular totales:", error);
    return {
      subtotal: 0,
      tax: 0,
      additionalTaxesTotal: 0,
      total: 0
    };
  }
}

// Esta es la función principal que deberás usar en tu código
function setupRealTimeCalculations(form, setCalculatedTotalSnapshot) {
  // Observar cambios en el formulario
  const formValues = form.watch();
  
  // Configurar efecto para actualizar cuando cambian los valores
  useEffect(() => {
    console.log("🔄 Valores del formulario cambiados, recalculando...");
    forceRecalculateTotals(form, setCalculatedTotalSnapshot);
  }, [formValues, form, setCalculatedTotalSnapshot]);
  
  // Retornar funciones de utilidad
  return {
    calculateTotals: () => forceRecalculateTotals(form, setCalculatedTotalSnapshot),
    handleItemChange: (field, index, fieldName) => {
      return (e) => {
        // Actualizar el campo
        field.onChange(e.target.value);
        
        // Recalcular después de un pequeño retraso para dar tiempo a que se actualice el valor
        setTimeout(() => {
          forceRecalculateTotals(form, setCalculatedTotalSnapshot);
        }, 10);
      };
    }
  };
}