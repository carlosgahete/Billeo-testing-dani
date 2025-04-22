// Nueva implementación simplificada del endpoint de dashboard
// Añadir al final de routes.ts

import { eq } from "drizzle-orm";
import { dashboardState } from "../shared/schema";

app.get("/api/stats/dashboard-fix", requireAuth, async (req: Request, res: Response) => {
  try {
    console.log("Iniciando manejo de solicitud a /api/stats/dashboard-fix - VERSIÓN SIMPLIFICADA");
    console.log('Recibido en dashboard-fix:', req.query);
    
    // Configurar encabezados para evitar almacenamiento en caché de datos financieros
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Expires', '0');
    res.setHeader('Pragma', 'no-cache');
    
    // Obtener parámetros de filtrado del usuario
    const { year, period, timestamp } = req.query;
    
    // Registrar la consulta para depuración
    const formattedDate = timestamp ? new Date(timestamp as string).toISOString() : new Date().toISOString();
    console.log(`📊 Consultando datos fiscales [SIMPLIFICADO]: { year: '${year}', period: '${period}', timestamp: '${formattedDate}' }`);
    
    // Más logs para depuración
    console.log(`📅 Tipo de period: ${typeof period}, Valor: '${period}'`);
    if (period && period !== 'all' && period.includes('Q')) {
      const trimestre = parseInt(period.replace('Q', ''));
      console.log(`🔢 Trimestre seleccionado: ${trimestre} (extraído de '${period}')`);
    } else {
      console.log(`⚠️ period no tiene formato de trimestre o es 'all': '${period}'`);
    }
    
    // Obtener el ID del usuario autenticado
    const userId = req.session.userId;
    
    try {
      // Obtener datos de facturas
      const invoices = await storage.getInvoicesByUserId(userId);
      
      // Añadir log para verificar cuántas facturas hay en total
      console.log(`📊 Total de facturas encontradas: ${invoices.length}`);
      
      // Calcular años únicos para mostrar en filtros
      const uniqueYears = [...new Set(invoices.map(inv => new Date(inv.issueDate).getFullYear()))];
      console.log("Años de transacciones:", uniqueYears);
      
      // Verificar si el año solicitado tiene datos - esto es crítico para no mostrar datos incorrectos
      const hasDataForRequestedYear = !year || uniqueYears.includes(parseInt(year as string));
      if (!hasDataForRequestedYear && year) {
        console.log(`⚠️ No hay datos para el año ${year} - devolviendo objeto con valores cero`);
        return res.status(200).json({
          // Valores principales con ceros
          income: 0,
          expenses: 0,
          pendingInvoices: 0,
          pendingCount: 0,
          pendingQuotes: 0,
          pendingQuotesCount: 0,
          balance: 0,
          result: 0,
          baseImponible: 0,
          baseImponibleGastos: 0,
          ivaRepercutido: 0,
          ivaSoportado: 0,
          irpfRetenidoIngresos: 0,
          period: period || 'all',
          year,
          totalWithholdings: 0,
          netIncome: 0,
          netExpenses: 0,
          netResult: 0,
          taxes: { vat: 0, incomeTax: 0, ivaALiquidar: 0 },
          taxStats: {
            ivaRepercutido: 0,
            ivaSoportado: 0,
            ivaLiquidar: 0,
            irpfRetenido: 0,
            irpfTotal: 0,
            irpfPagar: 0
          },
          issuedCount: 0,
          quarterCount: 0,
          quarterIncome: 0,
          yearCount: 0,
          yearIncome: 0,
          invoices: {
            total: 0,
            pending: 0,
            paid: 0,
            overdue: 0,
            totalAmount: 0
          },
          quotes: {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0
          },
          allQuotes: 0,
          acceptedQuotes: 0,
          rejectedQuotes: 0,
          pendingQuotesTotal: 0,
          lastQuoteDate: null
        });
      }
      
      // Función auxiliar para obtener el trimestre de una fecha (1-4)
      const getQuarterFromDate = (date: Date): number => {
        const month = date.getMonth();
        if (month < 3) return 1; // Q1: Ene-Mar
        if (month < 6) return 2; // Q2: Abr-Jun
        if (month < 9) return 3; // Q3: Jul-Sep
        return 4; // Q4: Oct-Dic
      };
      
      // Filtrar facturas por año y trimestre si se proporcionan
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.issueDate);
        const invoiceYear = invoiceDate.getFullYear().toString();
        const invoiceQuarter = getQuarterFromDate(invoiceDate);
        
        console.log(`📋 DEBUG FACTURA: ID=${invoice.id}, fecha=${invoice.issueDate}, año=${invoiceYear}, trimestre=${invoiceQuarter}`);
        
        // Si no hay filtro de año, mostramos todas
        if (!year) return true;
        
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
          // Si hay un error o el formato no es reconocido, devolvemos false
          return false;
        }
        
        // Si tiene el año correcto y no hay filtro de trimestre, la incluimos
        console.log(`✅ Factura ${invoice.id} incluida (año ${invoiceYear})`);
        return true;
      });
      
      // Obtener datos de transacciones
      const transactions = await storage.getTransactionsByUserId(userId);
      
      // Si el periodo es un trimestre específico, verificar si hay datos
      // Normalizamos a mayúsculas para asegurar consistencia
      const periodUpper = period ? period.toString().toUpperCase() : '';
      if (period && period !== 'all' && periodUpper.startsWith('Q') && /^Q[1-4]$/.test(periodUpper)) {
        const requestedQuarter = parseInt(periodUpper.replace('Q', ''));
        
        // Verificar si hay facturas en este trimestre
        const hasInvoicesInQuarter = filteredInvoices.length > 0;
        
        // Verificar si hay transacciones en este trimestre
        const hasTransactionsInQuarter = transactions.some(txn => {
          const txnDate = new Date(txn.date);
          const txnYear = txnDate.getFullYear().toString();
          const txnQuarter = getQuarterFromDate(txnDate);
          return txnYear === year && txnQuarter === requestedQuarter;
        });
        
        // Si no hay datos para este trimestre, devolver ceros
        if (!hasInvoicesInQuarter && !hasTransactionsInQuarter) {
          console.log(`⚠️ No hay datos para el trimestre ${period} del año ${year} - devolviendo objeto con valores cero`);
          return res.status(200).json({
            // Valores principales con ceros
            income: 0,
            expenses: 0,
            pendingInvoices: 0,
            pendingCount: 0,
            pendingQuotes: 0,
            pendingQuotesCount: 0,
            balance: 0,
            result: 0,
            baseImponible: 0,
            baseImponibleGastos: 0,
            ivaRepercutido: 0,
            ivaSoportado: 0,
            irpfRetenidoIngresos: 0,
            period,
            year,
            totalWithholdings: 0,
            netIncome: 0,
            netExpenses: 0,
            netResult: 0,
            taxes: { vat: 0, incomeTax: 0, ivaALiquidar: 0 },
            taxStats: {
              ivaRepercutido: 0,
              ivaSoportado: 0,
              ivaLiquidar: 0,
              irpfRetenido: 0,
              irpfTotal: 0,
              irpfPagar: 0
            },
            issuedCount: 0,
            quarterCount: 0,
            quarterIncome: 0,
            yearCount: 0,
            yearIncome: 0,
            invoices: {
              total: 0,
              pending: 0,
              paid: 0,
              overdue: 0,
              totalAmount: 0
            },
            quotes: {
              total: 0,
              pending: 0,
              accepted: 0,
              rejected: 0
            },
            allQuotes: 0,
            acceptedQuotes: 0,
            rejectedQuotes: 0,
            pendingQuotesTotal: 0,
            lastQuoteDate: null
          });
        }
      }
      
      // Filtrar transacciones por año y trimestre
      const filteredTransactions = transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        const txnYear = txnDate.getFullYear().toString();
        const txnQuarter = getQuarterFromDate(txnDate);
        
        console.log(`💰 DEBUG TRANSACCIÓN: ID=${txn.id}, fecha=${txn.date}, año=${txnYear}, trimestre=${txnQuarter}, tipo=${txn.type}`);
        
        // Si no hay filtro de año, mostramos todas
        if (!year) return true;
        
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
          // Si hay un error o el formato no es reconocido, devolvemos false
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
        
        console.log(`📝 DEBUG PRESUPUESTO: ID=${quote.id}, fecha=${quote.issueDate}, año=${quoteYear}, trimestre=${quoteQuarter}`);
        
        // Si no hay filtro de año, mostramos todas
        if (!year) return true;
        
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
          // Si hay un error o el formato no es reconocido, devolvemos false
          return false;
        }
        
        // Si tiene el año correcto y no hay filtro de trimestre, la incluimos
        console.log(`✅ Presupuesto ${quote.id} incluido (año ${quoteYear})`);
        return true;
      });
      
      // CÁLCULOS BÁSICOS
      
      // Mostrar resumen de filtrado para debugging
      console.log(`🔍 RESULTADOS DE FILTRADO:`);
      console.log(`📅 Filtros aplicados - Año: ${year || 'todos'}, Trimestre: ${period || 'todos'}`);
      console.log(`📄 Facturas: ${invoices.length} totales -> ${filteredInvoices.length} filtradas`);
      console.log(`💸 Transacciones: ${transactions.length} totales -> ${filteredTransactions.length} filtradas`);
      console.log(`📋 Presupuestos: ${quotes.length} totales -> ${filteredQuotes.length} filtrados`);
      
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
      
      // 5. Gastos - Mejorado para calcular correctamente base imponible, IVA e IRPF
      const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
      
      // Variables para acumular los totales correctos
      let totalBaseImponibleGastos = 0;
      let totalIvaSoportado = 0;
      let totalIrpfGastos = 0;
      
      // Procesar cada transacción individualmente para extraer los impuestos correctamente
      for (const transaction of expenseTransactions) {
        try {
          // Valor total del gasto (lo pagado)
          const totalAmount = parseFloat(transaction.amount || '0');
          
          // Si no hay monto válido, saltamos esta transacción
          if (isNaN(totalAmount)) continue;
          
          // Variables para esta transacción específica
          let baseAmount = totalAmount; // Por defecto asumimos que todo es base imponible
          let ivaAmount = 0;
          let irpfAmount = 0;
          let ivaRate = 0;
          let irpfRate = 0;
          
          // Procesar impuestos adicionales si existen
          if (transaction.additionalTaxes) {
            let taxes = [];
            if (typeof transaction.additionalTaxes === 'string') {
              taxes = JSON.parse(transaction.additionalTaxes);
            } else if (Array.isArray(transaction.additionalTaxes)) {
              taxes = transaction.additionalTaxes;
            }
            
            // Extraer tasas de IVA e IRPF
            for (const tax of taxes) {
              if (tax && tax.name === 'IVA') {
                ivaRate = Math.abs(parseFloat(tax.amount) || 0);
              } else if (tax && tax.name === 'IRPF') {
                irpfRate = Math.abs(parseFloat(tax.amount) || 0);
              }
            }
            
            // Si tenemos información de impuestos, recalcular la base imponible correctamente
            if (ivaRate > 0 || irpfRate > 0) {
              // Extraer la base imponible real considerando ambos impuestos
              // La fórmula correcta es: base = total / (1 + IVA/100) para quitar el IVA
              if (ivaRate > 0) {
                baseAmount = totalAmount / (1 + (ivaRate / 100));
                ivaAmount = totalAmount - baseAmount;
              }
              
              // Si hay IRPF, este valor se restó del pago pero debemos considerarlo parte de la base
              if (irpfRate > 0) {
                // El IRPF se calcula sobre la base imponible
                irpfAmount = (baseAmount * irpfRate) / 100;
              }
              
              // Ajustar la base según el método correcto
              baseAmount = parseFloat(baseAmount.toFixed(2));
              ivaAmount = parseFloat(ivaAmount.toFixed(2));
              irpfAmount = parseFloat(irpfAmount.toFixed(2));
            }
          }
          
          // Añadir al acumulado
          totalBaseImponibleGastos += baseAmount;
          totalIvaSoportado += ivaAmount;
          totalIrpfGastos += irpfAmount;
          
        } catch (error) {
          console.error("Error procesando gasto:", error);
        }
      }
      
      // Establecer los valores correctos calculados individualmente
      const baseImponibleGastos = totalBaseImponibleGastos;
      const ivaSoportado = totalIvaSoportado;
      const irpfGastos = totalIrpfGastos;
      
      // Para compatibilidad, también calculamos el total de gastos (para referencia)
      const expenses = baseImponibleGastos + ivaSoportado;
      
      // 8. IRPF retenido (en ingresos)
      let irpfRetenidoIngresos = 0;
      for (const invoice of paidInvoices) {
        try {
          if (invoice.additionalTaxes) {
            let taxes = [];
            if (typeof invoice.additionalTaxes === 'string') {
              taxes = JSON.parse(invoice.additionalTaxes);
            } else if (Array.isArray(invoice.additionalTaxes)) {
              taxes = invoice.additionalTaxes;
            }
            
            for (const tax of taxes) {
              if (tax && tax.name === 'IRPF') {
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
      
      // 9. IRPF de gastos - Ya calculado anteriormente
      let totalIrpfFromExpensesInvoices = irpfGastos; // Usamos el valor calculado anteriormente
      
      // 10. Balance de IVA
      const vatBalance = ivaRepercutido - ivaSoportado;
      const vatBalanceFinal = vatBalance > 0 ? vatBalance : 0;
      
      // 11. Balance de IRPF
      const incomeTaxFinal = irpfRetenidoIngresos > 0 ? irpfRetenidoIngresos : 0;
      
      // 12. Presupuestos (utilizando los presupuestos filtrados)
      const pendingQuotesTotal = filteredQuotes
        .filter(quote => quote.status === 'pending')
        .reduce((sum, quote) => {
          const total = parseFloat(quote.total || '0');
          return isNaN(total) ? sum : sum + total;
        }, 0);
      
      const pendingQuotesCount = filteredQuotes.filter(quote => quote.status === 'pending').length;
      const acceptedQuotesCount = filteredQuotes.filter(quote => quote.status === 'accepted').length;
      const rejectedQuotesCount = filteredQuotes.filter(quote => quote.status === 'rejected').length;
      const allQuotesCount = filteredQuotes.length;
      
      // 13. Fecha del último presupuesto (filtrado por año/trimestre)
      const lastQuote = filteredQuotes.sort((a, b) => 
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
      
      console.log("=== RESUMEN DE CÁLCULOS SIMPLIFICADOS ===");
      console.log(`Ingresos (facturas pagadas): ${invoiceIncome}€`);
      console.log(`Base imponible ingresos: ${baseImponible}€`);
      console.log(`IVA repercutido: ${ivaRepercutido}€`);
      console.log(`Gastos (base imponible): ${baseImponibleGastos}€`);
      console.log(`IVA soportado: ${ivaSoportado}€`);
      console.log(`Total con IVA: ${expenses}€`);
      console.log(`IRPF en gastos: ${totalIrpfFromExpensesInvoices}€`);
      console.log(`IRPF en ingresos: ${irpfRetenidoIngresos}€`);
      console.log(`Balance bruto: ${balance}€`);
      console.log(`Resultado neto: ${result}€`);
      
      // Preparar respuesta segura
      
      // Función para asegurar valores numéricos
      const safeNumber = (value: any): number => {
        if (typeof value !== 'number' || isNaN(value)) return 0;
        return parseFloat(value.toFixed(2)); // Redondeo a 2 decimales
      };
      
      // Actualizar el estado del dashboard para que la marca de tiempo se actualice
      console.log('🔄 Intentando actualizar el estado del dashboard con filtros');
      console.log(`🔍 Contexto: updateDashboardState=${typeof global.updateDashboardState}, userId=${userId}`);
      
      if (global.updateDashboardState && userId) {
        try {
          const eventData = { filtered: true, year, period };
          console.log('📤 Llamando a updateDashboardState con:', { type: 'dashboard-filtered', eventData, userId });
          await global.updateDashboardState('dashboard-filtered', eventData, userId);
          console.log(`✅ Estado del dashboard actualizado con filtros: año=${year}, trimestre=${period}`);
          
          // Verificar la tabla después de la actualización
          const result = await db.select().from(dashboardState).where(eq(dashboardState.userId, userId));
          console.log(`🔎 Estado actual del dashboard después de actualizar:`, result[0]);
        } catch (error) {
          console.error('❌ Error al actualizar estado del dashboard:', error);
        }
      } else {
        console.warn(`⚠️ No se pudo actualizar el estado del dashboard: updateDashboardState=${!!global.updateDashboardState}, userId=${userId}`);
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
      
      // Intentar actualizar el estado del dashboard incluso en caso de error
      try {
        if (global.updateDashboardState && userId) {
          const eventData = { filtered: true, year, period, error: true };
          await global.updateDashboardState('dashboard-filter-error', eventData, userId);
          console.log(`⚠️ Estado del dashboard actualizado con error de filtro: año=${year}, trimestre=${period}`);
        }
      } catch (e) {
        console.error("Error al actualizar estado del dashboard tras error:", e);
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
      if (global.updateDashboardState && req.session.userId) {
        const errorEventData = { 
          critical: true, 
          year: req.query.year, 
          period: req.query.period,
          errorType: error?.name || 'Unknown',
          errorMessage: error?.message || 'Error no especificado'
        };
        await global.updateDashboardState('dashboard-critical-error', errorEventData, req.session.userId);
        console.log(`🛑 Estado del dashboard actualizado con error crítico`);
      }
    } catch (e) {
      console.error("Error al actualizar estado del dashboard tras error crítico:", e);
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