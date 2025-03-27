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
  profileImage: text("profile_image"),
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
});

// Definición del tipo de impuesto adicional
export const additionalTaxSchema = z.object({
  name: z.string().min(1, { message: "El nombre del impuesto es obligatorio" }),
  amount: z.number(), // Permitimos valores negativos para impuestos como IRPF
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
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // income, expense
  categoryId: integer("category_id"),
  paymentMethod: text("payment_method"), // cash, bank_transfer, credit_card, etc.
  notes: text("notes"),
  attachments: text("attachments").array(),
  invoiceId: integer("invoice_id"), // Optional link to an invoice
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ 
  id: true 
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

// Modificamos el esquema para incluir el campo additionalTaxes como un array de impuestos
export const quoteWithTaxesSchema = insertQuoteSchema.extend({
  additionalTaxes: z.array(additionalTaxSchema).optional().nullable()
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
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItems.$inferSelect;
