import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tabla de proveedores
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessName: text("business_name").notNull(),
  taxId: text("tax_id"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("España"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabla de tipos de gastos
export const expenseTypes = pgTable("expense_types", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  categoryId: integer("category_id"),
  
  // Configuración fiscal por defecto
  defaultVatRate: text("default_vat_rate").default("21"),
  defaultVatDeductiblePercent: text("default_vat_deductible_percent").default("100"),
  defaultDeductibleForCorporateTax: boolean("default_deductible_for_corporate_tax").default(true),
  defaultDeductibleForIrpf: boolean("default_deductible_for_irpf").default(true),
  defaultDeductiblePercent: text("default_deductible_percent").default("100"),
  
  // Reglas especiales
  hasDeductibleLimit: boolean("has_deductible_limit").default(false),
  limitAmountPerYear: text("limit_amount_per_year"),
  limitAmountPerExpense: text("limit_amount_per_expense"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabla de gastos mejorada
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transactionId: integer("transaction_id"),
  expenseNumber: text("expense_number"),
  
  // Información básica
  description: text("description").notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  categoryId: integer("category_id"),
  paymentMethod: text("payment_method"),
  
  // Información del proveedor
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name"),
  supplierTaxId: text("supplier_tax_id"),
  
  // Información fiscal detallada
  netAmount: text("net_amount").notNull(),
  vatAmount: text("vat_amount").default("0"),
  vatRate: text("vat_rate").default("0"),
  vatDeductiblePercent: text("vat_deductible_percent").default("100"),
  vatDeductibleAmount: text("vat_deductible_amount").default("0"),
  
  irpfAmount: text("irpf_amount").default("0"),
  irpfRate: text("irpf_rate").default("0"),
  
  otherTaxes: jsonb("other_taxes"),
  totalAmount: text("total_amount").notNull(),
  
  // Deducibilidad fiscal
  deductibleForCorporateTax: boolean("deductible_for_corporate_tax").default(true),
  deductibleForIrpf: boolean("deductible_for_irpf").default(true),
  deductiblePercent: text("deductible_percent").default("100"),
  deductibleLimit: text("deductible_limit"),
  
  // Información adicional
  invoiceNumber: text("invoice_number"),
  notes: text("notes"),
  attachments: text("attachments").array(),
  
  // Campos técnicos
  createdFromOcr: boolean("created_from_ocr").default(false),
  ocrConfidence: text("ocr_confidence"),
  requiresReview: boolean("requires_review").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Esquemas de validación
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
});

export const insertExpenseTypeSchema = createInsertSchema(expenseTypes).omit({ 
  id: true,
  createdAt: true 
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true 
});

// Esquema extendido para gastos con validaciones adicionales
export const enhancedExpenseSchema = insertExpenseSchema.extend({
  // Validar que los importes sean coherentes
  netAmount: z.coerce.number().min(0.01, "El importe neto debe ser mayor que 0").transform(val => val.toString()),
  vatAmount: z.coerce.number().min(0, "El IVA no puede ser negativo").optional().transform(val => val?.toString()),
  vatRate: z.coerce.number().min(0).max(100, "El tipo de IVA debe estar entre 0 y 100").optional().transform(val => val?.toString()),
  vatDeductiblePercent: z.coerce.number().min(0).max(100, "El porcentaje deducible debe estar entre 0 y 100").optional().transform(val => val?.toString()),
  irpfAmount: z.coerce.number().min(0, "El IRPF no puede ser negativo").optional().transform(val => val?.toString()),
  irpfRate: z.coerce.number().min(0).max(100, "El tipo de IRPF debe estar entre 0 y 100").optional().transform(val => val?.toString()),
  totalAmount: z.coerce.number().min(0.01, "El importe total debe ser mayor que 0").transform(val => val.toString()),
  deductiblePercent: z.coerce.number().min(0).max(100, "El porcentaje deducible debe estar entre 0 y 100").optional().transform(val => val?.toString()),
  
  // Validar CIF/NIF si se proporciona
  supplierTaxId: z.string().optional().refine(
    (val) => !val || /^[A-Z]?\d{8}[A-Z]?$/i.test(val),
    "El CIF/NIF debe tener un formato válido"
  ),
  
  // Validar fecha
  expenseDate: z.union([z.string(), z.date()]).transform(val => {
    if (val instanceof Date) return val;
    return new Date(val);
  }),
});

// Tipos TypeScript
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type ExpenseType = typeof expenseTypes.$inferSelect;
export type InsertExpenseType = z.infer<typeof insertExpenseTypeSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type EnhancedExpense = z.infer<typeof enhancedExpenseSchema>;

// Tipos específicos para cálculos fiscales
export interface ExpenseTaxCalculation {
  netAmount: number;
  vatAmount: number;
  vatDeductibleAmount: number;
  irpfAmount: number;
  totalAmount: number;
  deductibleAmountCorporateTax: number;
  deductibleAmountIrpf: number;
}

// Función auxiliar para calcular impuestos automáticamente
export function calculateExpenseTaxes(expense: Partial<EnhancedExpense>): ExpenseTaxCalculation {
  const netAmount = Number(expense.netAmount || 0);
  const vatRate = Number(expense.vatRate || 0);
  const vatDeductiblePercent = Number(expense.vatDeductiblePercent || 100);
  const irpfRate = Number(expense.irpfRate || 0);
  const deductiblePercent = Number(expense.deductiblePercent || 100);
  
  // Calcular IVA
  const vatAmount = netAmount * (vatRate / 100);
  const vatDeductibleAmount = vatAmount * (vatDeductiblePercent / 100);
  
  // Calcular IRPF
  const irpfAmount = netAmount * (irpfRate / 100);
  
  // Calcular total
  const totalAmount = netAmount + vatAmount - irpfAmount;
  
  // Calcular importes deducibles
  const deductibleAmountCorporateTax = expense.deductibleForCorporateTax 
    ? netAmount * (deductiblePercent / 100) 
    : 0;
  const deductibleAmountIrpf = expense.deductibleForIrpf 
    ? netAmount * (deductiblePercent / 100) 
    : 0;
  
  return {
    netAmount,
    vatAmount,
    vatDeductibleAmount,
    irpfAmount,
    totalAmount,
    deductibleAmountCorporateTax,
    deductibleAmountIrpf,
  };
} 