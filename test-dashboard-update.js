// Script para probar las actualizaciones del dashboard
const { pool, db } = require('./server/db');
const { eq } = require('drizzle-orm');
const { dashboardState, dashboardEvents } = require('./shared/schema');

// Función para actualizar el estado del dashboard, copiada de server/dashboard-state.ts
async function updateDashboardState(type, data = null, userId) {
  // Verificar que userId sea un número válido
  if (userId === undefined || userId === null) {
    console.error('❌ updateDashboardState: userId es undefined/null');
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
    // Generar timestamp exacto para la actualización
    const now = new Date();
    console.log(`⏱️ Timestamp generado para actualización: ${now.toISOString()}`);
    
    // Comprobar si ya existe un registro para este usuario
    const [existing] = await db.select()
      .from(dashboardState)
      .where(eq(dashboardState.userId, userIdNum));
    
    if (existing) {
      console.log(`⏱️ Actualizando con nueva fecha: ${now.toISOString()}`);
      
      // Actualizar el registro existente con fecha explícita
      const updateResult = await db.update(dashboardState)
        .set({
          lastEventType: type,
          updatedAt: now
        })
        .where(eq(dashboardState.userId, userIdNum))
        .returning();
      
      console.log(`🔄 Resultado de la actualización:`, updateResult);
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
    
    // Aún registramos el evento completo para historial
    await db.insert(dashboardEvents).values({
      type,
      data,
      userId: userIdNum,
      updatedAt: now // Mismo timestamp para consistencia
    });
    
    console.log(`✅ Estado del dashboard actualizado: ${type} para usuario ${userIdNum}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al actualizar estado del dashboard:`, error);
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
      pool.end();
      console.log('🔌 Conexión cerrada');
    }, 500);
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    pool.end();
  }
}

runTest();