import { randomBytes, timingSafeEqual } from 'crypto';
import {
  User,
  InsertUser,
  Company,
  InsertCompany,
  Client,
  InsertClient,
  Invoice,
  InsertInvoice,
  InvoiceItem,
  InsertInvoiceItem,
  Quote,
  InsertQuote,
  QuoteItem,
  InsertQuoteItem,
  Category,
  InsertCategory,
  Transaction,
  InsertTransaction,
  Task,
  InsertTask,
  users,
  companies,
  clients,
  invoices,
  invoiceItems,
  quotes,
  quoteItems,
  categories,
  transactions,
  tasks,
  dashboardPreferences,
  DashboardPreferences,
  InsertDashboardPreferences,
  DashboardBlock
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db, sql } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { hashPassword, comparePasswords } from "./auth";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  loginAsUser(adminId: number, userId: number): Promise<{success: boolean, log?: any}>;
  setSecurityQuestion(userId: number, question: string, answer: string): Promise<boolean>;
  verifySecurityAnswer(email: string, answer: string): Promise<User | undefined>;
  
  // Métodos para recuperación de contraseña
  createPasswordResetToken(email: string): Promise<{ token: string, user: User } | undefined>;
  verifyPasswordResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: number, newPassword: string): Promise<boolean>;
  
  // Dashboard preferences operations
  getDashboardPreferences(userId: number): Promise<DashboardPreferences | undefined>;
  saveDashboardPreferences(userId: number, layout: DashboardBlock[]): Promise<DashboardPreferences>;

  // Company operations
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByUserId(userId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // Client operations
  getClient(id: number): Promise<Client | undefined>;
  getClientsByUserId(userId: number): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByUserId(userId: number): Promise<Invoice[]>;
  getRecentInvoicesByUserId(userId: number, limit: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  // Invoice Item operations
  getInvoiceItemsByInvoiceId(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, invoiceItem: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<boolean>;

  // Quote operations
  getQuote(id: number): Promise<Quote | undefined>;
  getQuotesByUserId(userId: number): Promise<Quote[]>;
  getRecentQuotesByUserId(userId: number, limit: number): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote | undefined>;
  deleteQuote(id: number): Promise<boolean>;

  // Quote Item operations
  getQuoteItemsByQuoteId(quoteId: number): Promise<QuoteItem[]>;
  createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem>;
  updateQuoteItem(id: number, quoteItem: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined>;
  deleteQuoteItem(id: number): Promise<boolean>;

  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getCategoriesByUserId(userId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Transaction operations
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getRecentTransactionsByUserId(userId: number, limit: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUserId(userId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
  
  // Database initialization
  initializeDatabase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    // Configurar el almacenamiento de sesiones con PostgreSQL
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
  }
  
  async initializeDatabase(): Promise<void> {
    try {
      // Verificar si existe la tabla de usuarios usando SQL directo
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'users'
        )
      `;
      
      if (!result[0] || result[0].exists === false) {
        console.log("Inicializando tablas de base de datos...");
        
        // Ejecutar las consultas SQL para crear las tablas directamente
        await sql`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" SERIAL PRIMARY KEY,
            "username" TEXT NOT NULL UNIQUE,
            "password" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "email" TEXT NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'user',
            "profile_image" TEXT,
            "reset_token" TEXT,
            "reset_token_expiry" TIMESTAMP
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "companies" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
            "name" TEXT NOT NULL,
            "tax_id" TEXT NOT NULL,
            "address" TEXT NOT NULL,
            "city" TEXT NOT NULL,
            "postal_code" TEXT NOT NULL,
            "country" TEXT NOT NULL,
            "email" TEXT,
            "phone" TEXT,
            "logo" TEXT
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "clients" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
            "name" TEXT NOT NULL,
            "tax_id" TEXT NOT NULL,
            "address" TEXT NOT NULL,
            "city" TEXT,
            "postal_code" TEXT,
            "country" TEXT,
            "email" TEXT,
            "phone" TEXT,
            "notes" TEXT
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "invoices" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
            "invoice_number" TEXT NOT NULL,
            "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
            "issue_date" TIMESTAMP NOT NULL,
            "due_date" TIMESTAMP NOT NULL,
            "subtotal" DECIMAL(10, 2) NOT NULL,
            "tax" DECIMAL(10, 2) NOT NULL,
            "total" DECIMAL(10, 2) NOT NULL,
            "additional_taxes" JSONB,
            "status" TEXT NOT NULL DEFAULT 'pending',
            "notes" TEXT,
            "attachments" TEXT[]
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "invoice_items" (
            "id" SERIAL PRIMARY KEY,
            "invoice_id" INTEGER NOT NULL REFERENCES "invoices"("id") ON DELETE CASCADE,
            "description" TEXT NOT NULL,
            "quantity" DECIMAL(10, 2) NOT NULL,
            "unit_price" DECIMAL(10, 2) NOT NULL,
            "tax_rate" DECIMAL(5, 2) NOT NULL,
            "subtotal" DECIMAL(10, 2) NOT NULL
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "categories" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
            "name" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "color" TEXT
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "transactions" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
            "description" TEXT NOT NULL,
            "amount" DECIMAL(10, 2) NOT NULL,
            "date" TIMESTAMP NOT NULL,
            "type" TEXT NOT NULL,
            "category_id" INTEGER REFERENCES "categories"("id"),
            "payment_method" TEXT,
            "notes" TEXT,
            "attachments" TEXT[],
            "invoice_id" INTEGER REFERENCES "invoices"("id")
          );
        `;
        
        await sql`
          CREATE TABLE IF NOT EXISTS "tasks" (
            "id" SERIAL PRIMARY KEY,
            "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
            "title" TEXT NOT NULL,
            "description" TEXT,
            "due_date" TIMESTAMP,
            "completed" BOOLEAN NOT NULL DEFAULT FALSE,
            "priority" TEXT DEFAULT 'medium'
          );
        `;
        
        // Crear usuario predeterminado
        await this.createUser({
          username: "demo",
          password: "demo",
          name: "Ana García",
          email: "ana@example.com",
          role: "admin"
        });
        
        // Crear categorías predeterminadas
        const userId = 1; // Usuario demo
        
        await this.createCategory({
          userId,
          name: "Ventas",
          type: "income",
          color: "#4caf50"
        });
        
        await this.createCategory({
          userId,
          name: "Servicios",
          type: "income",
          color: "#2196f3"
        });
        
        await this.createCategory({
          userId,
          name: "Oficina",
          type: "expense",
          color: "#f44336"
        });
        
        await this.createCategory({
          userId,
          name: "Suministros",
          type: "expense",
          color: "#ff9800"
        });
        
        // Crear tareas de ejemplo
        await this.createTask({
          userId,
          title: "Presentar declaración trimestral",
          description: "Completar y presentar la declaración trimestral de IVA",
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          completed: false,
          priority: "high"
        });
        
        await this.createTask({
          userId,
          title: "Actualizar datos de empresa",
          description: "Revisar y actualizar la información de la empresa",
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          completed: true,
          priority: "medium"
        });
        
        await this.createTask({
          userId,
          title: "Conciliar movimientos bancarios",
          description: "Revisar y conciliar los últimos movimientos bancarios",
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          completed: false,
          priority: "medium"
        });
        
        console.log("Base de datos inicializada correctamente!");
      } else {
        // Verificar si existen las tablas de quotes y quote_items
        const quotesResult = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = 'quotes'
          )
        `;
        
        if (!quotesResult[0] || quotesResult[0].exists === false) {
          console.log("Creando tablas de presupuestos...");
          
          await sql`
            CREATE TABLE IF NOT EXISTS "quotes" (
              "id" SERIAL PRIMARY KEY,
              "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
              "quote_number" TEXT NOT NULL,
              "client_id" INTEGER NOT NULL REFERENCES "clients"("id"),
              "issue_date" TIMESTAMP NOT NULL,
              "valid_until" TIMESTAMP NOT NULL,
              "subtotal" DECIMAL(10, 2) NOT NULL,
              "tax" DECIMAL(10, 2) NOT NULL,
              "total" DECIMAL(10, 2) NOT NULL,
              "additional_taxes" JSONB,
              "status" TEXT NOT NULL DEFAULT 'draft',
              "notes" TEXT,
              "attachments" TEXT[]
            );
          `;
          
          await sql`
            CREATE TABLE IF NOT EXISTS "quote_items" (
              "id" SERIAL PRIMARY KEY,
              "quote_id" INTEGER NOT NULL REFERENCES "quotes"("id") ON DELETE CASCADE,
              "description" TEXT NOT NULL,
              "quantity" DECIMAL(10, 2) NOT NULL,
              "unit_price" DECIMAL(10, 2) NOT NULL,
              "tax_rate" DECIMAL(5, 2) NOT NULL,
              "subtotal" DECIMAL(10, 2) NOT NULL
            );
          `;
          
          console.log("Tablas de presupuestos creadas correctamente!");
        }
        
        console.log("Las tablas de la base de datos ya existen.");
      }
    } catch (error) {
      console.error("Error al inicializar la base de datos:", error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUserProfile(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }
  
  async createPasswordResetToken(email: string): Promise<{ token: string, user: User } | undefined> {
    try {
      // Buscar al usuario por email
      const user = await this.getUserByEmail(email);
      if (!user) {
        return undefined; // Usuario no encontrado
      }
      
      // Generar un token aleatorio
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1); // El token expira en 1 hora
      
      // Guardar el token y la fecha de expiración en el usuario
      await db.update(users)
        .set({
          resetToken: token,
          resetTokenExpiry: expiry
        })
        .where(eq(users.id, user.id));
      
      // Devolver el token y el usuario actualizado
      return { 
        token, 
        user: { ...user, resetToken: token, resetTokenExpiry: expiry } 
      };
    } catch (error) {
      console.error("Error al crear token de recuperación:", error);
      return undefined;
    }
  }
  
  async verifyPasswordResetToken(token: string): Promise<User | undefined> {
    try {
      // Buscar al usuario con el token
      const result = await db.select()
        .from(users)
        .where(eq(users.resetToken, token));
      
      const user = result[0];
      if (!user) {
        return undefined; // Token no válido
      }
      
      // Verificar que el token no ha expirado
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return undefined; // Token expirado
      }
      
      return user;
    } catch (error) {
      console.error("Error al verificar token de recuperación:", error);
      return undefined;
    }
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<boolean> {
    try {
      // Encriptar la nueva contraseña
      const hashedPassword = await hashPassword(newPassword);
      
      // Actualizar la contraseña y limpiar el token de recuperación
      const result = await db.update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, userId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error al resetear contraseña:", error);
      return false;
    }
  }
  
  // Dashboard preferences methods
  async getDashboardPreferences(userId: number): Promise<DashboardPreferences | undefined> {
    try {
      const result = await db.select()
        .from(dashboardPreferences)
        .where(eq(dashboardPreferences.userId, userId));
      
      return result[0];
    } catch (error) {
      console.error("Error al obtener preferencias de dashboard:", error);
      return undefined;
    }
  }
  
  async saveDashboardPreferences(userId: number, layout: DashboardBlock[]): Promise<DashboardPreferences> {
    try {
      // Comprobar si ya existen preferencias para este usuario
      const existingPrefs = await this.getDashboardPreferences(userId);
      
      if (existingPrefs) {
        // Actualizar las preferencias existentes
        const result = await db.update(dashboardPreferences)
          .set({
            layout: layout,
            updatedAt: new Date()
          })
          .where(eq(dashboardPreferences.userId, userId))
          .returning();
        
        return result[0];
      } else {
        // Crear nuevas preferencias
        const result = await db.insert(dashboardPreferences)
          .values({
            userId: userId,
            layout: layout
          })
          .returning();
        
        return result[0];
      }
    } catch (error) {
      console.error("Error al guardar preferencias de dashboard:", error);
      throw error;
    }
  }
  
  async setSecurityQuestion(userId: number, question: string, answer: string): Promise<boolean> {
    try {
      // Encriptar la respuesta para mayor seguridad
      const hashedAnswer = await hashPassword(answer.toLowerCase().trim());
      
      // Actualizar la pregunta y respuesta de seguridad
      const result = await db.update(users)
        .set({
          securityQuestion: question,
          securityAnswer: hashedAnswer
        })
        .where(eq(users.id, userId))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error al configurar pregunta de seguridad:", error);
      return false;
    }
  }
  
  async verifySecurityAnswer(email: string, answer: string): Promise<User | undefined> {
    try {
      // Obtener el usuario por email
      const user = await this.getUserByEmail(email);
      if (!user || !user.securityQuestion || !user.securityAnswer) {
        return undefined; // Usuario no encontrado o no tiene pregunta de seguridad
      }
      
      // Verificar la respuesta
      const isCorrect = await comparePasswords(answer.toLowerCase().trim(), user.securityAnswer);
      if (!isCorrect) {
        return undefined; // Respuesta incorrecta
      }
      
      return user;
    } catch (error) {
      console.error("Error al verificar respuesta de seguridad:", error);
      return undefined;
    }
  }
  
  async loginAsUser(adminId: number, userId: number): Promise<{success: boolean, log?: any}> {
    try {
      // Verificar que el usuario que solicita sea admin
      const admin = await this.getUser(adminId);
      if (!admin || admin.role !== 'admin') {
        return { success: false, log: { error: 'No autorizado. Se requiere privilegios de administrador.' } };
      }
      
      // Verificar que el usuario objetivo existe
      const targetUser = await this.getUser(userId);
      if (!targetUser) {
        return { success: false, log: { error: 'Usuario objetivo no encontrado.' } };
      }
      
      // Registrar el acceso en la base de datos (crear una tabla de logs si es necesario)
      const log = {
        adminId,
        adminUsername: admin.username,
        targetUserId: userId,
        targetUsername: targetUser.username,
        timestamp: new Date()
      };
      
      // Aquí deberíamos guardar este registro en una tabla de logs
      // Por simplicidad, solo lo devolvemos en la respuesta
      
      return { success: true, log };
    } catch (error) {
      console.error('Error en loginAsUser:', error);
      return { success: false, log: { error: 'Error interno al intentar iniciar sesión como otro usuario.' } };
    }
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async getCompanyByUserId(userId: number): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.userId, userId));
    return result[0];
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(company).returning();
    return result[0];
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company | undefined> {
    const result = await db.update(companies).set(companyData).where(eq(companies.id, id)).returning();
    return result[0];
  }

  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.userId, userId));
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(client).returning();
    return result[0];
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients).set(clientData).where(eq(clients.id, id)).returning();
    return result[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id));
    return result[0];
  }

  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.issueDate));
  }

  async getRecentInvoicesByUserId(userId: number, limit: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.issueDate))
      .limit(limit);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values({
      ...invoice,
      status: invoice.status || "pending",
      notes: invoice.notes || null,
      attachments: invoice.attachments || null
    }).returning();
    return result[0];
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const result = await db.update(invoices).set(invoiceData).where(eq(invoices.id, id)).returning();
    return result[0];
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }

  async getInvoiceItemsByInvoiceId(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const result = await db.insert(invoiceItems).values(invoiceItem).returning();
    return result[0];
  }

  async updateInvoiceItem(id: number, itemData: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const result = await db.update(invoiceItems).set(itemData).where(eq(invoiceItems.id, id)).returning();
    return result[0];
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id)).returning();
    return result.length > 0;
  }

  // Quote operations
  async getQuote(id: number): Promise<Quote | undefined> {
    const result = await db.select().from(quotes).where(eq(quotes.id, id));
    return result[0];
  }

  async getQuotesByUserId(userId: number): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.userId, userId)).orderBy(desc(quotes.issueDate));
  }

  async getRecentQuotesByUserId(userId: number, limit: number): Promise<Quote[]> {
    return await db
      .select()
      .from(quotes)
      .where(eq(quotes.userId, userId))
      .orderBy(desc(quotes.issueDate))
      .limit(limit);
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    // Convertir los valores numéricos a cadenas para manejar los tipos DECIMAL en la base de datos
    const formattedQuote = {
      ...quote,
      subtotal: quote.subtotal?.toString() || "0",
      tax: quote.tax?.toString() || "0",
      total: quote.total?.toString() || "0",
      status: quote.status || "draft",
      notes: quote.notes || null,
      attachments: quote.attachments || null
    };
    
    console.log("[SERVER] Creando presupuesto con datos formateados:", JSON.stringify(formattedQuote, null, 2));
    
    const result = await db.insert(quotes).values(formattedQuote).returning();
    return result[0];
  }

  async updateQuote(id: number, quoteData: Partial<InsertQuote>): Promise<Quote | undefined> {
    // Convertir valores numéricos a cadenas en caso de que existan en el quoteData
    const formattedData = { ...quoteData };
    
    if (typeof formattedData.subtotal === "number") {
      formattedData.subtotal = formattedData.subtotal.toString();
    }
    
    if (typeof formattedData.tax === "number") {
      formattedData.tax = formattedData.tax.toString();
    }
    
    if (typeof formattedData.total === "number") {
      formattedData.total = formattedData.total.toString();
    }
    
    console.log("[SERVER] Actualizando presupuesto con datos formateados:", JSON.stringify(formattedData, null, 2));
    
    const result = await db.update(quotes).set(formattedData).where(eq(quotes.id, id)).returning();
    return result[0];
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id)).returning();
    return result.length > 0;
  }

  // Quote Item operations
  async getQuoteItemsByQuoteId(quoteId: number): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  async createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem> {
    // Convertir números a strings para los campos decimales
    const formattedItem = {
      ...quoteItem,
      quantity: quoteItem.quantity?.toString() || "1",
      unitPrice: quoteItem.unitPrice?.toString() || "0",
      taxRate: quoteItem.taxRate?.toString() || "0",
      subtotal: quoteItem.subtotal?.toString() || "0"
    };
    
    console.log("[SERVER] Creando item de presupuesto con datos formateados:", JSON.stringify(formattedItem, null, 2));
    
    const result = await db.insert(quoteItems).values(formattedItem).returning();
    return result[0];
  }

  async updateQuoteItem(id: number, itemData: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined> {
    // Convertir números a strings para los campos decimales
    const formattedData = { ...itemData };
    
    if (typeof formattedData.quantity === 'number') {
      formattedData.quantity = formattedData.quantity.toString();
    }
    
    if (typeof formattedData.unitPrice === 'number') {
      formattedData.unitPrice = formattedData.unitPrice.toString();
    }
    
    if (typeof formattedData.taxRate === 'number') {
      formattedData.taxRate = formattedData.taxRate.toString();
    }
    
    if (typeof formattedData.subtotal === 'number') {
      formattedData.subtotal = formattedData.subtotal.toString();
    }
    
    console.log("[SERVER] Actualizando item de presupuesto con datos formateados:", JSON.stringify(formattedData, null, 2));
    
    const result = await db.update(quoteItems).set(formattedData).where(eq(quoteItems.id, id)).returning();
    return result[0];
  }

  async deleteQuoteItem(id: number): Promise<boolean> {
    const result = await db.delete(quoteItems).where(eq(quoteItems.id, id)).returning();
    return result.length > 0;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async getCategoriesByUserId(userId: number): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.userId, userId));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories).set(categoryData).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }

  async getRecentTransactionsByUserId(userId: number, limit: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .limit(limit);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions).set(transactionData).where(eq(transactions.id, id)).returning();
    return result[0];
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return result.length > 0;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    // Ordenar por completado (incompleto primero) y luego por fecha de vencimiento
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.completed, tasks.dueDate);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const result = await db.update(tasks).set(taskData).where(eq(tasks.id, id)).returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }
}

