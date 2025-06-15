import { sql } from './server/db.ts';

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuarios en la base de datos...');
    
    const users = await sql`SELECT id, username, LEFT(password, 30) as password_preview FROM users ORDER BY id`;
    
    console.log('\n📋 Usuarios encontrados:');
    console.log('ID | Usuario    | Contraseña (primeros 30 chars)        | Estado');
    console.log('---|------------|---------------------------------------|------------------');
    
    for (const user of users) {
      const isEncrypted = 
        user.password_preview.startsWith('$2a$') || 
        user.password_preview.startsWith('$2b$') ||
        user.password_preview.includes('.');
      
      const status = isEncrypted ? '✅ ENCRIPTADA' : '❌ SIN ENCRIPTAR';
      console.log(`${user.id.toString().padStart(2)} | ${user.username.padEnd(10)} | ${user.password_preview.padEnd(37)} | ${status}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers(); 