import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Verificar que la variable de entorno existe
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Crear el cliente SQL
const queryClient = postgres(process.env.DATABASE_URL);

// Crear la instancia de Drizzle
export const db = drizzle(queryClient, { schema });