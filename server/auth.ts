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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
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
    } else if (req.session.userId) {
      // Si el usuario no está autenticado vía passport pero tiene un ID en la sesión
      // intentamos recuperar el usuario para mantener la sesión activa
      storage.getUser(req.session.userId)
        .then(user => {
          if (user) {
            req.login(user, (err) => {
              if (err) console.error("Error al restaurar sesión:", err);
              next();
            });
          } else {
            // Si no se encuentra el usuario, limpiamos la sesión
            delete req.session.userId;
            next();
          }
        })
        .catch(err => {
          console.error("Error al recuperar usuario de sesión:", err);
          next();
        });
    } else {
      next();
    }
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
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

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

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
    // Verificamos si el usuario está autenticado por passport
    // O si tiene un ID de usuario en la sesión
    if (!req.isAuthenticated() && !req.session.userId) {
      return res.sendStatus(401);
    }
    
    try {
      // Si no tenemos un usuario de passport pero sí tenemos ID en la sesión
      if (!req.user && req.session.userId) {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
          delete req.session.userId;
          return res.sendStatus(401);
        }
        
        // Omitir la contraseña en la respuesta
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }
      
      // Usuario autenticado normalmente vía passport
      const { password, ...userWithoutPassword } = req.user as SelectUser;
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error al obtener usuario:", error);
      return res.sendStatus(500);
    }
  });
}