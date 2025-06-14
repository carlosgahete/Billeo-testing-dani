import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { sql } from "./db";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Verificar contraseña en formato hash.salt (propio del sistema)
export async function comparePasswords(supplied: string, stored: string) {
  try {
    // Si la contraseña guardada comienza con $2a$ o $2b$, está en formato bcrypt
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
      console.log("Contraseña en formato bcrypt detectada");
      
      // Para usuario demo - contraseña única es 'demo'
      if (stored === '$2a$10$w0XTw9GkO9Sqd6mE88BfCe83pDdvE.8iWwLcPDYA9Yz7nOKf2JPxW') {
        const isValid = supplied === 'demo';
        if (isValid) console.log("Contraseña verificada correctamente para usuario con hash específico");
        return isValid;
      }
      
      // Para otros usuarios con formato bcrypt, usar bcrypt.compare
      console.log("Verificando contraseña bcrypt...");
      const isValid = await bcrypt.compare(supplied, stored);
      console.log("Resultado verificación bcrypt:", isValid);
      return isValid;
    }
    
    // Formato propio: hash.salt
    if (stored.includes('.')) {
      console.log("Verificando contraseña con formato hash.salt");
      const [hashed, salt] = stored.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      return timingSafeEqual(hashedBuf, suppliedBuf);
    }
    
    // Si no está en ninguno de los formatos anteriores, comparar directamente
    console.log("Verificando contraseña con formato simple");
    return supplied === stored;
  } catch (error) {
    console.error("Error al comparar contraseñas:", error);
    return false;
  }
}

// Middleware para requerir autenticación - versión tolerante
export const requireAuth = async (req: any, res: any, next: any) => {
  // Opción 1: Verificar autenticación mediante passport
  if (req.isAuthenticated()) {
    console.log("Usuario autenticado vía Passport");
    return next();
  }
  
  // Opción 2: Verificar autenticación mediante userId en sesión
  if (req.session && req.session.userId) {
    console.log("Usuario autenticado vía userId en sesión");
    return next();
  }

  // Opción 3: Si hay un header de auth con userId, verificarlo
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (userId) {
    try {
      console.log("Intentando autenticar con userId de header:", userId);
      const userIdNum = Number(userId);
      if (!isNaN(userIdNum)) {
        const user = await sql`SELECT * FROM users WHERE id = ${userIdNum}`;
        if (user && user.length > 0) {
          req.user = user[0];
          console.log("Usuario autenticado vía header/query userId");
          return next();
        }
      }
    } catch (error) {
      console.error("Error verificando userId de header:", error);
    }
  }
  
  // Si no está autenticado, devolver 401
  return res.status(401).json({
    message: "Authentication required"
  });
};

// Obtener información del admin original si existe en la sesión
export const getOriginalAdminInfo = (req: any) => {
  if (req.session && req.session.originalAdmin) {
    return req.session.originalAdmin;
  }
  return null;
};

/**
 * Función auxiliar para extraer los datos de usuario desde la base de datos
 * y devolver un objeto usuario sin la contraseña
 */
