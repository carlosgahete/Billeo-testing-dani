// Este archivo sirve como adaptador para facilitar la importación de manejadores especializados
import { Request, Response } from "express";
import { handleDashboardStatus } from "./dashboard-route-simple";

// Exponer una función que puede ser utilizada directamente en el manejador de rutas
export function createDashboardStatusHandler() {
  return async (req: Request, res: Response) => {
    return handleDashboardStatus(req, res);
  };
}