// Cargar variables de entorno desde .env
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurar conexión a la base de datos
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Tipos de gastos por defecto
const defaultExpenseTypes = [
  {
    name: 'Combustible',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '50', // Gasolina: IVA solo 50% deducible
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Comidas de negocio',
    defaultVatRate: '10',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Material de oficina',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Suministros (luz, agua, gas)',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Telecomunicaciones',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Seguros',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Formación',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Asesoría y consultoría',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Alquiler local',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  },
  {
    name: 'Mantenimiento y reparaciones',
    defaultVatRate: '21',
    defaultVatDeductiblePercent: '100',
    defaultDeductiblePercent: '100'
  }
];

async function createDefaultExpenseTypes() {
  try {
    console.log('🔄 Conectando a la base de datos...');
    await client.connect();
    
    // Obtener todos los usuarios
    console.log('📋 Obteniendo usuarios existentes...');
    const usersResult = await client.query('SELECT id FROM users');
    const users = usersResult.rows;
    
    console.log(`👥 Encontrados ${users.length} usuarios`);
    
    for (const user of users) {
      console.log(`🔄 Procesando usuario ${user.id}...`);
      
      // Verificar si ya tiene tipos de gastos
      const existingTypesResult = await client.query(
        'SELECT COUNT(*) as count FROM expense_types WHERE user_id = $1',
        [user.id]
      );
      
      const existingCount = parseInt(existingTypesResult.rows[0].count);
      
      if (existingCount > 0) {
        console.log(`  ✓ Usuario ${user.id} ya tiene ${existingCount} tipos de gastos, omitiendo...`);
        continue;
      }
      
      // Insertar tipos de gastos por defecto
      for (const expenseType of defaultExpenseTypes) {
        await client.query(`
          INSERT INTO expense_types (
            user_id, 
            name, 
            default_vat_rate, 
            default_vat_deductible_percent, 
            default_deductible_for_corporate_tax, 
            default_deductible_for_irpf, 
            default_deductible_percent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          user.id,
          expenseType.name,
          expenseType.defaultVatRate,
          expenseType.defaultVatDeductiblePercent,
          true, // default_deductible_for_corporate_tax
          true, // default_deductible_for_irpf
          expenseType.defaultDeductiblePercent
        ]);
      }
      
      console.log(`  ✅ Creados ${defaultExpenseTypes.length} tipos de gastos para usuario ${user.id}`);
    }
    
    console.log('✅ Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error creando tipos de gastos por defecto:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDefaultExpenseTypes(); 