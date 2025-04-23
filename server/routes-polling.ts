import { Request, Response } from 'express';
import { Express } from 'express';
import { sql } from './db';

/**
 * Registra las rutas relacionadas con el polling para actualizaciones del dashboard
 * Implementación simplificada que siempre permite acceso en entorno de desarrollo
 */
export function registerPollingRoutes(app: Express) {
  console.log("🔄 Registrando rutas de polling para el dashboard");
  
  /**
   * Endpoint para consultar el estado del dashboard (polling)
   * Siempre permite acceso usando el usuario de demostración (ID 1)
   */
  app.get("/api/polling/dashboard-status", async (req: Request, res: Response) => {
    console.log("📊 Solicitud recibida en /api/polling/dashboard-status");
    
    // SIEMPRE usar el usuario demo (1) para simplificar
    const userId = 1;
    
    try {
      // Consulta SQL directa usando sql de postgres-js
      const result = await sql`
        SELECT * FROM dashboard_state 
        WHERE user_id = ${userId}
        LIMIT 1
      `;
      
      // Verificar si tenemos resultado
      if (!result || result.length === 0) {
        console.log('🆕 No se encontró estado del dashboard para usuario demo, creando uno inicial');
        
        // Crear estado inicial
        const createResult = await sql`
          INSERT INTO dashboard_state (user_id, last_event_type) 
          VALUES (${userId}, 'initial')
          RETURNING *
        `;
        
        if (!createResult || createResult.length === 0) {
          throw new Error("Error al crear estado inicial");
        }
        
        const initialState = createResult[0];
        
        return res.status(200).json({
          updated_at: new Date(initialState.updated_at).getTime(),
          lastEvent: initialState.last_event_type,
          message: "Estado inicial creado"
        });
      }
      
      // Extraer el estado encontrado
      const state = result[0];
      console.log('✅ Estado del dashboard encontrado:', state.last_event_type);
      
      // Devolver estado actual
      return res.status(200).json({
        updated_at: new Date(state.updated_at).getTime(),
        lastEvent: state.last_event_type
      });
      
    } catch (error) {
      console.error('❌ Error en polling del dashboard:', error);
      
      // Siempre devolver una respuesta para no romper el cliente
      return res.status(200).json({
        updated_at: Date.now(),
        lastEvent: 'error-recovery',
        error: (error instanceof Error) ? error.message : 'Error desconocido'
      });
    }
  });
  
  /**
   * Endpoint para actualizar manualmente el estado del dashboard
   * Útil para pruebas o cuando se fuerza una actualización
   */
  app.post("/api/polling/update-dashboard", async (req: Request, res: Response) => {
    try {
      const eventType = req.body.eventType || 'manual-update';
      const userId = 1; // Siempre usar el usuario demo
      
      // Actualizar el estado del dashboard usando sql de postgres-js
      const updateResult = await sql`
        UPDATE dashboard_state 
        SET last_event_type = ${eventType}, updated_at = NOW() 
        WHERE user_id = ${userId} 
        RETURNING *
      `;
      
      if (!updateResult || updateResult.length === 0) {
        throw new Error("No se pudo actualizar el estado del dashboard");
      }
      
      const updatedState = updateResult[0];
      
      return res.status(200).json({
        updated_at: new Date(updatedState.updated_at).getTime(),
        lastEvent: updatedState.last_event_type,
        message: "Estado actualizado con éxito"
      });
      
    } catch (error) {
      console.error('❌ Error al actualizar estado del dashboard:', error);
      return res.status(500).json({
        message: "Error actualizando estado",
        error: (error instanceof Error) ? error.message : 'Error desconocido'
      });
    }
  });
}