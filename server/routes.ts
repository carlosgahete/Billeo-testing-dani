import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import express from "express";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Extiende el objeto Request para incluir las propiedades de sesión
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const scryptAsync = promisify(scrypt);

// Función para comparar contraseñas
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertUserSchema, 
  insertCompanySchema,
  insertClientSchema,
  insertInvoiceSchema,
  invoiceWithTaxesSchema,
  insertInvoiceItemSchema,
  quoteWithTaxesSchema,
  quoteItemValidationSchema,
  insertQuoteItemSchema,
  insertCategorySchema,
  insertTransactionSchema,
  insertTaskSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
// Importación diferida para mejorar tiempo de inicio
// La funcionalidad de procesamiento de documentos se cargará bajo demanda
// import { processReceiptImage, processReceiptPDF, mapToTransaction } from "./services/visionService";

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
  // Middleware para verificar autenticación de manera consistente
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    // Verificar si el usuario está autenticado mediante passport o mediante sesión
    if (req.isAuthenticated() || (req.session && req.session.userId)) {
      return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
  };
  
  // Inicializar la base de datos
  try {
    await storage.initializeDatabase();
    console.log("Base de datos inicializada correctamente");
  } catch (error) {
    console.error("Error al inicializar la base de datos:", error);
  }
  
  // Servir archivos estáticos de la carpeta uploads
  app.use('/uploads', express.static(uploadDir));
  
  // Setup authentication
  setupAuth(app);
  
  // Rutas para recuperación de contraseña
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "El email es requerido" });
      }
      
      // Generar token de restablecimiento
      const result = await storage.createPasswordResetToken(email);
      
      if (!result) {
        // No devolvemos error para no revelar si el email existe o no
        return res.status(200).json({ message: "Si el email está registrado, recibirás instrucciones para restablecer tu contraseña" });
      }
      
      const { token, user } = result;
      
      // Importar el servicio de email sólo cuando se necesita
      const { sendPasswordResetEmail } = await import('./services/emailService');
      
      // Enviar email de recuperación
      const emailResult = await sendPasswordResetEmail(user.email, token, user.username);
      
      console.log(`Email de recuperación para ${user.email}: ${token}`);
      
      // En desarrollo, podemos incluir información adicional para depuración
      if (process.env.NODE_ENV !== 'production') {
        return res.status(200).json({ 
          message: "Email enviado con instrucciones para restablecer contraseña", 
          token,
          previewUrl: emailResult.previewUrl || null
        });
      }
      
      return res.status(200).json({ 
        message: "Email enviado con instrucciones para restablecer contraseña"
      });
    } catch (error) {
      console.error("Error en recuperación de contraseña:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const user = await storage.verifyPasswordResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Token inválido o expirado" });
      }
      
      return res.status(200).json({ valid: true });
    } catch (error) {
      console.error("Error al verificar token de recuperación:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token y nueva contraseña son requeridos" });
      }
      
      const user = await storage.verifyPasswordResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Token inválido o expirado" });
      }
      
      const success = await storage.resetPassword(user.id, newPassword);
      
      if (!success) {
        return res.status(500).json({ error: "Error al actualizar la contraseña" });
      }
      
      return res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("Error al restablecer contraseña:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Rutas para recuperación de contraseña con preguntas de seguridad
  app.post("/api/security-question/set", requireAuth, async (req, res) => {
    try {
      const { question, answer } = req.body;
      
      if (!question || !answer) {
        return res.status(400).json({ error: "Pregunta y respuesta son requeridas" });
      }
      
      const userId = req.session.userId;
      const success = await storage.setSecurityQuestion(userId, question, answer);
      
      if (!success) {
        return res.status(500).json({ error: "Error al guardar la pregunta de seguridad" });
      }
      
      return res.status(200).json({ message: "Pregunta de seguridad guardada correctamente" });
    } catch (error) {
      console.error("Error al configurar pregunta de seguridad:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  app.post("/api/security-question/check", async (req, res) => {
    try {
      const { email, answer } = req.body;
      
      if (!email || !answer) {
        return res.status(400).json({ error: "Email y respuesta son requeridos" });
      }
      
      const user = await storage.verifySecurityAnswer(email, answer);
      
      if (!user) {
        return res.status(400).json({ error: "Email o respuesta incorrectos" });
      }
      
      // Crear un token temporal para el restablecimiento
      const { token } = await storage.createPasswordResetToken(email);
      
      return res.status(200).json({ 
        valid: true, 
        token,
        message: "Respuesta correcta, puede restablecer su contraseña" 
      });
    } catch (error) {
      console.error("Error al verificar respuesta de seguridad:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Endpoint para obtener la pregunta de seguridad de un usuario por email
  app.get("/api/security-question", async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ error: "Email es requerido" });
      }
      
      const user = await storage.getUserByEmail(email as string);
      
      if (!user || !user.securityQuestion) {
        return res.status(404).json({ error: "No hay pregunta de seguridad para este usuario" });
      }
      
      return res.status(200).json({ question: user.securityQuestion });
    } catch (error) {
      console.error("Error al obtener pregunta de seguridad:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Endpoint para obtener la pregunta de seguridad del usuario autenticado
  app.get("/api/security-question/current", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Usuario no autenticado" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.securityQuestion) {
        return res.status(404).json({ error: "No has configurado una pregunta de seguridad" });
      }
      
      return res.status(200).json({ question: user.securityQuestion });
    } catch (error) {
      console.error("Error al obtener pregunta de seguridad actual:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Middleware para verificar si el usuario es administrador
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "No autenticado" });
      }
      
      const user = req.user as any;
      if (user.role !== 'admin') {
        return res.status(403).json({ message: "No autorizado. Se requiere rol de administrador." });
      }
      
      next();
    } catch (error) {
      console.error("Error en middleware requireAdmin:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  };
  
  // ====== RUTAS DE ADMINISTRACIÓN DE USUARIOS ======
  // Obtener todos los usuarios (solo admin)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Eliminar contraseñas antes de enviar la respuesta
      const usersWithoutPasswords = users.map(({ password, ...userData }) => userData);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });
  
  // Crear un nuevo usuario (solo admin)
  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      // Validar datos
      const validatedData = insertUserSchema.parse(req.body);
      
      // Verificar si el usuario ya existe
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      
      // Crear el usuario (la contraseña se encriptará en auth.ts)
      const user = await storage.createUser(validatedData);
      
      // Crear datos predeterminados para el nuevo usuario
      try {
        // 1. Crear empresa predeterminada
        await storage.createCompany({
          userId: user.id,
          name: "Mi Empresa",
          taxId: "X0000000X",
          address: "Dirección predeterminada",
          city: "Ciudad",
          postalCode: "00000",
          country: "España"
        });
        
        // 2. Crear categorías predeterminadas
        await storage.createCategory({
          userId: user.id,
          name: "Ventas",
          type: "income",
          color: "#4caf50"
        });
        
        await storage.createCategory({
          userId: user.id,
          name: "Servicios",
          type: "income",
          color: "#2196f3"
        });
        
        await storage.createCategory({
          userId: user.id,
          name: "Oficina",
          type: "expense",
          color: "#f44336"
        });
        
        await storage.createCategory({
          userId: user.id,
          name: "Suministros",
          type: "expense",
          color: "#ff9800"
        });
        
        console.log(`Datos predeterminados creados para el usuario ${user.id}`);
      } catch (initError) {
        // Si falla la creación de datos predeterminados, lo registramos pero no fallamos la creación del usuario
        console.error("Error al crear datos predeterminados:", initError);
      }
      
      // Omitir la contraseña en la respuesta
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error al crear usuario:", error);
      res.status(500).json({ message: "Error al crear usuario" });
    }
  });
  
  // Actualizar un usuario (solo admin)
  app.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      
      // Validar que el usuario existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Actualizar usuario
      const updatedUser = await storage.updateUserProfile(userId, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "Error al actualizar usuario" });
      }
      
      // Omitir la contraseña en la respuesta
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      res.status(500).json({ message: "Error al actualizar usuario" });
    }
  });
  
  // Eliminar un usuario (solo admin)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      
      // Verificar que el usuario existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Evitar que el administrador se elimine a sí mismo
      if (userId === (req.user as any).id) {
        return res.status(400).json({ message: "No puedes eliminar tu propia cuenta" });
      }
      
      // Eliminar usuario
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "Error al eliminar usuario" });
      }
      
      res.status(200).json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      res.status(500).json({ message: "Error al eliminar usuario" });
    }
  });
  
  // Iniciar sesión como otro usuario (solo admin)
  app.post("/api/admin/login-as/:id", requireAdmin, async (req, res) => {
    try {
      const targetUserId = parseInt(req.params.id);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "ID de usuario inválido" });
      }
      
      const adminId = (req.user as any).id;
      const result = await storage.loginAsUser(adminId, targetUserId);
      
      if (!result.success) {
        return res.status(400).json({ message: "No se pudo iniciar sesión como usuario", log: result.log });
      }
      
      // Cambiar el usuario en la sesión
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      // Cerrar la sesión actual y crear una nueva con el usuario objetivo
      req.logout((err) => {
        if (err) {
          console.error("Error al cerrar sesión:", err);
          return res.status(500).json({ message: "Error al iniciar sesión como usuario" });
        }
        
        req.login(targetUser, (err) => {
          if (err) {
            console.error("Error al iniciar sesión como usuario:", err);
            return res.status(500).json({ message: "Error al iniciar sesión como usuario" });
          }
          
          // Omitir la contraseña en la respuesta
          const { password, ...userWithoutPassword } = targetUser;
          
          // Registrar el evento de inicio de sesión
          console.log(`[ADMIN] Usuario ${adminId} ha iniciado sesión como ${targetUserId}`);
          
          res.status(200).json({
            message: "Sesión iniciada correctamente como usuario",
            user: userWithoutPassword,
            log: result.log
          });
        });
      });
    } catch (error) {
      console.error("Error al iniciar sesión como usuario:", error);
      res.status(500).json({ message: "Error al iniciar sesión como usuario" });
    }
  });
  
  // Keep compatibility with old auth endpoint
  app.get("/api/auth/session", async (req, res) => {
    // Verificar si el usuario está autenticado mediante passport
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      return res.status(200).json({
        authenticated: true,
        user: userWithoutPassword
      });
    }
    
    // Si no está autenticado por passport, verificar si hay userId en la sesión
    if (req.session && req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json({
            authenticated: true,
            user: userWithoutPassword
          });
        }
      } catch (error) {
        console.error("Error fetching user from session:", error);
      }
    }
    
    // Si ninguna de las anteriores, no está autenticado
    return res.status(200).json({ authenticated: false });
  });
  
  // Endpoint para diagnóstico de la sesión
  app.get("/api/debug/session", (req, res) => {
    return res.status(200).json({
      sessionExists: !!req.session,
      sessionId: req.session?.id || null,
      isAuthenticated: req.isAuthenticated(),
      hasUserId: !!req.session?.userId,
      userId: req.session?.userId || null,
      hasUser: !!req.user,
      userIdFromReq: req.user ? (req.user as any).id : null,
      cookies: req.headers.cookie || null
    });
  });
  
  // Rutas para el perfil de usuario
  app.get("/api/user/profile", requireAuth, (req, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      const { password, ...userWithoutPassword } = req.user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error al obtener perfil:", error);
      res.status(500).json({ message: "Error al obtener perfil" });
    }
  });
  
  app.put("/api/user/profile", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      const userId = req.user.id;
      const { name, email, businessType } = req.body;
      
      // Verificar si el email ya está en uso por otro usuario
      if (email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "El email ya está en uso por otro usuario" });
        }
      }
      
      const updatedUser = await storage.updateUserProfile(userId, {
        name,
        email,
        businessType
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Error al actualizar perfil" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      res.status(500).json({ message: "Error al actualizar perfil" });
    }
  });
  
  app.put("/api/user/password", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Contraseña actual y nueva son requeridas" });
      }
      
      // Verificar la contraseña actual
      const isPasswordValid = await comparePasswords(currentPassword, req.user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Contraseña actual incorrecta" });
      }
      
      // Actualizar la contraseña
      const success = await storage.resetPassword(userId, newPassword);
      
      if (!success) {
        return res.status(500).json({ message: "Error al actualizar contraseña" });
      }
      
      res.status(200).json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
      console.error("Error al actualizar contraseña:", error);
      res.status(500).json({ message: "Error al actualizar contraseña" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);

  // Auth routes are now handled by the setupAuth function

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
      
      // Validar el tipo de negocio
      const businessType = userResult.data.businessType || "autonomo";
      if (businessType !== "autonomo" && businessType !== "empresa") {
        return res.status(400).json({ message: "Tipo de negocio no válido" });
      }
      
      // Asegurarnos de que el tipo de negocio esté incluido
      const userData = {
        ...userResult.data,
        businessType
      };
      
      const newUser = await storage.createUser(userData);
      
      // Crear datos predeterminados para el nuevo usuario
      try {
        // 1. Crear empresa predeterminada
        await storage.createCompany({
          userId: newUser.id,
          name: "Mi Empresa",
          taxId: "X0000000X",
          address: "Dirección predeterminada",
          city: "Ciudad",
          postalCode: "00000",
          country: "España"
        });
        
        // 2. Crear categorías predeterminadas
        await storage.createCategory({
          userId: newUser.id,
          name: "Ventas",
          type: "income",
          color: "#4caf50"
        });
        
        await storage.createCategory({
          userId: newUser.id,
          name: "Servicios",
          type: "income",
          color: "#2196f3"
        });
        
        await storage.createCategory({
          userId: newUser.id,
          name: "Oficina",
          type: "expense",
          color: "#f44336"
        });
        
        await storage.createCategory({
          userId: newUser.id,
          name: "Suministros",
          type: "expense",
          color: "#ff9800"
        });
        
        console.log(`Datos predeterminados creados para el usuario ${newUser.id}`);
      } catch (initError) {
        // Si falla la creación de datos predeterminados, lo registramos pero no fallamos la creación del usuario
        console.error("Error al crear datos predeterminados:", initError);
      }
      
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
  
  // Subir logo de la empresa
  app.post("/api/company/:id/logo", upload.single("companyLogo"), async (req: Request, res: Response) => {
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
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const logoPath = `/uploads/${req.file.filename}`;
      
      const updatedCompany = await storage.updateCompany(companyId, {
        logo: logoPath
      });
      
      return res.status(200).json(updatedCompany);
    } catch (error) {
      console.error("[SERVER] Error al subir logo de empresa:", error);
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
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
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
      
      // Usamos el esquema con soporte para impuestos adicionales
      const invoiceResult = invoiceWithTaxesSchema.safeParse(invoiceData);
      
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
    } catch (error: any) {
      console.error("Error al crear factura:", error);
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
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
      
      // Validar solo los campos que se van a actualizar, usando el esquema que soporta impuestos adicionales
      const invoiceResult = invoiceWithTaxesSchema.partial().safeParse(completeInvoiceData);
      
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

  // Obtener los items de una factura
  app.get("/api/invoices/:id/items", async (req: Request, res: Response) => {
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
      return res.status(200).json(items);
    } catch (error) {
      console.error("[SERVER] Error al obtener items de factura:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // ENDPOINTS DE PRESUPUESTOS
  
  // Obtener todos los presupuestos
  app.get("/api/quotes", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quotes = await storage.getQuotesByUserId(req.session.userId);
      return res.status(200).json(quotes);
    } catch (error) {
      console.error("[SERVER] Error al obtener presupuestos:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Obtener presupuestos recientes
  app.get("/api/quotes/recent", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const limit = parseInt(req.query.limit as string) || 5;
      const quotes = await storage.getRecentQuotesByUserId(req.session.userId, limit);
      return res.status(200).json(quotes);
    } catch (error) {
      console.error("[SERVER] Error al obtener presupuestos recientes:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Obtener un presupuesto por ID
  app.get("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to access this quote" });
      }
      
      const items = await storage.getQuoteItemsByQuoteId(quoteId);
      
      return res.status(200).json({ quote, items });
    } catch (error) {
      console.error("[SERVER] Error al obtener presupuesto:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Crear un nuevo presupuesto
  app.post("/api/quotes", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteData = {
        ...req.body,
        userId: req.session.userId
      };
      
      // Validar los datos del presupuesto
      const quoteResult = quoteWithTaxesSchema.safeParse(quoteData);
      
      if (!quoteResult.success) {
        console.log("[SERVER] Error validando presupuesto:", JSON.stringify(quoteResult.error.errors, null, 2));
        console.log("[SERVER] Datos recibidos:", JSON.stringify(quoteData, null, 2));
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: quoteResult.error.errors,
          received: quoteData
        });
      }
      
      // Crear presupuesto
      const newQuote = await storage.createQuote(quoteResult.data);
      
      // Si hay elementos, crearlos
      if (req.body.items && Array.isArray(req.body.items)) {
        for (const item of req.body.items) {
          // Validar cada item
          const itemResult = quoteItemValidationSchema.safeParse({
            ...item,
            quoteId: newQuote.id
          });
          
          if (!itemResult.success) {
            console.log("[SERVER] Error validando item:", JSON.stringify(itemResult.error.errors, null, 2));
            continue;
          }
          
          await storage.createQuoteItem(itemResult.data);
        }
      }
      
      return res.status(201).json(newQuote);
    } catch (error: any) {
      console.error("[SERVER] Error al crear presupuesto:", error);
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });
  
  // Actualizar un presupuesto
  app.put("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this quote" });
      }
      
      // Validar los datos actualizados del presupuesto
      const quoteResult = quoteWithTaxesSchema.partial().safeParse(req.body);
      
      if (!quoteResult.success) {
        console.log("[SERVER] Error validando actualización de presupuesto:", JSON.stringify(quoteResult.error.errors, null, 2));
        console.log("[SERVER] Datos recibidos para actualización:", JSON.stringify(req.body, null, 2));
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: quoteResult.error.errors,
          received: req.body
        });
      }
      
      console.log("[SERVER] Actualizando presupuesto:", quoteId);
      console.log("[SERVER] Datos recibidos:", req.body);
      
      // Actualizar presupuesto
      const updatedQuote = await storage.updateQuote(quoteId, quoteResult.data);
      
      // Si hay elementos nuevos, eliminar los antiguos y crear los nuevos
      if (req.body.items && Array.isArray(req.body.items)) {
        console.log("[SERVER] Eliminando items existentes para el presupuesto:", quoteId);
        
        // Obtener items existentes y eliminarlos
        const existingItems = await storage.getQuoteItemsByQuoteId(quoteId);
        for (const item of existingItems) {
          await storage.deleteQuoteItem(item.id);
        }
        
        console.log("[SERVER] Creando nuevos items para el presupuesto:", req.body.items.length);
        
        // Crear nuevos items
        for (const item of req.body.items) {
          await storage.createQuoteItem({
            ...item,
            quoteId
          });
        }
      }
      
      console.log("[SERVER] Presupuesto actualizado correctamente");
      
      return res.status(200).json({ quote: updatedQuote });
    } catch (error: any) {
      console.error("[SERVER] Error al actualizar presupuesto:", error);
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
    }
  });
  
  // Obtener los items de un presupuesto
  app.get("/api/quotes/:id/items", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to access this quote" });
      }
      
      const items = await storage.getQuoteItemsByQuoteId(quoteId);
      return res.status(200).json(items);
    } catch (error) {
      console.error("[SERVER] Error al obtener items de presupuesto:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Eliminar un presupuesto
  app.delete("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to delete this quote" });
      }
      
      // Eliminar items primero
      const items = await storage.getQuoteItemsByQuoteId(quoteId);
      for (const item of items) {
        await storage.deleteQuoteItem(item.id);
      }
      
      const deleted = await storage.deleteQuote(quoteId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete quote" });
      }
      
      return res.status(200).json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("[SERVER] Error al eliminar presupuesto:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Convertir presupuesto a factura
  // Subir logo para presupuestos
  app.post("/api/quotes/:id/logo", upload.single("quoteLogo"), async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to update this quote" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const logoPath = `/uploads/${req.file.filename}`;
      
      // Si no hay campo de attachments, lo creamos como array con el logo
      const attachments = quote.attachments || [];
      // Buscamos si ya hay un logo (asumimos que el primer elemento del array es el logo)
      if (attachments.length > 0) {
        // Reemplazamos el logo existente
        attachments[0] = logoPath;
      } else {
        // Añadimos el nuevo logo
        attachments.push(logoPath);
      }
      
      const updatedQuote = await storage.updateQuote(quoteId, {
        attachments: attachments
      });
      
      return res.status(200).json({
        quote: updatedQuote,
        logoPath
      });
    } catch (error) {
      console.error("[SERVER] Error al subir logo de presupuesto:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/quotes/:id/convert", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      const quote = await storage.getQuote(quoteId);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized to convert this quote" });
      }
      
      // Obtener el último número de factura para crear uno nuevo
      const invoices = await storage.getInvoicesByUserId(req.session.userId);
      let lastNumber = 0;
      
      if (invoices.length > 0) {
        const numbers = invoices.map(inv => parseInt(inv.invoiceNumber)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
          lastNumber = Math.max(...numbers);
        }
      }
      
      // Crear nueva factura a partir del presupuesto
      const newInvoice = await storage.createInvoice({
        userId: quote.userId,
        invoiceNumber: (lastNumber + 1).toString(),
        clientId: quote.clientId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días para pagar
        // Convertir los números a string para evitar problemas con DECIMAL en PostgreSQL
        subtotal: typeof quote.subtotal === 'string' ? quote.subtotal : quote.subtotal.toString(),
        tax: typeof quote.tax === 'string' ? quote.tax : quote.tax.toString(),
        total: typeof quote.total === 'string' ? quote.total : quote.total.toString(),
        additionalTaxes: quote.additionalTaxes,
        status: "pending",
        notes: `Generada a partir del presupuesto #${quote.quoteNumber}. ${quote.notes || ""}`
      });
      
      // Copiar items del presupuesto a la factura
      const quoteItems = await storage.getQuoteItemsByQuoteId(quoteId);
      for (const item of quoteItems) {
        await storage.createInvoiceItem({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          subtotal: item.subtotal
        });
      }
      
      // Actualizar el estado del presupuesto a "accepted"
      await storage.updateQuote(quoteId, { status: "accepted" });
      
      return res.status(200).json({ 
        message: "Quote converted to invoice successfully",
        invoice: newInvoice
      });
    } catch (error: any) {
      console.error("[SERVER] Error al convertir presupuesto a factura:", error);
      return res.status(500).json({ message: `Internal server error: ${error.message}` });
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
      
      // Cargar las funciones de procesamiento bajo demanda
      // para mejorar el tiempo de inicio del servidor
      const visionService = await import("./services/visionService");
      
      // Extraer información del documento según el tipo de archivo
      let extractedData;
      
      if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
        extractedData = await visionService.processReceiptImage(filePath);
      } else if (fileExtension === '.pdf') {
        extractedData = await visionService.processReceiptPDF(filePath);
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
      const transactionData = visionService.mapToTransaction(
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
        notes: transactionData.notes,
        additionalTaxes: transactionData.additionalTaxes
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
  app.get("/api/stats/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      // Obtenemos el ID de usuario desde passport o desde session
      const userId = req.isAuthenticated() ? (req.user as any).id : req.session.userId;
      
      // Obtenemos parámetros de año y trimestre si fueron enviados
      const year = req.query.year ? String(req.query.year) : new Date().getFullYear().toString();
      const period = req.query.period ? String(req.query.period) : 'all';
      
      // Loguear qué período se está consultando
      console.log("Consultando datos fiscales para:", { year, period });
      
      // Función para filtrar por año y trimestre
      const isInPeriod = (dateString: string) => {
        try {
          const date = new Date(dateString);
          const dateYear = date.getFullYear().toString();
          const month = date.getMonth() + 1; // getMonth() devuelve 0-11
          
          // Si el año no coincide, excluir
          if (dateYear !== year) return false;
          
          // Si estamos buscando todo el año, incluir
          if (period === 'all') return true;
          
          // Definir en qué trimestre cae el mes
          const quarter = 
            month <= 3 ? 'q1' : 
            month <= 6 ? 'q2' : 
            month <= 9 ? 'q3' : 'q4';
            
          return quarter === period;
        } catch (e) {
          console.error("Error al parsear fecha:", dateString, e);
          return false;
        }
      };
      
      // Get all transactions for the user
      let allTransactions = await storage.getTransactionsByUserId(userId);
      
      // Get all invoices
      let allInvoices = await storage.getInvoicesByUserId(userId);
      
      // Filtrar por período si es necesario
      allTransactions = allTransactions.filter(t => isInPeriod(t.date));
      allInvoices = allInvoices.filter(inv => isInPeriod(inv.issueDate));
      
      // Calculate totals from transactions
      const transactionIncome = allTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const transactionExpenses = allTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Calculate invoice income (paid invoices only)
      const paidInvoices = allInvoices.filter(inv => inv.status === "paid");
      
      // Ahora usamos el total en lugar del subtotal para reflejar correctamente todos los impuestos (IVA, IRPF, etc.)
      const invoiceIncome = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        
      // Registro detallado para depuración
      console.log("=== CÁLCULO DE INGRESOS Y GASTOS ===");
      console.log("Período filtrado:", year, period);
      console.log("Número total de facturas:", allInvoices.length);
      console.log("Facturas pagadas:", paidInvoices.length);
      console.log("Detalle de facturas pagadas:", 
        paidInvoices.map(inv => ({ 
          number: inv.invoiceNumber, 
          status: inv.status,
          subtotal: inv.subtotal,
          total: inv.total,
          fecha: inv.issueDate
        }))
      );
      
      // Detalle de transacciones para depuración
      console.log("Total de transacciones:", allTransactions.length);
      console.log("Transacciones de ingresos:", allTransactions.filter(t => t.type === "income").length);
      console.log("Transacciones de gastos:", allTransactions.filter(t => t.type === "expense").length);
      console.log("Detalle de gastos:", 
        allTransactions
          .filter(t => t.type === "expense")
          .map(t => ({ 
            description: t.description, 
            amount: t.amount,
            date: t.date
          }))
      );
      
      console.log("Ingresos de facturas:", invoiceIncome);
      console.log("Ingresos de transacciones:", transactionIncome);
      console.log("Gastos de transacciones:", transactionExpenses);
      
      // Añadir información detallada de impuestos para depuración
      console.log("Detalle de facturas e impuestos:");
      paidInvoices.forEach(invoice => {
        console.log(`Factura ${invoice.invoiceNumber}: Subtotal=${invoice.subtotal}, Total=${invoice.total}`);
        
        // Mostrar impuestos adicionales si existen
        if (invoice.additionalTaxes) {
          let additionalTaxes = [];
          try {
            if (typeof invoice.additionalTaxes === 'string') {
              additionalTaxes = JSON.parse(invoice.additionalTaxes);
            } else if (Array.isArray(invoice.additionalTaxes)) {
              additionalTaxes = invoice.additionalTaxes;
            }
            
            console.log("  - Impuestos adicionales:", additionalTaxes);
          } catch (e) {
            console.log("  - Error al parsear impuestos adicionales");
          }
        }
      });
        
      // Calculate total income - solo consideramos ingresos de facturas, más seguro para estadísticas
      const income = invoiceIncome;
      
      // Calculate total expenses from transactions
      const expenses = transactionExpenses;
      
      // Calculate pending invoices (money expected but not yet received)
      const pendingInvoices = allInvoices
        .filter(inv => inv.status === "pending" || inv.status === "overdue")
        .reduce((sum, inv) => sum + Number(inv.total), 0);
      
      const pendingCount = allInvoices
        .filter(inv => inv.status === "pending" || inv.status === "overdue")
        .length;
      
      // Calcular las retenciones (IRPF) que ya se han aplicado en las facturas
      // Ahora extraemos las retenciones directamente de los impuestos adicionales de cada factura
      let totalWithholdings = 0;
      
      // Iteramos por todas las facturas pagadas para calcular retenciones
      for (const invoice of paidInvoices) {
        try {
          // Comprobamos si hay impuestos adicionales
          if (invoice.additionalTaxes) {
            let additionalTaxes = [];
            
            // Si es una cadena JSON, intentamos parsearlo
            if (typeof invoice.additionalTaxes === 'string') {
              try {
                additionalTaxes = JSON.parse(invoice.additionalTaxes);
              } catch (e) {
                console.log("Error al parsear additionalTaxes como JSON:", e);
              }
            } 
            // Si ya es un array, lo usamos directamente
            else if (Array.isArray(invoice.additionalTaxes)) {
              additionalTaxes = invoice.additionalTaxes;
            }
            
            // Buscamos impuestos que sean IRPF (retenciones)
            for (const tax of additionalTaxes) {
              if (tax.name && tax.name.toLowerCase().includes('irpf')) {
                if (tax.isPercentage) {
                  // Si es un porcentaje, calculamos basado en el subtotal
                  // El signo negativo en el importe indica que es una retención
                  let retentionAmount = Number(invoice.subtotal) * Math.abs(Number(tax.amount)) / 100;
                  totalWithholdings += retentionAmount;
                } else {
                  // Si es un valor fijo, sumamos su valor absoluto (ya que las retenciones tienen signo negativo)
                  totalWithholdings += Math.abs(Number(tax.amount));
                }
              }
            }
          }
        } catch (e) {
          console.error("Error al procesar retenciones de factura:", e);
        }
      }
      
      // Registrar el total de retenciones calculadas
      console.log("Total de retenciones calculadas:", totalWithholdings);
      
      // Si no hay retenciones detectadas en las facturas, calculamos una estimación basada en el 15%
      if (totalWithholdings === 0 && income > 0) {
        const retentionRate = 0.15;
        totalWithholdings = Math.round(income * retentionRate);
        console.log("No se detectaron retenciones en facturas, usando estimación del 15%:", totalWithholdings);
      }
      
      // Calcular el resultado (ingresos - gastos)
      const result = income - expenses;
      
      // Calculate balance
      const balance = income - expenses;
      
      // Calculate VAT (IVA) - 21% sobre los ingresos
      const vatRate = 0.21;
      const vatBalance = Math.round(income * vatRate);
      
      // Cálculo del IRPF según el sistema español para autónomos
      // 20% del beneficio neto (ingresos - gastos)
      const irpfRate = 0.20;
      const irpfTotalEstimated = Math.max(0, Math.round((income - expenses) * irpfRate));
      
      // El IRPF a pagar será el total estimado menos las retenciones ya aplicadas
      const incomeTax = Math.max(0, irpfTotalEstimated - totalWithholdings);
      
      return res.status(200).json({
        income,
        expenses,
        pendingInvoices,
        pendingCount,
        balance,
        result,
        totalWithholdings,
        period,
        year,
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
