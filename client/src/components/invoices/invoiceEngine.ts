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
  taxTotal?: number;
  total?: number;
}

export function calculateInvoice(form: UseFormReturn<InvoiceFormData>) {
  const { getValues, setValue } = form
  const items = getValues('items') || []
  const additionalTaxes = getValues('additionalTaxes') || []

  let subtotal = 0
  items.forEach((item: InvoiceItem) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.price) || 0
    subtotal += quantity * unitPrice
  })

  let taxTotal = 0
  additionalTaxes.forEach((tax: AdditionalTax) => {
    const rate = Number(tax.rate) || 0
    taxTotal += subtotal * (rate / 100)
  })

  const total = subtotal + taxTotal

  // ✅ Actualiza los campos del formulario
  setValue('subtotal', parseFloat(subtotal.toFixed(2)), { shouldDirty: true })
  setValue('taxTotal', parseFloat(taxTotal.toFixed(2)), { shouldDirty: true })
  setValue('total', parseFloat(total.toFixed(2)), { shouldDirty: true })
}