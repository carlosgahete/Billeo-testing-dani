import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Optimizada para un manejo de errores más eficiente y con mejor rendimiento
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Intentamos obtener errores en formato JSON primero (más estructurado y eficiente)
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        // Generamos mensajes de error más amigables y optimizados
        const errorMessage = errorData.message || errorData.error || res.statusText;
        throw new Error(`${errorMessage}`);
      } else {
        // Si no es JSON, limitamos el tamaño del texto para mejor rendimiento
        const text = await res.text();
        const trimmedText = text.length > 150 ? text.substring(0, 150) + '...' : text;
        throw new Error(`${res.status}: ${trimmedText || res.statusText}`);
      }
    } catch (parseError) {
      // Si hay error al parsear, usamos un formato simple para no bloquear la interfaz
      throw new Error(`Error ${res.status}`);
    }
  }
}

export async function apiRequest<T = any>(
  method: string = "GET",
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Eliminamos logging para mejorar rendimiento (estilo Apple)
  
  // Validar y normalizar el método HTTP
  const validMethod = method.toUpperCase();
  
  if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(validMethod)) {
    throw new Error(`Método HTTP no válido: ${method}`);
  }
  
  // Preparar los headers siempre con el mismo formato para evitar errores de tipo
  const headers: Record<string, string> = {};
  
  // Si hay datos, añadir Content-Type
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Performance optimization: Usamos el método más rápido para convertir data a JSON
  const bodyData = data ? 
    (typeof data === 'string' ? data : JSON.stringify(data)) 
    : undefined;
  
  // Agregamos cache-control para optimizar el rendimiento de las peticiones
  if (validMethod === 'GET') {
    headers["Cache-Control"] = "max-age=30"; // 30 segundos de caché para GETs
  }
  
  try {
    const res = await fetch(url, {
      method: validMethod,
      headers,
      body: bodyData,
      credentials: "include",
    });
    
    // Logging mínimo solo para errores críticos
    if (!res.ok && res.status >= 500) {
      console.error(`API server error: ${res.status}`);
    }
    
    return res;
  } catch (error) {
    // Capturar errores de red para mejor experiencia de usuario
    console.error(`Network error`);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Optimizamos añadiendo caché para mejorar rendimiento de solicitudes repetidas
    const headers: Record<string, string> = {
      "Cache-Control": "max-age=30", // 30 segundos de caché para mejorar rendimiento
      "X-Requested-With": "XMLHttpRequest" // Optimiza la detección de peticiones AJAX en el servidor
    };
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });
  
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
  
      await throwIfResNotOk(res);
      
      // Optimización: parsear JSON de manera más eficiente
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await res.json();
      } else {
        // Para respuestas no-JSON, devolvemos un objeto simple para evitar errores de parseo
        return { success: true, message: "Ok" } as any;
      }
    } catch (error) {
      // Manejo optimizado de errores para mejor rendimiento y UX
      console.error('Query error');
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Desactivamos para evitar actualizaciones innecesarias que ralenticen al usuario
      staleTime: 30 * 1000, // 30 segundos - optimizado para mejorar rendimiento manteniendo datos frescos (estilo Apple)
      gcTime: 5 * 60 * 1000, // 5 minutos - reducido para optimizar memoria en dispositivos móviles
      retry: 0, // Sin reintentos para mejorar la velocidad de carga inicial
      refetchOnMount: true, // Refrescar solo si los datos son obsoletos (más eficiente)
      retryOnMount: false, // Evitamos reintentos adicionales para mejorar la fluidez
    },
    mutations: {
      retry: 0, // Sin reintentos para mejorar velocidad de las mutaciones
      onError: (error) => {
        // Logging mínimo para maximizar rendimiento
        console.error('Mutation error');
      }
    },
  },
});
