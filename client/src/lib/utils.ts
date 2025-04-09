import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda (EUR)
 */
export function formatCurrency(amount: number): string {
  // Si la cantidad es cero, devolvemos "0 €" para evitar "-0 €"
  if (amount === 0) {
    return "0 €";
  }
  
  // Evitar el doble signo negativo en valores negativos
  // Formatear manualmente para tener más control
  if (amount < 0) {
    // Convertimos a positivo para formatear y luego añadimos el signo negativo
    const absValue = Math.abs(amount);
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      // Desactivar el signo para añadirlo manualmente
      signDisplay: 'never'
    }).format(absValue);
    
    return "-" + formatted;
  }
  
  // Formateo normal para números positivos
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
