import type { Express, Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { dashboardState } from "../shared/schema";

/**
 * Registra las rutas relacionadas con el estado del dashboard
 * @param app - La aplicación Express
 */
export function registerDashboardStateRoutes(app: Express) {
  // Endpoint para verificar estado de actualización del dashboard (reemplaza WebSocket)
  app.get("/api/dashboard-status", async (req: Request, res: Response) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Obtenemos el estado actual del dashboard para este usuario
      const [state] = await db.select()
        .from(dashboardState)
        .where(eq(dashboardState.userId, req.session.userId));
      
      if (!state) {
        // Si no existe, creamos un registro inicial
        const [newState] = await db.insert(dashboardState)
          .values({
            userId: req.session.userId,
            lastEventType: 'initial',
            // id y updatedAt tienen valores por defecto
          })
          .returning();
        
        return res.status(200).json({
          updated_at: newState.updatedAt.getTime(),
          lastEvent: newState.lastEventType
        });
      }
      
      // Devolvemos la fecha de la última actualización
      return res.status(200).json({
        updated_at: state.updatedAt.getTime(),
        lastEvent: state.lastEventType
      });
    } catch (error) {
      console.error("Error al obtener estado del dashboard:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
}