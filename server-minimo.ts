import express from "express";
import { createServer } from "http";
import { db, sql } from "./server/db";

console.log("Iniciando servidor mínimo...");

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    console.log("Verificando conexión a la base de datos...");
    const result = await db.execute(sql`SELECT NOW()`);
    console.log("Conexión a la base de datos exitosa:", result);

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
      console.log(`Servidor mínimo escuchando en puerto ${port}`);
    });

    return server;
  } catch (error) {
    console.error("Error al iniciar el servidor mínimo:", error);
    throw error;
  }
}

// Iniciar con manejo de errores
startServer().catch(error => {
  console.error("Error fatal:", error);
  process.exit(1);
});