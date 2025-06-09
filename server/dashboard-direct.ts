import { Request, Response, NextFunction } from 'express';
import { Express } from 'express';
import { storage } from './storage';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from './db';
import { dashboardState, transactions, categories, invoices } from '../shared/schema';
import { expenses } from "../shared/enhanced-schema";

// Función auxiliar para formatear moneda
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// Interfaz para impuestos adicionales
interface AdditionalTax {
  name: string;
  rate: string;
  amount?: number;
}

// Interfaz para facturas
interface Invoice {
  id?: number | string;
  subtotal?: string | number;
  total?: string | number;
  status?: string;
  additionalTaxes?: AdditionalTax[] | null;
  // otros campos de factura
  issueDate: string;
  dueDate: string;
}

// Validación para detectar si los datos de IRPF son coherentes
function validateIrpfData(invoices: any[], irpfRetenidoIngresos: number): { isValid: boolean; message: string } {
  try {
    // Comprobar si hay facturas con IRPF pero el total calculado es 0 o muy pequeño
    let hasIrpfInvoices = false;
    let irpfInvoicesCount = 0;
    
    for (const invoice of invoices) {
      // Solo revisar facturas pagadas
      if (invoice.status !== 'paid') continue;
      
      const additionalTaxes = invoice.additionalTaxes || [];
      
      // Detectar si alguna factura tiene impuesto IRPF
      for (const tax of additionalTaxes) {
        if (tax.name && 
            tax.name.toLowerCase().includes('irpf') && 
            tax.rate && 
            parseFloat(tax.rate) < 0) {
          hasIrpfInvoices = true;
          irpfInvoicesCount++;
          break;
        }
      }
    }
    
    // Si hay facturas con IRPF pero el total calculado es muy bajo, puede indicar un problema
    if (hasIrpfInvoices && irpfRetenidoIngresos < 10 && irpfInvoicesCount > 0) {
      return { 
        isValid: false, 
        message: `Posible error en cálculo de IRPF: Se encontraron ${irpfInvoicesCount} facturas con IRPF pero el total calculado es muy bajo (${irpfRetenidoIngresos.toFixed(2)}€)` 
      };
    }
    
    return { isValid: true, message: 'Validación de IRPF correcta' };
  } catch (error) {
    console.error('Error validando datos de IRPF:', error);
    // En caso de error, permitir la actualización pero registrar el problema
    return { isValid: true, message: 'Error en validación de IRPF, permitiendo actualización: ' + error };
  }
}

