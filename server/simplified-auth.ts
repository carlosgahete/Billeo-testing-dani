import { Request, Response, NextFunction } from 'express';

// Middleware simplificado para autenticación, diseñado para endpoints que necesitan
// acceso consistente incluso cuando hay problemas de autenticación
export const simplifiedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Si ya está autenticado con session.userId, permitir
    if (req.session && req.session.userId) {
      console.log("Acceso permitido - Usuario autenticado vía userId en sesión:", req.session.userId);
      return next();
    }
    
    // Para desarrollo, usar siempre usuario demo
    if (process.env.NODE_ENV !== 'production') {
      // Forzar autenticación con usuario demo (ID 1)
      if (req.session) {
        req.session.userId = 1;
      }
      console.log("Usuario autenticado vía bypass de desarrollo (usuario demo)");
      return next();
    }
    
    // En producción, validar autenticación
    return res.status(401).json({ message: "Authentication required" });
  } catch (error) {
    console.error("Error en middleware simplifiedAuth:", error);
    return res.status(500).json({ message: "Error interno en autenticación" });
  }
};