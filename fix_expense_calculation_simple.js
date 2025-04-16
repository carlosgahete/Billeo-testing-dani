/**
 * Este archivo contiene la corrección para el cálculo de la base imponible
 * 
 * En lugar de usar directamente el monto total como base imponible, ahora:
 * 1. Si tenemos el valor del IVA, calculamos: baseAmount = amount - ivaValue
 * 2. Si no, usamos la fórmula: baseAmount = amount / (1 + IVA/100)
 * 
 * Esto debe aplicarse en dos lugares:
 * 1. Cuando se procesa additionalTaxes y se encuentra un impuesto de tipo IVA
 * 2. Cuando se usa como fallback cuando no hay datos específicos de la base imponible
 */

// Explicación detallada:
// Cuando se registra un gasto de 121€ con IVA 21%:
// - Monto total: 121€
// - Base imponible real: 100€ 
// - IVA: 21€

// El problema era que se usaba el monto total (121€) como base imponible
// en lugar de calcular correctamente la base (100€)

// Para corregirlo, dividimos el total entre (1 + IVA/100):
// baseAmount = 121 / (1 + 21/100) = 121 / 1.21 = 100€

// Este cambio garantiza que:
// 1. Los reportes fiscales muestren el monto correcto
// 2. Las declaraciones de impuestos sean precisas
// 3. El usuario no pague IVA sobre cantidades incorrectas