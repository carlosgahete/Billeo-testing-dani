// Cargar variables de entorno desde .env
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from "./routes";
import { configureBetterExpenseRoutes } from "./routes-expenses-basic";
import { configureDirectExpenseRoutes } from "./routes-direct-expenses";
import { configureOptionsRoutes } from "./routes-options";
import { configureSimpleExpensesRoutes } from "./routes-simple-expenses";
import { configureExpensesRoutes } from "./routes-expenses";
import { configureFileRoutes } from "./routes-files-new";
import { registerDashboardStateRoutes } from "./routes-dashboard-state";
import { updateDashboardState } from "./dashboard-state";
import { registerPollingRoutes } from "./routes-polling";
import { setupVite, serveStatic, log } from "./vite";

// Obtener el equivalente a __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Aumentar el límite de tamaño para permitir PDFs más grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Configure session middleware con la configuración optimizada y mayor tiempo de sesión
app.use(session({
  secret: 'financial-app-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using https
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en lugar de 24 horas
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
  // Aplicar fix de autenticación global
  try {
    const { registerAuthFixer } = await import('./fixes/auth-fixer');
    registerAuthFixer(app);
    console.log('🔐 Fix global de autenticación aplicado correctamente');
  } catch (error) {
    console.error('❌ Error al aplicar fix de autenticación:', error);
  }

  // Intentar inicializar el servicio de correo electrónico, pero no bloquear si falla
  try {
    const { initEmailService } = await import('./services/emailService');
    await initEmailService();
    console.log('Servicio de email inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar el servicio de email, continuando sin él:', error);
  }
  
  // Inicializar el servicio de alertas después del correo electrónico
  try {
    // Importar el servicio de alertas
    const { alertService, checkAndSendAlertsForAllUsers } = await import('./services/alertService');
    console.log('Servicio de alertas inicializado correctamente');
    
    // Configurar un programador para ejecutar las comprobaciones de alertas periódicamente
    // Este es un reemplazo simple para node-cron usando setInterval
    const ONE_HOUR = 60 * 60 * 1000; // 1 hora en milisegundos
    
    // Primera ejecución después de 5 minutos (para dar tiempo a que el sistema se inicialice completamente)
    setTimeout(async () => {
      console.log('Ejecutando primera comprobación de alertas programada...');
      try {
        const result = await checkAndSendAlertsForAllUsers();
        console.log(`Comprobación de alertas completada: ${result.alertsSent} alertas enviadas a ${result.processedUsers} usuarios`);
        if (result.errors.length > 0) {
          console.error(`Ocurrieron ${result.errors.length} errores durante la comprobación de alertas`);
        }
      } catch (error) {
        console.error('Error al ejecutar la comprobación de alertas programada:', error);
      }
      
      // Configurar ejecuciones periódicas (cada 1 hora)
      setInterval(async () => {
        console.log('Ejecutando comprobación de alertas programada...');
        try {
          const result = await checkAndSendAlertsForAllUsers();
          console.log(`Comprobación de alertas completada: ${result.alertsSent} alertas enviadas a ${result.processedUsers} usuarios`);
          if (result.errors.length > 0) {
            console.error(`Ocurrieron ${result.errors.length} errores durante la comprobación de alertas`);
          }
        } catch (error) {
          console.error('Error al ejecutar la comprobación de alertas programada:', error);
        }
      }, ONE_HOUR);
      
    }, 5 * 60 * 1000); // 5 minutos
    
  } catch (error) {
    console.error('Error al inicializar el servicio de alertas:', error);
  }
  
  // Configurar middleware para CORS y opciones comunes
  configureOptionsRoutes(app);
  
  // Registrar las rutas del nuevo estado del dashboard
  registerDashboardStateRoutes(app);
  console.log('Sistema de estado del dashboard mejorado registrado correctamente');
  
  // Registrar las rutas de polling (siempre permiten acceso)
  registerPollingRoutes(app);
  console.log('Sistema de polling del dashboard registrado correctamente');
  
  // Ruta HTML pura para presupuestos - acceso directo sin autenticación
  app.get('/mobile-quotes', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/quotes-standalone.html'));
  });
  
  // Ruta ultra-minimalista para presupuestos (diseño Apple)
  app.get('/super-light-quotes', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/public/quotes-super-light.html'));
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
  
  // Configurar rutas para gestión de archivos
  configureFileRoutes(app);
  
  // Añadir endpoint para pruebas de correo
  import('./test-email').then((module) => {
    app.use('/api/test-email', module.default);
    console.log('Rutas de prueba de correo configuradas');
  }).catch(err => {
    console.error('Error al cargar el módulo de prueba de correo:', err);
  });
  
  // Añadir el endpoint directa para el dashboard
  import('./dashboard-direct').then((module) => {
    module.registerDirectDashboardEndpoint(app);
    console.log('Endpoint directo para el dashboard (/api/dashboard-direct) configurado');
  }).catch(err => {
    console.error('Error al cargar el módulo de dashboard directo:', err);
  });

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
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
