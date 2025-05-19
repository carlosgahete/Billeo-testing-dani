import crypto from 'crypto';
import { promisify } from 'util';

// Función para determinar si estamos en modo desarrollo
const isDevelopment = process.env.NODE_ENV !== 'production';

// Log condicional solo en desarrollo
function devLog(...args) {
  if (isDevelopment) {
    console.log(...args);
  }
}

// Error log condicional solo en desarrollo
function devError(...args) {
  if (isDevelopment) {
    console.error(...args);
  }
}

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const hash = await hashPassword("superadmin");
  devLog("Hash para 'superadmin':", hash);
  // Siempre retornamos el hash para que pueda usarse incluso en producción
  return hash;
}

main().catch(err => devError("Error al generar hash:", err));