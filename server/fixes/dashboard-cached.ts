import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { updateDashboardState } from '../dashboard-state';
import { Invoice, Transaction } from '@shared/schema';

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
        try {
          updateDashboardState('dashboard-stats-cached', {
            year,
            period,
            filterInfo: {
              year,
              quarter: period,
              timestamp: new Date().toISOString()
            },
            summary: cachedResult.data
          });
        } catch (error) {
          console.error('Error al actualizar estado del dashboard (no crítico):', error);
        }
        
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
      
      // Calcular ingresos totales (solo facturas pagadas)
      const income = filteredInvoices
        .filter((invoice: Invoice) => invoice.status === 'paid')
        .reduce((total: number, invoice: Invoice) => total + (Number(invoice.subtotal) || 0), 0);
        
      // Calcular gastos totales
      const expenses = filteredTransactions
        .filter((transaction: Transaction) => transaction.type === 'expense')
        .reduce((total: number, transaction: Transaction) => total + (Number(transaction.amount) || 0), 0);
        
      // Calcular facturas pendientes
      const pendingInvoices = filteredInvoices
        .filter((invoice: Invoice) => invoice.status === 'pending')
        .reduce((total: number, invoice: Invoice) => total + (Number(invoice.total) || 0), 0);
      
      const pendingCount = filteredInvoices
        .filter((invoice: Invoice) => invoice.status === 'pending').length;
      
      // Datos completos para respuesta
      const result = {
        income,
        expenses,
        pendingInvoices,
        pendingCount,
        invoiceCount: filteredInvoices.length,
        transactionCount: filteredTransactions.length
      };
      
      // Guardar en caché con nueva expiración
      dashboardCache[cacheKey] = {
        data: result,
        timestamp: now,
        expiry: now + CACHE_TTL
      };
      
      // Emitir evento de actualización
      try {
        updateDashboardState(Number(userId), 'dashboard-stats-calculated', {
          year,
          period,
          filterInfo: {
            year,
            quarter: period,
            timestamp: new Date().toISOString()
          },
          summary: result
        });
      } catch (error) {
        console.error('Error al actualizar estado del dashboard:', error);
      }
      
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