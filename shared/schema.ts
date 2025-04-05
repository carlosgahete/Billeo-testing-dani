import { pgTable, text, serial, decimal, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("user"),
  businessType: text("business_type").notNull().default("autonomo"), // autonomo, empresa
  profileImage: text("profile_image"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  securityQuestion: text("security_question"),
  securityAnswer: text("security_answer"),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Company Profile Model
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  taxId: text("tax_id").notNull(), // CIF/NIF
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull(),
  email: text("email"),
  phone: text("phone"),
  logo: text("logo"),
  bankAccount: text("bank_account"), // Número de cuenta para transferencias bancarias
});

export const insertCompanySchema = createInsertSchema(companies).omit({ 
  id: true 
});
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Client Model
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  taxId: text("tax_id").notNull(), // CIF/NIF
  address: text("address").notNull(),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
});

export const insertClientSchema = createInsertSchema(clients).omit({ 
  id: true 
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Invoice Model
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  clientId: integer("client_id").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  additionalTaxes: jsonb("additional_taxes"), // Array de impuestos adicionales
  status: text("status").notNull().default("pending"), // pending, paid, overdue, canceled
  notes: text("notes"),
  attachments: text("attachments").array(),
  logo: text("logo"), // Logo para la factura (opcional)
});

// Definición del tipo de impuesto adicional
export const additionalTaxSchema = z.object({
  name: z.string().min(1, { message: "El nombre del impuesto es obligatorio" }),
  amount: z.union([z.string(), z.number()]).transform(val => 
    typeof val === 'string' ? Number(val) : val
  ), // Permitimos valores negativos para impuestos como IRPF
  isPercentage: z.boolean().optional() // Indicador de si es un porcentaje o un valor fijo
});

export type AdditionalTax = z.infer<typeof additionalTaxSchema>;

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ 
  id: true 
});

// Modificamos el esquema para incluir el campo additionalTaxes como un array de impuestos
export const invoiceWithTaxesSchema = insertInvoiceSchema.extend({
  additionalTaxes: z.array(additionalTaxSchema).optional().nullable()
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// Invoice Items Model
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ 
  id: true 
});
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// Transaction Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // income, expense
  color: text("color"),
  icon: text("icon"), // Icono/emoji para la categoría
});

export const insertCategorySchema = createInsertSchema(categories).omit({ 
  id: true 
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Transactions (Income/Expenses)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title"), // Título opcional para mostrar en la lista
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // income, expense
  categoryId: integer("category_id"),
  paymentMethod: text("payment_method"), // cash, bank_transfer, credit_card, etc.
  notes: text("notes"),
  attachments: text("attachments").array(),
  invoiceId: integer("invoice_id"), // Optional link to an invoice
  additionalTaxes: text("additional_taxes"), // Para almacenar impuestos como IRPF en formato JSON
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true 
});

// Helper function to convert string or number to string
function toStringAmount(value: any, defaultValue = "0"): string {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  // Si ya es un string, lo devolvemos tal cual
  if (typeof value === 'string') {
    return value;
  }
  
  // Si es un número, lo convertimos a string
  if (typeof value === 'number') {
    return value.toString();
  }
  
  // En cualquier otro caso, intentamos convertir a string
  return String(value);
}

// Definimos un esquema flexible para transacciones que acepta variedad de formatos para campos numéricos
export const transactionFlexibleSchema = insertTransactionSchema.extend({
  // Permitir que amount sea tanto string como número, pero siempre guardarlo como string
  amount: z.union([z.string(), z.number()]).transform(val => toStringAmount(val)),
  // Permitir que categoryId sea null, undefined, string o número
  categoryId: z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform(val => {
      if (val === null || val === undefined || val === '' || val === 'null') {
        return null;
      }
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num;
      }
      return val;
    }).nullable(),
  // Asegurar que la fecha sea un objeto Date válido
  date: z.union([z.string(), z.date()]).transform(val => {
    if (val instanceof Date) return val;
    return new Date(val);
  }),
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").notNull().default(false),
  priority: text("priority").default("medium"), // low, medium, high
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ 
  id: true 
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Quote Model (Presupuestos)
export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  quoteNumber: text("quote_number").notNull(),
  clientId: integer("client_id").notNull(),
  issueDate: timestamp("issue_date").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  additionalTaxes: jsonb("additional_taxes"), // Array de impuestos adicionales como IRPF
  status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired
  notes: text("notes"),
  attachments: text("attachments").array(),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ 
  id: true 
});

// Helper function to convert string to number
function toNumber(value: any, defaultValue = 0): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Modificamos el esquema para incluir el campo additionalTaxes como un array de impuestos
export const quoteWithTaxesSchema = insertQuoteSchema.extend({
  additionalTaxes: z.array(additionalTaxSchema).optional().nullable(),
  // Asegurarnos que los campos numéricos se conviertan correctamente
  clientId: z.preprocess((val) => toNumber(val), z.number()),
  subtotal: z.string(),
  tax: z.string(),
  total: z.string(),
  // Convertir fechas
  issueDate: z.preprocess((val) => val instanceof Date ? val : new Date(val as string), z.date()),
  validUntil: z.preprocess((val) => val instanceof Date ? val : new Date(val as string), z.date())
});

export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Quote Items Model
export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({ 
  id: true 
});

// Esquema validado para que los campos numéricos sean strings
export const quoteItemValidationSchema = insertQuoteItemSchema.extend({
  quantity: z.string(),
  unitPrice: z.string(),
  taxRate: z.string(),
  subtotal: z.string()
});
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;

// Dashboard Preferences
export const dashboardPreferences = pgTable("dashboard_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  layout: jsonb("layout").notNull(), // Layout completo con configuración detallada
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDashboardPreferencesSchema = createInsertSchema(dashboardPreferences).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

// Schema para un bloque del dashboard
export const dashboardBlockSchema = z.object({
  id: z.string(), // ID único del bloque
  type: z.string(), // Tipo de bloque (income, expenses, taxes, etc.)
  position: z.object({
    x: z.number(), // Posición horizontal (columna)
    y: z.number(), // Posición vertical (fila)
    w: z.number(), // Ancho (en unidades de grid)
    h: z.number(), // Alto (en unidades de grid)
  }),
  visible: z.boolean().default(true), // Si es visible o no
  config: z.record(z.any()).optional(), // Configuración específica del bloque
});

export type DashboardBlock = z.infer<typeof dashboardBlockSchema>;
export type InsertDashboardPreferences = z.infer<typeof insertDashboardPreferencesSchema>;
export type DashboardPreferences = typeof dashboardPreferences.$inferSelect;
