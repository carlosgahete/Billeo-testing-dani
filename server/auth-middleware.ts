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
  // Verificar autenticación mediante passport
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Verificar autenticación mediante userId en sesión como respaldo
  if (req.session && req.session.userId) {
    console.log("Usuario autenticado mediante userId en sesión:", req.session.userId);
    return next();
  }
  
  // Si no está autenticado, devolver 401
  console.log("Autenticación fallida - No autenticado");
  return res.status(401).json({ message: 'Not authenticated' });
};

// Middleware para roles de administrador
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Primero verificar autenticación
  if (req.isAuthenticated()) {
    const user = req.user as User;
    if (user.role === 'admin') {
      return next();
    } else {
      return res.status(403).json({ message: 'No tienes permisos de administrador' });
    }
  }
  
  // Verificar mediante datos en sesión como respaldo
  if (req.session && req.session.userId && req.session.userRole === 'admin') {
    console.log("Admin autenticado mediante sesión:", req.session.userId);
    return next();
  }
  
  // Si no está autenticado, devolver 401
  if (!req.isAuthenticated() && (!req.session || !req.session.userId)) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Si está autenticado pero no es admin
  return res.status(403).json({ message: 'No tienes permisos de administrador' });
};

// Extender tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}