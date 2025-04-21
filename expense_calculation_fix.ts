// Nueva implementación simplificada del endpoint de dashboard
// Añadir al final de routes.ts

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
      
      // Función para determinar el trimestre de una fecha
      const getQuarter = (date: Date): number => {
        const month = date.getMonth();
        return Math.floor(month / 3) + 1; // 1-4 para Q1-Q4
      };
      
      console.log("Fecha de ejemplo:", new Date().toISOString(), "Trimestre:", getQuarter(new Date()));
      
      // Validar el formato del periodo
      let validPeriod = period;
      let requestedQuarter = 0;
      
      if (period && period !== 'all') {
        if (period.startsWith('q') && period.length === 2) {
          requestedQuarter = parseInt(period.substring(1));
          if (requestedQuarter < 1 || requestedQuarter > 4) {
            console.log(`Trimestre no válido: ${requestedQuarter}, usando 'all'`);
            validPeriod = 'all';
            requestedQuarter = 0;
          }
        } else {
          console.log(`Formato de periodo no reconocido: ${period}, usando 'all'`);
          validPeriod = 'all';
        }
      }
      
      console.log(`Periodo validado: ${validPeriod}, Trimestre solicitado: ${requestedQuarter}`);
      
      // Filtrar facturas por año y trimestre si se proporcionan
      const filteredInvoices = invoices.filter(invoice => {
        const invoiceDate = new Date(invoice.issueDate);
        const invoiceYear = invoiceDate.getFullYear().toString();
        
        // Primero filtramos por año
        if (year && invoiceYear !== year) {
          return false;
        }
        
        // Luego filtramos por trimestre si está especificado
        if (validPeriod !== 'all' && requestedQuarter > 0) {
          const quarter = getQuarter(invoiceDate);
          console.log(`Factura: ID=${invoice.id}, Fecha=${invoiceDate.toISOString()}, Trimestre=${quarter}`);
          
          // Comparar con el trimestre solicitado
          if (quarter !== requestedQuarter) {
            return false;
          }
        }
        
        // Si pasó los filtros, incluimos la factura
        return true;
      });
      
      // Obtener datos de transacciones
      const transactions = await storage.getTransactionsByUserId(userId);
      
      // Filtrar transacciones por año y trimestre
      const filteredTransactions = transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        const txnYear = txnDate.getFullYear().toString();
        
        // Primero filtramos por año
        if (year && txnYear !== year) {
          return false;
        }
        
        // Luego filtramos por trimestre si está especificado
        if (validPeriod !== 'all' && requestedQuarter > 0) {
          const quarter = getQuarter(txnDate);
          console.log(`Transacción: ID=${txn.id}, Fecha=${txnDate.toISOString()}, Trimestre=${quarter}, Comparando con trimestre solicitado=${requestedQuarter}`);
          
          // Comparar con el trimestre solicitado
          if (quarter !== requestedQuarter) {
            return false;
          }
        }
        
        // Si pasó los filtros, incluimos la transacción
        return true;
      });
        
      // Obtener datos de presupuestos
      const quotes = await storage.getQuotesByUserId(userId);
      
      // Filtrar presupuestos por año y trimestre
      const filteredQuotes = quotes.filter(quote => {
        const quoteDate = new Date(quote.issueDate);
        const quoteYear = quoteDate.getFullYear().toString();
        
        // Primero filtramos por año
        if (year && quoteYear !== year) {
          return false;
        }
        
        // Luego filtramos por trimestre si está especificado
        if (validPeriod !== 'all' && requestedQuarter > 0) {
          const quarter = getQuarter(quoteDate);
          console.log(`Presupuesto: ID=${quote.id}, Fecha=${quoteDate.toISOString()}, Trimestre=${quarter}`);
          
          // Comparar con el trimestre solicitado
          if (quarter !== requestedQuarter) {
            return false;
          }
        }
        
        // Si pasó los filtros, incluimos el presupuesto
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
      
      // 12. Presupuestos - Usar los presupuestos filtrados
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
      
      // 13. Fecha del último presupuesto
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
      
      // Preparar datos trimestrales para la visualización en el dashboard
      const quarterlyData: Record<string, { Ingresos: number; Gastos: number; Resultado: number }> = {
        "Q1": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q2": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q3": { Ingresos: 0, Gastos: 0, Resultado: 0 },
        "Q4": { Ingresos: 0, Gastos: 0, Resultado: 0 }
      };
      
      // Rellenar datos trimestrales por fechas reales de facturas y gastos
      if (validPeriod === 'all') {
        // Agrupar facturas por trimestre para el año actual
        filteredInvoices.forEach(invoice => {
          if (invoice.status === 'pagada' || invoice.status === 'paid') {
            const invoiceDate = new Date(invoice.issueDate);
            const quarter = getQuarter(invoiceDate);
            const quarterKey = `Q${quarter}`;
            
            // Añadir a los datos del trimestre correspondiente
            const baseImponible = parseFloat(invoice.subtotal);
            if (!isNaN(baseImponible)) {
              quarterlyData[quarterKey].Ingresos += baseImponible;
            }
          }
        });
        
        // Agrupar gastos por trimestre
        filteredTransactions.forEach(txn => {
          const txnDate = new Date(txn.date);
          const quarter = getQuarter(txnDate);
          const quarterKey = `Q${quarter}`;
          
          // Añadir a los gastos del trimestre
          const baseImponible = txn.baseImponible || txn.amount;
          if (!isNaN(baseImponible)) {
            quarterlyData[quarterKey].Gastos += baseImponible;
          }
        });
        
        // Calcular resultados por trimestre
        Object.keys(quarterlyData).forEach(quarter => {
          quarterlyData[quarter].Resultado = 
            quarterlyData[quarter].Ingresos - quarterlyData[quarter].Gastos;
        });
      } 
      // Si estamos filtrando por un trimestre específico, ponemos todos los datos en ese trimestre
      else if (validPeriod.startsWith('q')) {
        const quarterKey = `Q${requestedQuarter}`;
        quarterlyData[quarterKey].Ingresos = baseImponible;
        quarterlyData[quarterKey].Gastos = baseImponibleGastos;
        quarterlyData[quarterKey].Resultado = balance;
      }
      
      console.log('Datos trimestrales calculados:', quarterlyData);

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
        lastQuoteDate,
        
        // Datos trimestrales para la visualización en gráficos
        quarterlyData
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