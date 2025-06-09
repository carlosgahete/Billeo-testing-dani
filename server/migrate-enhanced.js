// Cargar variables de entorno desde .env
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Buscar el .env en el directorio padre

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar conexión a la base de datos
const connectionString = process.env.DATABASE_URL;

console.log('🔍 DATABASE_URL configurada:', connectionString ? 'Sí' : 'No');
console.log('🔍 DATABASE_URL length:', connectionString?.length || 0);

if (!connectionString) {
  console.error('❌ DATABASE_URL no está configurada');
  console.error('Variables de entorno disponibles:');
  console.error(Object.keys(process.env).filter(key => key.includes('DATA')));
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await client.connect();
    
    console.log('📋 Leyendo archivo de migración...');
    const sqlPath = join(__dirname, 'sql', 'enhanced_expenses_schema.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    console.log('⚡ Ejecutando migraciones...');
    await client.query(sqlContent);
    
    console.log('✅ Migraciones ejecutadas exitosamente!');
    
    // Verificar que las tablas se crearon
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('suppliers', 'expenses', 'expense_types')
      ORDER BY table_name;
    `);
    
    console.log('📊 Tablas creadas/verificadas:');
    checkTables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations(); 