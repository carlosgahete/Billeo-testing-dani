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
export async function directLogin(username: string, password: string): Promise<boolean> {
  console.log("Iniciando proceso de login directo para:", username);
  
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

    console.log("Respuesta de login directo - Estado:", res.status);
    console.log("Respuesta de login directo - OK:", res.ok);
    console.log("Respuesta de login directo - Headers:", 
      Array.from(res.headers.entries())
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    );
    
    if (res.ok) {
      // Login exitoso
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
        } else {
          console.warn("Verificación de usuario fallida pero login ok - Status:", userCheckResponse.status);
        }
      } catch (userCheckError) {
        console.error("Error al verificar usuario:", userCheckError);
      }
      
      // Esperar un poco y redireccionar
      console.log("Preparando redirección al dashboard");
      setTimeout(() => {
        console.log("Redirigiendo al dashboard ahora");
        window.location.href = "/";
      }, 1000);
      
      return true;
    } else {
      console.error("Login directo fallido - Código:", res.status);
      let errorMessage = "Error al iniciar sesión";
      
      try {
        // Intentar leer el mensaje de error
        const errorData = await res.text();
        console.error("Respuesta de error completa:", errorData);
        errorMessage = errorData || "Error al iniciar sesión";
      } catch (e) {
        console.error("Error al leer respuesta de error:", e);
      }
      
      console.error("Mensaje de error:", errorMessage);
      return false;
    }
  } catch (error) {
    console.error("Error durante login directo:", error);
    return false;
  }
}