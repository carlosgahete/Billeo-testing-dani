import Papa from 'papaparse';

interface CSVRow {
  fecha?: string;
  date?: string;
  descripcion?: string;
  description?: string;
  importe?: string;
  amount?: string;
  tipo?: string;
  type?: string;
  categoria?: string;
  category?: string;
  [key: string]: any;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId?: number | null;
  paymentMethod: string;
}

export async function parseCSV(
  file: File, 
  categories: { id: number; name: string; type: string }[]
): Promise<ParsedTransaction[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions: ParsedTransaction[] = [];
          
          for (const row of results.data as CSVRow[]) {
            // Get date (try multiple possible column names)
            const dateStr = row.fecha || row.date || '';
            if (!dateStr) {
              console.warn('Skipping row with no date', row);
              continue;
            }
            
            // Try to parse the date
            let parsedDate: Date;
            try {
              // Handle different date formats (DD/MM/YYYY, YYYY-MM-DD)
              if (dateStr.includes('/')) {
                const [day, month, year] = dateStr.split('/');
                parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
              } else {
                parsedDate = new Date(dateStr);
              }
              
              if (isNaN(parsedDate.getTime())) {
                console.warn('Skipping row with invalid date', row);
                continue;
              }
            } catch (e) {
              console.warn('Error parsing date', dateStr, e);
              continue;
            }
            
            // Get description
            const description = row.descripcion || row.description || 'Sin descripción';
            
            // Get amount and determine type (income or expense)
            let amountStr = row.importe || row.amount || '0';
            amountStr = amountStr.replace(',', '.').replace(/[^\d.-]/g, '');
            const amount = parseFloat(amountStr);
            
            if (isNaN(amount)) {
              console.warn('Skipping row with invalid amount', row);
              continue;
            }
            
            // Determine type from explicit column or from amount sign
            let type: 'income' | 'expense';
            
            if (row.tipo || row.type) {
              const typeValue = (row.tipo || row.type || '').toLowerCase();
              
              if (['ingreso', 'income', 'entrada', 'in'].includes(typeValue)) {
                type = 'income';
              } else if (['gasto', 'expense', 'salida', 'out'].includes(typeValue)) {
                type = 'expense';
              } else {
                // If type is not recognized, infer from amount
                type = amount >= 0 ? 'income' : 'expense';
              }
            } else {
              // If no type column, infer from amount
              type = amount >= 0 ? 'income' : 'expense';
            }
            
            // Try to match category if provided
            let categoryId: number | null = null;
            const categoryName = row.categoria || row.category || '';
            
            if (categoryName && categories.length > 0) {
              // First try matching by name and type
              const matchedCategory = categories.find(
                c => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === type
              );
              
              if (matchedCategory) {
                categoryId = matchedCategory.id;
              }
            }
            
            // Create transaction object
            const transaction: ParsedTransaction = {
              date: parsedDate.toISOString(),
              description,
              amount: Math.abs(amount),
              type,
              categoryId,
              paymentMethod: 'bank_transfer' // Default for imports
            };
            
            transactions.push(transaction);
          }
          
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export async function exportTransactionsToCSV(
  transactions: any[],
  categories: { id: number; name: string; type: string }[]
): Promise<string> {
  // Prepare data for CSV
  const csvData = transactions.map(transaction => {
    const category = categories.find(c => c.id === transaction.categoryId);
    
    return {
      'Fecha': new Date(transaction.date).toLocaleDateString('es-ES'),
      'Descripción': transaction.description,
      'Importe': Number(transaction.amount).toFixed(2),
      'Tipo': transaction.type === 'income' ? 'Ingreso' : 'Gasto',
      'Categoría': category ? category.name : 'Sin categoría',
      'Método de pago': getPaymentMethodName(transaction.paymentMethod),
    };
  });
  
  // Generate CSV string
  const csv = Papa.unparse(csvData);
  return csv;
}

function getPaymentMethodName(method: string): string {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'bank_transfer':
      return 'Transferencia bancaria';
    case 'credit_card':
      return 'Tarjeta de crédito';
    case 'debit_card':
      return 'Tarjeta de débito';
    case 'paypal':
      return 'PayPal';
    default:
      return 'Otro';
  }
}