// Middleware simplificado para autenticación que siempre permite acceso en desarrollo
export const simplifiedAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Si ya está autenticado con session.userId, permitir
    if (req.session && req.session.userId) {
      console.log("✅ Acceso a dashboard-fix permitido - Usuario autenticado vía userId en sesión:", req.session.userId);
      return next();
    }
    
    // Para desarrollo, comprobar si estamos en modo integrado o con autenticación real
    if (process.env.NODE_ENV !== 'production') {
      // Solo usar el bypass si realmente no hay un usuario autenticado
      // Esto permite que los administradores como perlancelot mantengan su identidad
      if (!req.isAuthenticated() && !req.user) {
        console.log("✅ Acceso a dashboard-fix permitido - Usuario autenticado vía bypass de desarrollo (ID=1)");
        return next();
      } else {
        console.log("✅ Acceso a dashboard-fix permitido - Usuario ya autenticado:", req.user ? (req.user as any).username : "desconocido");
        return next();
      }
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
      
      // Obtener el ID del usuario para el que se mostrarán los datos
      let userId: number;
      
      // 1. Verificar si está en la URL (parámetro explícito)
      if (req.query.userId) {
        userId = parseInt(req.query.userId as string, 10);
        console.log(`📊 Usando ID de usuario de URL: ${userId}`);
      }
      // 2. Verificar si está en el header X-User-ID (enviado desde el cliente frontend)
      else if (req.headers['x-user-id']) {
        userId = parseInt(req.headers['x-user-id'] as string, 10);
        console.log(`📊 Usando ID de usuario del header X-User-ID: ${userId}`);
      } 
      // 3. Si el usuario está autenticado, usar su ID real
      else if (req.user) {
        userId = (req.user as any).id;
        console.log(`📊 Usando ID de usuario autenticado: ${userId}`);
      } 
      // 4. Si hay un ID en la sesión, usarlo
      else if (req.session?.userId) {
        userId = req.session.userId;
        console.log(`📊 Usando ID de usuario en sesión: ${userId}`);
      }
      // 5. Como último recurso, si no hay autenticación, usar el usuario demo
      else {
        userId = 1; // Usuario demo como fallback
        console.log(`📊 Usando ID de usuario demo por defecto: ${userId}`);
      }
      
      // Verificar si hay un administrador original viendo como cliente
      const originalAdmin = req.session?.originalAdmin;
      if (originalAdmin) {
        console.log(`📊 Admin original ${originalAdmin.username} está viendo los datos del usuario ${userId}`);
      }
      
      // Validación adicional para depuración
      const headerKeys = Object.keys(req.headers).filter(key => 
        key.toLowerCase().includes('user') || 
        key.toLowerCase().includes('auth') || 
        key.toLowerCase().includes('session')
      );
      
      console.log("📊 Headers relacionados con autenticación:", headerKeys);
      console.log("📊 Cookies disponibles:", req.headers.cookie ? "Sí" : "No");
      
      // Registrar parámetros de URL para diagnóstico
      console.log("📊 Parámetros de URL:", Object.keys(req.query).map(k => `${k}=${req.query[k]}`).join(", "));
      
      // Información de diagnóstico adicional
      console.log(`📊 ID DEFINITIVO USADO PARA CARGAR DATOS: ${userId}`);
      console.log(`📊 SESSIÓN ID: ${req.sessionID || 'No disponible'}`);
      console.log(`📊 USUARIO AUTENTICADO: ${req.isAuthenticated() ? 'Sí' : 'No'}`);
      
      // Obtener datos de facturas
      const invoices = await storage.getInvoicesByUserId(userId);
      const transactions = await storage.getTransactionsByUserId(userId);
      
      // Comprobación adicional para validar que estamos obteniendo datos
      console.log(`📊 Datos obtenidos: ${invoices.length} facturas, ${transactions.length} transacciones para usuario ${userId}`);
      
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
      
      // 5. Gastos - CORREGIDO: Usar datos fiscales reales cuando estén disponibles
      const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
      
      let totalBaseImponibleGastos = 0;
      let totalIvaSoportado = 0;
      let totalIrpfGastos = 0;
      let totalExpenses = 0; // Total de gastos (incluye IVA)
      
      // NUEVOS CÁLCULOS FISCALES ESPECÍFICOS
      let totalGastosDeducibles = 0;      // Cifra neta de gastos que sean deducibles
      let totalIvaDeducible = 0;          // IVA soportado que sea deducible
      
      console.log(`📊 Procesando ${expenseTransactions.length} transacciones de gastos para cálculos fiscales específicos`);
      
      // Obtener gastos directamente de la tabla expenses (gastos con datos fiscales detallados)
      let expenseRecords: any[] = [];
      try {
        expenseRecords = await db
          .select()
          .from(expenses)
          .where(eq(expenses.userId, userId));
        console.log(`📊 Encontrados ${expenseRecords.length} gastos en la tabla expenses con datos fiscales detallados`);
        
        // LOG DETALLADO: Mostrar todos los registros de gastos encontrados
        expenseRecords.forEach((record, index) => {
          console.log(`📊 Gasto ${index + 1}:`, {
            transactionId: record.transactionId,
            netAmount: record.netAmount,
            vatAmount: record.vatAmount,
            irpfAmount: record.irpfAmount,
            totalAmount: record.totalAmount,
            vatDeductiblePercent: record.vatDeductiblePercent,
            deductiblePercent: record.deductiblePercent
          });
        });
      } catch (error) {
        console.log(`❌ Error obteniendo gastos de la tabla expenses:`, (error as Error).message);
        expenseRecords = [];
      }
      
      // Procesar cada transacción de gasto para calcular correctamente
      for (const transaction of expenseTransactions) {
        try {
          // Buscar datos fiscales específicos para esta transacción
          const fiscalData = expenseRecords.find(expense => expense.transactionId === transaction.id);
          
          if (fiscalData) {
            // Usar datos fiscales reales
            const netAmount = parseFloat(fiscalData.netAmount || '0');
            const vatAmount = parseFloat(fiscalData.vatAmount || '0');
            const irpfAmount = parseFloat(fiscalData.irpfAmount || '0');
            const totalAmount = parseFloat(fiscalData.totalAmount || '0');
            const vatDeductiblePercent = parseFloat(fiscalData.vatDeductiblePercent || '100');
            const deductiblePercent = parseFloat(fiscalData.deductiblePercent || '100');
            
            // LOGS DETALLADOS DE CADA CAMPO
            console.log(`📊 GASTO ${transaction.id} - Datos raw de la BD:`, {
              netAmount: fiscalData.netAmount,
              vatAmount: fiscalData.vatAmount,
              irpfAmount: fiscalData.irpfAmount,
              totalAmount: fiscalData.totalAmount,
              vatDeductiblePercent: fiscalData.vatDeductiblePercent,
              deductiblePercent: fiscalData.deductiblePercent
            });
            
            console.log(`📊 GASTO ${transaction.id} - Datos parseados:`, {
              netAmount,
              vatAmount,
              irpfAmount,
              totalAmount,
              vatDeductiblePercent,
              deductiblePercent
            });
            
            totalBaseImponibleGastos += netAmount;
            totalIvaSoportado += vatAmount;
            totalIrpfGastos += irpfAmount;
            totalExpenses += totalAmount;
            
            // CORREGIDO: Aplicar porcentajes de deducibilidad reales
            const gastosDeduciblesCalculado = netAmount * (deductiblePercent / 100);
            const ivaDeducibleCalculado = vatAmount * (vatDeductiblePercent / 100);
            
            totalGastosDeducibles += gastosDeduciblesCalculado;
            totalIvaDeducible += ivaDeducibleCalculado;
            
            console.log(`📊 GASTO ${transaction.id} - Cálculos de deducibilidad:`, {
              gastosDeduciblesCalculado,
              ivaDeducibleCalculado,
              deductiblePercent,
              vatDeductiblePercent
            });
            
            console.log(`📊 Gasto ID ${transaction.id} (datos fiscales): Base=${netAmount}€, IVA=${vatAmount}€, IRPF=${irpfAmount}€, Total=${totalAmount}€`);
            console.log(`📊 Gasto ID ${transaction.id} (deducibilidad): BaseDeducible=${gastosDeduciblesCalculado}€, IVADeducible=${ivaDeducibleCalculado}€`);
          } else {
            // Fallback: usar el importe total de la transacción y estimar
            const amount = parseFloat(transaction.amount || '0');
            totalExpenses += amount;
            
            // Estimación simple (solo si no hay datos fiscales)
            const estimatedBase = amount / 1.21;
            const estimatedVat = amount - estimatedBase;
            
            totalBaseImponibleGastos += estimatedBase;
            totalIvaSoportado += estimatedVat;
            totalGastosDeducibles += estimatedBase;
            totalIvaDeducible += estimatedVat;
            
            console.log(`📊 Gasto ID ${transaction.id} (estimado): Base=${estimatedBase.toFixed(2)}€, IVA=${estimatedVat.toFixed(2)}€, Total=${amount}€`);
          }
        } catch (error) {
          console.error(`❌ Error procesando transacción ${transaction.id}:`, error);
        }
      }
      
      console.log(`📊 TOTALES GASTOS: Base=${totalBaseImponibleGastos.toFixed(2)}€, IVA=${totalIvaSoportado.toFixed(2)}€, IRPF=${totalIrpfGastos.toFixed(2)}€, Total=${totalExpenses.toFixed(2)}€`);
      
      // 6. Base imponible gastos
      const baseImponibleGastos = totalBaseImponibleGastos;
      
      // 7. IVA soportado
      const ivaSoportado = totalIvaSoportado;
      
      // 8. IRPF retenido (en ingresos)
      let irpfRetenidoIngresos = paidInvoices.reduce((sum, invoice) => {
        try {
          // Obtener los impuestos adicionales (donde debería estar el IRPF)
          const additionalTaxes = invoice.additionalTaxes || [];
          
          // Buscar si existe un impuesto de tipo IRPF (con porcentaje negativo)
          let irpfAmount = 0;
          const taxesArray = Array.isArray(additionalTaxes) ? additionalTaxes : [];
          for (const tax of taxesArray) {
            // El IRPF generalmente tiene un nombre que lo identifica y un valor negativo
            if (
              tax.name && 
              tax.name.toLowerCase().includes('irpf') && 
              tax.rate
            ) {
              // Verificar si es valor negativo (como -15, -7, etc.)
              const taxRate = parseFloat(tax.rate);
              // Asegurar que estamos tratando con valores negativos, pero usando su valor absoluto
              if (taxRate < 0) {
                // Calcular el monto del IRPF basado en la base imponible de la factura
                const subtotal = parseFloat(invoice.subtotal || '0');
                const irpfValue = subtotal * (Math.abs(taxRate) / 100);
                irpfAmount += irpfValue;
                console.log(`📊 Detectado IRPF en factura ${invoice.id}: ${tax.rate}%, base: ${subtotal.toFixed(2)}€, monto: ${irpfValue.toFixed(2)}€`);
              } else {
                console.warn(`⚠️ IRPF con tasa positiva (${taxRate}%) en factura ${invoice.id}. Debería ser negativo.`);
              }
            }
          }
          
          return sum + irpfAmount;
        } catch (error) {
          console.error(`Error procesando IRPF de factura ${invoice.id || 'desconocida'}:`, error);
          // Si hay error, mantener el cálculo anterior como fallback
          const irpfEstimated = parseFloat(invoice.subtotal || '0') * 0.15; // Usar 15% como estimación por defecto
          console.warn(`⚠️ Usando estimación de IRPF: ${irpfEstimated.toFixed(2)}€ para factura ${invoice.id}`);
          return sum + irpfEstimated;
        }
      }, 0);
      
      // 9. IVA a liquidar
      const ivaALiquidar = ivaRepercutido - ivaSoportado;
      
      // 10. IRPF total
      let irpfTotal = irpfRetenidoIngresos + totalIrpfGastos;
      
      // 11. Resultado neto
      let resultado = baseImponible - baseImponibleGastos - irpfTotal;
      
      // Validar datos del IRPF antes de actualizar el estado
      const irpfValidation = validateIrpfData(paidInvoices, irpfRetenidoIngresos);
      
      // Si hay un problema con los datos de IRPF, registrar advertencia
      if (!irpfValidation.isValid) {
        console.warn(`⚠️ ${irpfValidation.message}`);
        // No bloqueamos la actualización, pero añadimos datos de diagnóstico
        console.log('📊 Diagnóstico IRPF:');
        console.log(`- Total de facturas pagadas: ${paidInvoices.length}`);
        console.log(`- Total IRPF calculado: ${irpfRetenidoIngresos.toFixed(2)}€`);
        console.log(`- Total base imponible: ${baseImponible.toFixed(2)}€`);
        
        // Intentar corregir el valor del IRPF si está muy bajo pero debería tener
        let irpfCorregido = irpfRetenidoIngresos;
        if (baseImponible > 1000 && irpfRetenidoIngresos < 10) {
          console.log('🔄 Corrigiendo valor de IRPF basado en base imponible');
          // Usar una estimación del 15% sobre la base imponible como último recurso
          irpfCorregido = baseImponible * 0.15;
          console.log(`- Nuevo valor estimado IRPF: ${irpfCorregido.toFixed(2)}€`);
          // Actualizamos el valor total
          irpfTotal = irpfCorregido + totalIrpfGastos;
          // Recalculamos el resultado
          resultado = baseImponible - baseImponibleGastos - irpfTotal;
        }
        
        // Usar el valor corregido
        irpfRetenidoIngresos = irpfCorregido;
      }
      
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
        irpfGastos: Math.round(totalIrpfGastos),
        period: period || 'all',
        year,
        totalWithholdings: Math.round(irpfTotal),
        netIncome: Math.round(baseImponible),
        netExpenses: Math.round(baseImponibleGastos),
        netResult: Math.round(resultado),
        
        // NUEVOS CAMPOS FISCALES ESPECÍFICOS
        gastosDeducibles: Math.round(totalGastosDeducibles),      // Cifra neta de gastos deducibles
        ivaDeducible: Math.round(totalIvaDeducible),             // IVA soportado deducible
        resultadoFiscal: Math.round(baseImponible - totalGastosDeducibles), // Resultado: neto ingresos - neto gastos deducibles
        ivaAIngresar: Math.round(ivaRepercutido - totalIvaDeducible),        // IVA a ingresar: IVA ingresos - IVA deducible
        
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
          irpfPagar: Math.round(irpfTotal - irpfRetenidoIngresos),
          
          // NUEVOS CAMPOS EN TAX STATS
          gastosDeducibles: Math.round(totalGastosDeducibles),
          ivaDeducible: Math.round(totalIvaDeducible),
          resultadoFiscal: Math.round(baseImponible - totalGastosDeducibles),
          ivaAIngresar: Math.round(ivaRepercutido - totalIvaDeducible)
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