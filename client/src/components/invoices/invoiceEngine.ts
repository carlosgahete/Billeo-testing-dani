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
  const defaultTaxRate = Number(data.defaultTaxRate) || 21 // IVA por defecto si no se especifica

  // Calcula el subtotal sumando cada artículo
  let subtotal = 0
  items.forEach((item: any) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.price) || 0
    subtotal += quantity * unitPrice
  })

  // Procesa impuestos adicionales si existen
  let taxes = 0
  
  // Si hay impuestos adicionales definidos por el usuario, usarlos
  if (additionalTaxes.length > 0) {
    additionalTaxes.forEach((tax: any) => {
      const rate = Number(tax.rate) || 0
      taxes += subtotal * (rate / 100)
    })
  } else {
    // Si no hay impuestos adicionales, aplicar el IVA por defecto seleccionado
    taxes = subtotal * (defaultTaxRate / 100)
  }

  // Calcula el total final
  const total = subtotal + taxes

  // Redondea todos los valores a 2 decimales
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxes: parseFloat(taxes.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  }
}