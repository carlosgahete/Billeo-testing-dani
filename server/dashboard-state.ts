import { eq } from "drizzle-orm";
import { db } from "./db";
import { dashboardEvents, dashboardState } from "../shared/schema";

/**
 * Función para actualizar el estado del dashboard de un usuario
 * Esta función reemplaza a la antigua función notifyDashboardUpdate de WebSockets
 * Usa una única fila por usuario para mayor eficiencia
 * @param type - Tipo de evento (invoice-created, transaction-updated, etc.)
 * @param data - Datos adicionales relacionados con el evento (no se almacena)
 * @param userId - ID del usuario que realizó la acción
 */
export async function updateDashboardState(type: string, data: any = null, userId: number | undefined) {
  // Imprimir información de diagnóstico
  console.log(`🔄 LLAMADA A updateDashboardState:`);
  console.log(`🔑 userId: ${userId} (tipo: ${typeof userId})`);
  console.log(`📝 type: ${type}`);
  console.log(`📦 data:`, JSON.stringify(data));
  
  // Verificar que userId sea un número válido
  if (userId === undefined || userId === null) {
    console.error('❌ updateDashboardState: userId es undefined/null, se requiere un ID de usuario válido');
    return;
  }
  
  // Convertir userId a número si es string
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  // Si no es un número válido después de la conversión, abortamos
  if (isNaN(userIdNum)) {
    console.error(`❌ updateDashboardState: userId inválido (${userId})`);
    return;
  }
  
  try {
    // Generar timestamp exacto para la actualización (con precisión de milisegundos)
    const now = new Date();
    console.log(`⏱️ Timestamp generado para actualización: ${now.toISOString()} (${now.getTime()})`);
    
    // Comprobar si ya existe un registro para este usuario
    const [existing] = await db.select()
      .from(dashboardState)
      .where(eq(dashboardState.userId, userIdNum));
    
    console.log(`🔍 Registro actual: ${existing ? JSON.stringify(existing) : 'No existe'}`);
    
    if (existing) {
      console.log(`⏱️ Actualizando con nueva fecha: ${now.toISOString()}`);
      
      // Actualizar el registro existente con fecha explícita (FORZANDO)
      const updateResult = await db.update(dashboardState)
        .set({
          lastEventType: type,
          updatedAt: now
        })
        .where(eq(dashboardState.userId, userIdNum))
        .returning();
      
      console.log(`🔄 Resultado de la actualización:`, updateResult);
      
      // Verificar que se haya actualizado
      const [afterUpdate] = await db.select()
        .from(dashboardState)
        .where(eq(dashboardState.userId, userIdNum));
      
      if (afterUpdate) {
        console.log(`✅ Estado después de actualizar: ${JSON.stringify(afterUpdate)}`);
        
        // Verificación adicional del timestamp
        const oldTimestamp = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const newTimestamp = new Date(afterUpdate.updatedAt).getTime();
        
        if (oldTimestamp === newTimestamp) {
          console.warn(`⚠️ ¡ADVERTENCIA! El timestamp no cambió después de la actualización`);
          
          // Intento alternativo con SQL directo
          try {
            console.log(`🔧 Intentando actualización alternativa con SQL directo`);
            await db.execute(`
              UPDATE dashboard_state 
              SET last_event_type = $1, updated_at = $2
              WHERE user_id = $3
            `, [type, now, userIdNum]);
            
            const [afterDirectUpdate] = await db.select()
              .from(dashboardState)
              .where(eq(dashboardState.userId, userIdNum));
              
            console.log(`✅ Estado después de actualización directa: ${JSON.stringify(afterDirectUpdate)}`);
          } catch (sqlError) {
            console.error(`❌ Error con actualización SQL directa:`, sqlError);
          }
        } else {
          console.log(`✅ Timestamp actualizado correctamente: ${oldTimestamp} -> ${newTimestamp}`);
        }
      }
    } else {
      // Crear un nuevo registro
      console.log(`📝 Creando nuevo registro de estado para usuario ${userIdNum}`);
      const insertResult = await db.insert(dashboardState).values({
        userId: userIdNum,
        lastEventType: type,
        updatedAt: now  // Explícitamente definimos el timestamp
      }).returning();
      
      console.log(`✅ Registro creado:`, insertResult);
    }
    
    // Aún registramos el evento completo para historial (opcional)
    await db.insert(dashboardEvents).values({
      type,
      data,
      userId: userIdNum,
      updatedAt: now // Mismo timestamp para consistencia
    });
    
    console.log(`✅ Estado del dashboard actualizado: ${type} para usuario ${userIdNum} con timestamp ${now.toISOString()}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al actualizar estado del dashboard:`, error);
    return false;
  }
}

// Hacer la función disponible globalmente
global.updateDashboardState = updateDashboardState;
global.registerDashboardEvent = updateDashboardState; // Alias para compatibilidad

// Ampliar la declaración global
declare global {
  var updateDashboardState: (type: string, data?: any, userId?: number | undefined) => Promise<boolean | undefined>;
  var registerDashboardEvent: (type: string, data?: any, userId?: number | undefined) => Promise<boolean | undefined>;
}