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
import { sendInvoiceEmail, sendQuoteEmail } from "./services/emailService";
import * as visionService from "./services/visionService";
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
  transactionFlexibleSchema,
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
  
  // Ruta para descargar archivos adjuntos con su nombre original
  app.get('/api/download/:filename', (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const filename = req.params.filename;
      const filepath = path.join(uploadDir, filename);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Extraer extensión para determinar tipo de contenido
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      // Mapear extensiones comunes a tipos de contenido
      const contentTypeMap: {[key: string]: string} = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };
      
      if (contentTypeMap[ext]) {
        contentType = contentTypeMap[ext];
      }
      
      // Crear nombre de descarga amigable
      let downloadName = filename;
      
      // Si hay información de transacción en la consulta, la usamos para el nombre del archivo
      const { provider, date, category } = req.query;
      
      if (provider && date && category) {
        // Si tenemos todos los datos, creamos un nombre más descriptivo
        const cleanProvider = (provider as string).replace(/[^a-zA-Z0-9\-_]/g, '');
        const formattedDate = (date as string).replace(/[\/]/g, '-');
        const cleanCategory = (category as string).replace(/[^a-zA-Z0-9\-_]/g, '');
        
        downloadName = `${cleanProvider}_${formattedDate}_${cleanCategory}${ext}`;
      } 
      // Si no hay información completa pero es un nombre generado por multer, usar fecha genérica
      else if (filename.startsWith('file-')) {
        const datePart = filename.split('-')[1] || '';
        const dateFormatted = datePart ? new Date(parseInt(datePart)).toISOString().split('T')[0] : '';
        downloadName = `documento_${dateFormatted || 'descargado'}${ext}`;
      }
      
      // Configurar cabeceras para descarga
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      
      // Enviar archivo
      const filestream = fs.createReadStream(filepath);
      filestream.pipe(res);
      
    } catch (error) {
      console.error('Error downloading file:', error);
      return res.status(500).json({ message: "Error al descargar el archivo" });
    }
  });
  
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
      
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      
      // Si el usuario no tiene una pregunta de seguridad, devolvemos null en lugar de un error
      if (!user.securityQuestion) {
        return res.status(200).json({ question: null });
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
  
  // Endpoint para obtener datos del usuario actual (compatible con React Query)
  app.get("/api/user", async (req, res) => {
    // Verificar si el usuario está autenticado
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      return res.status(200).json(userWithoutPassword);
    }
    
    // Si no está autenticado por passport, verificar si hay userId en la sesión
    if (req.session && req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        }
      } catch (error) {
        console.error("Error getting user from userId:", error);
      }
    }
    
    return res.status(401).json({
      message: "Not authenticated"
    });
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
        console.log('Intento de acceso a factura sin sesión');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const invoiceId = parseInt(req.params.id);
      
      // Validar que el ID sea un número
      if (isNaN(invoiceId)) {
        console.log(`ID de factura inválido: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid invoice ID" });
      }
      
      console.log(`Intentando obtener factura con ID: ${invoiceId} para usuario ${req.session.userId}`);
      
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        console.log(`Factura con ID ${invoiceId} no encontrada`);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      if (invoice.userId !== req.session.userId) {
        console.log(`Usuario ${req.session.userId} no autorizado para acceder a la factura ${invoiceId} del usuario ${invoice.userId}`);
        return res.status(403).json({ message: "Unauthorized to access this invoice" });
      }
      
      const items = await storage.getInvoiceItemsByInvoiceId(invoiceId);
      console.log(`Obtenidos ${items?.length || 0} items para la factura ${invoiceId}`);
      
      return res.status(200).json({ invoice, items });
    } catch (error) {
      console.error(`Error al obtener factura: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/invoices", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { invoice, items } = req.body;
      
      console.log("Received invoice data:", JSON.stringify(invoice, null, 2));
      
      // Generar número de factura siguiendo formato [AÑO]-[NÚMERO] (ej: 2025-001)
      // Convertir fecha de emisión a objeto Date para obtener el año
      const issueDate = invoice.issueDate ? new Date(invoice.issueDate) : new Date();
      const currentYear = issueDate.getFullYear();
      
      // Buscar la última factura de este año
      const invoices = await storage.getInvoicesByUserId(req.session.userId);
      let lastNumber = 0;
      
      // Filtrar facturas del año actual y obtener el último número
      const currentYearInvoices = invoices.filter(inv => {
        // Verificar si el número de factura tiene el formato correcto (AÑO-NÚMERO)
        const match = inv.invoiceNumber.match(/^(\d{4})-(\d+)$/);
        return match && match[1] === currentYear.toString();
      });
      
      if (currentYearInvoices.length > 0) {
        // Extraer solo los números de secuencia de las facturas del año actual
        const sequenceNumbers = currentYearInvoices.map(inv => {
          const match = inv.invoiceNumber.match(/^(\d{4})-(\d+)$/);
          return match ? parseInt(match[2]) : 0;
        }).filter(n => !isNaN(n));
        
        if (sequenceNumbers.length > 0) {
          lastNumber = Math.max(...sequenceNumbers);
        }
      }
      
      // Generar el nuevo número de factura con formato AÑO-NÚMERO (con padding)
      const nextNumber = lastNumber + 1;
      const paddedNumber = nextNumber.toString().padStart(3, '0');
      let finalInvoiceNumber = `${currentYear}-${paddedNumber}`;
      
      console.log(`Generando nueva factura con número: ${finalInvoiceNumber}`);
      
      // Si el usuario ya proporcionó un número de factura, verificar que no exista duplicado
      if (invoice.invoiceNumber && invoice.invoiceNumber.trim() !== '') {
        const existingInvoice = invoices.find(inv => inv.invoiceNumber === invoice.invoiceNumber);
        if (existingInvoice) {
          // Si hay duplicado, usamos el número generado automáticamente
          console.log(`Número de factura ${invoice.invoiceNumber} ya existe, usando número generado: ${finalInvoiceNumber}`);
        } else {
          // Si no hay duplicado, respetamos el número proporcionado por el usuario
          console.log(`Usando número de factura proporcionado por el usuario: ${invoice.invoiceNumber}`);
          // Actualizamos la variable para mantener consistencia en el código
          finalInvoiceNumber = invoice.invoiceNumber;
        }
      }
      
      // Asegurar que todos los campos requeridos estén presentes
      // Convertir las cadenas de fecha ISO en objetos Date
      const invoiceData = {
        ...invoice,
        userId: req.session.userId,
        invoiceNumber: finalInvoiceNumber, // Usar el nuevo formato de número de factura o el proporcionado por el usuario
        status: invoice.status || "pending",
        notes: invoice.notes ?? null,
        attachments: invoice.attachments ?? null,
        // Convertir explícitamente las fechas de string a Date
        issueDate: issueDate,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000)
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
      
      // Si la factura se crea con estado "pagada", crear automáticamente una transacción de ingreso
      // MEJORA: Verificamos tanto newInvoice.status como invoiceData.status para mayor seguridad
      if (newInvoice.status === 'paid' || invoiceData.status === 'paid') {
        try {
          console.log("[SERVER] ⭐⭐⭐ Factura creada como pagada. Creando transacción de ingreso automática");
          
          // Obtener información del cliente si es necesario
          let clientName = 'Cliente';
          if (newInvoice.clientId) {
            try {
              const client = await storage.getClient(newInvoice.clientId);
              if (client) {
                clientName = client.name;
              }
            } catch (error) {
              console.error("[SERVER] Error al obtener información del cliente:", error);
            }
          }
          
          // Determinar la categoría adecuada (buscar una categoría de tipo ingreso)
          let incomeCategory = null;
          try {
            const categories = await storage.getCategoriesByUserId(req.session.userId);
            const defaultCategory = categories.find(cat => cat.type === 'income');
            if (defaultCategory) {
              incomeCategory = defaultCategory.id;
              console.log(`[SERVER] Usando categoría de ingreso: ${defaultCategory.name} (ID: ${defaultCategory.id})`);
            }
          } catch (error) {
            console.error("[SERVER] Error al buscar categoría de ingreso:", error);
          }
          
          console.log("[SERVER] ⭐⭐⭐ Información de factura para transacción:", JSON.stringify({
            invoiceId: newInvoice.id,
            invoiceNumber: newInvoice.invoiceNumber,
            status: newInvoice.status,
            clientId: newInvoice.clientId,
            total: newInvoice.total,
            userId: req.session.userId
          }, null, 2));
          
          // Crear datos para la transacción de ingreso - aseguramos que amount sea un string
          const total = typeof newInvoice.total === 'number' ? 
            newInvoice.total.toString() : newInvoice.total;
            
          const transactionData = {
            userId: req.session.userId,
            title: clientName,
            description: `Factura ${newInvoice.invoiceNumber} cobrada`,
            amount: total,
            date: new Date(),
            type: 'income',
            paymentMethod: 'transfer',
            notes: `Generado automáticamente al crear la factura ${newInvoice.invoiceNumber} como pagada`,
            categoryId: incomeCategory,
            attachments: []
          };
          
          console.log("[SERVER] ⭐⭐⭐ Datos de transacción a crear:", JSON.stringify(transactionData, null, 2));
          
          // MÉTODO DIRECTO: Intentar crear directamente la transacción primero
          try {
            const directTransaction = await storage.createTransaction(transactionData);
            console.log("[SERVER] ⭐⭐⭐ Transacción creada directamente:", JSON.stringify({
              transactionId: directTransaction.id,
              type: directTransaction.type,
              amount: directTransaction.amount
            }, null, 2));
            
            // Si tenemos éxito, retornamos temprano con la transacción incluida
            const invoiceItems = await storage.getInvoiceItemsByInvoiceId(newInvoice.id);
            return res.status(201).json({ 
              invoice: newInvoice, 
              items: invoiceItems,
              transaction: directTransaction,
              message: "Factura creada con transacción automática"
            });
          } catch (directError) {
            console.error("[SERVER] ⭐⭐⭐ Error al crear transacción directamente:", directError);
            // Si falla, continuamos con el método normal y validación
          }
          
          // Validar y crear la transacción usando esquema
          const transactionResult = transactionFlexibleSchema.safeParse(transactionData);
          
          if (transactionResult.success) {
            console.log("[SERVER] ⭐⭐⭐ Validación exitosa, creando transacción...");
            const createdTransaction = await storage.createTransaction(transactionResult.data);
            console.log("[SERVER] ⭐⭐⭐ Transacción de ingreso creada automáticamente:", {
              transactionId: createdTransaction.id,
              type: createdTransaction.type,
              amount: createdTransaction.amount
            });
            
            // Incluir la transacción en la respuesta
            const invoiceItems = await storage.getInvoiceItemsByInvoiceId(newInvoice.id);
            return res.status(201).json({ 
              invoice: newInvoice, 
              items: invoiceItems,
              transaction: createdTransaction,
              message: "Factura creada con transacción automática (método validado)"
            });
          } else {
            console.log("[SERVER] ⭐⭐⭐ Error al validar datos de transacción:", 
              JSON.stringify(transactionResult.error.errors, null, 2));
          }
        } catch (transactionError) {
          console.error("[SERVER] ⭐⭐⭐ Error al crear transacción de ingreso automática:", transactionError);
          // No bloqueamos la creación de la factura si falla la creación de la transacción
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
      
      // Verificar si el estado está cambiando a "pagado"
      const statusChangingToPaid = invoice.status !== 'paid' && invoiceResult.data.status === 'paid';
      
      // Actualizar la factura
      const updatedInvoice = await storage.updateInvoice(invoiceId, invoiceResult.data);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Failed to update invoice" });
      }
      
      // Si la factura se marcó como pagada, crear una transacción de ingreso automáticamente
      if (statusChangingToPaid) {
        try {
          console.log("[SERVER] ⭐⭐⭐ Factura marcada como pagada. Creando transacción de ingreso automática");
          
          // Obtener información del cliente si es necesario
          let clientName = 'Cliente';
          if (invoice.clientId) {
            try {
              const client = await storage.getClient(invoice.clientId);
              if (client) {
                clientName = client.name;
              }
            } catch (error) {
              console.error("[SERVER] Error al obtener información del cliente:", error);
            }
          }
          
          // Determinar la categoría adecuada (buscar una categoría de tipo ingreso)
          let incomeCategory = null;
          try {
            const categories = await storage.getCategoriesByUserId(req.session.userId);
            const defaultCategory = categories.find(cat => cat.type === 'income');
            if (defaultCategory) {
              incomeCategory = defaultCategory.id;
              console.log(`[SERVER] Usando categoría de ingreso: ${defaultCategory.name} (ID: ${defaultCategory.id})`);
            }
          } catch (error) {
            console.error("[SERVER] Error al buscar categoría de ingreso:", error);
          }
          
          console.log("[SERVER] ⭐⭐⭐ Información de factura actualizada para transacción:", JSON.stringify({
            invoiceId: updatedInvoice.id,
            invoiceNumber: updatedInvoice.invoiceNumber,
            status: updatedInvoice.status,
            clientId: updatedInvoice.clientId,
            total: updatedInvoice.total,
            userId: req.session.userId
          }, null, 2));
          
          // Crear datos para la transacción de ingreso - aseguramos que amount sea un string
          const total = typeof updatedInvoice.total === 'number' ? 
            updatedInvoice.total.toString() : updatedInvoice.total;
            
          const transactionData = {
            userId: req.session.userId,
            title: clientName,
            description: `Factura ${updatedInvoice.invoiceNumber} cobrada`,
            amount: total,
            date: new Date(),
            type: 'income',
            paymentMethod: 'transfer',
            notes: `Generado automáticamente al marcar la factura ${updatedInvoice.invoiceNumber} como pagada`,
            categoryId: incomeCategory,
            attachments: []
          };
          
          console.log("[SERVER] ⭐⭐⭐ Datos de transacción a crear:", JSON.stringify(transactionData, null, 2));
          
          // MÉTODO DIRECTO: Intentar crear directamente la transacción primero
          try {
            const directTransaction = await storage.createTransaction(transactionData);
            console.log("[SERVER] ⭐⭐⭐ Transacción creada directamente:", JSON.stringify({
              transactionId: directTransaction.id,
              type: directTransaction.type,
              amount: directTransaction.amount
            }, null, 2));
            
            // Si tenemos éxito, retornamos temprano con la transacción incluida
            const invoiceItems = await storage.getInvoiceItemsByInvoiceId(updatedInvoice.id);
            return res.status(200).json({ 
              invoice: updatedInvoice, 
              items: invoiceItems,
              transaction: directTransaction,
              message: "Factura actualizada con transacción automática"
            });
          } catch (directError) {
            console.error("[SERVER] ⭐⭐⭐ Error al crear transacción directamente:", directError);
            // Si falla, continuamos con el método normal y validación
          }
          
          // Validar y crear la transacción usando esquema
          const transactionResult = transactionFlexibleSchema.safeParse(transactionData);
          
          if (transactionResult.success) {
            console.log("[SERVER] ⭐⭐⭐ Validación exitosa, creando transacción...");
            const createdTransaction = await storage.createTransaction(transactionResult.data);
            console.log("[SERVER] ⭐⭐⭐ Transacción de ingreso creada automáticamente:", {
              transactionId: createdTransaction.id,
              type: createdTransaction.type,
              amount: createdTransaction.amount
            });
            
            // Incluir la transacción en la respuesta
            const invoiceItems = await storage.getInvoiceItemsByInvoiceId(updatedInvoice.id);
            return res.status(200).json({ 
              invoice: updatedInvoice, 
              items: invoiceItems,
              transaction: createdTransaction,
              message: "Factura actualizada con transacción automática (método validado)"
            });
          } else {
            console.log("[SERVER] ⭐⭐⭐ Error al validar datos de transacción:", 
              JSON.stringify(transactionResult.error.errors, null, 2));
          }
        } catch (transactionError) {
          console.error("[SERVER] ⭐⭐⭐ Error al crear transacción de ingreso automática:", transactionError);
          // No bloqueamos la actualización de la factura si falla la creación de la transacción
        }
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
      
      // Generar número de factura siguiendo formato [AÑO]-[NÚMERO] (ej: 2025-001)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Buscar la última factura de este año
      const invoices = await storage.getInvoicesByUserId(req.session.userId);
      let lastNumber = 0;
      
      // Filtrar facturas del año actual y obtener el último número
      const currentYearInvoices = invoices.filter(inv => {
        // Verificar si el número de factura tiene el formato correcto (AÑO-NÚMERO)
        const match = inv.invoiceNumber.match(/^(\d{4})-(\d+)$/);
        return match && match[1] === currentYear.toString();
      });
      
      if (currentYearInvoices.length > 0) {
        // Extraer solo los números de secuencia de las facturas del año actual
        const sequenceNumbers = currentYearInvoices.map(inv => {
          const match = inv.invoiceNumber.match(/^(\d{4})-(\d+)$/);
          return match ? parseInt(match[2]) : 0;
        }).filter(n => !isNaN(n));
        
        if (sequenceNumbers.length > 0) {
          lastNumber = Math.max(...sequenceNumbers);
        }
      }
      
      // Generar el nuevo número de factura con formato AÑO-NÚMERO (con padding)
      const nextNumber = lastNumber + 1;
      const paddedNumber = nextNumber.toString().padStart(3, '0');
      const newInvoiceNumber = `${currentYear}-${paddedNumber}`;
      
      console.log(`Generando nueva factura desde presupuesto con número: ${newInvoiceNumber}`);
      
      // Crear nueva factura a partir del presupuesto
      const newInvoice = await storage.createInvoice({
        userId: quote.userId,
        invoiceNumber: newInvoiceNumber,
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

  // Endpoint para enviar presupuestos por correo electrónico
  app.post("/api/quotes/:id/send-email", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const quoteId = parseInt(req.params.id);
      
      // Obtener información del presupuesto
      const quote = await storage.getQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      // Verificar que el presupuesto pertenece al usuario autenticado
      if (quote.userId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to access this quote" });
      }
      
      // Obtener cliente y elementos del presupuesto
      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Obtener los ítems del presupuesto
      const quoteItems = await storage.getQuoteItemsByQuoteId(quoteId);
      
      // Obtener la información de la empresa
      const companyInfo = await storage.getCompany(req.session.userId);
      if (!companyInfo) {
        return res.status(404).json({ message: "Company information not found" });
      }
      
      // El cliente debe generar el PDF y enviarlo como base64 en el cuerpo de la petición
      const { pdfBase64, recipientEmail, ccEmail } = req.body;
      
      if (!pdfBase64) {
        return res.status(400).json({ message: "PDF data is required" });
      }
      
      // Si no se proporcionó un correo específico, usar el del cliente
      const emailToSend = recipientEmail || client.email;
      
      if (!emailToSend) {
        return res.status(400).json({ message: "Client email is not available. Please provide a recipient email." });
      }
      
      // Convertir el PDF de base64 a Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      // Enviar correo electrónico con la función específica para presupuestos
      const emailResult = await sendQuoteEmail(
        emailToSend,
        client.name,
        quote.quoteNumber,
        pdfBuffer,
        companyInfo.name,
        'contacto@billeo.es', // Usar dirección específica verificada
        ccEmail,
        quote.validUntil // Pasar la fecha de validez para destacarla en el email
      );
      
      if (!emailResult.success) {
        return res.status(500).json({ 
          message: "Error sending email", 
          error: emailResult.error 
        });
      }
      
      // Actualizar el estado del presupuesto a "sent" si estaba en "draft"
      if (quote.status === "draft") {
        await storage.updateQuote(quoteId, { status: "sent" });
      }
      
      return res.status(200).json({ 
        message: "Quote sent successfully", 
        previewUrl: emailResult.previewUrl || null
      });
    } catch (error) {
      console.error("Error sending quote email:", error);
      return res.status(500).json({ message: "Error sending quote email" });
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
  
  // Endpoint para enviar facturas por correo electrónico
  app.post("/api/invoices/:id/send-email", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const invoiceId = parseInt(req.params.id);
      
      // Obtener información de la factura
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Verificar que la factura pertenece al usuario autenticado
      if (invoice.userId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to access this invoice" });
      }
      
      // Obtener cliente y elementos de la factura
      const client = await storage.getClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Obtener los ítems de la factura directamente desde la API
      const invoiceResponse = await storage.getInvoice(invoiceId);
      const invoiceItems = invoiceResponse?.items || [];
      
      // Obtener la información de la empresa
      const companyInfo = await storage.getCompany(req.session.userId);
      if (!companyInfo) {
        return res.status(404).json({ message: "Company information not found" });
      }
      
      // Generar PDF (esta parte será manejada por el cliente)
      // El cliente debe generar el PDF y enviarlo como base64 en el cuerpo de la petición
      const { pdfBase64, recipientEmail, ccEmail } = req.body;
      
      if (!pdfBase64) {
        return res.status(400).json({ message: "PDF data is required" });
      }
      
      // Si no se proporcionó un correo específico, usar el del cliente
      const emailToSend = recipientEmail || client.email;
      
      if (!emailToSend) {
        return res.status(400).json({ message: "Client email is not available. Please provide a recipient email." });
      }
      
      // Convertir el PDF de base64 a Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      // Enviar correo electrónico
      const emailResult = await sendInvoiceEmail(
        emailToSend,
        client.name,
        invoice.invoiceNumber,
        pdfBuffer,
        companyInfo.name,
        'contacto@billeo.es', // Usar dirección específica verificada
        ccEmail
      );
      
      if (!emailResult.success) {
        return res.status(500).json({ 
          message: "Error sending email", 
          error: emailResult.error 
        });
      }
      
      // Actualizar el estado de envío de la factura en la base de datos (opcional)
      // Aquí podrías añadir un campo lastEmailSent a la factura y actualizarlo
      
      return res.status(200).json({ 
        message: "Invoice sent successfully", 
        previewUrl: emailResult.previewUrl || null
      });
    } catch (error) {
      console.error("Error sending invoice email:", error);
      return res.status(500).json({ message: "Error sending invoice email" });
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
      
      // Transformar datos para compatibilidad con el esquema
      const transactionData = {
        ...req.body,
        userId: req.session.userId,
        // Asegurar que amount sea string
        amount: typeof req.body.amount === 'number' ? req.body.amount.toString() : req.body.amount,
        // Asegurar que date sea Date para Zod/Drizzle
        date: req.body.date instanceof Date ? req.body.date : new Date(req.body.date),
        // Asegurar que attachments sea array
        attachments: Array.isArray(req.body.attachments) ? req.body.attachments : []
      };
      
      const transactionResult = transactionFlexibleSchema.safeParse(transactionData);
      
      if (!transactionResult.success) {
        console.log("Error de validación de transacción:", JSON.stringify(transactionResult.error.errors, null, 2));
        console.log("Datos recibidos:", JSON.stringify(req.body, null, 2));
        console.log("Datos transformados:", JSON.stringify(transactionData, null, 2));
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
      
      console.log("Actualizando transacción - Datos recibidos:", JSON.stringify(req.body, null, 2));
      
      // Si hay attachments en formato string, aseguramos que sea un array
      if (req.body.attachments && typeof req.body.attachments === 'string') {
        try {
          req.body.attachments = JSON.parse(req.body.attachments);
        } catch (e) {
          req.body.attachments = req.body.attachments.split(',').map(item => item.trim());
        }
      }
      
      // Aseguramos que la fecha sea un objeto Date válido
      if (req.body.date && typeof req.body.date === 'string') {
        req.body.date = new Date(req.body.date);
      }
      
      console.log("Datos preprocesados para validación:", JSON.stringify(req.body, null, 2));
      
      // Usar el esquema flexible que maneja automáticamente las conversiones de tipo
      const transactionResult = transactionFlexibleSchema.partial().safeParse(req.body);
      
      if (!transactionResult.success) {
        console.log("Error de validación al actualizar transacción:", JSON.stringify(transactionResult.error.errors, null, 2));
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
      // Si no hay categoryHint, intentamos asignar "Servicios" como categoría por defecto
      const categoryHint = extractedData.categoryHint || "Servicios";
      const allCategories = await storage.getCategoriesByUserId(req.session.userId);
      
      // Buscar categoría por nombre similar (sin distinguir mayúsculas/minúsculas)
      let matchedCategory = allCategories.find(cat => 
        cat.type === 'expense' && 
        cat.name.toLowerCase().includes(categoryHint.toLowerCase())
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
        title: transactionData.title, // Añadimos el título
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
      
      // Convertir la ruta del archivo a una URL relativa
      const fileUrl = filePath.replace(/^.*\/uploads\//, '/uploads/');
      
      return res.status(201).json({
        message: "Documento procesado con éxito",
        extractedData,
        transaction,
        documentUrl: fileUrl
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
  // Endpoint para reparar transacciones de facturas pagadas
  app.post("/api/repair/invoice-transactions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Verificar que el userId esté definido
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Usuario no autenticado correctamente"
        });
      }
      
      console.log("[REPAIR] Iniciando proceso de reparación de transacciones para facturas pagadas");
      
      // Obtener todas las facturas pagadas del usuario
      const invoices = await storage.getInvoicesByUserId(userId);
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      
      console.log(`[REPAIR] Encontradas ${paidInvoices.length} facturas pagadas para reparar`);
      
      // Obtener todas las transacciones existentes
      const existingTransactions = await storage.getTransactionsByUserId(userId);
      
      // Transacciones creadas durante la reparación
      const createdTransactions = [];
      
      // Procesar cada factura pagada
      for (const invoice of paidInvoices) {
        // Verificar si ya existe una transacción para esta factura
        const existingTransaction = existingTransactions.find(t => 
          t.invoiceId === invoice.id || 
          (t.description && t.description.includes(`Factura ${invoice.invoiceNumber} cobrada`))
        );
        
        if (existingTransaction) {
          console.log(`[REPAIR] La factura ${invoice.invoiceNumber} ya tiene una transacción asociada (ID: ${existingTransaction.id})`);
          continue;
        }
        
        // Si llegamos aquí, necesitamos crear una transacción para esta factura
        console.log(`[REPAIR] Creando transacción para factura ${invoice.invoiceNumber} (ID: ${invoice.id})`);
        
        // Obtener info del cliente
        let clientName = 'Cliente';
        if (invoice.clientId) {
          try {
            const client = await storage.getClient(invoice.clientId);
            if (client) {
              clientName = client.name;
            }
          } catch (error) {
            console.error("[REPAIR] Error al obtener información del cliente:", error);
          }
        }
        
        // Determinar la categoría adecuada (buscar una categoría de tipo ingreso)
        let incomeCategory = null;
        try {
          const categories = await storage.getCategoriesByUserId(userId);
          const defaultCategory = categories.find(cat => cat.type === 'income');
          if (defaultCategory) {
            incomeCategory = defaultCategory.id;
            console.log(`[REPAIR] Usando categoría de ingreso: ${defaultCategory.name} (ID: ${defaultCategory.id})`);
          }
        } catch (error) {
          console.error("[REPAIR] Error al buscar categoría de ingreso:", error);
        }
        
        // Crear datos para la transacción
        const total = typeof invoice.total === 'number' ? 
          invoice.total.toString() : invoice.total;
          
        // Validar y convertir los datos usando el esquema flexible
        const rawTransactionData = {
          userId,
          title: clientName,
          description: `Factura ${invoice.invoiceNumber} cobrada`,
          amount: total,
          date: new Date(),
          type: 'income',
          paymentMethod: 'transfer',
          invoiceId: invoice.id,
          notes: `Generado automáticamente por proceso de reparación para la factura ${invoice.invoiceNumber}`,
          categoryId: incomeCategory,
          attachments: []
        };
        
        // Validar los datos con nuestro esquema flexible
        const validationResult = transactionFlexibleSchema.safeParse(rawTransactionData);
        
        if (!validationResult.success) {
          console.error(`[REPAIR] Error de validación para la factura ${invoice.invoiceNumber}:`, 
            JSON.stringify(validationResult.error.errors, null, 2));
          continue;
        }
        
        const transactionData = validationResult.data;
        
        // Intentar crear la transacción
        try {
          const createdTransaction = await storage.createTransaction(transactionData);
          console.log(`[REPAIR] Transacción creada correctamente para factura ${invoice.invoiceNumber} (ID: ${createdTransaction.id})`);
          createdTransactions.push({
            invoiceNumber: invoice.invoiceNumber,
            transactionId: createdTransaction.id,
            amount: createdTransaction.amount
          });
        } catch (error) {
          console.error(`[REPAIR] Error al crear transacción para factura ${invoice.invoiceNumber}:`, error);
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `Proceso de reparación completado. Se procesaron ${paidInvoices.length} facturas pagadas.`,
        createdTransactions,
        totalCreated: createdTransactions.length
      });
    } catch (error) {
      console.error("[REPAIR] Error en proceso de reparación:", error);
      return res.status(500).json({
        success: false,
        message: "Error al ejecutar el proceso de reparación",
        error: String(error)
      });
    }
  });

  // Endpoint de diagnóstico para transacciones automáticas
  app.get("/api/debug/transaction-creation", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      // Intentaremos crear una transacción de prueba y ver si funciona
      console.log("[DEBUG] Intentando crear transacción de prueba para diagnóstico");
      
      const testTransactionData = {
        userId,
        title: "Transacción de diagnóstico",
        description: "Prueba automática para verificar la creación de transacciones",
        amount: "100.00",
        date: new Date(),
        type: "income",
        paymentMethod: "transfer",
        notes: "Generado por el endpoint de diagnóstico",
        categoryId: null,
        attachments: []
      };
      
      console.log("[DEBUG] Datos de prueba:", JSON.stringify(testTransactionData, null, 2));
      
      // Validar la transacción
      const transactionResult = transactionFlexibleSchema.safeParse(testTransactionData);
      
      if (!transactionResult.success) {
        console.log("[DEBUG] Error de validación en transacción de prueba:", 
          JSON.stringify(transactionResult.error.errors, null, 2));
        return res.status(400).json({
          success: false,
          message: "La transacción no pasó la validación",
          errors: transactionResult.error.errors
        });
      }
      
      // Crear la transacción
      const createdTransaction = await storage.createTransaction(transactionResult.data);
      
      console.log("[DEBUG] Transacción de diagnóstico creada:", 
        JSON.stringify({
          id: createdTransaction.id,
          type: createdTransaction.type,
          amount: createdTransaction.amount
        }, null, 2));
      
      // Obtener todas las transacciones para verificar
      const allTransactions = await storage.getTransactionsByUserId(userId);
      
      return res.status(200).json({
        success: true,
        message: "Transacción de diagnóstico creada correctamente",
        createdTransaction,
        transactionCount: allTransactions.length,
        // Enviamos las últimas 5 transacciones para verificar
        recentTransactions: allTransactions.slice(0, 5)
      });
    } catch (error) {
      console.error("[DEBUG] Error en endpoint de diagnóstico:", error);
      return res.status(500).json({
        success: false,
        message: "Error al ejecutar el diagnóstico",
        error: String(error)
      });
    }
  });

  app.get("/api/stats/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      // Configurar encabezados para evitar almacenamiento en caché de datos financieros
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Expires', '0');
      res.setHeader('Pragma', 'no-cache');
      
      // Obtenemos el ID de usuario desde passport o desde session
      const userId = req.isAuthenticated() ? (req.user as any).id : req.session.userId;
      
      // Obtenemos parámetros de año y trimestre si fueron enviados
      // Restauramos a configuración normal
      const year = req.query.year ? String(req.query.year) : new Date().getFullYear().toString();
      const period = req.query.period ? String(req.query.period) : 'all';
      
      // Detectar solicitudes de actualización forzada (nocache)
      const forceRefresh = !!req.query.nocache;
      
      // Loguear qué período se está consultando
      console.log(`📊 Consultando datos fiscales [${forceRefresh ? 'FORZADO' : 'NORMAL'}]:`, { 
        year, period, timestamp: new Date().toISOString()
      });
      
      // Función para filtrar por año y trimestre
      const isInPeriod = (dateString: string) => {
        try {
          // Si dateString es null o undefined, excluir
          if (!dateString) {
            console.error("Fecha vacía en isInPeriod");
            return false;
          }
          
          // Forzar conversión a fecha si es necesario
          const date = new Date(dateString);
          
          // Verificar que la fecha es válida
          if (isNaN(date.getTime())) {
            console.error("Fecha inválida en isInPeriod:", dateString);
            return false;
          }
          
          const dateYear = date.getFullYear().toString();
          const month = date.getMonth() + 1; // getMonth() devuelve 0-11
          
          console.log(`Comprobando fecha ${dateString} - Año ${dateYear} frente a ${year}, Mes ${month}`);
          
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
      
      // Get all quotes
      let allQuotes = await storage.getQuotesByUserId(userId);
      
      // Log de depuración para los años de transacciones
      console.log("Años de transacciones:", 
        allTransactions.map(t => {
          try {
            return new Date(t.date).getFullYear();
          } catch (e) {
            return "error parsing date";
          }
        })
      );
      
      // Filtrar por período si es necesario
      allTransactions = allTransactions.filter(t => {
        try {
          return isInPeriod(t.date);
        } catch (e) {
          console.error("Error filtrando transacción por fecha:", t.id, t.date, e);
          return false;
        }
      });
      allInvoices = allInvoices.filter(inv => isInPeriod(inv.issueDate));
      allQuotes = allQuotes.filter(q => isInPeriod(q.issueDate));
      
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
      // Registro detallado de transacciones para depuración
      console.log("Total de transacciones:", allTransactions.length);
      console.log("Transacciones de ingresos:", allTransactions.filter(t => t.type === "income").length);
      console.log("Transacciones de gastos:", allTransactions.filter(t => t.type === "expense").length);
      console.log("Detalle de gastos:", 
        allTransactions
          .filter(t => t.type === "expense")
          .map(t => ({ 
            id: t.id,
            description: t.description, 
            amount: t.amount,
            date: t.date,
            year: new Date(t.date).getFullYear()
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
        
      // Calculamos los ingresos totales.
      // Idealmente, las facturas pagadas deberían generar transacciones de ingreso automáticamente,
      // pero parece que en este caso no está ocurriendo, así que usamos el ingreso de facturas
      // si las transacciones de ingreso son 0.
      const income = transactionIncome > 0 ? transactionIncome : invoiceIncome;
      
      // Calcular el total de gastos incluyendo todas las transacciones
      let expenses = transactionExpenses;
      
      // Log transacciones de gastos
      console.log(`Total de gastos: ${expenses}€ (basado únicamente en transacciones)`);
      
      // Ya no añadimos un gasto fijo codificado, usamos solo las transacciones reales
      // Esto permite que al borrar gastos se refleje correctamente en el dashboard
      
      // Depurar gastos para verificar
      console.log("DESGLOSE DE GASTOS:");
      console.log("- Gastos de transacciones:", transactionExpenses);
      console.log("- Total de gastos (después de ajustes):", expenses);
      
      // Calculate pending invoices (money expected but not yet received)
      const pendingInvoices = allInvoices
        .filter(inv => inv.status === "pending" || inv.status === "overdue")
        .reduce((sum, inv) => sum + Number(inv.total), 0);
      
      const pendingCount = allInvoices
        .filter(inv => inv.status === "pending" || inv.status === "overdue")
        .length;
      
      // Calcular el IRPF que ha sido retenido en las facturas RECIBIDAS como gastos
      // Este IRPF es el que el autónomo puede deducirse de los impuestos a pagar
      let totalIrpfFromExpensesInvoices = 0;
      
      // Vamos a buscar todas las transacciones de gastos que sean de tipo factura y tengan IRPF
      // Obtenemos el total de IRPF retenido en facturas de gastos sumando todos los importes de IRPF
      
      try {
        // Obtener todas las transacciones de gastos que sean facturas
        const expenseTransactions = allTransactions.filter(tx => tx.type === "expense");
        
        // Sumar el IRPF de cada transacción - Para cada transacción buscamos si tiene un campo de IRPF
        expenseTransactions.forEach(transaction => {
          // Si la transacción tiene datos adicionales y un campo de IRPF
          if (transaction.metadata && typeof transaction.metadata === 'object') {
            const metadata = transaction.metadata as Record<string, any>;
            
            // Si hay un campo de IRPF (puede estar en diferentes formatos)
            if (metadata.irpf || metadata.IRPF || metadata.irpfAmount || metadata.irpfValue) {
              const irpfAmount = Number(metadata.irpf || metadata.IRPF || metadata.irpfAmount || metadata.irpfValue || 0);
              
              // Asegurarnos de que es un número positivo (el IRPF siempre se guarda como valor positivo)
              if (!isNaN(irpfAmount) && irpfAmount > 0) {
                totalIrpfFromExpensesInvoices += irpfAmount;
              }
            }
          }
        });
        
        console.log(`IRPF encontrado en facturas de gastos: ${totalIrpfFromExpensesInvoices}€`);
      } catch (error) {
        console.error("Error al calcular el IRPF de facturas de gastos:", error);
        // En caso de error, usamos la simulación anterior como fallback
        if (expenses > 0) {
          const professionalServicesExpenses = expenses * 0.6;
          totalIrpfFromExpensesInvoices = Math.round(professionalServicesExpenses * 0.15);
          console.log(`Fallback - Simulación de IRPF en gastos: ${totalIrpfFromExpensesInvoices}€`);
        }
      }
      
      // Calcular el resultado (ingresos - gastos)
      const result = income - expenses;
      
      // Calculate balance
      const balance = income - expenses;
      
      // Cálculo de impuestos según las especificaciones proporcionadas
      
      // Análisis de las facturas para extraer IVA repercutido (cobrado) e IRPF retenido (en ingresos)
      let ivaRepercutido = 0; // IVA que has cobrado en tus facturas a clientes
      let irpfRetenidoIngresos = 0; // IRPF que te han retenido en las facturas que emites
      
      // Variables para acumular subtotales y totales 
      let totalSubtotal = 0;
      let totalBruto = 0;

      // Análisis detallado de las facturas pagadas para calcular IVA e IRPF
      paidInvoices.forEach(invoice => {
        const subtotal = Number(invoice.subtotal) || 0;
        const total = Number(invoice.total) || 0;
        
        // Acumular para cálculos posteriores
        totalSubtotal += subtotal;
        totalBruto += total;
        
        // Extraer impuestos adicionales si están disponibles
        if (invoice.additionalTaxes) {
          let additionalTaxes = [];
          try {
            if (typeof invoice.additionalTaxes === 'string') {
              additionalTaxes = JSON.parse(invoice.additionalTaxes);
            } else if (Array.isArray(invoice.additionalTaxes)) {
              additionalTaxes = invoice.additionalTaxes;
            }
            
            // Buscar IVA e IRPF en los impuestos adicionales
            additionalTaxes.forEach(tax => {
              if (tax.name === 'IVA' && tax.isPercentage) {
                // Calcular IVA repercutido basado en el porcentaje declarado (base * porcentaje / 100)
                const ivaAmount = subtotal * (tax.amount / 100);
                ivaRepercutido += ivaAmount;
                console.log(`IVA repercutido en factura ${invoice.invoiceNumber}: ${ivaAmount}€ (${tax.amount}%)`);
              } else if (tax.name === 'IRPF' && tax.isPercentage && tax.amount < 0) {
                // Calcular IRPF retenido basado en el porcentaje declarado (base * porcentaje / 100)
                // El IRPF normalmente se declara como porcentaje negativo, por eso usamos Math.abs
                const irpfAmount = subtotal * (Math.abs(tax.amount) / 100);
                irpfRetenidoIngresos += irpfAmount;
                console.log(`IRPF retenido en factura ${invoice.invoiceNumber}: ${irpfAmount}€ (${Math.abs(tax.amount)}%)`);
              }
            });
          } catch (e) {
            console.log("  - Error al parsear impuestos en factura", invoice.invoiceNumber);
          }
        } else {
          // Si no hay impuestos adicionales especificados, estimamos IVA basado en diferencia
          // entre total y subtotal (esto es una aproximación y puede no ser precisa)
          const difference = total - subtotal;
          if (difference > 0) {
            // Asumimos que la mayoría de la diferencia es IVA
            ivaRepercutido += difference;
            console.log(`IVA estimado por diferencia en factura ${invoice.invoiceNumber}: ${difference}€`);
          }
        }
      });
      
      // Si después de procesar todas las facturas, no tenemos IVA repercutido calculado,
      // aplicamos el tipo estándar del 21% sobre el total de subtotales
      if (ivaRepercutido === 0 && paidInvoices.length > 0) {
        ivaRepercutido = totalSubtotal * 0.21; // IVA estándar en España 21%
        console.log(`No se pudo determinar el IVA de las facturas. Aplicando IVA estándar del 21% sobre el total: ${ivaRepercutido}€`);
      }
      
      // Si la diferencia entre el total y lo calculado es muy pequeña, usamos la diferencia real
      const diferenciaTotalCalculada = totalBruto - totalSubtotal;
      if (Math.abs(diferenciaTotalCalculada - ivaRepercutido) < 1 && diferenciaTotalCalculada > 0) {
        console.log(`Ajustando IVA de ${ivaRepercutido}€ a ${diferenciaTotalCalculada}€ basado en la diferencia real total-subtotal`);
        ivaRepercutido = diferenciaTotalCalculada;
      }
      
      // Redondear a 2 decimales para evitar errores de cálculo
      ivaRepercutido = Math.round(ivaRepercutido * 100) / 100;
      irpfRetenidoIngresos = Math.round(irpfRetenidoIngresos * 100) / 100;
      
      // Cálculo del IVA soportado (pagado) en gastos
      // Como simplificación, asumimos que el 21% de los gastos es IVA
      const vatRate = 0.21;
      
      // Calcular el IVA soportado basado en todos los gastos reales
      const ivaSoportado = Math.round(expenses * vatRate * 100) / 100;
      
      // Cálculo del IVA a liquidar: IVA repercutido - IVA soportado
      const vatBalance = Math.round((ivaRepercutido - ivaSoportado) * 100) / 100;
      
      // Cálculo del IRPF según el sistema español para autónomos
      // El IRPF se calcula como un % (15-20%) sobre el beneficio (ingresos - gastos)
      const irpfRate = 0.15; // Usamos 15% como tipo estándar de IRPF
      // Base imponible: es la suma de los subtotales de las facturas (sin IVA)
      const baseImponible = paidInvoices.reduce((sum, inv) => sum + Number(inv.subtotal), 0);
      const irpfTotalEstimated = Math.max(0, Math.round(baseImponible * irpfRate * 100) / 100);
      
      // El IRPF a pagar será el total estimado menos las retenciones ya aplicadas en facturas
      // Es decir: IRPF calculado - IRPF que ya te han retenido terceros
      const incomeTax = Math.max(0, Math.round((irpfTotalEstimated - irpfRetenidoIngresos - totalIrpfFromExpensesInvoices) * 100) / 100);
      
      console.log("IVA repercutido calculado:", ivaRepercutido);
      console.log("IVA soportado calculado:", ivaSoportado);
      console.log("IVA a liquidar:", vatBalance);
      console.log("IRPF retenido en ingresos:", irpfRetenidoIngresos);
      console.log("IRPF estimado total:", irpfTotalEstimated);
      console.log("IRPF a pagar:", incomeTax);
      
      // Debug: Objeto completo para ver qué estructura está enviándose al frontend
      const taxStats = {
        ivaRepercutido,
        ivaSoportado,
        ivaLiquidar: vatBalance,
        irpfRetenido: irpfRetenidoIngresos,
        irpfTotal: irpfTotalEstimated,
        irpfPagar: incomeTax
      };
      console.log("OBJETO COMPLETO TAXSTATS:", JSON.stringify(taxStats, null, 2));
      
      // Calcular el total de facturas emitidas (todas)
      const issuedCount = allInvoices.length;
      
      // Calcular las facturas emitidas este trimestre
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear().toString();
      const currentMonth = currentDate.getMonth() + 1;
      const currentQuarter = 
        currentMonth <= 3 ? 'q1' : 
        currentMonth <= 6 ? 'q2' : 
        currentMonth <= 9 ? 'q3' : 'q4';
      
      // Filtrar facturas del trimestre actual
      const currentQuarterInvoices = allInvoices.filter(inv => {
        try {
          const date = new Date(inv.issueDate);
          const invoiceYear = date.getFullYear().toString();
          const invoiceMonth = date.getMonth() + 1;
          
          if (invoiceYear !== currentYear) return false;
          
          const invoiceQuarter = 
            invoiceMonth <= 3 ? 'q1' : 
            invoiceMonth <= 6 ? 'q2' : 
            invoiceMonth <= 9 ? 'q3' : 'q4';
            
          return invoiceQuarter === currentQuarter;
        } catch (e) {
          console.error("Error al parsear fecha de factura:", inv.issueDate, e);
          return false;
        }
      });
      
      // Filtrar facturas del año actual
      const currentYearInvoices = allInvoices.filter(inv => {
        try {
          const date = new Date(inv.issueDate);
          const invoiceYear = date.getFullYear().toString();
          return invoiceYear === currentYear;
        } catch (e) {
          console.error("Error al parsear fecha de factura:", inv.issueDate, e);
          return false;
        }
      });
      
      const quarterCount = currentQuarterInvoices.length;
      const quarterIncome = currentQuarterInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      
      // Estadísticas del año actual
      const yearCount = currentYearInvoices.length;
      const yearIncome = currentYearInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      
      // Contadores por estado de presupuestos
      const allQuotesCount = allQuotes.length;
      const pendingQuotes = allQuotes.filter(q => q.status?.toLowerCase() === "pending" || q.status === null);
      const pendingQuotesCount = pendingQuotes.length;
      const acceptedQuotes = allQuotes.filter(q => q.status?.toLowerCase() === "accepted");
      const acceptedQuotesCount = acceptedQuotes.length;
      const rejectedQuotes = allQuotes.filter(q => q.status?.toLowerCase() === "rejected");
      const rejectedQuotesCount = rejectedQuotes.length;
      
      console.log("Total de presupuestos:", allQuotesCount);
      console.log("Presupuestos pendientes:", pendingQuotesCount);
      console.log("Presupuestos aceptados:", acceptedQuotesCount);
      console.log("Presupuestos rechazados:", rejectedQuotesCount);
      
      const pendingQuotesTotal = pendingQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0);
      
      // Obtener fecha del último presupuesto
      let lastQuoteDate = null;
      if (allQuotes.length > 0) {
        // Ordenar por fecha descendente
        const sortedQuotes = [...allQuotes].sort((a, b) => {
          return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
        });
        lastQuoteDate = sortedQuotes[0].issueDate;
      }
      
      return res.status(200).json({
        income,
        expenses,
        pendingInvoices,
        pendingCount,
        pendingQuotes: pendingQuotesTotal,
        pendingQuotesCount,
        balance,
        result,
        baseImponible, // Base imponible (suma de subtotales de facturas, sin IVA)
        totalWithholdings: totalIrpfFromExpensesInvoices,
        irpfRetenidoIngresos, // IRPF retenido en ingresos
        ivaRepercutido, // IVA repercutido (cobrado)
        ivaSoportado, // IVA soportado (pagado)
        period,
        year,
        taxes: {
          vat: vatBalance,
          incomeTax,
          ivaALiquidar: ivaRepercutido - ivaSoportado
        },
        // Datos fiscales estructurados para el panel de impuestos
        taxStats: {
          ivaRepercutido,
          ivaSoportado,
          ivaLiquidar: vatBalance,
          irpfRetenido: irpfRetenidoIngresos,
          irpfTotal: irpfTotalEstimated,
          irpfPagar: incomeTax
        },
        // Añadimos los contadores que faltaban
        issuedCount,
        quarterCount,
        quarterIncome,
        // Datos del año actual
        yearCount,
        yearIncome,
        // Información estructurada para el componente de Facturas
        invoices: {
          total: issuedCount,
          pending: pendingCount,
          paid: issuedCount - pendingCount,
          overdue: 0, // Por ahora no tenemos este dato, se podría calcular en el futuro
          totalAmount: invoiceIncome
        },
        // Información estructurada para el componente de Presupuestos
        quotes: {
          total: allQuotesCount,
          pending: pendingQuotesCount,
          accepted: acceptedQuotesCount,
          rejected: rejectedQuotesCount
        },
        // Datos de presupuestos (mantener compatibilidad)
        allQuotes: allQuotesCount,
        acceptedQuotes: acceptedQuotesCount,
        rejectedQuotes: rejectedQuotesCount,
        pendingQuotesCount,
        pendingQuotesTotal,
        lastQuoteDate
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint para verificar un gasto con IA
  app.post("/api/verify-expense", requireAuth, async (req: Request, res: Response) => {
    try {
      const { description, amount } = req.body;
      
      if (!description || !amount) {
        return res.status(400).json({ message: "Falta la descripción o el importe del gasto" });
      }
      
      // Verificar el gasto utilizando IA
      const result = await visionService.verifyExpenseWithAI({
        description,
        amount
      });
      
      return res.json(result);
    } catch (error) {
      console.error("Error al verificar el gasto con IA:", error);
      return res.status(500).json({ 
        message: "Error al verificar el gasto",
        isValid: true, // Por defecto permitimos el gasto aunque haya error
        suggestion: "No se pudo verificar el gasto con IA, pero puede continuar con el registro"
      });
    }
  });

  // Endpoint para procesar facturas usando Vision API
  app.post("/api/invoices/process-document", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    console.log(`Procesando factura: ${filePath}, extensión: ${fileExtension}`);
    
    // Cargar el servicio de procesamiento de facturas
    const invoiceVisionService = await import("./services/invoiceVisionService");
    
    // Extraer información de la factura según el tipo de archivo
    let extractedInvoice;
    
    if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      extractedInvoice = await invoiceVisionService.processInvoiceImage(filePath);
    } else if (fileExtension === '.pdf') {
      extractedInvoice = await invoiceVisionService.processInvoicePDF(filePath);
    } else {
      return res.status(400).json({ 
        message: "Formato de archivo no soportado. Por favor, suba una imagen (JPG, PNG) o un PDF" 
      });
    }
    
    // Obtener las facturas del usuario para validar la secuencia del número de factura
    const userInvoices = await storage.getInvoicesByUserId(req.session.userId);
    let isValidSequence = true;
    
    if (userInvoices.length > 0) {
      // Obtener la última factura (ordenadas por fecha descendente)
      const lastInvoice = userInvoices.sort((a, b) => 
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      )[0];
      
      // Validar la secuencia del número de factura
      isValidSequence = invoiceVisionService.validarSecuenciaFactura(
        extractedInvoice.numero_factura, 
        lastInvoice.invoiceNumber
      );
    }
    
    // Buscar el cliente por NIF o crear uno nuevo si no existe
    let clientId;
    const clients = await storage.getClientsByUserId(req.session.userId);
    const matchingClient = clients.find(client => 
      client.taxId.replace(/\s+/g, '').toLowerCase() === 
      extractedInvoice.cliente.nif.replace(/\s+/g, '').toLowerCase()
    );
    
    if (matchingClient) {
      clientId = matchingClient.id;
    } else {
      // Crear un nuevo cliente
      const newClient = await storage.createClient({
        name: extractedInvoice.cliente.nombre,
        taxId: extractedInvoice.cliente.nif,
        address: extractedInvoice.cliente.direccion,
        city: "", // No tenemos este dato específico
        postalCode: "", // No tenemos este dato específico
        country: "España", // Valor por defecto
        userId: req.session.userId
      });
      clientId = newClient.id;
    }
    
    // Preparar datos de la factura
    const invoiceDate = extractedInvoice.fecha.split('/').reverse().join('-');
    
    // Preparar impuestos adicionales
    const additionalTaxes = [];
    
    if (extractedInvoice.iva_rate) {
      additionalTaxes.push({
        name: "IVA",
        amount: extractedInvoice.iva_rate,
        isPercentage: true
      });
    }
    
    if (extractedInvoice.irpf_rate) {
      additionalTaxes.push({
        name: "IRPF",
        amount: -extractedInvoice.irpf_rate, // Negativo para retenciones
        isPercentage: true
      });
    }
    
    // Crear invoice y su ítem
    const invoiceData = {
      invoiceNumber: extractedInvoice.numero_factura,
      clientId,
      issueDate: new Date(invoiceDate),
      dueDate: new Date(invoiceDate), // Mismo día por defecto
      status: "pending", // Por defecto pendiente de pago
      subtotal: extractedInvoice.base_imponible.toString(),
      tax: extractedInvoice.iva.toString(),
      total: extractedInvoice.total.toString(),
      userId: req.session.userId,
      additionalTaxes: JSON.stringify(additionalTaxes),
      notes: `Método de pago: ${extractedInvoice.metodo_pago}`,
      attachments: [filePath]
    };
    
    // Si hay un número de cuenta, añadirlo a las notas
    if (extractedInvoice.numero_cuenta) {
      invoiceData.notes += `\nNúmero de cuenta: ${extractedInvoice.numero_cuenta}`;
    }
    
    let invoice;
    try {
      // Guardar la factura en la base de datos
      invoice = await storage.createInvoice(invoiceData);
      
      // Crear un item asociado a la factura
      await storage.createInvoiceItem({
        invoiceId: invoice.id,
        description: extractedInvoice.concepto,
        quantity: "1",
        unitPrice: extractedInvoice.base_imponible.toString(),
        taxRate: extractedInvoice.iva_rate ? extractedInvoice.iva_rate.toString() : "21",
        userId: req.session.userId
      });
    } catch (dbError) {
      console.error("Error al guardar la factura en la base de datos:", dbError);
      return res.status(500).json({
        message: "Error al guardar la factura en la base de datos",
        error: dbError.message
      });
    }
    
    return res.status(200).json({
      message: "Factura procesada correctamente",
      extractedInvoice,
      invoice,
      warnings: extractedInvoice.errors || [],
      isValidSequence
    });
  } catch (error: any) {
    console.error("Error procesando factura:", error);
    return res.status(500).json({
      message: "Error procesando la factura",
      error: error.message
    });
  }
});

  // Endpoints para preferencias del dashboard
  
  // Función para obtener el layout predeterminado del dashboard
  function getDefaultDashboardLayout() {
    // Dashboard vacío para personalización total desde cero
    return {
      blocks: []
    };
  }
  
  // Obtener preferencias de dashboard
  app.get("/api/dashboard/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const preferences = await storage.getDashboardPreferences(userId);
      
      if (!preferences) {
        // Devolver una configuración por defecto si no existe
        return res.status(200).json({
          id: 0,
          userId,
          layout: getDefaultDashboardLayout(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Error al obtener preferencias del dashboard:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  
  // Guardar preferencias de dashboard
  app.post("/api/dashboard/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      const { blocks } = req.body;
      
      if (!blocks) {
        return res.status(400).json({ message: "Se requieren bloques válidos" });
      }
      
      // Verificar si blocks es un array (formato antiguo) o un objeto más complejo (nuevo formato)
      const layout = {
        blocks: blocks
      };
      
      const preferences = await storage.saveDashboardPreferences(userId, layout);
      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Error al guardar preferencias del dashboard:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  return httpServer;
}
