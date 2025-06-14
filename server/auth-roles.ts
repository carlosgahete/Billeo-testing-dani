import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { getOriginalAdminInfo } from './auth';

// Lista de usernames de superadmin
const SUPERADMIN_USERNAMES = ['admin', 'danielperla', 'perlancelot', 'billeo_admin', 'Superadmin'];

/**
 * Verifica si un usuario es superadmin basado en su rol o username
 */
export const isSuperAdmin = (user: any): boolean => {
  if (!user) return false;

  // Verificar por rol explícito
  if (user.role === 'superadmin' || user.role === 'SUPERADMIN') {
    return true;
  }
  
  // Verificar por username
  if (user.username && SUPERADMIN_USERNAMES.includes(user.username)) {
    return true;
  }

  return false;
};

/**
 * Verifica si un usuario tiene permisos de administrador considerando también
 * si está accediendo como cliente pero realmente es admin/superadmin
 */
export const hasAdminPrivileges = (req: Request): boolean => {
  // Verificar si el usuario actual es admin/superadmin
  if (req.user && isSuperAdmin(req.user)) {
    return true;
  }
  
  // Verificar si hay información de admin original en la sesión
  const originalAdmin = getOriginalAdminInfo(req);
  if (originalAdmin && originalAdmin.isSuperAdmin) {
    return true;
  }
  
  return false;
};

/**
 * Middleware general para verificar privilegios de administrador,
 * incluyendo cuando un admin ha iniciado sesión como otro usuario
 */
export const requireAdminPrivileges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar autenticación básica
    if (!req.session || (!req.session.userId && !req.user)) {
      return res.status(401).json({ message: 'No autenticado. Por favor inicie sesión.' });
    }
    
    // Verificar si hay información de admin original en la sesión
    const originalAdmin = getOriginalAdminInfo(req);
    if (originalAdmin && originalAdmin.isSuperAdmin) {
      console.log(`✅ Acceso permitido por privilegios originales: ${originalAdmin.username} (admin/superadmin) está viendo como cliente`);
      return next();
    }
    
    // Obtener el usuario actual si no está ya disponible
    let currentUser = req.user;
    if (!currentUser && req.session.userId) {
      currentUser = await storage.getUser(req.session.userId);
    }
    
    if (!currentUser) {
      return res.status(401).json({ message: 'No autenticado. Por favor inicie sesión.' });
    }
    
    // Verificar si el usuario actual es admin/superadmin
    if (isSuperAdmin(currentUser)) {
      console.log(`✅ Acceso permitido: ${currentUser.username} es admin/superadmin`);
      req.user = currentUser; // Asegurar que el usuario esté disponible
      return next();
    }
    
    // Si no es admin ni superadmin original, denegar acceso
    console.log(`❌ Acceso denegado: ${currentUser.username} no tiene privilegios administrativos`);
    return res.status(403).json({ 
      message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.'
    });
  } catch (error) {
    console.error('Error en middleware requireAdminPrivileges:', error);
    return res.status(500).json({ 
      message: 'Error interno al verificar permisos de administrador'
    });
  }
};

/**
 * Middleware para requerir rol de superadmin
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Primero verificar autenticación
    if (!req.session || (!req.session.userId && !req.user)) {
      return res.status(401).json({ message: 'No autenticado. Por favor inicie sesión.' });
    }
    
    // Verificar si hay información de admin original en la sesión
    const originalAdmin = getOriginalAdminInfo(req);
    if (originalAdmin && originalAdmin.isSuperAdmin) {
      console.log(`✅ Acceso permitido por privilegios originales: Admin original ${originalAdmin.username} es superadmin`);
      return next();
    }
    
    // Obtener el usuario actual
    let currentUser = req.user;
    
    // Si no está en req.user, intentar obtenerlo por ID de sesión
    if (!currentUser && req.session.userId) {
      currentUser = await storage.getUser(req.session.userId);
    }
    
    // Si no se puede obtener el usuario, no está autenticado
    if (!currentUser) {
      console.log('❌ Usuario no encontrado para verificación de superadmin');
      return res.status(401).json({ message: 'No autenticado. Por favor inicie sesión.' });
    }
    
    // Verificar si es superadmin
    if (!isSuperAdmin(currentUser)) {
      console.log(`❌ Acceso denegado: ${currentUser.username} no es superadmin`);
      return res.status(403).json({ 
        message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.'
      });
    }
    
    // Si es superadmin, continuar
    console.log(`✅ Acceso permitido: ${currentUser.username} es superadmin`);
    req.user = currentUser; // Asegurarse de que el usuario esté disponible en req
    next();
  } catch (error) {
    console.error('Error en middleware requireSuperAdmin:', error);
    return res.status(500).json({ 
      message: 'Error interno al verificar permisos de administrador'
    });
  }
};

/**
 * Middleware para verificar acceso a facturas
 * Los superadmins pueden editar cualquier factura
 * Los usuarios normales solo pueden editar sus propias facturas
 */
export const canEditInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar autenticación
    if (!req.session || (!req.session.userId && !req.user)) {
      return res.status(401).json({ message: 'No autenticado. Por favor inicie sesión.' });
    }
    
    // Verificar si hay información de admin original en la sesión
    const originalAdmin = getOriginalAdminInfo(req);
    if (originalAdmin && originalAdmin.isSuperAdmin) {
      console.log(`✅ Acceso permitido a factura por privilegios originales: Admin original ${originalAdmin.username} es superadmin`);
      return next();
    }
    
    // Obtener el ID de la factura
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ message: 'ID de factura inválido' });
    }
    
    // Obtener la factura
    const invoice = await storage.getInvoice(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }
    
    // Obtener el usuario actual
    let currentUser = req.user;
    if (!currentUser && req.session.userId) {
      currentUser = await storage.getUser(req.session.userId);
    }
    
    if (!currentUser) {
      return res.status(401).json({ message: 'No autenticado. Por favor inicie sesión.' });
    }
    
    // Si es superadmin, permitir acceso a cualquier factura
    if (isSuperAdmin(currentUser)) {
      console.log(`✅ Acceso permitido a factura ${invoiceId}: ${currentUser.username} es superadmin`);
      req.user = currentUser;
      return next();
    }
    
    // Si no es superadmin, verificar si la factura le pertenece
    if (invoice.userId !== currentUser.id) {
      console.log(`❌ Acceso denegado: ${currentUser.username} no puede editar factura ${invoiceId} (pertenece a usuario ${invoice.userId})`);
      return res.status(403).json({ 
        message: 'No tienes permiso para editar esta factura'
      });
    }
    
    // Si la factura pertenece al usuario, permitir acceso
    console.log(`✅ Acceso permitido a factura ${invoiceId}: Es el propietario`);
    req.user = currentUser;
    next();
  } catch (error) {
    console.error('Error en middleware canEditInvoice:', error);
    return res.status(500).json({ 
      message: 'Error interno al verificar permisos para editar factura'
    });
  }
};