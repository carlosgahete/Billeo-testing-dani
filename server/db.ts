// Cargar variables de entorno desde .env
import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Verificar que la variable de entorno existe
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Crear el cliente SQL con configuración de timeout más corto
export const sql = postgres(process.env.DATABASE_URL, {
  max: 10, // máximo de conexiones en el pool
  idle_timeout: 20, // tiempo máximo de inactividad (segundos)
  connect_timeout: 10, // tiempo máximo para conectar (segundos)
});

// Crear la instancia de Drizzle
export const db = drizzle(sql, { schema });