import { sql } from './server/db.ts';
import { comparePasswords } from './server/auth.ts';

async function checkCarlos() {
  try {
    console.log('🔍 Verificando usuario carlos...');
    
    const users = await sql`SELECT id, username, password FROM users WHERE username = 'carlos'`;
    
    if (users.length === 0) {
      console.log('❌ Usuario carlos no encontrado');
      return;
    }
    
    const carlos = users[0];
    console.log('\n📋 Datos del usuario carlos:');
    console.log('ID:', carlos.id);
    console.log('Username:', carlos.username);
    console.log('Password completa:', carlos.password);
    console.log('Longitud:', carlos.password.length);
    console.log('Formato detectado:');
    
    if (carlos.password.startsWith('$2a$') || carlos.password.startsWith('$2b$')) {
      console.log('  🔑 Formato: bcrypt');
    } else if (carlos.password.includes('.')) {
      console.log('  🔑 Formato: scrypt (hash.salt)');
    } else {
      console.log('  ❌ Formato: texto plano');
    }
    
    // Probar diferentes contraseñas posibles
    const testPasswords = ['carlos', 'Billeo123', 'billeo123', 'Carlos', 'CARLOS'];
    
    console.log('\n🧪 Probando contraseñas posibles:');
    for (const testPassword of testPasswords) {
      try {
        const result = await comparePasswords(testPassword, carlos.password);
        console.log(`  "${testPassword}" -> ${result ? '✅ CORRECTA' : '❌ INCORRECTA'}`);
      } catch (error) {
        console.log(`  "${testPassword}" -> ❌ ERROR: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkCarlos(); 