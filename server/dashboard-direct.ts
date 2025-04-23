import { Request, Response, NextFunction } from 'express';
import { Express } from 'express';
import { storage } from './storage';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { dashboardState } from '../shared/schema';

// Middleware simplificado para autenticación que siempre permite acceso en desarrollo
export const simplifiedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Si ya está autenticado con session.userId, permitir
    if (req.session && req.session.userId) {
      console.log("✅ Acceso a dashboard-fix permitido - Usuario autenticado vía userId en sesión:", req.session.userId);
      return next();
    }
    
    // Para desarrollo, usar siempre usuario demo
    if (process.env.NODE_ENV !== 'production') {
      // Forzar autenticación con usuario demo (ID 1)
      if (req.session) {
        req.session.userId = 1;
      }
      console.log("✅ Acceso a dashboard-fix permitido - Usuario autenticado vía bypass de desarrollo (ID=1)");
      return next();
    }
    
    // En producción, validar autenticación
    return res.status(401).json({ message: "Authentication required" });
  } catch (error) {
    console.error("❌ Error en middleware simplifiedAuth:", error);
    return res.status(500).json({ message: "Error interno en autenticación" });
  }
};

// Registrar el endpoint directo para el dashboard
export function registerDirectDashboardEndpoint(app: Express) {
  console.log("📊 Registrando endpoint directo para el dashboard...");
  
  app.get("/api/dashboard-direct", simplifiedAuth, async (req: Request, res: Response) => {
    try {
      console.log("📊 Procesando solicitud a /api/dashboard-direct - ACCESO DIRECTO");
      
      // Configurar encabezados para evitar caché en datos financieros
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Expires', '0');
      res.setHeader('Pragma', 'no-cache');
      
      // Obtener parámetros de filtrado
      const { year, period } = req.query;
      
      console.log(`📊 Solicitando datos fiscales: año=${year || 'todos'}, periodo=${period || 'todos'}`);
      
      // Obtener el ID del usuario autenticado
      const userId = req.session?.userId || 1; // Defaultear a 1 en caso de que no haya sesión
      
      // Obtener datos de facturas
      const invoices = await storage.getInvoicesByUserId(userId);
      const transactions = await storage.getTransactionsByUserId(userId);
      
      // Función auxiliar para obtener el trimestre
      const getQuarterFromDate = (date: Date): number => {
        const month = date.getMonth();
        if (month < 3) return 1; // Q1: Ene-Mar
        if (month < 6) return 2; // Q2: Abr-Jun
        if (month < 9) return 3; // Q3: Jul-Sep
        return 4; // Q4: Oct-Dic
      };
      
      // Filtrar facturas por año y trimestre
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.issueDate);
        const invoiceYear = invoiceDate.getFullYear().toString();
        const invoiceQuarter = getQuarterFromDate(invoiceDate);
        
        // Si no hay filtro de año, mostrar todas
        if (!year) return true;
        
        // Si el año no coincide, filtrar
        if (invoiceYear !== year) return false;
        
        // Si hay filtro de trimestre específico
        if (period && period !== 'all') {
          const periodUpper = period.toString().toUpperCase();
          if (periodUpper.startsWith('Q') && /^Q[1-4]$/.test(periodUpper)) {
            const requestedQuarter = parseInt(periodUpper.replace('Q', ''));
            return invoiceQuarter === requestedQuarter;
          }
          return false;
        }
        
        // Si tiene el año correcto y no hay filtro de trimestre, incluirla
        return true;
      });
      
      // Filtrar transacciones
      const filteredTransactions = transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        const txnYear = txnDate.getFullYear().toString();
        const txnQuarter = getQuarterFromDate(txnDate);
        
        // Si no hay filtro de año, mostrar todas
        if (!year) return true;
        
        // Si el año no coincide, filtrar
        if (txnYear !== year) return false;
        
        // Si hay filtro de trimestre específico
        if (period && period !== 'all') {
          const periodUpper = period.toString().toUpperCase();
          if (periodUpper.startsWith('Q') && /^Q[1-4]$/.test(periodUpper)) {
            const requestedQuarter = parseInt(periodUpper.replace('Q', ''));
            return txnQuarter === requestedQuarter;
          }
          return false;
        }
        
        // Si tiene el año correcto y no hay filtro de trimestre, incluirla
        return true;
      });
      
      // CÁLCULOS BÁSICOS
      
      // 1. Facturas
      const issuedCount = filteredInvoices.length;
      const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid');
      const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'pending');
      const pendingCount = pendingInvoices.length;
      
      // 2. Ingresos
      const invoiceIncome = paidInvoices.reduce((sum, invoice) => {
        const total = parseFloat(invoice.total || '0');
        return isNaN(total) ? sum : sum + total;
      }, 0);
      
      // 3. Base imponible
      const baseImponible = paidInvoices.reduce((sum, invoice) => {
        const subtotal = parseFloat(invoice.subtotal || '0');
        return isNaN(subtotal) ? sum : sum + subtotal;
      }, 0);
      
      // 4. IVA repercutido
      let ivaRepercutido = 0;
      if (baseImponible > 0) {
        ivaRepercutido = invoiceIncome - baseImponible;
      } else {
        ivaRepercutido = invoiceIncome * 0.21;
      }
      
      // 5. Gastos
      const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
      
      let totalBaseImponibleGastos = 0;
      let totalIvaSoportado = 0;
      let totalIrpfGastos = 0;
      
      // Procesar cada transacción de gasto
      for (const transaction of expenseTransactions) {
        try {
          const totalAmount = parseFloat(transaction.amount || '0');
          
          let baseAmount = totalAmount;
          let ivaAmount = 0;
          let irpfAmount = 0;
          
          // Simplificado para debug
          totalBaseImponibleGastos += baseAmount;
        } catch (error) {
          console.error("Error procesando gasto:", error);
        }
      }
      
      // 6. Base imponible gastos
      const baseImponibleGastos = totalBaseImponibleGastos;
      
      // 7. IVA soportado
      const ivaSoportado = totalIvaSoportado;
      
      // 8. IRPF retenido (en ingresos)
      const irpfRetenidoIngresos = paidInvoices.reduce((sum, invoice) => {
        // Simplificado
        const irpf = baseImponible * 0.07; // Estimación
        return sum + irpf;
      }, 0);
      
      // 9. IVA a liquidar
      const ivaALiquidar = ivaRepercutido - ivaSoportado;
      
      // 10. IRPF total
      const irpfTotal = irpfRetenidoIngresos + totalIrpfGastos;
      
      // 11. Resultado neto
      const resultado = baseImponible - baseImponibleGastos - irpfTotal;
      
      // Actualizar el estado del dashboard
      try {
        // Generar timestamp exacto
        const now = new Date();
        
        // Buscar si ya existe un estado para este usuario
        const existingState = await db
          .select()
          .from(dashboardState)
          .where(eq(dashboardState.userId, userId));
        
        if (existingState.length > 0) {
          // Actualizar el registro existente
          await db
            .update(dashboardState)
            .set({
              lastEventType: 'dashboard-stats-calculated',
              updatedAt: now
            })
            .where(eq(dashboardState.userId, userId));
        } else {
          // Crear un nuevo registro
          await db
            .insert(dashboardState)
            .values({
              userId,
              lastEventType: 'dashboard-stats-calculated',
              updatedAt: now
            });
        }
        
        console.log(`✅ Estado del dashboard actualizado: dashboard-stats-calculated para usuario ${userId} con timestamp ${now.toISOString()}`);
      } catch (error) {
        console.error(`❌ Error al actualizar estado del dashboard:`, error);
      }
      
      // Devolver los datos calculados
      return res.status(200).json({
        income: Math.round(baseImponible),
        expenses: Math.round(baseImponibleGastos),
        pendingInvoices: Math.round(pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0)),
        pendingCount,
        baseImponible: Math.round(baseImponible),
        baseImponibleGastos: Math.round(baseImponibleGastos),
        ivaRepercutido: Math.round(ivaRepercutido),
        ivaSoportado: Math.round(ivaSoportado),
        irpfRetenidoIngresos: Math.round(irpfRetenidoIngresos),
        period: period || 'all',
        year,
        totalWithholdings: Math.round(irpfTotal),
        netIncome: Math.round(baseImponible),
        netExpenses: Math.round(baseImponibleGastos),
        netResult: Math.round(resultado),
        taxes: { 
          vat: Math.round(ivaALiquidar), 
          incomeTax: Math.round(irpfTotal), 
          ivaALiquidar: Math.round(ivaALiquidar)
        },
        taxStats: {
          ivaRepercutido: Math.round(ivaRepercutido),
          ivaSoportado: Math.round(ivaSoportado),
          ivaLiquidar: Math.round(ivaALiquidar),
          irpfRetenido: Math.round(irpfRetenidoIngresos),
          irpfTotal: Math.round(irpfTotal),
          irpfPagar: Math.round(irpfTotal - irpfRetenidoIngresos)
        },
        issuedCount,
        invoices: {
          total: issuedCount,
          pending: pendingCount,
          paid: paidInvoices.length,
          overdue: pendingInvoices.filter(inv => new Date(inv.dueDate) < new Date()).length,
          totalAmount: Math.round(invoiceIncome)
        }
      });
    } catch (error) {
      console.error(`❌ Error general procesando dashboard-direct:`, error);
      return res.status(500).json({
        message: "Error al generar estadísticas del dashboard"
      });
    }
  });
  
  console.log("✅ Endpoint directo para el dashboard registrado con éxito");
}