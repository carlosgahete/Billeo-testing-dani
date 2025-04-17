/**
 * SOLUCIÓN AL PROBLEMA DE CÁLCULO EN FACTURAS CON FECHAS DE MARZO
 * 
 * Instrucciones para implementar:
 * 
 * 1. Añadir esta función en InvoiceFormSimple.tsx después de la función handleNumericChange
 */

// Función específica para manejar cambios de fecha
const handleDateChange = (field, dateType) => {
  return (date) => {
    if (!date) return;
    
    // Formatear la fecha y actualizar el campo
    const formattedDate = format(date, "yyyy-MM-dd");
    console.log(`🗓️ ${dateType} cambiada a ${formattedDate}`);
    
    // Actualizar el campo
    field.onChange(formattedDate);
    
    // Verificar si la fecha es de marzo (mes 2 en JavaScript, que empieza en 0)
    const isMarzo = date.getMonth() === 2;
    if (isMarzo) {
      console.log("⚠️ FECHA DE MARZO DETECTADA - Aplicando actualización forzada");
    }
    
    // Forzar recálculo de totales después de cambiar la fecha
    // Especialmente importante para fechas en marzo
    setTimeout(() => {
      try {
        // Primero actualizar los subtotales
        updateItemSubtotals();
        
        // Luego calcular totales generales
        const totals = calculateTotals();
        console.log(`📊 Totales recalculados después de cambio de fecha:`, totals);
        
        // Actualizar snapshot para forzar renderizado
        setCalculatedTotalSnapshot({
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total
        });
        
        // Doble verificación para fechas de marzo
        if (isMarzo) {
          console.log("🔍 Verificando de nuevo debido a fecha de marzo");
          // Un segundo retardo para asegurar que todo está actualizado
          setTimeout(() => calculateTotals(), 50);
        }
      } catch (error) {
        console.error("Error al recalcular después de cambio de fecha:", error);
      }
    }, 20);
  };
};

/**
 * 2. Modificar ambos componentes de calendario en el formulario:
 * 
 * Buscar todas las apariciones de:
 * 
 * onSelect={(date) => {
 *   if (date) {
 *     field.onChange(format(date, "yyyy-MM-dd"));
 *   }
 * }}
 * 
 * Y reemplazarlas con:
 * 
 * onSelect={handleDateChange(field, "Fecha de emisión")}
 * 
 * o
 * 
 * onSelect={handleDateChange(field, "Fecha de vencimiento")}
 * 
 * según corresponda al campo.
 */
