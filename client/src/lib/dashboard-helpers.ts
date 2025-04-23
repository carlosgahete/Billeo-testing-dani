/**
 * Helper functions para interacciones con el dashboard
 */

/**
 * Notifica al servidor que debe actualizar el estado del dashboard
 * Utiliza el endpoint de polling que no requiere autenticación tradicional
 * @param eventType Tipo de evento que generó la actualización
 * @returns Promise que se resuelve cuando se ha notificado correctamente
 */
export async function notifyDashboardUpdate(eventType: string = 'manual-update'): Promise<boolean> {
  try {
    // Construir datos para la solicitud
    const requestData = {
      eventType
    };
    
    // Usar la nueva ruta de polling que no requiere autenticación tradicional
    const response = await fetch('/api/polling/update-dashboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`Error al notificar actualización: ${response.status}`);
    }
    
    console.log(`📣 Notificación de actualización del dashboard enviada: ${eventType}`);
    return true;
  } catch (error) {
    console.error('❌ Error al notificar actualización del dashboard:', error);
    return false;
  }
}

/**
 * Obtiene datos actualizados del dashboard
 * Fuerza actualización en toda la aplicación
 * @param options Opciones adicionales
 * @returns Promise que se resuelve cuando se han recargado los datos
 */
export async function forceDashboardRefresh(options: {
  dispatchEvents?: boolean,
  silentMode?: boolean
} = {}): Promise<void> {
  try {
    const { dispatchEvents = true, silentMode = false } = options;
    
    if (!silentMode) {
      console.log("🔄 Forzando actualización del dashboard...");
    }
    
    // Configurar los headers para evitar caché
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    };
    
    // Solicitar explícitamente una recarga de datos para asegurar que obtenemos lo más reciente
    // Usando el endpoint con autenticación simplificada para evitar problemas de autenticación
    try {
      const response = await fetch(`/api/stats/dashboard-fix?year=2025&period=all&forceRefresh=true&nocache=${Date.now()}`, {
        method: 'GET',
        credentials: 'include', // Incluir cookies de sesión
        headers: {
          ...headers,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`❌ Error al cargar datos del dashboard: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("❌ Error en la solicitud:", error);
    }
    
    // Si se solicita, disparar eventos para que otros componentes se actualicen
    if (dispatchEvents) {
      if (!silentMode) {
        console.log("📣 Disparando eventos de actualización");
      }
      
      // Evento principal para componentes que escuchan este evento específico
      window.dispatchEvent(new CustomEvent('dashboard-refresh-required'));
      
      // Evento para compatibilidad con componentes más antiguos
      window.dispatchEvent(new CustomEvent('updateDashboard'));
    }
    
    return;
  } catch (error) {
    console.error('❌ Error al forzar actualización del dashboard:', error);
    throw error;
  }
}