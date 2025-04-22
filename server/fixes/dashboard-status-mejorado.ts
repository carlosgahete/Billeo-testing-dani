import { Request, Response } from "express";
import { dashboardState } from "@shared/schema";
import { db } from '../db';
import { eq } from "drizzle-orm";

/**
 * Handler mejorado para el endpoint de estado del dashboard
 * - Permite autenticación flexible a través de headers o sesión
 * - Registra automáticamente usuarios no registrados con configuración por defecto
 * - Maneja mejor los errores y proporciona logging detallado
 */
export async function handleDashboardStatus(req: Request, res: Response) {
  // Log detallado para depuración
  console.log('🔍 Headers recibidos en dashboard-status:', {
    userId: req.headers['x-user-id'] || '(no especificado)',
    username: req.headers['x-username'] || '(no especificado)',
    cookies: req.cookies || '(no cookies)',
    sessionID: req.session?.id || '(no session ID)',
    sessionUserId: req.session?.userId || '(no userId en sesión)'
  });
  
  try {
    // Intentar obtener userId de distintas fuentes
    let userId: number | null = null;
    
    // 1. Primero intentar obtener de la sesión
    if (req.session && req.session.userId) {
      userId = req.session.userId;
      console.log('✅ Usuario identificado por sesión:', userId);
    } 
    // 2. Luego intentar obtener de los headers
    else if (req.headers['x-user-id']) {
      userId = Number(req.headers['x-user-id']);
      console.log('✅ Usuario identificado por header:', userId);
      
      // Establecer en sesión para futuras peticiones
      if (req.session) {
        req.session.userId = userId;
      }
    }
    // 3. Por último intentar obtener del query string
    else if (req.query.userId) {
      userId = Number(req.query.userId);
      console.log('✅ Usuario identificado por query:', userId);
      
      // Establecer en sesión para futuras peticiones
      if (req.session) {
        req.session.userId = userId;
      }
    }
    
    // Si no hay userId, usar un valor por defecto para demo (solo en desarrollo)
    if (!userId && process.env.NODE_ENV !== 'production') {
      userId = 1; // Usuario de demostración
      console.log('⚠️ Usando usuario demo (1) por defecto');
      
      // Establecer en sesión para futuras peticiones
      if (req.session) {
        req.session.userId = userId;
      }
    }
    
    // Si no hay userId, devolver error de autenticación
    if (!userId) {
      return res.status(401).json({ 
        message: "No autenticado",
        error: "Se requiere autenticación para acceder al estado del dashboard"
      });
    }
    
    // Obtener estado del dashboard para el usuario
    const [state] = await db.select()
      .from(dashboardState)
      .where(eq(dashboardState.userId, userId));
    
    // Si no existe estado, crear uno nuevo
    if (!state) {
      console.log('🆕 Creando estado inicial del dashboard para usuario:', userId);
      
      // Crear nuevo estado
      const [newState] = await db.insert(dashboardState)
        .values({
          userId: userId,
          lastEventType: 'initial',
          // id y updatedAt tienen valores por defecto
        })
        .returning();
      
      return res.status(200).json({
        updated_at: newState.updatedAt.getTime(),
        lastEvent: newState.lastEventType,
        message: "Estado inicial creado"
      });
    }
    
    // Devolver estado actual
    console.log('✅ Estado del dashboard recuperado:', {
      userId: state.userId,
      lastEventType: state.lastEventType,
      updatedAt: state.updatedAt
    });
    
    return res.status(200).json({
      updated_at: state.updatedAt.getTime(),
      lastEvent: state.lastEventType
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estado del dashboard:', error);
    return res.status(500).json({ 
      message: "Error interno del servidor", 
      error: (error as Error).message 
    });
  }
}