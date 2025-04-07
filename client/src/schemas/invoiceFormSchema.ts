import { z } from 'zod';

// Esquema para un ítem de factura
export const invoiceItemSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria'),
  quantity: z.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  unitPrice: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  taxRate: z.number().min(0, 'El porcentaje de IVA debe ser mayor o igual a 0'),
  subtotal: z.number().optional()
});

// Esquema para un impuesto adicional
export const additionalTaxSchema = z.object({
  name: z.string().min(1, 'El nombre del impuesto es obligatorio'),
  amount: z.number(), // Puede ser positivo o negativo (como retenciones)
  isPercentage: z.boolean().default(false),
});

// Esquema completo para una factura
export const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'El número de factura es obligatorio'),
  clientId: z.number().min(1, 'Debes seleccionar un cliente'),
  issueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'La fecha de emisión no es válida',
  }),
  dueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'La fecha de vencimiento no es válida',
  }),
  status: z.string().min(1, 'El estado es obligatorio'),
  items: z.array(invoiceItemSchema).min(1, 'Debe haber al menos una línea de factura'),
  additionalTaxes: z.array(additionalTaxSchema).optional().default([]),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
export type InvoiceItemValues = z.infer<typeof invoiceItemSchema>;
export type AdditionalTaxValues = z.infer<typeof additionalTaxSchema>;