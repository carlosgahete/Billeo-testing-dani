// Script para crear usuario superadmin
import dotenv from 'dotenv';
dotenv.config();

import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function createSuperAdmin() {
  try {
    console.log('🔐 Creando usuario superadmin...');
    
    // Datos del superadmin
    const adminData = {
      username: 'admin',
      name: 'Administrador Principal',
      email: 'admin@billeo.es',
      password: await bcrypt.hash('admin123', 10), // Cambiar por una contraseña segura
      role: 'superadmin'
    };
    
    // Verificar si ya existe
    const existingAdmin = await db.select().from(users).where(eq(users.username, adminData.username));
    
    if (existingAdmin.length > 0) {
      console.log('❌ El usuario admin ya existe');
      console.log('Usuario existente:', {
        id: existingAdmin[0].id,
        username: existingAdmin[0].username,
        role: existingAdmin[0].role
      });
      return;
    }
    
    // Crear el usuario
    const result = await db.insert(users).values(adminData).returning();
    
    console.log('✅ Usuario superadmin creado exitosamente:');
    console.log('🆔 ID:', result[0].id);
    console.log('👤 Username:', adminData.username);
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Contraseña:', 'admin123');
    console.log('🛡️ Rol:', adminData.role);
    console.log('');
    console.log('🚀 Ahora puedes hacer login en: http://localhost:8080');
    
  } catch (error) {
    console.error('❌ Error al crear superadmin:', error);
  } finally {
    process.exit(0);
  }
}

createSuperAdmin(); 