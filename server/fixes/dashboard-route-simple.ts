import { Request, Response } from "express";
import { sql } from '../db';

/**
 * Endpoint para la consulta de estado del dashboard
 * Implementación simplificada con prioridad en acceso permisivo
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
    
    // Consulta SQL directa para evitar problemas con drizzle
    const stateResult = await sql`
      SELECT * FROM dashboard_state 
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    
    const state = stateResult && stateResult.length > 0 ? stateResult[0] : null;
    
    // Si no existe estado, crear uno nuevo
    if (!state) {
      console.log('🆕 Creando estado inicial del dashboard para usuario:', userId);
      
      // Crear nuevo registro de estado
      const newState = await sql`
        INSERT INTO dashboard_state (user_id, last_event_type)
        VALUES (${userId}, 'initial')
        RETURNING *
      `;
      
      const initialState = newState && newState.length > 0 ? newState[0] : null;
      
      if (!initialState) {
        throw new Error("Error creando estado inicial del dashboard");
      }
      
      return res.status(200).json({
        updated_at: new Date(initialState.updated_at).getTime(),
        lastEvent: initialState.last_event_type,
        message: "Estado inicial creado"
      });
    }
    
    // Devolver estado actual
    console.log('✅ Estado del dashboard recuperado:', {
      userId: state.user_id,
      lastEventType: state.last_event_type,
      updatedAt: state.updated_at
    });
    
    return res.status(200).json({
      updated_at: new Date(state.updated_at).getTime(),
      lastEvent: state.last_event_type
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estado del dashboard:', error);
    return res.status(500).json({ 
      message: "Error interno del servidor", 
      error: (error as Error).message 
    });
  }
}