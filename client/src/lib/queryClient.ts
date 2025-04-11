import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string = "GET",
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`, data);
  
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
  
  // Si data ya es un objeto, lo convertimos a JSON string
  const bodyData = data ? 
    (typeof data === 'string' ? data : JSON.stringify(data)) 
    : undefined;
  
  const res = await fetch(url, {
    method: validMethod,
    headers,
    body: bodyData,
    credentials: "include",
  });
  
  console.log(`API Response: ${res.status} ${res.statusText}`);
  
  // No lanzamos error aquí para que el componente pueda manejar la respuesta
  // incluso si es un error 401 o 400
  if (!res.ok) {
    console.error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Permitir recargar datos cuando la ventana recibe foco
      staleTime: 5 * 1000, // 5 segundos - reducido para mejorar actualización de datos en tiempo real
      gcTime: 60 * 60 * 1000, // 60 minutes - mantener datos en caché
      retry: 0, // No retries to speed up initial load
      refetchOnMount: "always", // Siempre refrescar al montar para asegurar datos actualizados
      retryOnMount: false, // No reintentar al montar para mejorar rendimiento inicial
    },
    mutations: {
      retry: 0, // No retries to speed up mutations
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    },
  },
});
