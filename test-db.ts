import { sql, db } from './server/db';

// Función para crear un timeout
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout después de ${ms}ms`)), ms)
  );
}

// Función para competir entre una promesa y un timeout
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    timeout(ms)
  ]);
}

async function testDatabaseConnection() {
  try {
    console.log("Intentando conectar a la base de datos...");
    console.log("URL de la BD:", process.env.DATABASE_URL?.substring(0, 30) + '...');
    
    const result = await withTimeout(sql`SELECT 1 as test`, 5000);
    console.log("Conexión exitosa:", result);
    
    console.log("Intentando ejecutar consulta con Drizzle...");
    const drizzleResult = await withTimeout(
      db.execute(sql`SELECT tablename FROM pg_tables LIMIT 1`),
      5000
    );
    console.log("Consulta Drizzle exitosa:", drizzleResult);
    
    process.exit(0);
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error);
    process.exit(1);
  }
}

testDatabaseConnection();