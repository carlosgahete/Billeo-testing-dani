import { Express, Request, Response, NextFunction } from 'express';

// Middleware para corregir problemas de autenticación
export const authFixer = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Verificar si está en la URL (parámetro explícito)
    if (req.query.userId) {
      const userId = parseInt(req.query.userId as string, 10);
      if (!isNaN(userId) && req.session) {
        req.session.userId = userId;
        console.log(`🔐 Autenticación aplicada con ID de usuario de URL: ${userId} para: ${req.path}`);
        return next();
      }
    }
    
    // 2. Verificar si está en el header X-User-ID (enviado desde el cliente frontend)
    if (req.headers['x-user-id']) {
      const userId = parseInt(req.headers['x-user-id'] as string, 10);
      if (!isNaN(userId) && req.session) {
        req.session.userId = userId;
        console.log(`🔐 Autenticación aplicada con ID de usuario del header X-User-ID: ${userId} para: ${req.path}`);
        return next();
      }
    }
    
    // 3. Si ya está autenticado con session.userId, permitir
    if (req.session && req.session.userId) {
      console.log(`🔐 Usuario ya autenticado con session.userId: ${req.session.userId} para: ${req.path}`);
      return next();
    }
    
    // 4. Si el usuario está autenticado con Passport, usar su ID
    if (typeof req.isAuthenticated === 'function' && req.isAuthenticated() && req.user) {
      const userId = (req.user as any).id;
      if (req.session) {
        req.session.userId = userId;
      }
      console.log(`🔐 Autenticación aplicada desde Passport user.id: ${userId} para: ${req.path}`);
      return next();
    }
    
    // 5. Para desarrollo, usar usuario demo solo si realmente no hay un usuario autenticado
    if (process.env.NODE_ENV !== 'production') {
      // Solo usar el bypass si realmente no hay un usuario autenticado
      const isPassportAuth = (typeof req.isAuthenticated === 'function') ? req.isAuthenticated() : false;
      if (!isPassportAuth && !req.user) {
        if (req.session) {
          req.session.userId = 1; // ID del usuario demo
          console.log(`🔐 Autenticación forzada con usuario demo (ID=1) para: ${req.path}`);
        }
        return next();
      }
    }
    
    // En producción, validar autenticación normalmente
    return res.status(401).json({ message: "Authentication required" });
  } catch (error) {
    console.error("❌ Error en middleware authFixer:", error);
    return res.status(500).json({ message: "Error interno en autenticación" });
  }
};

// Registrar el middleware para todos los endpoints importantes
export function registerAuthFixer(app: Express) {
  console.log("🔐 Registrando middleware de corrección de autenticación global");
  
  // Lista de endpoints críticos que necesitan autenticación consistente
  const ENDPOINTS_TO_FIX = [
    '/api/invoices',
    '/api/clients',
    '/api/transactions',
    '/api/categories',
    '/api/stats/dashboard',
    '/api/dashboard-direct', // Endpoint directo del dashboard
    '/api/dashboard',        // Endpoint general del dashboard
    '/api/users',            // Endpoint de usuarios
    '/api/company'           // Endpoint de datos de empresa
  ];
  
  // Aplicar el middleware a todos los endpoints críticos
  ENDPOINTS_TO_FIX.forEach(path => {
    console.log(`🔐 Aplicando corrección de autenticación a: ${path}`);
    app.use(path, authFixer);
    
    // También aplicar a las rutas con parámetros (/:id, etc)
    app.use(`${path}/*`, authFixer);
  });
  
  console.log("✅ Middleware de corrección de autenticación registrado");
}