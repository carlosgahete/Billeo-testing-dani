// Configuración de opciones y middlewares para el servidor

import express from 'express';

export function configureOptionsRoutes(app: express.Express) {
  // Middleware para CORS en todas las rutas
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    // Para solicitudes OPTIONS, responder inmediatamente con OK
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
  // Middleware para manejar errores de JSON parsing
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('Error de sintaxis JSON:', err);
      return res.status(400).json({ 
        success: false, 
        error: 'JSON inválido en la solicitud' 
      });
    }
    next(err);
  });
}