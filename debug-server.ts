import express from "express";
import { createServer } from "http";
import postgres from "postgres";

// Función para esperar un tiempo determinado
function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
}

// Función para agregar un timeout a una promesa
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, timeout(ms)]);
}

// Función para determinar si estamos en modo desarrollo
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log condicional solo en desarrollo
function devLog(...args: unknown[]): void {
  if (isDevelopment) {
    console.log(...args);
  }
}

// Error log condicional solo en desarrollo
function devError(...args: unknown[]): void {
  if (isDevelopment) {
    console.error(...args);
  }
}

// Prueba de conexión a la base de datos
async function testDatabaseConnection() {
  devLog("Probando conexión a la base de datos...");
  
  try {
    // Verificar que DATABASE_URL exista
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL no está definida en las variables de entorno");
    }
    
    // Crear cliente SQL con timeout
    const sql = postgres(dbUrl, {
      max: 1, // usar solo una conexión
      debug: isDevelopment // mostrar consultas SQL solo en desarrollo
    });
    
    // Probar la conexión con timeout de 5 segundos
    const result = await withTimeout(sql`SELECT NOW()`, 5000);
    devLog("Conexión a la base de datos exitosa:", result);
    
    // Cerrar conexión
    await sql.end();
    return true;
  } catch (error) {
    devError("ERROR de conexión a la base de datos:", error);
    return false;
  }
}

async function startServer() {
  // Creamos un servidor express básico
  devLog("Iniciando servidor de diagnóstico...");
  const app = express();

  // Probar la base de datos primero
  const dbConnected = await testDatabaseConnection();
  
  // Middleware para logging
  app.use((req, res, next) => {
    devLog(`${req.method} ${req.path}`);
    next();
  });

  // Ruta para verificar el servidor
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: dbConnected ? "connected" : "failed"
    });
  });

  // Crear servidor HTTP
  const server = createServer(app);

  // Iniciar en puerto 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    devLog(`Servidor de diagnóstico escuchando en puerto ${port}`);
    devLog(`Estado de la base de datos: ${dbConnected ? "Conectada" : "Error de conexión"}`);
  });
}

// Iniciar servidor
startServer().catch(err => {
  devError("Error al iniciar el servidor:", err);
  process.exit(1);
});