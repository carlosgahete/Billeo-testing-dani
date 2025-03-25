import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";

// Extiende el objeto Request para incluir las propiedades de sesión
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertCompanySchema,
  insertClientSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertTaskSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { processReceiptImage, processReceiptPDF, mapToTransaction } from "./services/visionService";

// Set up file upload with multer
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_disk = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage_disk });

export async function registerRoutes(app: Express): Promise<Server> {
  // Inicializar la base de datos
  try {
    await storage.initializeDatabase();
    console.log("Base de datos inicializada correctamente");
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
  }
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Authentication endpoints
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Simple session management (not for production)
      if (!req.session) {
        return res.status(500).json({ message: "Session management not available" });
      }
      
      req.session.userId = user.id;
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to logout" });
        }
        
        res.clearCookie("financial-app.sid"); // Nombre actualizado para que coincida con la configuración
        return res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      return res.status(200).json({ message: "Already logged out" });
    }
  });

  app.get("/api/auth/session", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(200).json({ authenticated: false });
      }
      
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(200).json({ authenticated: false });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        authenticated: true,
        user: userWithoutPassword
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User endpoints
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userResult = insertUserSchema.safeParse(req.body);
      
      if (!userResult.success) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: userResult.error.errors 
        });
      }
      
      const existingUser = await storage.getUserByUsername(userResult.data.username);
      
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser(userResult.data);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user profile
  app.put("/api/users/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = parseInt(req.params.id);
      
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this user" });
      }
      
      const userResult = insertUserSchema.partial().safeParse(req.body);
      
      if (!userResult.success) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: userResult.error.errors 
        });
      }
      
      // Omit sensitive fields
      const { password, username, role, ...safeUserData } = userResult.data;
      
      const updatedUser = await storage.updateUserProfile(userId, safeUserData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user profile image
  app.post("/api/users/:id/profile-image", upload.single("profileImage"), async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = parseInt(req.params.id);
      
      if (userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this user" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const imagePath = `/uploads/${req.file.filename}`;
      
      const updatedUser = await storage.updateUserProfile(userId, {
        profileImage: imagePath
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Company endpoints
  app.get("/api/company", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const company = await storage.getCompanyByUserId(req.session.userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      return res.status(200).json(company);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/company", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const companyResult = insertCompanySchema.safeParse({
        ...req.body,
        userId: req.session.userId
      });
      
      if (!companyResult.success) {
        return res.status(400).json({ 
          message: "Invalid company data", 
          errors: companyResult.error.errors 
        });
      }
      
      const existingCompany = await storage.getCompanyByUserId(req.session.userId);
      
      if (existingCompany) {
        return res.status(409).json({ message: "Company already exists for this user" });
      }
      
      const newCompany = await storage.createCompany(companyResult.data);
      return res.status(201).json(newCompany);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/company/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const companyId = parseInt(req.params.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      if (company.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this company" });
      }
      
      const companyResult = insertCompanySchema.partial().safeParse(req.body);
      
      if (!companyResult.success) {
        return res.status(400).json({ 
          message: "Invalid company data", 
          errors: companyResult.error.errors 
        });
      }
      
      const updatedCompany = await storage.updateCompany(companyId, companyResult.data);
      
      if (!updatedCompany) {
        return res.status(404).json({ message: "Failed to update company" });
      }
      
      return res.status(200).json(updatedCompany);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Client endpoints
  app.get("/api/clients", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clients = await storage.getClientsByUserId(req.session.userId);
      return res.status(200).json(clients);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to access this client" });
      }
      
      return res.status(200).json(client);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/clients", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clientResult = insertClientSchema.safeParse({
        ...req.body,
        userId: req.session.userId
      });
      
      if (!clientResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: clientResult.error.errors 
        });
      }
      
      const newClient = await storage.createClient(clientResult.data);
      return res.status(201).json(newClient);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this client" });
      }
      
      const clientResult = insertClientSchema.partial().safeParse(req.body);
      
      if (!clientResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: clientResult.error.errors 
        });
      }
      
      const updatedClient = await storage.updateClient(clientId, clientResult.data);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Failed to update client" });
      }
      
      return res.status(200).json(updatedClient);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/clients/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const clientId = parseInt(req.params.id);
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to delete this client" });
      }
      
      const deleted = await storage.deleteClient(clientId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete client" });
      }
      
      return res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Invoice endpoints
  app.get("/api/invoices", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const invoices = await storage.getInvoicesByUserId(req.session.userId);
      return res.status(200).json(invoices);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/invoices/recent", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const limit = parseInt(req.query.limit as string) || 5;
      const invoices = await storage.getRecentInvoicesByUserId(req.session.userId, limit);
      return res.status(200).json(invoices);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to access this invoice" });
      }
      
      const items = await storage.getInvoiceItemsByInvoiceId(invoiceId);
      
      return res.status(200).json({ invoice, items });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { invoice, items } = req.body;
      
      console.log("Received invoice data:", JSON.stringify(invoice, null, 2));
      console.log("Received items data:", JSON.stringify(items, null, 2));
      
      // Asegurar que todos los campos requeridos estén presentes
      // Convertir las cadenas de fecha ISO en objetos Date
      const invoiceData = {
        ...invoice,
        userId: req.session.userId,
        status: invoice.status || "pending",
        notes: invoice.notes ?? null,
        attachments: invoice.attachments ?? null,
        // Convertir explícitamente las fechas de string a Date
        issueDate: invoice.issueDate ? new Date(invoice.issueDate) : new Date(),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date()
      };
      
      console.log("Processed invoice data:", JSON.stringify(invoiceData, null, 2));
      
      const invoiceResult = insertInvoiceSchema.safeParse(invoiceData);
      
      if (!invoiceResult.success) {
        console.log("Validation errors:", JSON.stringify(invoiceResult.error.errors, null, 2));
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: invoiceResult.error.errors 
        });
      }
      
      const newInvoice = await storage.createInvoice(invoiceResult.data);
      
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const itemResult = insertInvoiceItemSchema.safeParse({
            ...item,
            invoiceId: newInvoice.id
          });
          
          if (itemResult.success) {
            await storage.createInvoiceItem(itemResult.data);
          }
        }
      }
      
      const invoiceItems = await storage.getInvoiceItemsByInvoiceId(newInvoice.id);
      
      return res.status(201).json({ invoice: newInvoice, items: invoiceItems });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this invoice" });
      }
      
      const { invoice: invoiceData, items } = req.body;
      
      console.log("[SERVER] Actualizando factura:", invoiceId);
      console.log("[SERVER] Datos recibidos:", JSON.stringify(invoiceData, null, 2));
      
      // Asegurarnos que tenemos todos los campos originales si no se están actualizando
      const completeInvoiceData = {
        ...invoice,                  // Datos actuales
        ...invoiceData,              // Datos nuevos que sobrescriben
        userId: req.session.userId,  // Mantener siempre el userID original
        id: invoiceId,               // Mantener siempre el ID
        // Convertir explícitamente las fechas de string a Date
        issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : invoice.issueDate,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : invoice.dueDate
      };
      
      console.log("[SERVER] Datos completos a actualizar:", JSON.stringify(completeInvoiceData, null, 2));
      
      // Validar solo los campos que se van a actualizar
      const invoiceResult = insertInvoiceSchema.partial().safeParse(completeInvoiceData);
      
      if (!invoiceResult.success) {
        console.log("[SERVER] Error de validación:", JSON.stringify(invoiceResult.error.errors, null, 2));
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: invoiceResult.error.errors 
        });
      }
      
      // Actualizar la factura
      const updatedInvoice = await storage.updateInvoice(invoiceId, invoiceResult.data);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Failed to update invoice" });
      }
      
      // Procesar los items solo si se proporcionan
      if (items && Array.isArray(items)) {
        // Eliminar items existentes
        console.log("[SERVER] Eliminando items existentes para la factura:", invoiceId);
        const existingItems = await storage.getInvoiceItemsByInvoiceId(invoiceId);
        for (const item of existingItems) {
          await storage.deleteInvoiceItem(item.id);
        }
        
        // Crear nuevos items
        console.log("[SERVER] Creando nuevos items para la factura:", items.length);
        for (const item of items) {
          const itemData = {
            ...item,
            invoiceId
          };
          
          const itemResult = insertInvoiceItemSchema.safeParse(itemData);
          
          if (itemResult.success) {
            await storage.createInvoiceItem(itemResult.data);
          } else {
            console.log("[SERVER] Error al validar item:", JSON.stringify(itemResult.error.errors, null, 2));
          }
        }
      }
      
      // Obtener los items actualizados
      const invoiceItems = await storage.getInvoiceItemsByInvoiceId(invoiceId);
      
      console.log("[SERVER] Factura actualizada correctamente");
      return res.status(200).json({ invoice: updatedInvoice, items: invoiceItems });
    } catch (error) {
      console.error("[SERVER] Error al actualizar factura:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/invoices/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to delete this invoice" });
      }
      
      // Delete invoice items first
      const items = await storage.getInvoiceItemsByInvoiceId(invoiceId);
      for (const item of items) {
        await storage.deleteInvoiceItem(item.id);
      }
      
      const deleted = await storage.deleteInvoice(invoiceId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete invoice" });
      }
      
      return res.status(200).json({ message: "Invoice deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Category endpoints
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categories = await storage.getCategoriesByUserId(req.session.userId);
      return res.status(200).json(categories);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categoryResult = insertCategorySchema.safeParse({
        ...req.body,
        userId: req.session.userId
      });
      
      if (!categoryResult.success) {
        return res.status(400).json({ 
          message: "Invalid category data", 
          errors: categoryResult.error.errors 
        });
      }
      
      const newCategory = await storage.createCategory(categoryResult.data);
      return res.status(201).json(newCategory);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this category" });
      }
      
      const categoryResult = insertCategorySchema.partial().safeParse(req.body);
      
      if (!categoryResult.success) {
        return res.status(400).json({ 
          message: "Invalid category data", 
          errors: categoryResult.error.errors 
        });
      }
      
      const updatedCategory = await storage.updateCategory(categoryId, categoryResult.data);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Failed to update category" });
      }
      
      return res.status(200).json(updatedCategory);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/categories/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const categoryId = parseInt(req.params.id);
      const category = await storage.getCategory(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      if (category.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to delete this category" });
      }
      
      const deleted = await storage.deleteCategory(categoryId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete category" });
      }
      
      return res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transaction endpoints
  app.get("/api/transactions", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const transactions = await storage.getTransactionsByUserId(req.session.userId);
      return res.status(200).json(transactions);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/transactions/recent", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const limit = parseInt(req.query.limit as string) || 5;
      const transactions = await storage.getRecentTransactionsByUserId(req.session.userId, limit);
      return res.status(200).json(transactions);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/transactions/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to access this transaction" });
      }
      
      return res.status(200).json(transaction);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/transactions", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const transactionResult = insertTransactionSchema.safeParse({
        ...req.body,
        userId: req.session.userId
      });
      
      if (!transactionResult.success) {
        return res.status(400).json({ 
          message: "Invalid transaction data", 
          errors: transactionResult.error.errors 
        });
      }
      
      const newTransaction = await storage.createTransaction(transactionResult.data);
      return res.status(201).json(newTransaction);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/transactions/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this transaction" });
      }
      
      const transactionResult = insertTransactionSchema.partial().safeParse(req.body);
      
      if (!transactionResult.success) {
        return res.status(400).json({ 
          message: "Invalid transaction data", 
          errors: transactionResult.error.errors 
        });
      }
      
      const updatedTransaction = await storage.updateTransaction(transactionId, transactionResult.data);
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Failed to update transaction" });
      }
      
      return res.status(200).json(updatedTransaction);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/transactions/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const transactionId = parseInt(req.params.id);
      const transaction = await storage.getTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      if (transaction.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to delete this transaction" });
      }
      
      const deleted = await storage.deleteTransaction(transactionId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete transaction" });
      }
      
      return res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task endpoints
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const tasks = await storage.getTasksByUserId(req.session.userId);
      return res.status(200).json(tasks);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const taskResult = insertTaskSchema.safeParse({
        ...req.body,
        userId: req.session.userId
      });
      
      if (!taskResult.success) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: taskResult.error.errors 
        });
      }
      
      const newTask = await storage.createTask(taskResult.data);
      return res.status(201).json(newTask);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this task" });
      }
      
      const taskResult = insertTaskSchema.partial().safeParse(req.body);
      
      if (!taskResult.success) {
        return res.status(400).json({ 
          message: "Invalid task data", 
          errors: taskResult.error.errors 
        });
      }
      
      const updatedTask = await storage.updateTask(taskId, taskResult.data);
      
      if (!updatedTask) {
        return res.status(404).json({ message: "Failed to update task" });
      }
      
      return res.status(200).json(updatedTask);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to delete this task" });
      }
      
      const deleted = await storage.deleteTask(taskId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete task" });
      }
      
      return res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      return res.status(201).json({
        filename: req.file.filename,
        path: `/uploads/${req.file.filename}`
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // CSV import endpoint
  app.post("/api/import/csv", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Process CSV file (in a real app, we would parse the CSV here)
      // For the demo, we'll just return a success message
      
      return res.status(200).json({
        message: "CSV imported successfully",
        filename: req.file.filename
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Endpoint para procesar documentos (facturas/recibos) usando Vision API
  app.post("/api/documents/process", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const filePath = req.file.path;
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      
      console.log(`Procesando documento: ${filePath}, extensión: ${fileExtension}`);
      
      // Extraer información del documento según el tipo de archivo
      let extractedData;
      
      if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
        extractedData = await processReceiptImage(filePath);
      } else if (fileExtension === '.pdf') {
        extractedData = await processReceiptPDF(filePath);
      } else {
        return res.status(400).json({ 
          message: "Formato de archivo no soportado. Por favor, suba una imagen (JPG, PNG) o un PDF" 
        });
      }
      
      // Buscar una categoría que coincida con la sugerencia de categoría
      const categoryHint = extractedData.categoryHint;
      const allCategories = await storage.getCategoriesByUserId(req.session.userId);
      
      // Buscar categoría por nombre similar (sin distinguir mayúsculas/minúsculas)
      let matchedCategory = allCategories.find(cat => 
        cat.type === 'expense' && 
        cat.name.toLowerCase().includes(categoryHint?.toLowerCase() || '')
      );
      
      // Si no encontramos una categoría específica, usamos la primera categoría de gastos o null
      const categoryId = matchedCategory ? 
        matchedCategory.id : 
        (allCategories.find(cat => cat.type === 'expense')?.id || null);
      
      // Convertir los datos extraídos a un objeto de transacción
      const transactionData = mapToTransaction(
        extractedData, 
        req.session.userId,
        categoryId
      );
      
      // Crear la transacción en la base de datos
      // Asegurarnos de que todos los campos requeridos estén presentes
      const transactionToCreate = {
        userId: transactionData.userId,
        description: transactionData.description,
        amount: transactionData.amount,
        date: transactionData.date,
        type: transactionData.type,
        categoryId: transactionData.categoryId,
        paymentMethod: transactionData.paymentMethod || 'other',
        notes: transactionData.notes
      };
      
      const transaction = await storage.createTransaction(transactionToCreate);
      
      return res.status(201).json({
        message: "Documento procesado con éxito",
        extractedData,
        transaction
      });
      
    } catch (error) {
      console.error("Error procesando documento:", error);
      return res.status(500).json({ 
        message: "Error al procesar el documento", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stats and reports
  app.get("/api/stats/dashboard", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = req.session.userId;
      
      // Get all transactions for the user
      const allTransactions = await storage.getTransactionsByUserId(userId);
      
      // Get all invoices
      const allInvoices = await storage.getInvoicesByUserId(userId);
      
      // Calculate totals from transactions
      const transactionIncome = allTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const transactionExpenses = allTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Calculate invoice income (paid invoices only)
      const paidInvoices = allInvoices.filter(inv => inv.status === "paid");
      const invoiceIncome = paidInvoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0);
        
      // Incluir también las facturas que se han marcado como pagadas
      console.log("=== CÁLCULO DE INGRESOS ===");
      console.log("Número total de facturas:", allInvoices.length);
      console.log("Facturas pagadas:", paidInvoices.length);
      console.log("Detalle de facturas pagadas:", 
        paidInvoices.map(inv => ({ 
          number: inv.invoiceNumber, 
          status: inv.status,
          subtotal: inv.subtotal,
          total: inv.total 
        }))
      );
      console.log("Ingresos de facturas:", invoiceIncome);
      console.log("Ingresos de transacciones:", transactionIncome);
        
      // Calculate total income - combinando transacciones e ingresos de facturas
      const income = transactionIncome + invoiceIncome;
      
      // Calculate total expenses from transactions
      const expenses = transactionExpenses;
      
      // Calculate pending invoices (money expected but not yet received)
      const pendingInvoices = allInvoices
        .filter(inv => inv.status === "pending" || inv.status === "overdue")
        .reduce((sum, inv) => sum + Number(inv.total), 0);
      
      const pendingCount = allInvoices
        .filter(inv => inv.status === "pending" || inv.status === "overdue")
        .length;
      
      // Calcular las retenciones (IRPF y otros impuestos negativos)
      let totalWithholdings = 0;
      
      // Procesar todos los impuestos adicionales de las facturas
      allInvoices.forEach(invoice => {
        if (invoice.additionalTaxes && Array.isArray(invoice.additionalTaxes)) {
          invoice.additionalTaxes.forEach((tax: any) => {
            // Si es una retención (valor negativo), la agregamos al total de retenciones
            if (tax.amount < 0) {
              if (tax.isPercentage) {
                // Si es porcentaje, calculamos sobre el subtotal
                const retentionAmount = Number(invoice.subtotal) * (Math.abs(Number(tax.amount)) / 100);
                totalWithholdings += retentionAmount;
              } else {
                // Si es valor fijo, sumamos directamente
                totalWithholdings += Math.abs(Number(tax.amount));
              }
            }
          });
        }
      });
      
      // Calcular el resultado (ingresos - gastos - retenciones)
      const result = income - expenses - totalWithholdings;
      
      // Calculate balance (including withholdings)
      const balance = result;
      
      // Calculate tax estimates (simplified)
      const vatCollected = allInvoices.reduce((sum, inv) => sum + Number(inv.tax), 0);
      const vatPaid = allTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + (Number(t.amount) * 0.21), 0); // Simplified VAT calculation
      
      const vatBalance = vatCollected - vatPaid;
      
      // Calculate income tax (simplified - 20% of income)
      const incomeTax = income * 0.2;
      
      return res.status(200).json({
        income,
        expenses,
        pendingInvoices,
        pendingCount,
        balance,
        result,
        totalWithholdings,
        taxes: {
          vat: vatBalance,
          incomeTax
        }
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
