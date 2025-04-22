import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';
import 'express-session';

// Extender el tipo Session para incluir el campo user
declare module 'express-session' {
  interface SessionData {
    user: User;
  }
}

// Middleware para verificar autenticación
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Verificar si el usuario está autenticado
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Añadir el usuario a la solicitud para acceso en rutas protegidas
  req.user = req.session.user;
  next();
};

// Middleware para roles de administrador
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Primero verificar autenticación
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Luego verificar rol de administrador
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'No tienes permisos de administrador' });
  }
  
  req.user = req.session.user;
  next();
};

// Extender tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}