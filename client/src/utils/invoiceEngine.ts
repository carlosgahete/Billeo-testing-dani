import { UseFormReturn } from 'react-hook-form'
import { InvoiceFormValues } from '@/types/invoice'

export function calculateInvoice(form: UseFormReturn<InvoiceFormValues>) {
  const { getValues, setValue } = form
  const items = getValues('items') || []
  const additionalTaxes = getValues('additionalTaxes') || []

  let subtotal = 0
  items.forEach(item => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    subtotal += quantity * unitPrice
  })

  let taxTotal = 0
  additionalTaxes.forEach(tax => {
    const rate = Number(tax.rate) || 0
    taxTotal += subtotal * (rate / 100)
  })

  const total = subtotal + taxTotal

  // ✅ Actualiza los campos del formulario
  setValue('subtotal', parseFloat(subtotal.toFixed(2)), { shouldDirty: true })
  setValue('taxTotal', parseFloat(taxTotal.toFixed(2)), { shouldDirty: true })
  setValue('total', parseFloat(total.toFixed(2)), { shouldDirty: true })
}