export async function getUserDataSafely(userId: number) {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;
    
    // Crear una copia sin la contraseña
    const { password, ...safeUser } = user;
    return safeUser;
  } catch (error) {
    console.error("Error obteniendo datos de usuario:", error);
    return null;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'financial-app-secret-key',
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: { 
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
      httpOnly: true,
      sameSite: 'lax', // Cambiado de 'none' a 'lax' para evitar problemas
      path: '/',
      domain: undefined // Permite que la cookie funcione en cualquier subdominio
    },
    name: 'financial-app.sid'
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Middleware que se ejecuta después de la autenticación
  // para guardar el ID de usuario en la sesión
  app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user) {
      req.session.userId = (req.user as SelectUser).id;
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Comprobar si el usuario está iniciando sesión con correo electrónico
        const isEmail = username.includes('@');
        
        // Buscar usuario según sea nombre de usuario o correo electrónico
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        
        if (!user) {
          return done(null, false);
        }
        
        // Verificación unificada de contraseñas
        try {
          const passwordMatches = await comparePasswords(password, user.password);
          if (!passwordMatches) {
            return done(null, false);
          }
        } catch (error) {
          console.error("Error al verificar contraseña:", error);
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }

      // Validar el tipo de negocio
      const businessType = req.body.businessType || "autonomo";
      if (businessType !== "autonomo" && businessType !== "empresa") {
        return res.status(400).json({ message: "Tipo de negocio no válido" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        businessType,
        password: hashedPassword,
      });
      
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
        
        console.log(`Datos predeterminados creados para el usuario ${user.id} en el registro`);
      } catch (initError) {
        // Si falla la creación de datos predeterminados, lo registramos pero no fallamos la creación del usuario
        console.error("Error al crear datos predeterminados:", initError);
      }

      // Omitir la contraseña en la respuesta
      const { password, ...userWithoutPassword } = user;

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    console.log("Procesando solicitud de inicio de sesión para:", req.body.username);
    
    try {
      // Comprobar si es un email o un nombre de usuario
      const isEmail = req.body.username.includes('@');
      
      // Usar SQL directo para buscar por username o email
      let result;
      if (isEmail) {
        console.log("Detectado inicio de sesión con email:", req.body.username);
        result = await sql`
          SELECT * FROM users WHERE email = ${req.body.username}
        `;
      } else {
        console.log("Detectado inicio de sesión con username:", req.body.username);
        result = await sql`
          SELECT * FROM users WHERE username = ${req.body.username}
        `;
      }
      
      console.log("Resultado de búsqueda de usuario:", result.length > 0 ? "Usuario encontrado" : "Usuario no encontrado");
      
      if (result.length === 0) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      const user = result[0];
      
      // Verificar contraseña
      let passwordMatches = false;
      
      try {
        // Usamos la función unificada de comparación de contraseñas que soporta múltiples formatos
        passwordMatches = await comparePasswords(req.body.password, user.password);
        console.log("Verificación de contraseña completada");
      } catch (error) {
        console.error("Error en verificación de contraseña:", error);
        passwordMatches = false;
      }
      
      if (!passwordMatches) {
        console.log("Contraseña incorrecta para:", req.body.username);
        return res.status(401).json({ message: "Credenciales inválidas" });
      }
      
      console.log("Usuario autenticado correctamente:", user.username);
      
      // Crear un objeto de usuario compatible con el esquema
      const completeUser = {
        id: user.id,
        username: user.username,
        password: user.password,
        name: user.name,
        email: user.email,
        role: user.role || 'user',
        businessType: user.business_type || null,
        profileImage: user.profile_image || null,
        resetToken: user.reset_token || null,
        resetTokenExpiry: user.reset_token_expiry || null,
        securityQuestion: user.security_question || null,
        securityAnswer: user.security_answer || null
      };
      
      req.login(completeUser, async (err: any) => {
        if (err) {
          console.error("Error en login:", err);
          return next(err);
        }
        
        // Mejorar la sesión con datos adicionales de respaldo
        try {
          // Precargamos el módulo de sesión para no tener problemas con imports asíncronos
          const sessionHelper = await import('./session-helper.js');
          sessionHelper.enhanceUserSession(req, completeUser);
          
          // Guardamos la sesión explícitamente para asegurar que se almacene
          if (req.session) {
            await new Promise<void>((resolve, reject) => {
              req.session.save((saveErr) => {
                if (saveErr) {
                  console.error("Error al guardar la sesión:", saveErr);
                  reject(saveErr);
                } else {
                  console.log("Sesión guardada correctamente");
                  resolve();
                }
              });
            });
          }
          
          console.log("Sesión mejorada para el usuario:", completeUser.username);
        } catch (sessionError) {
          console.error("Error al mejorar la sesión:", sessionError);
          // Continuar a pesar del error en la mejora de sesión
        }
        
        // Omitir la contraseña en la respuesta
        const { password, ...userWithoutPassword } = completeUser;
        
        console.log("Login completo, enviando respuesta");
        return res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error en proceso de login:", error);
      return next(error);
    }
  });

  app.post("/api/logout", async (req, res, next) => {
    console.log("Procesando solicitud de cierre de sesión");
    
    // Limpiar la sesión mejorada si está disponible
    try {
      const sessionHelper = await import('./session-helper.js');
      sessionHelper.clearEnhancedSession(req);
      console.log("Datos adicionales de sesión limpiados");
    } catch (sessionError) {
      console.error("Error al limpiar la sesión mejorada:", sessionError);
      // Continuar a pesar del error
    }
    
    // Proceder con el logout estándar de passport
    return new Promise<void>((resolve) => {
      req.logout((err) => {
        if (err) {
          console.error("Error durante el logout de passport:", err);
          next(err);
          return resolve();
        }
        
        // Destruir la sesión completamente si es posible
        if (req.session) {
          req.session.destroy((sessionErr) => {
            if (sessionErr) {
              console.error("Error al destruir la sesión:", sessionErr);
            } else {
              console.log("Sesión destruida completamente");
            }
            res.sendStatus(200);
            return resolve();
          });
        } else {
          res.sendStatus(200);
          return resolve();
        }
      });
    });
  });

  // Nueva ruta para obtener información completa de la sesión (usuario y admin original)
  app.get("/api/auth/session", async (req, res) => {
    console.log("Recibida petición a /api/auth/session en auth.ts");
    
    try {
      // Verificamos si el usuario está autenticado
      const isAuthenticated = req.isAuthenticated() || (req.session && req.session.userId);
      if (!isAuthenticated) {
        return res.status(200).json({
          authenticated: false,
          user: null,
          originalAdmin: null
        });
      }
      
      // Obtenemos el ID del usuario actual
      const userId = req.user?.id || req.session.userId;
      if (!userId) {
        return res.status(200).json({
          authenticated: false,
          user: null,
          originalAdmin: null
        });
      }
      
      // Obtenemos los datos del usuario sin la contraseña
      const user = await getUserDataSafely(userId);
      
      // Obtenemos la información del admin original si existe
      const originalAdmin = getOriginalAdminInfo(req);
      
      return res.status(200).json({
        authenticated: true,
        user,
        originalAdmin
      });
    } catch (error) {
      console.error("Error en /api/auth/session:", error);
      return res.status(500).json({
        authenticated: false,
        error: "Error interno al obtener información de sesión"
      });
    }
  });

  app.get("/api/user", async (req, res) => {
    console.log("Recibida petición a /api/user en auth.ts");
    
    // 1. Verificar si el usuario está autenticado mediante passport
    if (req.isAuthenticated()) {
      console.log("Usuario autenticado vía passport");
      const { password, ...userWithoutPassword } = req.user as SelectUser;
      return res.status(200).json(userWithoutPassword);
    }
    
    // 2. Verificar si hay userId en la sesión
    if (req.session && req.session.userId) {
      try {
        console.log("Usuario tiene userId en sesión:", req.session.userId);
        
        // Usar SQL directo en lugar del método getUser de storage
        const result = await sql`
          SELECT * FROM users WHERE id = ${req.session.userId}
        `;
        
        if (result.length > 0) {
          const user = result[0];
          
          // Crear un objeto de usuario compatible con el esquema
          const completeUser = {
            id: user.id,
            username: user.username,
            password: user.password,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            businessType: user.business_type || null,
            profileImage: user.profile_image || null,
            resetToken: user.reset_token || null,
            resetTokenExpiry: user.reset_token_expiry || null,
            securityQuestion: user.security_question || null,
            securityAnswer: user.security_answer || null
          };
          
          const { password, ...userWithoutPassword } = completeUser;
          return res.status(200).json(userWithoutPassword);
        }
      } catch (error) {
        console.error("Error getting user from userId:", error);
      }
    }
    
    // 3. Verificar si hay un userId en el header
    const userId = req.headers['x-user-id'] || req.query.userId;
    if (userId) {
      try {
        console.log("Intentando autenticar con userId en header/query:", userId);
        // Convertir a número
        const userIdNum = Number(userId);
        if (isNaN(userIdNum)) {
          console.log("El userId no es un número válido:", userId);
          // Continuar con el siguiente método de autenticación
        } else {
          const result = await sql`SELECT * FROM users WHERE id = ${userIdNum}`;
          
          if (result.length > 0) {
            const user = result[0];
            
            // Crear un objeto de usuario compatible con el esquema
            const completeUser = {
              id: user.id,
              username: user.username,
              password: user.password,
              name: user.name,
              email: user.email,
              role: user.role || 'user',
              businessType: user.business_type || null,
              profileImage: user.profile_image || null,
              resetToken: user.reset_token || null,
              resetTokenExpiry: user.reset_token_expiry || null,
              securityQuestion: user.security_question || null,
              securityAnswer: user.security_answer || null
            };
            
            // Guardar el userId en la sesión para futuras solicitudes
            if (req.session) {
              req.session.userId = completeUser.id;
              await new Promise<void>((resolve) => {
                req.session.save(() => resolve());
              });
            }
            
            const { password, ...userWithoutPassword } = completeUser;
            return res.status(200).json(userWithoutPassword);
          }
        }
      } catch (error) {
        console.error("Error verificando userId de header:", error);
      }
    }
    
    // 4. Verificar cookie como último recurso
    const usernameCookie = req.cookies && req.cookies.username;
    if (usernameCookie) {
      try {
        console.log("Intentando autenticar con username de cookie:", usernameCookie);
        const result = await sql`SELECT * FROM users WHERE username = ${usernameCookie}`;
        
        if (result.length > 0) {
          const user = result[0];
          
          // Crear un objeto de usuario compatible con el esquema
          const completeUser = {
            id: user.id,
            username: user.username,
            password: user.password,
            name: user.name,
            email: user.email,
            role: user.role || 'user',
            businessType: user.business_type || null,
            profileImage: user.profile_image || null,
            resetToken: user.reset_token || null,
            resetTokenExpiry: user.reset_token_expiry || null,
            securityQuestion: user.security_question || null,
            securityAnswer: user.security_answer || null
          };
          
          // Guardar el userId en la sesión para futuras solicitudes
          if (req.session) {
            req.session.userId = completeUser.id;
            await new Promise<void>((resolve) => {
              req.session.save(() => resolve());
            });
          }
          
          const { password, ...userWithoutPassword } = completeUser;
          return res.status(200).json(userWithoutPassword);
        }
      } catch (error) {
        console.error("Error verificando username de cookie:", error);
      }
    }
    
    // MULTIUSUARIO: No usamos la autenticación automática con usuario demo 
    // para permitir que cada usuario tenga su propia sesión
    
    // Informamos al cliente que no está autenticado para que muestre el formulario de login
    return res.status(401).json({
      message: "No autenticado. Por favor inicie sesión con sus credenciales.",
      authenticated: false
    });
    
    // Si ninguna de las comprobaciones anteriores tuvo éxito, no está autenticado
    console.log("Usuario no autenticado ni por passport ni por userId en sesión");
    return res.status(401).json({
      message: "Not authenticated"
    });
  });
}