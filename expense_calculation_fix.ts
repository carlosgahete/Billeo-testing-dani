// Este archivo contiene la corrección para el cálculo de la base imponible
// en las transacciones de gastos

// Fix 1: En lugar de usar el monto total como base imponible, calculamos correctamente
// la base imponible a partir del total y el valor del IVA
if (ivaObj) {
  // Si encontramos el objeto de IVA, extraemos la tasa y la cantidad del IVA
  ivaRate = ivaObj.amount || 21;
  const ivaValue = ivaObj.value || 0;
  
  // Calcular la base imponible adecuadamente a partir del importe total y el valor del IVA
  if (ivaValue > 0) {
    // Si tenemos el valor del IVA, podemos calcular la base imponible restando del total
    baseAmount = amount - ivaValue;
    console.log(`Calculando base imponible a partir del total ${amount}€ menos el IVA ${ivaValue}€: ${baseAmount}€`);
  } else if (tx.baseAmount) {
    baseAmount = Number(tx.baseAmount);
    console.log(`Usando baseAmount del objeto principal: ${baseAmount}€`);
  } else if (tx.base) {
    baseAmount = Number(tx.base);
    console.log(`Usando base del objeto principal: ${baseAmount}€`);
  } else if (tx.baseImponible) {
    baseAmount = Number(tx.baseImponible);
    console.log(`Usando baseImponible del objeto principal: ${baseAmount}€`);
  } else if (ivaRate > 0 && amount > 0) {
    // Calculamos la base imponible a partir del monto total y la tasa de IVA
    baseAmount = Math.round((amount / (1 + (ivaRate / 100))) * 100) / 100;
    console.log(`Calculando base imponible a partir del monto ${amount}€ y tasa IVA ${ivaRate}%: ${baseAmount}€`);
  } else {
    // Si no hay suficiente información, usamos un valor predeterminado
    baseAmount = amount;
    console.log(`Sin suficiente información para calcular la base imponible, usando valor por defecto: ${baseAmount}€`);
  }

  // El IVA es la diferencia entre el importe total y la base imponible
  ivaAmount = amount - baseAmount;
  
  console.log(`Transacción ID ${tx.id}: IVA encontrado en additionalTaxes`, {
    ivaRate,
    baseAmount,
    ivaAmount,
    totalAmount: amount
  });
  
  // Acumulamos los valores
  baseImponibleGastos += baseAmount;
  ivaSoportadoReal += ivaAmount;
  
  return; // Continuamos con la siguiente transacción
}

// Fix 2: Para el caso donde no hay información directa sobre el IVA en additionalTaxes
// Calculamos la base imponible a partir del valor total usando la tasa de IVA estándar (21%)
// Esto en lugar de simplemente usar el monto total como base imponible

// Calculamos la base imponible a partir del valor total y la tasa de IVA estándar (21%)
// Este es un fallback cuando no hay información directa sobre la base imponible
baseAmount = Math.round((Number(tx.amount) / 1.21) * 100) / 100;
console.log(`Calculando base imponible a partir del total ${tx.amount}€ con IVA estándar del 21%: ${baseAmount}€`);