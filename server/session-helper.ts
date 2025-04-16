/**
 * Utilidades para mejorar el manejo de sesiones
 */

import { Request } from 'express';
import { users } from '../shared/schema';

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
    
    console.log("Datos adicionales de sesión eliminados");
  }
}