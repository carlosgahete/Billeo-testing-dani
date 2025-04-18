import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod';

// Define el tipo internamente para evitar problemas de importación
interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal?: number;
}

interface AdditionalTax {
  name: string;
  amount: number;
  rate?: number;
  isPercentage: boolean;
}

interface InvoiceFormValues {
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  taxTotal?: number;
  total: number;
  additionalTaxes: AdditionalTax[];
  status: string;
  notes?: string;
  attachments?: string[];
  items: InvoiceItem[];
}

export function calculateInvoice(form: UseFormReturn<any>) {
  const { getValues, setValue } = form
  const items = getValues('items') || []
  const additionalTaxes = getValues('additionalTaxes') || []

  let subtotal = 0
  items.forEach((item: any) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    subtotal += quantity * unitPrice
  })

  let taxTotal = 0
  additionalTaxes.forEach((tax: any) => {
    // Usar 'amount' en lugar de 'rate' para mantener compatibilidad
    const rate = Number(tax.amount) || 0
    taxTotal += subtotal * (rate / 100)
  })

  const total = subtotal + taxTotal

  // ✅ Actualiza los campos del formulario
  setValue('subtotal', parseFloat(subtotal.toFixed(2)), { shouldDirty: true })
  setValue('tax', parseFloat(taxTotal.toFixed(2)), { shouldDirty: true })
  setValue('total', parseFloat(total.toFixed(2)), { shouldDirty: true })
}