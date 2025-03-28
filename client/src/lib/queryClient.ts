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
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
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
      refetchOnWindowFocus: false, // Don't refetch when window gets focus to avoid login loop
      staleTime: 30 * 60 * 1000, // 30 minutes - aumentado para mejorar rendimiento
      gcTime: 60 * 60 * 1000, // 60 minutes - aumentado para mantener datos en caché más tiempo
      retry: 0, // No retries to speed up initial load
      refetchOnMount: true, // Refetch solo si los datos están obsoletos
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