// Clase MemStorage para uso temporal, mantenerla para compatibilidad
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private companies: Map<number, Company>;
  private clients: Map<number, Client>;
  private invoices: Map<number, Invoice>;
  private invoiceItems: Map<number, InvoiceItem>;
  private quotes: Map<number, Quote>;
  private quoteItems: Map<number, QuoteItem>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private tasks: Map<number, Task>;
  public sessionStore: session.Store;

  private userIdCounter: number;
  private companyIdCounter: number;
  private clientIdCounter: number;
  private invoiceIdCounter: number;
  private invoiceItemIdCounter: number;
  private quoteIdCounter: number;
  private quoteItemIdCounter: number;
  private categoryIdCounter: number;
  private transactionIdCounter: number;
  private taskIdCounter: number;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.clients = new Map();
    this.invoices = new Map();
    this.invoiceItems = new Map();
    this.quotes = new Map();
    this.quoteItems = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.tasks = new Map();
    
    // Usar MemoryStore para la sesión cuando se usa MemStorage
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 horas
    });

    this.userIdCounter = 1;
    this.companyIdCounter = 1;
    this.clientIdCounter = 1;
    this.invoiceIdCounter = 1;
    this.invoiceItemIdCounter = 1;
    this.quoteIdCounter = 1;
    this.quoteItemIdCounter = 1;
    this.categoryIdCounter = 1;
    this.transactionIdCounter = 1;
    this.taskIdCounter = 1;

    // Initialize with default user for development
    this.createUser({
      username: "demo",
      password: "demo",
      name: "Ana García",
      email: "ana@example.com",
      role: "admin"
    });

    // Create default categories
    this.createCategory({
      userId: 1,
      name: "Ventas",
      type: "income",
      color: "#4caf50"
    });
    
    this.createCategory({
      userId: 1,
      name: "Servicios",
      type: "income",
      color: "#2196f3"
    });
    
    this.createCategory({
      userId: 1,
      name: "Oficina",
      type: "expense",
      color: "#f44336"
    });
    
    this.createCategory({
      userId: 1,
      name: "Suministros",
      type: "expense",
      color: "#ff9800"
    });

    // Create example tasks
    this.createTask({
      userId: 1,
      title: "Presentar declaración trimestral",
      description: "Completar y presentar la declaración trimestral de IVA",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      completed: false,
      priority: "high"
    });

    this.createTask({
      userId: 1,
      title: "Actualizar datos de empresa",
      description: "Revisar y actualizar la información de la empresa",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completed: true,
      priority: "medium"
    });

    this.createTask({
      userId: 1,
      title: "Conciliar movimientos bancarios",
      description: "Revisar y conciliar los últimos movimientos bancarios",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      completed: false,
      priority: "medium"
    });
  }
  
  async initializeDatabase(): Promise<void> {
    console.log("Using in-memory storage, no database initialization required");
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  // Implementación de loginAsUser en la clase base DatabaseStorage
  // La implementación real está en DatabaseStorage

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id, 
      profileImage: null,
      role: user.role || 'user'  // Asegurar que role siempre tenga un valor
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUserProfile(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Company operations
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByUserId(userId: number): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(
      (company) => company.userId === userId
    );
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = this.companyIdCounter++;
    const newCompany: Company = { 
      ...company, 
      id,
      email: company.email || null,
      phone: company.phone || null,
      logo: company.logo || null
    };
    this.companies.set(id, newCompany);
    return newCompany;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;

    const updatedCompany = { ...company, ...companyData };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  // Client operations
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientsByUserId(userId: number): Promise<Client[]> {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = this.clientIdCounter++;
    const newClient: Client = { 
      ...client, 
      id,
      email: client.email || null,
      city: client.city || null,
      postalCode: client.postalCode || null,
      country: client.country || null,
      phone: client.phone || null,
      notes: client.notes || null
    };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...clientData };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((invoice) => invoice.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }

  async getRecentInvoicesByUserId(userId: number, limit: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .filter((invoice) => invoice.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, limit);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceIdCounter++;
    // Ensure all required fields are present with proper defaults
    const newInvoice: Invoice = { 
      ...invoice, 
      id,
      status: invoice.status || "pending",
      notes: invoice.notes || null,
      attachments: invoice.attachments || null,
      additionalTaxes: invoice.additionalTaxes || null
    };
    this.invoices.set(id, newInvoice);
    return newInvoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const updatedInvoice = { ...invoice, ...invoiceData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }

  // Invoice Item operations
  async getInvoiceItemsByInvoiceId(invoiceId: number): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values()).filter(
      (item) => item.invoiceId === invoiceId
    );
  }

  async createInvoiceItem(invoiceItem: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = this.invoiceItemIdCounter++;
    // Ensure the proper data format for invoice items
    const newInvoiceItem: InvoiceItem = { 
      ...invoiceItem, 
      id
    };
    this.invoiceItems.set(id, newInvoiceItem);
    return newInvoiceItem;
  }

  async updateInvoiceItem(id: number, itemData: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const invoiceItem = this.invoiceItems.get(id);
    if (!invoiceItem) return undefined;

    const updatedItem = { ...invoiceItem, ...itemData };
    this.invoiceItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    return this.invoiceItems.delete(id);
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoriesByUserId(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.categoryIdCounter++;
    const newCategory: Category = { 
      ...category, 
      id,
      color: category.color || null
    };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, categoryData: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;

    const updatedCategory = { ...category, ...categoryData };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transaction operations
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getRecentTransactionsByUserId(userId: number, limit: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id,
      notes: transaction.notes || null,
      attachments: transaction.attachments || null,
      invoiceId: transaction.invoiceId || null,
      categoryId: transaction.categoryId || null,
      paymentMethod: transaction.paymentMethod || null
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter((task) => task.userId === userId)
      .sort((a, b) => {
        // Sort by completed (incomplete first), then by due date
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        return 0;
      });
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const newTask: Task = { 
      ...task, 
      id,
      dueDate: task.dueDate || null,
      description: task.description || null,
      completed: task.completed || false,
      priority: task.priority || 'medium'
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
  
  // Quote operations
  async getQuote(id: number): Promise<Quote | undefined> {
    return this.quotes.get(id);
  }

  async getQuotesByUserId(userId: number): Promise<Quote[]> {
    return Array.from(this.quotes.values())
      .filter((quote) => quote.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }

  async getRecentQuotesByUserId(userId: number, limit: number): Promise<Quote[]> {
    return Array.from(this.quotes.values())
      .filter((quote) => quote.userId === userId)
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, limit);
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const id = this.quoteIdCounter++;
    // Ensure all required fields are present with proper defaults
    const newQuote: Quote = { 
      ...quote, 
      id,
      status: quote.status || "draft",
      notes: quote.notes || null,
      attachments: quote.attachments || null,
      additionalTaxes: quote.additionalTaxes || null
    };
    this.quotes.set(id, newQuote);
    return newQuote;
  }

  async updateQuote(id: number, quoteData: Partial<InsertQuote>): Promise<Quote | undefined> {
    const quote = this.quotes.get(id);
    if (!quote) return undefined;

    const updatedQuote = { ...quote, ...quoteData };
    this.quotes.set(id, updatedQuote);
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    return this.quotes.delete(id);
  }

  // Quote Item operations
  async getQuoteItemsByQuoteId(quoteId: number): Promise<QuoteItem[]> {
    return Array.from(this.quoteItems.values()).filter(
      (item) => item.quoteId === quoteId
    );
  }

  async createQuoteItem(quoteItem: InsertQuoteItem): Promise<QuoteItem> {
    const id = this.quoteItemIdCounter++;
    // Ensure the proper data format for quote items
    const newQuoteItem: QuoteItem = { 
      ...quoteItem, 
      id
    };
    this.quoteItems.set(id, newQuoteItem);
    return newQuoteItem;
  }

  async updateQuoteItem(id: number, itemData: Partial<InsertQuoteItem>): Promise<QuoteItem | undefined> {
    const quoteItem = this.quoteItems.get(id);
    if (!quoteItem) return undefined;

    const updatedItem = { ...quoteItem, ...itemData };
    this.quoteItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteQuoteItem(id: number): Promise<boolean> {
    return this.quoteItems.delete(id);
  }
}

// Crear e inicializar la instancia de almacenamiento con PostgreSQL
export const storage = new DatabaseStorage();