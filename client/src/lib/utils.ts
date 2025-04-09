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
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
