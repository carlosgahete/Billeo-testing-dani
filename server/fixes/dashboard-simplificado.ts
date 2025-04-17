import { Request, Response } from 'express';
import { IStorage } from '../storage';

/**
 * Endpoint simplificado para el dashboard que solo realiza cálculos básicos
 * para garantizar que los datos se muestren correctamente
 */
export function setupSimplifiedDashboardEndpoint(
  app: any, 
  requireAuth: any, 
  storage: IStorage
) {
  app.get("/api/stats/dashboard-fix", requireAuth, async (req: Request, res: Response) => {
    try {
      console.log("Iniciando manejo de solicitud a /api/stats/dashboard-fix - VERSIÓN SIMPLIFICADA");
      
      // Configurar encabezados para evitar almacenamiento en caché de datos financieros
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Expires', '0');
      res.setHeader('Pragma', 'no-cache');
      
      // Obtener parámetros de filtrado del usuario
      const { year, period, timestamp } = req.query;
      
      // Registrar la consulta para depuración
      const formattedDate = timestamp ? new Date(timestamp as string).toISOString() : new Date().toISOString();
      console.log(`📊 Consultando datos fiscales [SIMPLIFICADO]: { year: '${year}', period: '${period}', timestamp: '${formattedDate}' }`);
      
      // Obtener el ID del usuario autenticado
      const userId = req.session.userId;
      
      try {
        // Obtener datos de facturas
        const invoices = await storage.getInvoicesByUserId(userId);
        
        // Calcular años únicos para mostrar en filtros
        const uniqueYears = [...new Set(invoices.map(inv => new Date(inv.issueDate).getFullYear()))];
        console.log("Años de transacciones:", uniqueYears);
        
        // Filtrar facturas por año si se proporciona, pero nunca filtrar por año si estamos en 'all'
        const filteredInvoices = (year && year !== 'all')
          ? invoices.filter(invoice => {
              // Verificamos si la factura tiene fecha válida
              if (!invoice.issueDate) return true; // Incluir facturas sin fecha
              const invoiceYear = new Date(invoice.issueDate).getFullYear();
              return invoiceYear.toString() === year;
            })
          : invoices; // Si year es 'all' o no se proporciona, incluir todas las facturas
          
        // Obtener datos de transacciones
        const transactions = await storage.getTransactionsByUserId(userId);
        
        // Filtrar transacciones por año, pero nunca filtrar si estamos en 'all'
        const filteredTransactions = (year && year !== 'all')
          ? transactions.filter(txn => {
              // Verificamos si la transacción tiene fecha válida
              if (!txn.date) return true; // Incluir transacciones sin fecha
              const txnYear = new Date(txn.date).getFullYear();
              return txnYear.toString() === year;
            })
          : transactions; // Si year es 'all' o no se proporciona, incluir todas las transacciones
          
        // Obtener datos de presupuestos
        const quotes = await storage.getQuotesByUserId(userId);
        
        // CÁLCULOS BÁSICOS
        
        // 1. Facturas
        const issuedCount = filteredInvoices.length;
        const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid');
        const pendingInvoices = filteredInvoices.filter(inv => inv.status === 'pending');
        const pendingCount = pendingInvoices.length;
        
        // 2. Ingresos
        // Calculamos los ingresos como la suma de los totales de facturas pagadas
        const invoiceIncome = paidInvoices.reduce((sum, invoice) => {
          const total = parseFloat(invoice.total || '0');
          return isNaN(total) ? sum : sum + total;
        }, 0);
        
        // 3. Base imponible (subtotal sin IVA)
        const baseImponible = paidInvoices.reduce((sum, invoice) => {
          const subtotal = parseFloat(invoice.subtotal || '0');
          return isNaN(subtotal) ? sum : sum + subtotal;
        }, 0);
        
        // 4. IVA repercutido (de ingresos)
        // Si tenemos subtotal, usamos la diferencia con el total, si no estimamos 21%
        let ivaRepercutido = 0;
        if (baseImponible > 0) {
          ivaRepercutido = invoiceIncome - baseImponible;
        } else {
          ivaRepercutido = invoiceIncome * 0.21;
        }
        
        // 5. Gastos
        // Calculamos los gastos como la suma de los importes de transacciones de gastos
        const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
        
        // Variables para acumular totales correctos
        let totalBaseImponibleGastos = 0;
        let totalIvaSoportado = 0;
        let totalIrpfGastos = 0;
        
        // Procesar cada transacción de gasto individualmente para obtener los valores reales
        for (const transaction of expenseTransactions) {
          try {
            // Obtener el monto total y defaultear a la base imponible
            const totalAmount = parseFloat(transaction.amount || '0');
            
            // Variables para cada transacción individual
            let baseAmount = totalAmount;
            let ivaAmount = 0;
            let irpfAmount = 0;
            let ivaRate = 0;
            let irpfRate = 0;
            
            // Procesar additionalTaxes para obtener los valores reales
            if (transaction.additionalTaxes) {
              let taxes: any[] = [];
              if (typeof transaction.additionalTaxes === 'string') {
                taxes = JSON.parse(transaction.additionalTaxes);
              } else if (Array.isArray(transaction.additionalTaxes)) {
                taxes = transaction.additionalTaxes;
              }
              
              // Extraer tasas de IVA e IRPF
              for (const tax of taxes) {
                if (tax && tax.name === 'IVA') {
                  ivaRate = Math.abs(parseFloat(tax.amount) || 0);
                  // Si tenemos el valor exacto del IVA, úsalo
                  if (tax.value) {
                    ivaAmount = parseFloat(tax.value);
                    // En este caso, calculamos la base hacia atrás
                    if (ivaRate > 0) {
                      baseAmount = (ivaAmount * 100) / ivaRate;
                    }
                  }
                } else if (tax && tax.name === 'IRPF') {
                  irpfRate = Math.abs(parseFloat(tax.amount) || 0);
                  // Si tenemos el valor exacto del IRPF, úsalo
                  if (tax.value) {
                    irpfAmount = parseFloat(tax.value);
                  }
                }
              }
              
              // Si no tenemos el valor exacto del IVA pero sí la tasa
              if (ivaAmount === 0 && ivaRate > 0) {
                // Calcular base imponible correctamente
                baseAmount = totalAmount / (1 + (ivaRate / 100));
                ivaAmount = totalAmount - baseAmount;
              }
              
              // Si no tenemos el valor exacto del IRPF pero sí la tasa
              if (irpfAmount === 0 && irpfRate > 0) {
                irpfAmount = (baseAmount * irpfRate) / 100;
              }
            }
            
            // Ajustar valores con precisión
            baseAmount = parseFloat(baseAmount.toFixed(2));
            ivaAmount = parseFloat(ivaAmount.toFixed(2));
            irpfAmount = parseFloat(irpfAmount.toFixed(2));
            
            // Acumular totales
            totalBaseImponibleGastos += baseAmount;
            totalIvaSoportado += ivaAmount;
            totalIrpfGastos += irpfAmount;
            
            // Log para depuración
            console.log(`Gasto procesado: ID=${transaction.id}, Total=${totalAmount}, Base=${baseAmount}, IVA=${ivaAmount}, IRPF=${irpfAmount}`);
          } catch (error) {
            console.error("Error procesando gasto:", error);
          }
        }
        
        // 6. Base imponible total de gastos (valor REAL, no estimado)
        const baseImponibleGastos = totalBaseImponibleGastos;
        
        // 7. IVA soportado total (valor REAL, no estimado)
        const ivaSoportado = totalIvaSoportado;
        
        // 8. IRPF retenido (en ingresos)
        let irpfRetenidoIngresos = 0;
        for (const invoice of paidInvoices) {
          try {
            if (invoice.additionalTaxes) {
              let taxes: any[] = [];
              if (typeof invoice.additionalTaxes === 'string') {
                taxes = JSON.parse(invoice.additionalTaxes);
              } else if (Array.isArray(invoice.additionalTaxes)) {
                taxes = invoice.additionalTaxes;
              }
              
              for (const tax of taxes) {
                if (tax && typeof tax === 'object' && tax.name === 'IRPF') {
                  const subtotal = parseFloat(invoice.subtotal || '0');
                  if (tax.isPercentage) {
                    irpfRetenidoIngresos += (Math.abs(tax.amount) * subtotal) / 100;
                  } else {
                    irpfRetenidoIngresos += Math.abs(tax.amount);
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error procesando IRPF de factura:", e);
          }
        }
        
        // 9. IRPF de gastos
        let totalIrpfFromExpensesInvoices = totalIrpfGastos;
        
        // 10. Balance de IVA
        const vatBalance = ivaRepercutido - ivaSoportado;
        const vatBalanceFinal = vatBalance > 0 ? vatBalance : 0;
        
        // 11. Balance de IRPF
        const incomeTaxFinal = irpfRetenidoIngresos > 0 ? irpfRetenidoIngresos : 0;
        
        // 12. Presupuestos
        const pendingQuotesTotal = quotes
          .filter(quote => quote.status === 'pending')
          .reduce((sum, quote) => {
            const total = parseFloat(quote.total || '0');
            return isNaN(total) ? sum : sum + total;
          }, 0);
        
        const pendingQuotesCount = quotes.filter(quote => quote.status === 'pending').length;
        const acceptedQuotesCount = quotes.filter(quote => quote.status === 'accepted').length;
        const rejectedQuotesCount = quotes.filter(quote => quote.status === 'rejected').length;
        const allQuotesCount = quotes.length;
        
        // 13. Fecha del último presupuesto
        const lastQuote = quotes.sort((a, b) => 
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
        )[0];
        
        const lastQuoteDate = lastQuote ? new Date(lastQuote.issueDate) : null;
        
        // 14. Balance bruto y neto
        const balance = baseImponible - baseImponibleGastos;
        const result = balance - vatBalanceFinal - incomeTaxFinal;
        
        // 15. Valores netos
        const netIncome = baseImponible - irpfRetenidoIngresos;
        const netExpenses = baseImponibleGastos - totalIrpfFromExpensesInvoices;
        const netResult = netIncome - netExpenses;
        
        // 16. Estadísticas de períodos
        const quarterIncome = invoiceIncome;
        const quarterCount = filteredInvoices.length;
        const yearIncome = invoiceIncome;
        const yearCount = filteredInvoices.length;
        
        // Estructura para organizar información fiscal
        const taxStats = {
          ivaRepercutido,
          ivaSoportado,
          ivaLiquidar: vatBalanceFinal,
          irpfRetenido: irpfRetenidoIngresos,
          irpfTotal: irpfRetenidoIngresos + totalIrpfFromExpensesInvoices,
          irpfPagar: incomeTaxFinal
        };
        
        // Calculamos expenses como la suma total por compatibilidad con logs antiguos
        const expenses = totalBaseImponibleGastos + totalIvaSoportado;
        
        console.log("=== RESUMEN DE CÁLCULOS SIMPLIFICADOS ===");
        console.log(`Ingresos (facturas pagadas): ${invoiceIncome}€`);
        console.log(`Base imponible ingresos: ${baseImponible}€`);
        console.log(`IVA repercutido: ${ivaRepercutido}€`);
        console.log(`Gastos (transacciones): ${expenses}€`);
        console.log(`Base imponible gastos: ${baseImponibleGastos}€`);
        console.log(`IVA soportado: ${ivaSoportado}€`);
        console.log(`IRPF retenido: ${irpfRetenidoIngresos}€`);
        console.log(`IRPF en gastos: ${totalIrpfGastos}€`);
        console.log(`Balance bruto: ${balance}€`);
        console.log(`Resultado neto: ${result}€`);
        
        // Preparar respuesta segura
        
        // Función para asegurar valores numéricos
        const safeNumber = (value: any): number => {
          if (typeof value !== 'number' || isNaN(value)) return 0;
          return parseFloat(value.toFixed(2)); // Redondeo a 2 decimales
        };
        
        // Preparar respuesta con valores seguros
        return res.status(200).json({
          // Valores principales 
          income: safeNumber(baseImponible),
          expenses: safeNumber(baseImponibleGastos),
          pendingInvoices: safeNumber(pendingInvoices.reduce((sum, i) => sum + parseFloat(i.total || '0'), 0)),
          pendingCount,
          pendingQuotes: safeNumber(pendingQuotesTotal),
          pendingQuotesCount,
          balance: safeNumber(balance),
          result: safeNumber(result),
          
          // Valores de compatibilidad
          baseImponible: safeNumber(baseImponible),
          baseImponibleGastos: safeNumber(baseImponibleGastos),
          
          // Impuestos principales
          ivaRepercutido: safeNumber(ivaRepercutido),
          ivaSoportado: safeNumber(ivaSoportado),
          irpfRetenidoIngresos: safeNumber(irpfRetenidoIngresos),
          
          // Datos para filtrado
          period,
          year,
          
          // Datos internos
          totalWithholdings: safeNumber(totalIrpfFromExpensesInvoices),
          
          // Valores netos
          netIncome: safeNumber(netIncome),
          netExpenses: safeNumber(netExpenses),
          netResult: safeNumber(netResult),
          
          // Estructura de impuestos
          taxes: {
            vat: safeNumber(vatBalanceFinal),
            incomeTax: safeNumber(incomeTaxFinal),
            ivaALiquidar: safeNumber(vatBalanceFinal)
          },
          
          // Estadísticas fiscales
          taxStats: {
            ivaRepercutido: safeNumber(ivaRepercutido),
            ivaSoportado: safeNumber(ivaSoportado),
            ivaLiquidar: safeNumber(vatBalanceFinal),
            irpfRetenido: safeNumber(irpfRetenidoIngresos),
            irpfTotal: safeNumber(irpfRetenidoIngresos + totalIrpfFromExpensesInvoices),
            irpfPagar: safeNumber(incomeTaxFinal)
          },
          
          // Contadores
          issuedCount,
          quarterCount,
          quarterIncome: safeNumber(quarterIncome),
          yearCount,
          yearIncome: safeNumber(yearIncome),
          
          // Información de facturas
          invoices: {
            total: issuedCount,
            pending: pendingCount,
            paid: issuedCount - pendingCount,
            overdue: 0,
            totalAmount: safeNumber(invoiceIncome)
          },
          
          // Información de presupuestos
          quotes: {
            total: allQuotesCount,
            pending: pendingQuotesCount,
            accepted: acceptedQuotesCount,
            rejected: rejectedQuotesCount
          },
          
          // Datos de presupuestos (compatibilidad)
          allQuotes: allQuotesCount,
          acceptedQuotes: acceptedQuotesCount,
          rejectedQuotes: rejectedQuotesCount,
          pendingQuotesCount,
          pendingQuotesTotal: safeNumber(pendingQuotesTotal),
          lastQuoteDate
        });
      } catch (error) {
        console.error("Error en el cálculo de datos del dashboard:", error);
        
        // En caso de error, devolver una respuesta mínima pero válida
        return res.status(200).json({
          income: 0,
          expenses: 0,
          pendingInvoices: 0,
          pendingCount: 0,
          balance: 0,
          result: 0,
          baseImponible: 0,
          baseImponibleGastos: 0,
          period,
          year,
          taxStats: {
            ivaRepercutido: 0,
            ivaSoportado: 0,
            ivaLiquidar: 0,
            irpfRetenido: 0,
            irpfTotal: 0,
            irpfPagar: 0
          }
        });
      }
    } catch (error) {
      console.error("Error crítico en el endpoint de dashboard:", error);
      return res.status(200).json({ 
        message: "Internal server error",
        income: 0, 
        expenses: 0, 
        pendingInvoices: 0, 
        pendingCount: 0,
        period: req.query.period || 'all',
        year: req.query.year || new Date().getFullYear().toString()
      });
    }
  });
}