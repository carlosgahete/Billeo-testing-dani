import { sql } from './server/db.ts';
import { hashPassword } from './server/auth.ts';

async function fixCarlos() {
  try {
    console.log('🔧 Arreglando contraseña del usuario carlos...');
    
    // Verificar que el usuario existe
    const users = await sql`SELECT id, username, password FROM users WHERE username = 'carlos'`;
    
    if (users.length === 0) {
      console.log('❌ Usuario carlos no encontrado');
      return;
    }
    
    const carlos = users[0];
    console.log(`📋 Usuario encontrado: ${carlos.username} (ID: ${carlos.id})`);
    console.log(`🔍 Contraseña actual: "${carlos.password}"`);
    
    // La contraseña original probablemente era "Billeo123" (sin el punto)
    const newPassword = "Billeo123";
    console.log(`🔑 Nueva contraseña: "${newPassword}"`);
    
    // Encriptar la contraseña correctamente
    const hashedPassword = await hashPassword(newPassword);
    console.log(`🔐 Contraseña encriptada: ${hashedPassword.substring(0, 30)}...`);
    
    // Actualizar en la base de datos
    await sql`
      UPDATE users 
      SET password = ${hashedPassword} 
      WHERE id = ${carlos.id}
    `;
    
    console.log('✅ Contraseña actualizada correctamente');
    console.log('');
    console.log('🎉 Ahora puedes iniciar sesión con:');
    console.log(`   Usuario: carlos`);
    console.log(`   Contraseña: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixCarlos(); 