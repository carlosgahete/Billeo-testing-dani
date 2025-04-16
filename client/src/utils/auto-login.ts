/**
 * Auto-login para desarrollo
 * Este módulo proporciona un mecanismo para iniciar sesión automáticamente durante el desarrollo,
 * lo que facilita las pruebas del dashboard y otros componentes.
 */

import { directLogin } from './directLogin';

// Variable global para rastrear si ya se intentó el auto-login
let autoLoginAttempted = false;

/**
 * Inicia sesión automáticamente para pruebas de desarrollo
 * @param credentials - Credenciales de inicio de sesión predeterminadas o personalizadas
 * @returns Promise<boolean> - Retorna true si el inicio de sesión fue exitoso
 */
export async function attemptAutoLogin(
  credentials: { username: string; password: string } = { 
    username: 'demo', 
    password: 'demo' 
  }
): Promise<boolean> {
  // Si ya se intentó el auto-login, no volver a intentar
  if (autoLoginAttempted) {
    console.log('Auto-login ya fue intentado anteriormente');
    return false;
  }
  
  // Marcar que se ha intentado el auto-login
  autoLoginAttempted = true;
  
  // Verificar si ya hay una sesión activa
  try {
    const userResponse = await fetch('/api/user', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    
    if (userResponse.ok) {
      console.log('✅ Ya existe una sesión activa, no se requiere auto-login');
      return true;
    }
    
    console.log('⚙️ No hay sesión activa, intentando auto-login...');
    const loginSuccess = await directLogin(credentials.username, credentials.password, 'diagnostic');
    
    if (loginSuccess) {
      console.log('✅ Auto-login exitoso con usuario:', credentials.username);
      return true;
    } else {
      console.error('❌ Auto-login fallido');
      return false;
    }
  } catch (error) {
    console.error('❌ Error durante el auto-login:', error);
    return false;
  }
}

/**
 * Inicializa el auto-login si estamos en un entorno de desarrollo
 * Esta función se debe llamar al inicio de la aplicación
 */
export function initAutoLogin(): void {
  // Solo activar en desarrollo
  if (import.meta.env.DEV) {
    console.log('⚙️ Auto-login activado para desarrollo');
    
    // Pequeño retraso para dar tiempo a que se inicialice la aplicación
    setTimeout(() => {
      attemptAutoLogin()
        .then(success => {
          if (success) {
            // Recargar la página para activar la sesión si es necesario
            // (esto solo es relevante si el auto-login fue exitoso pero el estado de la aplicación no se actualizó)
            if (window.location.pathname === '/auth' || window.location.pathname === '/login') {
              console.log('🔄 Redirigiendo al dashboard después del auto-login');
              window.location.href = '/';
            }
          }
        });
    }, 1000);
  }
}

export default {
  attemptAutoLogin,
  initAutoLogin
};