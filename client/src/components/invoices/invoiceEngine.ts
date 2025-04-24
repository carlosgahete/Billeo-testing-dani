import { UseFormReturn } from 'react-hook-form'

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
}

interface AdditionalTax {
  name: string;
  amount?: number;
  rate?: number;
}

interface InvoiceFormData {
  items: InvoiceItem[];
  additionalTaxes: AdditionalTax[];
  subtotal?: number;
  taxes?: number;
  total?: number;
}

// Versión para usar con valores directos (sin form)
export function calculateInvoice(data: any) {
  const items = data.items || []
  const additionalTaxes = data.additionalTaxes || []

  // Calcular subtotal sumando todos los items
  let subtotal = 0
  items.forEach((item: any) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.price) || 0
    subtotal += quantity * unitPrice
  })

  // Calcular impuestos solo si hay impuestos definidos
  let taxes = 0
  additionalTaxes.forEach((tax: any) => {
    // Permitimos rates negativos (ej: -21 para IRPF)
    const rate = Number(tax.rate) || 0
    taxes += subtotal * (rate / 100)
  })

  // No añadir impuestos automáticamente si no hay ninguno definido
  // Solo se aplican los impuestos que el usuario ha añadido explícitamente

  // Calcular total
  const total = subtotal + taxes

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxes: parseFloat(taxes.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  }
}