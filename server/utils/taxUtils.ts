/**
 * Utilidades para cálculos fiscales
 * 
 * Este módulo contiene funciones para calcular correctamente
 * bases imponibles, IVA e IRPF en facturas de gastos e ingresos.
 */

/**
 * Calcula la base imponible a partir del importe total, IVA e IRPF
 * 
 * @param total Importe total de la factura (con IVA y con IRPF aplicado)
 * @param iva Importe del IVA en euros
 * @param irpf Importe del IRPF en euros (valor positivo)
 * @returns La base imponible calculada
 */
export function calcularBaseConImpuestos(total: number, iva: number, irpf: number = 0): number {
  // Fórmula: base = total - IVA + IRPF
  return total - iva + irpf;
}

/**
 * Calcula la base imponible a partir del importe total y las tasas de IVA e IRPF
 * 
 * @param total Importe total de la factura (con IVA y con IRPF aplicado)
 * @param ivaRate Tasa de IVA como porcentaje (ej: 21 para 21%)
 * @param irpfRate Tasa de IRPF como porcentaje (ej: 15 para 15%)
 * @returns Un objeto con la base imponible, el importe de IVA y el importe de IRPF
 */
export function calcularBaseConTasas(total: number, ivaRate: number, irpfRate: number = 0): {
  base: number;
  ivaImporte: number;
  irpfImporte: number;
} {
  // Si hay IRPF, la fórmula para despejar la base imponible desde el total es:
  // base = (total * (1 + irpfRate/100)) / (1 + (ivaRate/100) - (irpfRate/100))
  
  const factorIVA = ivaRate / 100;
  const factorIRPF = irpfRate / 100;
  
  let base: number;
  let ivaImporte: number;
  let irpfImporte: number;
  
  if (irpfRate !== 0) {
    // Usar la fórmula completa que considera IRPF e IVA
    base = (total * (1 + factorIRPF)) / (1 + factorIVA - factorIRPF);
    
    // Redondear a 2 decimales para evitar errores de punto flotante
    base = Math.round(base * 100) / 100;
    
    // El IVA es un porcentaje de la base imponible
    ivaImporte = Math.round(base * factorIVA * 100) / 100;
    
    // El IRPF es un porcentaje de la base imponible
    irpfImporte = Math.round(base * factorIRPF * 100) / 100;
  } else {
    // Si no hay IRPF, usamos la fórmula simple: base = total / (1 + ivaRate/100)
    base = Math.round((total / (1 + factorIVA)) * 100) / 100;
    
    // El IVA es la diferencia entre el total y la base
    ivaImporte = Math.round((total - base) * 100) / 100;
    
    irpfImporte = 0;
  }
  
  return { base, ivaImporte, irpfImporte };
}

/**
 * Detecta si un importe probablemente tiene IRPF aplicado basado en patrones numéricos
 * 
 * @param amount Importe total a analizar
 * @returns true si el importe probablemente tiene IRPF aplicado
 */
export function detectarPosibleIRPF(amount: number): boolean {
  // Muchas facturas con IRPF tienen finales característicos (06, 32, 58, etc.)
  // debido al resultado de aplicar IVA del 21% y restar IRPF del 15%
  const lastTwoDigits = Math.round(amount * 100) % 100;
  
  return (
    (lastTwoDigits >= 5 && lastTwoDigits <= 10) || 
    (lastTwoDigits >= 30 && lastTwoDigits <= 35) ||
    (lastTwoDigits >= 55 && lastTwoDigits <= 60) ||
    (lastTwoDigits >= 80 && lastTwoDigits <= 85)
  );
}

/**
 * Función auxiliar para calcular la base imponible e IVA a partir
 * del importe total y la tasa de IVA, considerando IRPF si es necesario
 * 
 * @param amount Importe total de la factura
 * @param tasaIVA Tasa de IVA como porcentaje (ej: 21 para 21%)
 * @param irpf Tasa de IRPF como porcentaje (ej: 15 para 15%)
 * @returns Objeto con base imponible, IVA y IRPF calculados
 */
export function calcularBaseEIVA(amount: number, tasaIVA: number, irpf = 0) {
  // Usar las funciones de utilidad importadas del módulo taxUtils
  const resultado = calcularBaseConTasas(amount, tasaIVA, irpf);
  
  // Si hay IRPF, mostramos información de debug detallada
  if (irpf !== 0) {
    console.log(`Cálculo con IRPF: Total=${amount}€, Base=${resultado.base}€, IVA=${resultado.ivaImporte}€, IRPF=${resultado.irpfImporte}€`);
  }
  
  return {
    base: resultado.base,
    iva: resultado.ivaImporte,
    irpfAmount: resultado.irpfImporte
  };
}