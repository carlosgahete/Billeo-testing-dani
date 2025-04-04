/**
 * Función para realizar peticiones API
 * @param {string} url - URL de la petición
 * @param {string} method - Método HTTP: 'GET', 'POST', 'PUT', 'DELETE'
 * @param {any} data - Datos a enviar en el cuerpo de la petición (para POST y PUT)
 * @returns {Promise<any>} - Promesa con la respuesta de la petición
 */
export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: any
): Promise<any> {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // Para enviar cookies de autenticación
  };

  // Agregar cuerpo a la petición si se proporcionan datos
  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  // Verificar si la respuesta es exitosa
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
  }

  // Si la respuesta está vacía, devolver null
  if (response.status === 204) {
    return null;
  }

  // Intentar parsear la respuesta como JSON
  try {
    return await response.json();
  } catch (error) {
    // Si no se puede parsear como JSON, devolver el texto
    return await response.text();
  }
}