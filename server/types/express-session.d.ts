import 'express-session';

// Ampliamos la definición SessionData de express-session
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
    userName?: string;
    loginTime?: number;
    sessionEnhanced?: boolean;
  }
}