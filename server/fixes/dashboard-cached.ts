import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { updateDashboardState } from '../dashboard-state';
import { Invoice, Transaction } from '@shared/schema';

// Función para enviar actualización al estado del dashboard con mejor manejo de errores
async function sendDashboardUpdate(type: string, data: any, userId: number | string | undefined) {
  if (userId === undefined || userId === null) {
    console.error('❌ userId indefinido o nulo en sendDashboardUpdate');
    return;
  }
  
  // Asegurar que userId sea un número
  const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  try {
    await updateDashboardState(type, data, userIdNum);
  } catch (error) {
    console.error(`❌ Error al enviar actualización al dashboard: ${error}`);
  }
}

// Estructura para la caché
interface DashboardResult {
  data: any;
  timestamp: number;
  expiry: number; // Timestamp de expiración
}

// Caché de resultados por usuario, año y trimestre
const dashboardCache: {
  [key: string]: DashboardResult
} = {};

// Tiempo de vida de la caché en milisegundos (30 segundos)
const CACHE_TTL = 30 * 1000;

/**
 * Endpoint optimizado para el dashboard que utiliza caché para reducir
 * el tiempo de respuesta y disminuir la carga en el servidor.
 */
export function setupCachedDashboardEndpoint(
  app: any, 
  requireAuth: any, 
  storage: IStorage
) {
  app.get('/api/stats/dashboard-cached', requireAuth, async (req: Request, res: Response) => {
    try {
      // Identificar usuario
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Obtener parámetros de filtro
      const year = req.query.year as string || new Date().getFullYear().toString();
      const period = req.query.period as string || 'all';
      const forceRefresh = req.query.forceRefresh === 'true';
      
      // Clave única para la caché basada en usuario, año y trimestre
      const cacheKey = `${userId}-${year}-${period}`;
      
      // Verificar si tenemos datos en caché
      const now = Date.now();
      const cachedResult = dashboardCache[cacheKey];
      
      // Si hay datos en caché y no están expirados ni se solicita actualización forzada
      if (cachedResult && cachedResult.expiry > now && !forceRefresh) {
        console.log(`🚀 Usando datos en caché para dashboard (${year}/${period})`);
        
        // Emitir una notificación de actualización de dashboard (sin afectar caché)
        sendDashboardUpdate('dashboard-stats-cached', {
          year,
          period,
          filterInfo: {
            year,
            quarter: period,
            timestamp: new Date().toISOString()
          },
          summary: cachedResult.data
        }, userId);
        
        // Devolver datos en caché
        return res.status(200).json(cachedResult.data);
      }
      
      console.log(`🔄 Generando datos nuevos para dashboard (${year}/${period})`);
      
      // Obtener datos de facturas utilizando los métodos existentes
      const allInvoices = await storage.getInvoicesByUserId(Number(userId));
      const filteredInvoices = allInvoices.filter((invoice: Invoice) => {
        // Convertir el string de fecha a objeto Date
        const invoiceDate = new Date(invoice.issueDate);
        const invoiceYear = invoiceDate.getFullYear().toString();
        
        // Verificar si coincide con el año solicitado
        if (invoiceYear !== year) return false;
        
        // Si filtro de trimestre está activo, verificar trimestre
        if (period !== 'all' && period.startsWith('q')) {
          const month = invoiceDate.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          const requestedQuarter = parseInt(period.substring(1));
          return quarter === requestedQuarter;
        }
        
        // Si filtro de mes está activo, verificar mes
        if (period !== 'all' && period.startsWith('m')) {
          const month = invoiceDate.getMonth() + 1;
          const requestedMonth = parseInt(period.substring(1));
          return month === requestedMonth;
        }
        
        // Si no hay filtro activo, incluir todos
        return true;
      });
      
      // Obtener datos de transacciones utilizando los métodos existentes
      const allTransactions = await storage.getTransactionsByUserId(Number(userId));
      const filteredTransactions = allTransactions.filter((transaction: Transaction) => {
        // Convertir el string de fecha a objeto Date
        const transactionDate = new Date(transaction.date);
        const transactionYear = transactionDate.getFullYear().toString();
        
        // Verificar si coincide con el año solicitado
        if (transactionYear !== year) return false;
        
        // Si filtro de trimestre está activo, verificar trimestre
        if (period !== 'all' && period.startsWith('q')) {
          const month = transactionDate.getMonth();
          const quarter = Math.floor(month / 3) + 1;
          const requestedQuarter = parseInt(period.substring(1));
          return quarter === requestedQuarter;
        }
        
        // Si filtro de mes está activo, verificar mes
        if (period !== 'all' && period.startsWith('m')) {
          const month = transactionDate.getMonth() + 1;
          const requestedMonth = parseInt(period.substring(1));
          return month === requestedMonth;
        }
        
        // Si no hay filtro activo, incluir todos
        return true;
      });
      
      // Verificamos los datos que estamos procesando
      console.log(`Procesando ${allInvoices.length} facturas y ${allTransactions.length} transacciones`);
      console.log(`Filtradas: ${filteredInvoices.length} facturas y ${filteredTransactions.length} transacciones`);
        
      // Calcular ingresos totales (facturas pagadas)
      const paidInvoices = filteredInvoices.filter((invoice: Invoice) => invoice.status === 'paid');
      const income = paidInvoices.reduce((total: number, invoice: Invoice) => total + (Number(invoice.subtotal) || 0), 0);
      console.log(`Ingresos calculados de facturas pagadas (base imponible): ${income}`);
      
      // Calcular el IVA repercutido basado en cada factura individual
      const ivaRepercutido = paidInvoices.reduce((total: number, invoice: Invoice) => {
        // Calcular el IVA basado en la diferencia entre total y subtotal para cada factura
        const ivaInvoice = (Number(invoice.total) || 0) - (Number(invoice.subtotal) || 0);
        return total + ivaInvoice;
      }, 0);
      console.log(`IVA repercutido calculado directamente de facturas: ${ivaRepercutido}`);
        
      // Calcular gastos totales
      const expenses = filteredTransactions
        .filter((transaction: Transaction) => transaction.type === 'expense')
        .reduce((total: number, transaction: Transaction) => total + (Number(transaction.amount) || 0), 0);
      console.log(`Gastos calculados: ${expenses}`);
        
      // Calcular facturas pendientes
      const pendingInvoices = filteredInvoices
        .filter((invoice: Invoice) => invoice.status === 'pending')
        .reduce((total: number, invoice: Invoice) => total + (Number(invoice.total) || 0), 0);
      console.log(`Total de facturas pendientes: ${pendingInvoices}`);
      
      // Contar facturas pendientes
      const pendingCount = filteredInvoices
        .filter((invoice: Invoice) => invoice.status === 'pending').length;
      console.log(`Número de facturas pendientes: ${pendingCount}`);
      
      // Calcular IVA soportado basado en transacciones de gastos
      const ivaSoportado = filteredTransactions
        .filter((transaction: Transaction) => transaction.type === 'expense')
        .reduce((total: number, transaction: Transaction) => {
          // Si el gasto tiene IVA explícito, usarlo, de lo contrario aproximar (21%)
          const ivaAmount = transaction.taxAmount ? Number(transaction.taxAmount) : Number(transaction.amount) * 0.21;
          return total + ivaAmount;
        }, 0);
      console.log(`IVA soportado calculado: ${ivaSoportado}`);
      
      // Calcular IRPF retenido en ingresos
      const irpfRetenidoIngresos = paidInvoices.reduce((total: number, invoice: Invoice) => {
        // Si la factura tiene una retención especificada, usarla
        if (invoice.retentionAmount) {
          return total + Number(invoice.retentionAmount);
        }
        // De lo contrario, calcular 15% de retención
        return total + (Number(invoice.subtotal) * 0.15);
      }, 0);
      console.log(`IRPF retenido en ingresos calculado: ${irpfRetenidoIngresos}`);
      
      // Datos completos para respuesta, incluyendo campos adicionales necesarios para el dashboard
      const result = {
        income,
        expenses,
        pendingInvoices,
        pendingCount,
        invoiceCount: filteredInvoices.length,
        transactionCount: filteredTransactions.length,
        
        // Campos adicionales para cálculos fiscales
        baseImponible: income,
        baseImponibleGastos: expenses,
        ivaRepercutido: ivaRepercutido, // Usado el IVA calculado de las facturas
        ivaSoportado: ivaSoportado, // Usado el IVA calculado de los gastos
        irpfRetenidoIngresos: irpfRetenidoIngresos, // IRPF calculado de las facturas
        totalWithholdings: expenses * 0.15, // Aproximado para retenciones de gastos
        
        // Campos adicionales para balances
        balance: income - expenses,
        result: income - expenses,
        netIncome: income - irpfRetenidoIngresos, // Ingresos menos IRPF calculado
        netExpenses: expenses,
        netResult: (income - irpfRetenidoIngresos) - expenses,
        
        // Datos fiscales agregados
        taxes: {
          vat: ivaRepercutido - ivaSoportado,
          incomeTax: irpfRetenidoIngresos,
          ivaALiquidar: ivaRepercutido - ivaSoportado
        },
        
        // Estadísticas detalladas de impuestos
        taxStats: {
          ivaRepercutido: ivaRepercutido,
          ivaSoportado: ivaSoportado,
          ivaLiquidar: ivaRepercutido - ivaSoportado,
          irpfRetenido: irpfRetenidoIngresos,
          irpfTotal: irpfRetenidoIngresos,
          irpfPagar: irpfRetenidoIngresos
        },
        
        // Información de filtros aplicados
        year,
        period
      };
      
      // Guardar en caché con nueva expiración
      dashboardCache[cacheKey] = {
        data: result,
        timestamp: now,
        expiry: now + CACHE_TTL
      };
      
      // Emitir evento de actualización
      sendDashboardUpdate('dashboard-stats-calculated', {
        year,
        period,
        filterInfo: {
          year,
          quarter: period,
          timestamp: new Date().toISOString()
        },
        summary: result
      }, userId);
      
      // Responder con los datos calculados
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error al obtener estadísticas del dashboard:', error);
      return res.status(500).json({
        message: 'Error al cargar estadísticas del dashboard',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });
  
  // Endpoint adicional para limpiar la caché manualmente si es necesario
  app.post('/api/stats/dashboard-cached/clear', requireAuth, (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Eliminar todas las entradas de caché para este usuario
      const userKeyPrefix = `${userId}-`;
      const keysToDelete = Object.keys(dashboardCache).filter(key => key.startsWith(userKeyPrefix));
      
      keysToDelete.forEach(key => {
        delete dashboardCache[key];
      });
      
      return res.status(200).json({ 
        message: 'Caché limpiada correctamente',
        entriesDeleted: keysToDelete.length
      });
    } catch (error) {
      console.error('Error al limpiar caché del dashboard:', error);
      return res.status(500).json({ 
        message: 'Error al limpiar caché',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });
  
  console.log('Endpoint optimizado con caché para el dashboard configurado');
}