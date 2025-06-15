const { sql } = require('./server/db.js');
const { hashPassword } = require('./server/auth.js');

async function fixPasswords() {
  try {
    console.log('🔐 Iniciando migración de contraseñas...');
    
    // Obtener todos los usuarios
    const users = await sql`SELECT id, username, password FROM users`;
    console.log(`📋 Encontrados ${users.length} usuarios`);
    
    let fixed = 0;
    
    for (const user of users) {
      // Detectar si la contraseña ya está encriptada
      const isAlreadyHashed = 
        user.password.startsWith('$2a$') || // bcrypt
        user.password.startsWith('$2b$') || // bcrypt
        user.password.includes('.'); // formato scrypt propio
      
      if (!isAlreadyHashed) {
        console.log(`🔑 Encriptando contraseña para usuario: ${user.username}`);
        
        // Encriptar la contraseña usando el mismo método que el registro
        const hashedPassword = await hashPassword(user.password);
        
        // Actualizar en la base de datos
        await sql`
          UPDATE users 
          SET password = ${hashedPassword} 
          WHERE id = ${user.id}
        `;
        
        fixed++;
        console.log(`  ✅ Contraseña encriptada para ${user.username}`);
      } else {
        console.log(`  ℹ️  Usuario ${user.username} ya tiene contraseña encriptada`);
      }
    }
    
    console.log(`\n✅ Migración completada!`);
    console.log(`📊 Contraseñas encriptadas: ${fixed}/${users.length}`);
    
    if (fixed > 0) {
      console.log('\n🎉 Ahora todos los usuarios pueden iniciar sesión correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    process.exit(0);
  }
}

fixPasswords(); 