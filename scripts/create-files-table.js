import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear la carpeta de uploads si no existe
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Directorio de uploads creado en: ${uploadDir}`);
}

// Conectar a la base de datos
async function createFilesTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Verificar si la tabla ya existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'files'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('La tabla "files" ya existe');
    } else {
      // Crear la tabla files
      await client.query(`
        CREATE TABLE files (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          filename TEXT NOT NULL,
          original_name TEXT NOT NULL,
          path TEXT NOT NULL,
          size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          file_type TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          upload_date TIMESTAMP NOT NULL DEFAULT NOW(),
          thumbnail_path TEXT,
          is_deleted BOOLEAN DEFAULT FALSE
        );
      `);
      console.log('Tabla "files" creada correctamente');
    }
  } catch (error) {
    console.error('Error al crear la tabla files:', error);
  } finally {
    await client.end();
    console.log('Conexión a la base de datos cerrada');
  }
}

createFilesTable().catch(console.error);