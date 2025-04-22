/**
 * Utilidades para mejorar el manejo de sesiones
 */

import { Request } from 'express';
import { users } from '../shared/schema';
import 'express-session';

// Extender la declaración de SessionData para incluir nuestras propiedades personalizadas
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userRole: string;
    userName: string;
    loginTime: number;
    sessionEnhanced: boolean;
    userDetails: {
      id: number;
      username: string;
      name: string;
      email: string;
      role: string;
      businessType: string | null;
      lastAccess: string;
    };
  }
}

// Definir un tipo compatible con los usuarios de la aplicación
type SelectUser = typeof users.$inferSelect;

/**
 * Guarda datos adicionales en la sesión del usuario
 * Esta función actúa como un complemento del proceso de sesión integrado de Passport
 * para garantizar que se conserven datos importantes en la sesión
 */
export function enhanceUserSession(req: Request, user: SelectUser): void {
  if (req.session) {
    // Guardar el ID del usuario en la sesión como respaldo
    req.session.userId = user.id;
    
    // Guardar el rol del usuario para verificaciones rápidas sin necesidad de acceder a la base de datos
    req.session.userRole = user.role;
    
    // Guardar el nombre para personalización
    req.session.userName = user.name;
    
    // Timestamp para tracking
    req.session.loginTime = Date.now();
    
    // Marcador de estado de la sesión
    req.session.sessionEnhanced = true;
    
    // Añadir información más completa del usuario
    req.session.userDetails = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      businessType: user.businessType,
      lastAccess: new Date().toISOString()
    };
    
    // Guardar la sesión de forma explícita
    req.session.save((err) => {
      if (err) {
        console.error("Error al guardar la sesión mejorada:", err);
      } else {
        console.log("Sesión mejorada guardada correctamente");
      }
    });
    
    console.log("Datos adicionales guardados en la sesión del usuario:", {
      userId: req.session.userId,
      role: req.session.userRole,
      enhanced: req.session.sessionEnhanced
    });
  }
}

/**
 * Verifica si la sesión del usuario contiene información adicional
 */
export function hasEnhancedSession(req: Request): boolean {
  return !!(req.session && req.session.sessionEnhanced && req.session.userId);
}

/**
 * Limpia los datos adicionales de la sesión
 */
export function clearEnhancedSession(req: Request): void {
  if (req.session) {
    delete req.session.userId;
    delete req.session.userRole;
    delete req.session.userName;
    delete req.session.loginTime;
    delete req.session.sessionEnhanced;
    delete req.session.userDetails;
    
    // Guardar la sesión tras limpiarla
    req.session.save((err) => {
      if (err) {
        console.error("Error al guardar la sesión después de limpiarla:", err);
      }
    });
    
    console.log("Datos adicionales de sesión eliminados");
  }
}

/**
 * Recuperar la información del usuario desde la sesión
 * Útil cuando passport no está disponible o la sesión está parcialmente degradada
 */
export function getUserFromSession(req: Request): SelectUser | null {
  if (req.session && req.session.userDetails) {
    // Reconstruir un objeto de usuario básico a partir de los datos en sesión
    return {
      id: req.session.userDetails.id,
      username: req.session.userDetails.username,
      name: req.session.userDetails.name, 
      email: req.session.userDetails.email,
      role: req.session.userDetails.role,
      password: '[PROTECTED]', // Valor ficticio, nunca guardar contraseñas en sesión
      businessType: req.session.userDetails.businessType,
      profileImage: null,
      resetToken: null,
      resetTokenExpiry: null,
      securityQuestion: null,
      securityAnswer: null
    } as SelectUser;
  }
  
  // Si no hay datos de usuario en la sesión, pero hay un userId
  if (req.session && req.session.userId) {
    console.log("Hay userId en sesión pero no detalles completos:", req.session.userId);
    // Devolver un objeto básico solo con el ID
    return {
      id: req.session.userId,
      username: '',
      name: req.session.userName || '',
      email: '',
      role: req.session.userRole || 'user',
      password: '[PROTECTED]',
      businessType: null,
      profileImage: null,
      resetToken: null,
      resetTokenExpiry: null,
      securityQuestion: null,
      securityAnswer: null
    } as SelectUser;
  }
  
  return null;
}