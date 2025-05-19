// Script para probar las actualizaciones del dashboard
import { db, sql } from './server/db';
import { eq } from 'drizzle-orm';
import { dashboardState, dashboardEvents } from './shared/schema';

// Tipo de datos para eventos del dashboard
interface DashboardEventData {
  test?: boolean;
  [key: string]: unknown;
}

// Función para determinar si estamos en modo desarrollo
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log condicional solo en desarrollo
function devLog(...args: unknown[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

// Error log condicional solo en desarrollo
function devError(...args: unknown[]): void {
  if (isDevelopment) {
    console.error(...args);
  }
}

// Función para actualizar el estado del dashboard, copiada de server/dashboard-state.ts
async function updateDashboardState(type: string, data: DashboardEventData | null = null, userId: number | undefined) {
  // Verificar que userId sea un número válido
  if (userId === undefined || userId === null) {
    devError('❌ updateDashboardState: userId es undefined/null');
    return;
  }
  
  // Convertir userId a número si es string
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  // Si no es un número válido después de la conversión, abortamos
  if (isNaN(userIdNum)) {
    devError(`❌ updateDashboardState: userId inválido (${userId})`);
    return;
  }

  try {
    // Generar timestamp exacto para la actualización
    const now = new Date();
    devLog(`⏱️ Timestamp generado para actualización: ${now.toISOString()}`);
    
    // Comprobar si ya existe un registro para este usuario
    const [existing] = await db.select()
      .from(dashboardState)
      .where(eq(dashboardState.userId, userIdNum));
    
    if (existing) {
      devLog(`⏱️ Actualizando con nueva fecha: ${now.toISOString()}`);
      
      // Actualizar el registro existente con fecha explícita
      const updateResult = await db.update(dashboardState)
        .set({
          lastEventType: type,
          updatedAt: now
        })
        .where(eq(dashboardState.userId, userIdNum))
        .returning();
      
      devLog(`🔄 Resultado de la actualización:`, updateResult);
    } else {
      // Crear un nuevo registro
      devLog(`📝 Creando nuevo registro de estado para usuario ${userIdNum}`);
      const insertResult = await db.insert(dashboardState).values({
        userId: userIdNum,
        lastEventType: type,
        updatedAt: now  // Explícitamente definimos el timestamp
      }).returning();
      
      devLog(`✅ Registro creado:`, insertResult);
    }
    
    // Aún registramos el evento completo para historial
    await db.insert(dashboardEvents).values({
      type,
      data,
      userId: userIdNum,
      updatedAt: now // Mismo timestamp para consistencia
    });
    
    devLog(`✅ Estado del dashboard actualizado: ${type} para usuario ${userIdNum}`);
    return true;
  } catch (error) {
    devError(`❌ Error al actualizar estado del dashboard:`, error);
    return false;
  }
}

// Ejecuta el test y luego cierra la conexión
async function runTest() {
  try {
    console.log('🧪 Iniciando prueba de actualizaciones de dashboard');
    
    // Simular actualizaciones para diferentes usuarios
    await updateDashboardState('test-update-1', { test: true }, 1);
    await updateDashboardState('test-update-2', { test: true }, 2);
    await updateDashboardState('test-update-3', { test: true }, 3);
    
    // Esperar a que se completen las actualizaciones
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar el estado actual de la tabla
    const states = await db.select().from(dashboardState);
    console.log('📊 Estado actual de la tabla dashboard_state:', states);
    
    console.log('✅ Prueba completada');
    
    // Cerrar la conexión a la base de datos después de un tiempo
    setTimeout(() => {
      sql.end();
      console.log('🔌 Conexión cerrada');
    }, 500);
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    sql.end();
  }
}

runTest();