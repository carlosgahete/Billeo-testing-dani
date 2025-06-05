import dotenv from 'dotenv';
dotenv.config();

import { db } from './server/db.js';
import { users } from './shared/schema.js';

async function checkUsers() {
  try {
    const result = await db.select().from(users);
    console.log('👥 Usuarios en la base de datos:');
    console.log('Total usuarios:', result.length);
    console.log('');
    
    result.forEach(user => {
      console.log(`🆔 ID: ${user.id}`);
      console.log(`👤 Username: ${user.username}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🛡️ Rol: ${user.role}`);
      console.log(`📝 Nombre: ${user.name}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error al verificar usuarios:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers(); 