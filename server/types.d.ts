import 'express-session';

// Extender la interfaz SessionData para incluir la propiedad originalAdmin
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    originalAdmin?: {
      id: number;
      username: string;
      role: string;
      isSuperAdmin: boolean;
      isAdmin: boolean;
    };
  }
}

// Extender Request para incluir originalAdmin
declare namespace Express {
  interface Request {
    originalAdmin?: {
      id: number;
      username: string;
      role: string;
      isSuperAdmin: boolean;
      isAdmin: boolean;
    };
  }
}