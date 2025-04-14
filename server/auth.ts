import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
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

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'financial-app-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: { 
      secure: false, // Set to true if using https
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
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
        
        // Si la contraseña no tiene formato hashPassword.salt (usuario antiguo)
        if (!user.password.includes('.')) {
          if (user.password !== password) {
            return done(null, false);
          }
          
          // Actualizar a formato seguro para próximas autenticaciones
          const hashedPassword = await hashPassword(password);
          await storage.updateUserProfile(user.id, { password: hashedPassword });
          return done(null, user);
        }
        
        // Contraseña en formato seguro
        if (!(await comparePasswords(password, user.password))) {
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

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Credenciales inválidas" });
      
      req.login(user, (err: any) => {
        if (err) return next(err);
        
        // Omitir la contraseña en la respuesta
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    console.log("Recibida petición a /api/user en auth.ts");
    
    // Verificar si el usuario está autenticado mediante passport
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as SelectUser;
      return res.status(200).json(userWithoutPassword);
    }
    
    // Si no está autenticado por passport, verificar si hay userId en la sesión
    if (req.session && req.session.userId) {
      try {
        console.log("Usuario no autenticado por passport, pero tiene userId en sesión:", req.session.userId);
        const user = await storage.getUser(req.session.userId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return res.status(200).json(userWithoutPassword);
        }
      } catch (error) {
        console.error("Error getting user from userId:", error);
      }
    }
    
    // Si ninguna de las comprobaciones anteriores tuvo éxito, no está autenticado
    console.log("Usuario no autenticado ni por passport ni por userId en sesión");
    return res.status(401).json({
      message: "Not authenticated"
    });
  });
}