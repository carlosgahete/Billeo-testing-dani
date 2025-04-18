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

  let subtotal = 0
  items.forEach((item: any) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.price) || 0
    subtotal += quantity * unitPrice
  })

  let taxes = 0
  additionalTaxes.forEach((tax: any) => {
    const rate = Number(tax.rate) || 0
    taxes += subtotal * (rate / 100)
  })

  // Si no hay impuestos adicionales definidos, aplicar IVA por defecto (21%)
  if (additionalTaxes.length === 0) {
    taxes = subtotal * 0.21 // 21% IVA
  }

  const total = subtotal + taxes

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxes: parseFloat(taxes.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  }
}