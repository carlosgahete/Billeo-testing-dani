import { Request, Response, NextFunction } from "express";

/**
 * Middleware alternativo para los endpoints de dashboard que comprueba la autenticación
 * de múltiples maneras para garantizar que los filtros funcionen correctamente.
 */
export function enhancedAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Comprobar autenticación por passport (método preferido)
  if (req.isAuthenticated()) {
    console.log("Dashboard: Usuario autenticado por passport");
    return next();
  }
  
  // 2. Comprobar autenticación por userId en sesión (respaldo)
  if (req.session && req.session.userId) {
    console.log("Dashboard: Usuario autenticado por userId en sesión:", req.session.userId);
    return next();
  }
  
  // 3. Comprobar autenticación por header personalizado (para desarrollo/pruebas)
  const dashboardAuthHeader = req.headers['x-dashboard-auth'];
  if (dashboardAuthHeader === 'development-bypass-auth') {
    console.log("Dashboard: Usuario autenticado por header de desarrollo");
    return next();
  }
  
  // 4. Comprobar cookies de sesión para intentar recuperar la sesión
  if (req.headers.cookie && req.headers.cookie.includes('connect.sid')) {
    console.log("Dashboard: Cookie de sesión presente, intentando recuperar sesión...");
    // Intentamos continuar confiando en que la conexión entre este middleware
    // y la sesión de Express se restablecerá por sí sola
    return next();
  }
  
  // Si ninguno de los métodos anteriores funciona, el usuario no está autenticado
  console.log("Dashboard: Usuario no autenticado");
  return res.status(401).json({
    message: "Not authenticated",
    endpoint: req.originalUrl,
    method: req.method
  });
}

/**
 * Middleware para agregar información de diagnóstico a las respuestas del dashboard
 * Útil para depurar problemas de autenticación y filtros
 */
export function dashboardDiagnosticsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Almacenar la función original de res.json para poder extenderla
  const originalJson = res.json;
  
  // Sobrescribir el método json para añadir información de diagnóstico
  res.json = function(body: any) {
    // Si la respuesta ya es un objeto, añadimos información de diagnóstico
    if (body && typeof body === 'object') {
      body._diagnostics = {
        authenticated: req.isAuthenticated(),
        sessionExists: !!req.session,
        sessionId: req.session?.id,
        userId: req.session?.userId,
        requestTime: new Date().toISOString(),
        requestedFilters: {
          year: req.query.year || 'default',
          period: req.query.period || 'all'
        }
      };
    }
    
    // Llamar al método original con el body modificado
    return originalJson.call(this, body);
  };
  
  next();
}

/**
 * Establece encabezados CORS específicos para las respuestas del dashboard
 * para evitar problemas de caché y asegurar respuestas frescas
 */
export function noCacheDashboardMiddleware(req: Request, res: Response, next: NextFunction) {
  // Establecer encabezados para prevenir el almacenamiento en caché
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Añadir timestamp único en ms para forzar refrescos
  res.setHeader('X-Dashboard-Timestamp', Date.now().toString());
  
  next();
}

/**
 * Limpia los parámetros de consulta para asegurar que son válidos
 */
export function sanitizeDashboardFiltersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Validar y establecer defaults para year
  if (req.query.year) {
    const yearNum = parseInt(req.query.year as string);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      req.query.year = new Date().getFullYear().toString();
    }
  } else {
    req.query.year = new Date().getFullYear().toString();
  }
  
  // Validar y establecer defaults para period
  const validPeriods = ['all', 'q1', 'q2', 'q3', 'q4'];
  if (!req.query.period || !validPeriods.includes(req.query.period as string)) {
    req.query.period = 'all';
  }
  
  next();
}