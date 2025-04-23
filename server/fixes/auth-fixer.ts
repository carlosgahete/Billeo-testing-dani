import { Express, Request, Response, NextFunction } from 'express';

// Middleware para corregir problemas de autenticación
export const authFixer = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Si ya está autenticado con session.userId, permitir
    if (req.session && req.session.userId) {
      return next();
    }
    
    // Para desarrollo, usar siempre usuario demo
    if (process.env.NODE_ENV !== 'production') {
      // Forzar autenticación con usuario demo (ID 1)
      if (req.session) {
        req.session.userId = 1;
        console.log("🔐 Autenticación forzada con usuario demo para:", req.path);
      }
      return next();
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
    '/api/stats/dashboard'
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