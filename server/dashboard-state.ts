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
  if (userId === undefined) {
    console.error('❌ updateDashboardState: userId es undefined, se requiere un ID de usuario válido');
    return;
  }
  try {
    // Comprobar si ya existe un registro para este usuario
    const [existing] = await db.select()
      .from(dashboardState)
      .where(eq(dashboardState.userId, userId));
    
    console.log(`🔍 Registro actual: ${existing ? JSON.stringify(existing) : 'No existe'}`);
    
    if (existing) {
      const updatedAt = new Date();
      console.log(`⏱️ Actualizando con nueva fecha: ${updatedAt.toISOString()}`);
      
      // Actualizar el registro existente con fecha explícita
      await db.update(dashboardState)
        .set({
          lastEventType: type,
          updatedAt: updatedAt
        })
        .where(eq(dashboardState.userId, userId));
      
      // Verificar que se haya actualizado
      const [afterUpdate] = await db.select()
        .from(dashboardState)
        .where(eq(dashboardState.userId, userId));
      
      console.log(`✅ Estado después de actualizar: ${JSON.stringify(afterUpdate)}`);
    } else {
      // Crear un nuevo registro
      await db.insert(dashboardState).values({
        userId,
        lastEventType: type,
        // id y updatedAt tienen valores por defecto
      });
    }
    
    // Aún registramos el evento completo para historial (opcional)
    await db.insert(dashboardEvents).values({
      type,
      data,
      userId,
      updatedAt: new Date()
    });
    
    console.log(`Estado del dashboard actualizado: ${type} para usuario ${userId}`);
  } catch (error) {
    console.error(`Error al actualizar estado del dashboard:`, error);
  }
}

// Hacer la función disponible globalmente
global.updateDashboardState = updateDashboardState;
global.registerDashboardEvent = updateDashboardState; // Alias para compatibilidad

// Ampliar la declaración global
declare global {
  var updateDashboardState: (type: string, data?: any, userId?: number | undefined) => Promise<void>;
  var registerDashboardEvent: (type: string, data?: any, userId?: number | undefined) => Promise<void>;
}