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
  businessType: text("business_type"), // autonomo, empresa
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
  console.log("toStringAmount - Valor original recibido:", value, "tipo:", typeof value);
  
  if (value === undefined || value === null) {
    console.log("toStringAmount - Valor undefined/null, usando default:", defaultValue);
    return defaultValue;
  }
  
  // Si ya es un string, normalizamos el formato (reemplazar coma por punto)
  if (typeof value === 'string') {
    console.log("toStringAmount - Procesando string:", value);
    // Reemplazar comas por puntos
    const normalized = value.replace(',', '.');
    console.log("toStringAmount - String normalizado:", normalized);
    
    // Intentar convertir a número y formatear con 2 decimales
    try {
      const num = parseFloat(normalized);
      if (!isNaN(num)) {
        const result = num.toFixed(2);
        console.log("toStringAmount - Convertido a número y formateado:", result);
        return result;
      }
    } catch (e) {
      console.log("toStringAmount - Error al convertir string a número:", e);
      // Si hay error al convertir, devolvemos el valor original normalizado
    }
    return normalized;
  }
  
  // Si es un número, lo convertimos a string con formato de 2 decimales
  if (typeof value === 'number') {
    console.log("toStringAmount - Procesando número:", value);
    const result = value.toFixed(2);
    console.log("toStringAmount - Número formateado:", result);
    return result;
  }
  
  // En cualquier otro caso, intentamos convertir a string
  try {
    console.log("toStringAmount - Procesando tipo desconocido, intentando convertir a string");
    const asStr = String(value);
    const normalized = asStr.replace(',', '.');
    console.log("toStringAmount - Convertido a string y normalizado:", normalized);
    
    const num = parseFloat(normalized);
    if (!isNaN(num)) {
      const result = num.toFixed(2);
      console.log("toStringAmount - Convertido a número y formateado:", result);
      return result;
    }
    return normalized;
  } catch (e) {
    console.log("toStringAmount - Error al procesar tipo desconocido:", e);
    return defaultValue;
  }
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
  // Manejar additionalTaxes como string o array - versión simplificada
  additionalTaxes: z.union([
    z.string(),
    z.array(additionalTaxSchema),
    z.null(), 
    z.undefined()
  ]).transform(val => {
    if (val === null || val === undefined) {
      return null;
    }
    // Si es un string, lo mantenemos como string
    if (typeof val === 'string') {
      return val; // No intentamos parsearlo para evitar errores
    }
    // Si es un array, lo convertimos a string
    if (Array.isArray(val)) {
      return JSON.stringify(val);
    }
    // En cualquier otro caso, lo convertimos a string
    return JSON.stringify(val);
  }).nullable(),
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
  emailNotifications: boolean("email_notifications").default(true), // Preferencia de notificaciones por email
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

// Tabla de archivos
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileType: text("file_type").notNull(), // 'image', 'pdf', 'document', 'other'
  entityType: text("entity_type"), // 'expense', 'invoice', 'quote', 'client', 'company'
  entityId: integer("entity_id"),
  uploadDate: timestamp("upload_date").notNull().defaultNow(),
  thumbnailPath: text("thumbnail_path"),
  isDeleted: boolean("is_deleted").default(false),
});

// Esquema de inserción para archivos
export const insertFileSchema = createInsertSchema(files)
  .omit({ id: true });
  
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Tabla de relación entre administradores y clientes
export const adminClientRelations = pgTable("admin_client_relations", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  assignedBy: integer("assigned_by").notNull().references(() => users.id), // ID del superadmin que hizo la asignación
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  // Constraint para evitar duplicados de admin-cliente
  uniqueAdminClient: text("unique_admin_client").notNull().unique()
    .$defaultFn(() => ""), // Se llenará con adminId_clientId en el insert
});

export const insertAdminClientRelationSchema = createInsertSchema(adminClientRelations)
  .omit({ id: true, assignedAt: true, uniqueAdminClient: true });

export type InsertAdminClientRelation = z.infer<typeof insertAdminClientRelationSchema>;
export type AdminClientRelation = typeof adminClientRelations.$inferSelect;
