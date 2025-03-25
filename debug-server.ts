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

// Prueba de conexión a la base de datos
async function testDatabaseConnection() {
  console.log("Probando conexión a la base de datos...");
  
  try {
    // Crear cliente SQL con timeout
    const sql = postgres(process.env.DATABASE_URL, {
      max: 1, // usar solo una conexión
      debug: true // mostrar consultas SQL
    });
    
    // Probar la conexión con timeout de 5 segundos
    const result = await withTimeout(sql`SELECT NOW()`, 5000);
    console.log("Conexión a la base de datos exitosa:", result);
    
    // Cerrar conexión
    await sql.end();
    return true;
  } catch (error) {
    console.error("ERROR de conexión a la base de datos:", error);
    return false;
  }
}

async function startServer() {
  // Creamos un servidor express básico
  console.log("Iniciando servidor de diagnóstico...");
  const app = express();

  // Probar la base de datos primero
  const dbConnected = await testDatabaseConnection();
  
  // Middleware para logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
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
    console.log(`Servidor de diagnóstico escuchando en puerto ${port}`);
    console.log(`Estado de la base de datos: ${dbConnected ? "Conectada" : "Error de conexión"}`);
  });
}

// Iniciar servidor
startServer().catch(err => {
  console.error("Error al iniciar el servidor:", err);
  process.exit(1);
});