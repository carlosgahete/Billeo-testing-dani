import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes-optimized";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware
app.use(session({
  secret: 'financial-app-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using https
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  },
  name: 'financial-app.sid'
}));

// Middleware para logging simplificado - evitamos capturar toda la respuesta
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("Iniciando servidor con configuración optimizada...");
  
  // Establecer límite de tiempo para inicialización
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Tiempo de inicialización agotado")), 15000);
  });

  try {
    // Iniciar con límite de tiempo
    const serverPromise = registerRoutes(app);
    const server = await Promise.race([serverPromise, timeoutPromise]);

    // Configuración básica de manejo de errores
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Vite setup
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar en puerto 5000
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Servidor optimizado escuchando en puerto ${port}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
})();