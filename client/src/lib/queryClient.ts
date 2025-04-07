import { QueryClient, MutationFunction, QueryFunction } from '@tanstack/react-query';

/**
 * Función para realizar llamadas a la API
 */
export async function apiRequest<T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    // Si la respuesta es 204 No Content, devolvemos un objeto vacío
    if (response.status === 204) {
      return {} as T;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * Función para obtener un queryFn para React Query
 * Esta función se utiliza como queryFn por defecto en useQuery
 */
export const getQueryFn = <T>(
  url: string
): QueryFunction<T> => {
  return async () => {
    return apiRequest<T>(url);
  };
};

/**
 * Crea una función de mutación para actualizar datos
 */
export function createMutation<T, V = void>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
): MutationFunction<T, V> {
  return async (variables) => {
    return apiRequest<T>(url, method, variables);
  };
}

/**
 * Cliente de consulta global para React Query
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
});

export default queryClient;