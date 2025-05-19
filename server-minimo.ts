import express from "express";
import { createServer } from "http";
import { db, sql } from "./server/db";

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

devLog("Iniciando servidor mínimo...");

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    devLog("Verificando conexión a la base de datos...");
    const result = await db.execute(sql`SELECT NOW()`);
    devLog("Conexión a la base de datos exitosa:", result);

    // Crear servidor express
    const app = express();
    app.use(express.json());

    // Ruta de prueba
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", time: new Date().toISOString() });
    });

    // Crear servidor HTTP
    const server = createServer(app);

    // Iniciar servidor en puerto 5000
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      devLog(`Servidor mínimo escuchando en puerto ${port}`);
    });

    return server;
  } catch (error) {
    devError("Error al iniciar el servidor mínimo:", error);
    throw error;
  }
}

// Iniciar con manejo de errores
startServer().catch(error => {
  devError("Error fatal:", error);
  process.exit(1);
});