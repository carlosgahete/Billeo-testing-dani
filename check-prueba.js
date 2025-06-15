import { sql } from './server/db.ts';
import { comparePasswords } from './server/auth.ts';

async function checkPrueba() {
  try {
    console.log('🔍 Verificando usuario "prueba"...');
    
    const users = await sql`SELECT id, username, password FROM users WHERE username = 'prueba'`;
    
    if (users.length === 0) {
      console.log('❌ Usuario "prueba" no encontrado');
      return;
    }
    
    const user = users[0];
    console.log('\n📋 Datos del usuario "prueba":');
    console.log('ID:', user.id);
    console.log('Username:', user.username);
    console.log('Password completa:', user.password);
    console.log('Longitud:', user.password.length);
    
    // Detectar formato
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      console.log('📋 Formato: bcrypt ✅');
    } else if (user.password.includes('.') && user.password.length > 50) {
      console.log('📋 Formato: scrypt (hash.salt) ✅');
    } else if (user.password.includes('.')) {
      console.log('❌ Formato: TEXTO PLANO con punto (PROBLEMA!)');
    } else {
      console.log('❌ Formato: TEXTO PLANO (PROBLEMA!)');
    }
    
    // Probar las contraseñas que dijiste
    const testPasswords = ['Billeo123.', 'Billeo123', 'prueba'];
    
    console.log('\n🧪 Probando contraseñas:');
    for (const testPassword of testPasswords) {
      try {
        const result = await comparePasswords(testPassword, user.password);
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

checkPrueba(); 