/**
 * Módulo para realizar inicio de sesión directamente sin depender de hooks de React
 * Esto es una solución alternativa para cuando hay problemas con el ciclo de vida de los componentes
 */

/**
 * Función para iniciar sesión directamente
 * @param username - Nombre de usuario
 * @param password - Contraseña
 * @returns Promise<boolean> - Retorna true si el inicio de sesión fue exitoso
 */
export type LoginDiagnosticResult = {
  success: boolean;
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  userData?: any;
  error?: string;
  timing: {
    start: number;
    loginComplete: number;
    userCheckComplete?: number;
    total: number;
  };
}

/**
 * Información de diagnóstico sobre el último intento de login
 */
export let lastLoginDiagnostic: LoginDiagnosticResult | null = null;

export async function directLogin(username: string, password: string, mode: 'redirect' | 'diagnostic' = 'redirect'): Promise<boolean> {
  console.log("Iniciando proceso de login directo para:", username);
  
  // Variables para diagnóstico
  const startTime = performance.now();
  const diagnostic: LoginDiagnosticResult = {
    success: false,
    status: 0,
    statusText: "",
    timing: {
      start: startTime,
      loginComplete: 0,
      total: 0
    }
  };

  try {
    console.log("Preparando petición de login directo");
    
    // Log de datos (sin mostrar contraseña completa)
    const maskedPassword = password.substring(0, 1) + "****";
    console.log(`Datos de login: username=${username}, password=${maskedPassword}`);
    
    // Configurar la llamada fetch
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Importante para mantener la sesión
      body: JSON.stringify({ username, password }),
    });

    // Actualizamos el diagnóstico con la información de la respuesta
    diagnostic.status = res.status;
    diagnostic.statusText = res.statusText;
    diagnostic.headers = Object.fromEntries(res.headers.entries());
    diagnostic.timing.loginComplete = performance.now();

    console.log("Respuesta de login directo - Estado:", res.status);
    console.log("Respuesta de login directo - OK:", res.ok);
    console.log("Respuesta de login directo - Headers:", 
      Array.from(res.headers.entries())
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    );
    
    if (res.ok) {
      // Login exitoso
      diagnostic.success = true;
      console.log("Login directo exitoso - Intentando obtener datos del usuario");
      
      // Intentar obtener datos del usuario para verificar que la sesión está activa
      try {
        const userCheckResponse = await fetch("/api/user", {
          method: "GET",
          credentials: "include",
        });
        
        if (userCheckResponse.ok) {
          const userData = await userCheckResponse.json();
          console.log("Verificación de usuario exitosa:", userData);
          
          // Añadir datos del usuario al diagnóstico
          diagnostic.userData = userData;
        } else {
          console.warn("Verificación de usuario fallida pero login ok - Status:", userCheckResponse.status);
          diagnostic.error = `Verificación de usuario fallida: ${userCheckResponse.status} ${userCheckResponse.statusText}`;
        }
        
        // Registramos el tiempo de verificación de usuario
        diagnostic.timing.userCheckComplete = performance.now();
      } catch (userCheckError) {
        console.error("Error al verificar usuario:", userCheckError);
        diagnostic.error = `Error al verificar usuario: ${String(userCheckError)}`;
      }
      
      // Si estamos en modo diagnóstico, solo devolvemos los datos sin redireccionar
      if (mode === 'diagnostic') {
        diagnostic.timing.total = performance.now() - startTime;
        lastLoginDiagnostic = diagnostic;
        return true;
      }
      
      // Esperar un poco y redireccionar
      console.log("Preparando redirección al dashboard");
      setTimeout(() => {
        console.log("Redirigiendo al dashboard ahora");
        window.location.href = "/";
      }, 1000);
      
      // Guardar diagnóstico antes de retornar
      diagnostic.timing.total = performance.now() - startTime;
      lastLoginDiagnostic = diagnostic;
      return true;
    } else {
      // Login fallido
      diagnostic.success = false;
      console.error("Login directo fallido - Código:", res.status);
      let errorMessage = "Error al iniciar sesión";
      
      try {
        // Intentar leer el mensaje de error
        const errorData = await res.text();
        console.error("Respuesta de error completa:", errorData);
        errorMessage = errorData || "Error al iniciar sesión";
        diagnostic.error = errorMessage;
      } catch (e) {
        console.error("Error al leer respuesta de error:", e);
        diagnostic.error = `Error al procesar respuesta: ${String(e)}`;
      }
      
      console.error("Mensaje de error:", errorMessage);
      
      // Guardar diagnóstico antes de retornar
      diagnostic.timing.total = performance.now() - startTime;
      lastLoginDiagnostic = diagnostic;
      return false;
    }
  } catch (error) {
    // Error general durante el proceso
    console.error("Error durante login directo:", error);
    diagnostic.success = false;
    diagnostic.error = `Error general: ${String(error)}`;
    diagnostic.timing.total = performance.now() - startTime;
    lastLoginDiagnostic = diagnostic;
    return false;
  }
}