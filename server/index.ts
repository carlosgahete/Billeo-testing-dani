import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import { registerRoutes } from "./routes";
import { configureBetterExpenseRoutes } from "./routes-expenses-basic";
import { configureDirectExpenseRoutes } from "./routes-direct-expenses";
import { configureOptionsRoutes } from "./routes-options";
import { configureSimpleExpensesRoutes } from "./routes-simple-expenses";
import { configureExpensesRoutes } from "./routes-expenses";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
// Aumentar el límite de tamaño para permitir PDFs más grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Configure session middleware con la configuración optimizada
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Intentar inicializar el servicio de correo electrónico, pero no bloquear si falla
  try {
    const { initEmailService } = await import('./services/emailService');
    await initEmailService();
    console.log('Servicio de email inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar el servicio de email, continuando sin él:', error);
  }
  
  // Configurar middleware para CORS y opciones comunes
  configureOptionsRoutes(app);
  
  // Ruta HTML pura para presupuestos - acceso directo sin autenticación
  app.get('/mobile-quotes', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/quotes-standalone.html'));
  });

  const server = await registerRoutes(app);
  
  // Configurar las rutas para gastos básicos
  configureBetterExpenseRoutes(app);
  
  // Configurar las rutas directas para gastos (sin validaciones)
  configureDirectExpenseRoutes(app);
  
  // Configurar rutas ultra simples para gastos (mínimas validaciones)
  configureSimpleExpensesRoutes(app);
  
  // Configurar ruta principal para el nuevo formulario de gastos con FormData
  configureExpensesRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
