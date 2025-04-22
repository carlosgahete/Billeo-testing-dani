import { Request, Response, NextFunction } from "express";
import { sql } from "../db";

// Definir una interfaz para el objeto de usuario que respete los requisitos
interface UserType {
  id: number;
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
  businessType: string | null;
  profileImage: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  securityQuestion: string | null;
  securityAnswer: string | null;
}

export const requiereDemoAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Verificar autenticación normal primero
  if (req.isAuthenticated()) {
    console.log("Acceso permitido - Usuario autenticado vía Passport");
    return next();
  }
  
  // Verificar si hay un ID de usuario en la sesión
  if (req.session && req.session.userId) {
    console.log("Acceso permitido - Usuario autenticado vía userId en sesión:", req.session.userId);
    return next();
  }

  // Verificar si hay un ID de usuario en el header o query
  const userId = req.headers['x-user-id'] || req.query.userId;
  if (userId) {
    try {
      const userIdNum = Number(userId);
      if (!isNaN(userIdNum)) {
        const result = await sql<UserType[]>`SELECT * FROM users WHERE id = ${userIdNum}`;
        if (result && result.length > 0) {
          // @ts-ignore - Asignar el usuario aunque typescript se queje
          req.user = result[0];
          if (req.session) {
            req.session.userId = result[0].id;
          }
          console.log("Acceso permitido - Usuario autenticado vía header/query userId:", userId);
          return next();
        }
      }
    } catch (error) {
      console.error("Error verificando userId de header:", error);
    }
  }

  // Verificar si hay una cookie de nombre de usuario
  const usernameCookie = req.cookies && req.cookies.username;
  if (usernameCookie) {
    try {
      console.log("Intentando autenticar con username de cookie:", usernameCookie);
      const result = await sql<UserType[]>`SELECT * FROM users WHERE username = ${usernameCookie}`;
      if (result && result.length > 0) {
        // @ts-ignore - Asignar el usuario aunque typescript se queje
        req.user = result[0];
        if (req.session) {
          req.session.userId = result[0].id;
        }
        console.log("Acceso permitido - Usuario autenticado vía cookie username");
        return next();
      }
    } catch (error) {
      console.error("Error verificando username de cookie:", error);
    }
  }

  // MODO DESARROLLO - Autenticar con usuario demo si no estamos en producción
  // Esto debe eliminarse en producción
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log("Intentando autenticación de desarrollo con usuario demo");
      const result = await sql<UserType[]>`SELECT * FROM users WHERE username = 'demo'`;
      if (result && result.length > 0) {
        // @ts-ignore - Asignar el usuario aunque typescript se queje
        req.user = result[0];
        if (req.session) {
          req.session.userId = result[0].id;
        }
        console.log("Acceso permitido - Autenticación de desarrollo con usuario demo");
        return next();
      }
    } catch (error) {
      console.error("Error en autenticación de fallback:", error);
    }
  }
  
  return res.status(401).json({
    message: "Authentication required"
  });
};