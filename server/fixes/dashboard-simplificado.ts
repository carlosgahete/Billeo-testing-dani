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
        
        // Función auxiliar para obtener el trimestre de una fecha (1-4)
        const getQuarterFromDate = (date: Date): number => {
          const month = date.getMonth();
          if (month < 3) return 1; // Q1: Ene-Mar
          if (month < 6) return 2; // Q2: Abr-Jun
          if (month < 9) return 3; // Q3: Jul-Sep
          return 4; // Q4: Oct-Dic
        };
        
        console.log(`\n===== DETALLE DE TODAS LAS FACTURAS ANTES DEL FILTRADO =====`);
        console.log(`Total de facturas sin filtrar: ${invoices.length}`);
        invoices.forEach(invoice => {
          // Mostrar información detallada de cada factura
          const fecha = new Date(invoice.issueDate);
          const mes = fecha.getMonth() + 1; // getMonth() devuelve 0-11
          const trimestre = Math.ceil(mes / 3); // Calcula el trimestre (1-4)
          console.log(`Factura ID=${invoice.id}, Fecha=${fecha.toISOString().split('T')[0]}, Mes=${mes}, Trimestre=Q${trimestre}, Estado=${invoice.status}, Total=${invoice.total}`);
        });
        console.log(`===== FIN DETALLE FACTURAS SIN FILTRAR =====\n`);
        
        // Filtrar facturas por año y trimestre si se proporciona
        console.log(`🔎🔎🔎 DEBUG DE FILTRADO DE FACTURAS - año: ${year}, trimestre: ${period}`);
        
        const filteredInvoices = invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.issueDate);
          const invoiceYear = invoiceDate.getFullYear().toString();
          const invoiceQuarter = getQuarterFromDate(invoiceDate);
          
          console.log(`📋 DEBUG FACTURA: ID=${invoice.id}, fecha=${invoice.issueDate}, año=${invoiceYear}, trimestre=Q${invoiceQuarter}`);
          
          // Si no hay filtro de año, mostramos todas
          if (!year) {
            console.log(`✅ Factura ${invoice.id} incluida (no hay filtro de año)`);
            return true;
          }
          
          // Si el año no coincide, filtramos
          if (invoiceYear !== year) {
            console.log(`❌ Factura ${invoice.id} filtrada por año: ${invoiceYear} ≠ ${year}`);
            return false;
          }
          
          // Si hay filtro de trimestre específico
          if (period && period !== 'all') {
            try {
              // Si period comienza con 'Q' o 'q' y tiene un número después (Q1, q1, etc.)
              // Normalizamos siempre a mayúsculas para la comparación
              const periodUpper = period.toString().toUpperCase();
              if (periodUpper.startsWith('Q') && /^Q[1-4]$/.test(periodUpper)) {
                const requestedQuarter = parseInt(periodUpper.replace('Q', ''));
                const matches = invoiceQuarter === requestedQuarter;
                console.log(`🔍 Comparando trimestre de factura: ${invoiceQuarter} ${matches ? '=' : '≠'} ${requestedQuarter} (solicitado)`);
                return matches;
              } else {
                console.log(`⚠️ Formato de period no reconocido: '${period}', se esperaba Q1-Q4`);
              }
            } catch (error) {
              console.error(`❌ Error procesando period '${period}':`, error);
            }
            // Si hay un error o el formato no es reconocido, devolvemos false para ser conservadores
            return false;
          }
          
          // Si tiene el año correcto y no hay filtro de trimestre (o es 'all'), la incluimos
          console.log(`✅ Factura ${invoice.id} incluida (año ${invoiceYear})`);
          return true;
        });
          
        // Obtener datos de transacciones
        const transactions = await storage.getTransactionsByUserId(userId);
        
        // Filtrar transacciones por año y trimestre
        const filteredTransactions = transactions.filter(txn => {
          const txnDate = new Date(txn.date);
          const txnYear = txnDate.getFullYear().toString();
          const txnQuarter = getQuarterFromDate(txnDate);
          
          console.log(`💰 DEBUG TRANSACCIÓN: ID=${txn.id}, fecha=${txn.date}, año=${txnYear}, trimestre=Q${txnQuarter}, tipo=${txn.type}`);
          
          // Si no hay filtro de año, mostramos todas
          if (!year) {
            console.log(`✅ Transacción ${txn.id} incluida (no hay filtro de año)`);
            return true;
          }
          
          // Si el año no coincide, filtramos
          if (txnYear !== year) {
            console.log(`❌ Transacción ${txn.id} filtrada por año: ${txnYear} ≠ ${year}`);
            return false;
          }
          
          // Si hay filtro de trimestre específico
          if (period && period !== 'all') {
            try {
              // Normalizamos a mayúsculas para tener consistencia
              const periodUpper = period.toString().toUpperCase();
              // Si period comienza con 'Q' y tiene un número después (Q1, Q2, etc.)
              if (periodUpper.startsWith('Q') && /^Q[1-4]$/.test(periodUpper)) {
                const requestedQuarter = parseInt(periodUpper.replace('Q', ''));
                const matches = txnQuarter === requestedQuarter;
                console.log(`🔍 Comparando trimestre de transacción: ${txnQuarter} ${matches ? '=' : '≠'} ${requestedQuarter} (solicitado)`);
                return matches;
              } else {
                console.log(`⚠️ Formato de period no reconocido para transacciones: '${period}'`);
              }
            } catch (error) {
              console.error(`❌ Error procesando period '${period}' para transacciones:`, error);
            }
            // Si hay un error o el formato no es reconocido, devolvemos false para ser conservadores
            return false;
          }
          
          // Si tiene el año correcto y no hay filtro de trimestre, la incluimos
          console.log(`✅ Transacción ${txn.id} incluida (año ${txnYear})`);
          return true;
        });
          
        // Obtener datos de presupuestos
        const quotes = await storage.getQuotesByUserId(userId);
        
        // Filtrar presupuestos por año y trimestre
        const filteredQuotes = quotes.filter(quote => {
          const quoteDate = new Date(quote.issueDate);
          const quoteYear = quoteDate.getFullYear().toString();
          const quoteQuarter = getQuarterFromDate(quoteDate);
          
          console.log(`📝 DEBUG PRESUPUESTO: ID=${quote.id}, fecha=${quote.issueDate}, año=${quoteYear}, trimestre=Q${quoteQuarter}`);
          
          // Si no hay filtro de año, mostramos todos
          if (!year) {
            console.log(`✅ Presupuesto ${quote.id} incluido (no hay filtro de año)`);
            return true;
          }
          
          // Si el año no coincide, filtramos
          if (quoteYear !== year) {
            console.log(`❌ Presupuesto ${quote.id} filtrado por año: ${quoteYear} ≠ ${year}`);
            return false;
          }
          
          // Si hay filtro de trimestre específico
          if (period && period !== 'all') {
            try {
              // Normalizamos a mayúsculas para tener consistencia
              const periodUpper = period.toString().toUpperCase();
              // Si period comienza con 'Q' y tiene un número después (Q1, Q2, etc.)
              if (periodUpper.startsWith('Q') && /^Q[1-4]$/.test(periodUpper)) {
                const requestedQuarter = parseInt(periodUpper.replace('Q', ''));
                const matches = quoteQuarter === requestedQuarter;
                console.log(`🔍 Comparando trimestre de presupuesto: ${quoteQuarter} ${matches ? '=' : '≠'} ${requestedQuarter} (solicitado)`);
                return matches;
              } else {
                console.log(`⚠️ Formato de period no reconocido para presupuestos: '${period}'`);
              }
            } catch (error) {
              console.error(`❌ Error procesando period '${period}' para presupuestos:`, error);
            }
            // Si hay un error o el formato no es reconocido, devolvemos false para ser conservadores
            return false;
          }
          
          // Si tiene el año correcto y no hay filtro de trimestre, lo incluimos
          console.log(`✅ Presupuesto ${quote.id} incluido (año ${quoteYear})`);
          return true;
        });
        
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
        
        // Registramos el evento de cálculo en el estado del dashboard, 
        // incluyendo información sobre los filtros aplicados
        try {
          // Importar directamente el módulo de dashboard-state para asegurar que usamos la implementación correcta
          import('../dashboard-state').then(async (module) => {
            try {
              // Usar la función del módulo, no la global
              await module.updateDashboardState('dashboard-stats-calculated', { 
                year, 
                period, 
                filterInfo: {
                  year,
                  quarter: period,
                  timestamp: new Date().toISOString()
                },
                // Resumen de datos para debugging
                summary: {
                  income: safeNumber(baseImponible),
                  expenses: safeNumber(expenses),
                  invoiceCount: filteredInvoices.length,
                  transactionCount: filteredTransactions.length
                }
              }, userId);
              
              console.log(`✅ Estado del dashboard actualizado correctamente con filtros: año=${year}, trimestre=${period}`);
            } catch (importError) {
              console.error(`❌ Error al actualizar el dashboard usando el módulo importado:`, importError);
            }
          }).catch(importError => {
            console.error(`❌ Error al importar el módulo de dashboard-state:`, importError);
            
            // Intento alternativo usando la función global si está disponible
            if (typeof global.updateDashboardState === 'function') {
              try {
                // Usar la función global como último recurso
                global.updateDashboardState('dashboard-stats-calculated', { 
                  year, period, 
                  fallback: true, // Marcar como intento alternativo
                  timestamp: new Date().toISOString()
                }, userId);
                console.log(`✅ Estado del dashboard actualizado usando función global alternativa`);
              } catch (globalError) {
                console.error(`❌ Error usando updateDashboardState global:`, globalError);
              }
            } else {
              console.warn("⚠️ No se pudo acceder a ninguna implementación de updateDashboardState");
            }
          });
        } catch (notifyError) {
          console.error("❌ Error general al actualizar estado del dashboard:", notifyError);
        }
        
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
        
        // Actualizar el estado del dashboard para indicar el error
        try {
          // Importar directamente el módulo
          import('../dashboard-state').then(async (module) => {
            try {
              await module.updateDashboardState('dashboard-calculation-error', { 
                year, 
                period, 
                errorType: error?.name || 'Unknown',
                errorTime: new Date().toISOString()
              }, userId);
              
              console.log(`⚠️ Estado del dashboard actualizado con error de cálculo: año=${year}, trimestre=${period}`);
            } catch (moduleError) {
              console.error(`❌ Error al actualizar estado con módulo importado:`, moduleError);
            }
          }).catch(() => {
            // Caer de vuelta a la implementación global si el import falla
            if (typeof global.updateDashboardState === 'function') {
              try {
                global.updateDashboardState('dashboard-calculation-error', { 
                  year, period, fallback: true
                }, userId);
              } catch (globalError) {
                console.error(`❌ Error con método global:`, globalError);
              }
            }
          });
        } catch (notifyError) {
          console.error("❌ Error general al actualizar estado del dashboard tras error:", notifyError);
        }
        
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
      
      // Intentar actualizar el estado del dashboard incluso en caso de error crítico
      try {
        // Este es un error crítico, intentamos todas las opciones disponibles
        const userId = req.user?.id || req.session?.userId;
        if (!userId) {
          console.warn("No se pudo identificar al usuario para notificar error crítico");
          return;
        }
        
        const errorEventData = { 
          critical: true, 
          year: req.query.year, 
          period: req.query.period,
          errorType: error?.name || 'Unknown',
          errorMessage: error?.message || 'Error desconocido',
          errorTime: new Date().toISOString()
        };
        
        // Método 1: Import directo (más confiable)
        import('../dashboard-state').then(async (module) => {
          try {
            await module.updateDashboardState('dashboard-critical-error', errorEventData, userId);
            console.log(`⚠️ Estado del dashboard actualizado con error crítico (módulo directo)`);
          } catch (moduleError) {
            console.error(`❌ Error con importación directa:`, moduleError);
          }
        }).catch(async (importError) => {
          console.error(`❌ Error al importar dashboard-state para error crítico:`, importError);
          
          // Método 2: Fallback a función global
          if (typeof global.updateDashboardState === 'function') {
            try {
              await global.updateDashboardState('dashboard-critical-error', {
                ...errorEventData,
                fallback: true
              }, userId);
              console.log(`⚠️ Estado del dashboard actualizado con error crítico (función global)`);
            } catch (globalError) {
              console.error(`❌ Error con método global para error crítico:`, globalError);
              
              // Método 3: Última opción - operación directo contra la DB
              try {
                const { db } = await import('../db');
                const { dashboardState } = await import('../../shared/schema');
                
                await db.insert(dashboardState).values({
                  userId: userId,
                  lastEventType: 'critical-error-fallback',
                  updatedAt: new Date()
                }).onConflictDoUpdate({
                  target: dashboardState.userId,
                  set: {
                    lastEventType: 'critical-error-fallback',
                    updatedAt: new Date()
                  }
                });
                
                console.log(`⚠️ Estado del dashboard actualizado con error crítico (DB directa)`);
              } catch (dbError) {
                console.error(`❌ Error al actualizar DB directamente:`, dbError);
              }
            }
          }
        });
      } catch (notifyError) {
        console.error("Error general al notificar error crítico:", notifyError);
      }
      
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