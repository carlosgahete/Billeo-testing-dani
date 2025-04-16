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
    // Configurar la llamada fetch
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Importante para mantener la sesión
      body: JSON.stringify({ username, password }),
    });

    console.log("Respuesta de login directo:", res.status);
    
    if (res.ok) {
      // Login exitoso
      console.log("Login directo exitoso - Redirigiendo a página principal");
      
      // Esperar un poco y redireccionar
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      
      return true;
    } else {
      console.error("Login directo fallido - Código:", res.status);
      let errorMessage = "Error al iniciar sesión";
      
      try {
        // Intentar leer el mensaje de error
        const errorData = await res.text();
        errorMessage = errorData || "Error al iniciar sesión";
      } catch (e) {
        // Ignorar error al leer respuesta
      }
      
      console.error("Mensaje de error:", errorMessage);
      return false;
    }
  } catch (error) {
    console.error("Error durante login directo:", error);
    return false;
  }
}