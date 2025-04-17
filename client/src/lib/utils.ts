import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un valor numérico como moneda (EUR)
 * @param value - El valor a formatear
 * @returns El valor formateado como moneda
 */
export function formatCurrency(value: number | undefined | null) {
  // Asegurarnos de que el valor es un número, y si no, usar 0
  const safeValue = value !== undefined && value !== null ? value : 0;
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(safeValue);
}