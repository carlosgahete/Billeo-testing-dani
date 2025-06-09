/**
 * Utilidades para manejo de transacciones y determinación de editores
 */

export interface TransactionData {
  id: number;
  type: 'income' | 'expense';
  invoiceId?: number;
  [key: string]: any;
}

export interface EditorDestination {
  path: string;
  type: 'invoice' | 'transaction';
  description: string;
}

/**
 * Función central que determina qué editor abrir basado en los datos de la transacción
 */
export function determineEditor(transaction: TransactionData, origin?: string): EditorDestination {
  // REGLA 1: Si es un gasto, SIEMPRE editor de transacciones
  if (transaction.type === 'expense') {
    return {
      path: `/transactions/edit/${transaction.id}`,
      type: 'transaction',
      description: 'Editor de gastos'
    };
  }
  
  // REGLA 2: Si es un ingreso con invoiceId, SIEMPRE editor de facturas
  if (transaction.type === 'income' && transaction.invoiceId) {
    // Agregar información del origen para el botón volver
    const returnParam = origin ? `?returnTo=${encodeURIComponent(origin)}` : '';
    return {
      path: `/invoices/edit/${transaction.invoiceId}${returnParam}`,
      type: 'invoice',
      description: 'Editor de facturas (ingreso con factura asociada)'
    };
  }
  
  // REGLA 3: Si es un ingreso sin invoiceId, editor de transacciones
  if (transaction.type === 'income' && !transaction.invoiceId) {
    return {
      path: `/transactions/edit/${transaction.id}`,
      type: 'transaction',
      description: 'Editor de ingresos simples'
    };
  }
  
  // Fallback (no debería llegar aquí)
  return {
    path: `/transactions/edit/${transaction.id}`,
    type: 'transaction',
    description: 'Editor por defecto'
  };
}

/**
 * Determina la página de origen basada en la URL actual
 */
export function determineOrigin(currentLocation: string): string {
  if (currentLocation.includes('/invoices')) {
    return 'invoices';
  }
  if (currentLocation.includes('/income') || currentLocation.includes('tab=income')) {
    return 'transactions-income';
  }
  if (currentLocation.includes('/transactions')) {
    return 'transactions';
  }
  return 'invoices'; // Por defecto
}

/**
 * Convierte el origen en una ruta de retorno
 */
export function getReturnPath(origin: string): string {
  switch (origin) {
    case 'transactions-income':
      return '/transactions?tab=income';
    case 'transactions':
      return '/transactions';
    case 'invoices':
    default:
      return '/invoices';
  }
}

/**
 * Función para logging/debug de decisiones de editor
 */
export function logEditorDecision(transaction: TransactionData, destination: EditorDestination, origin?: string) {
  console.log('🎯 DECISIÓN DE EDITOR:', {
    transactionId: transaction.id,
    transactionType: transaction.type,
    hasInvoiceId: !!transaction.invoiceId,
    invoiceId: transaction.invoiceId,
    origin: origin,
    decision: destination.description,
    finalPath: destination.path
  });
}

/**
 * Función de test para verificar la lógica con diferentes casos
 */
export function testEditorLogic() {
  console.log('🧪 PROBANDO LÓGICA DE EDITORES:');
  
  const testCases = [
    {
      name: 'Gasto simple',
      transaction: { id: 1, type: 'expense' as const },
      origin: 'transactions'
    },
    {
      name: 'Ingreso con factura',
      transaction: { id: 2, type: 'income' as const, invoiceId: 123 },
      origin: 'transactions-income'
    },
    {
      name: 'Ingreso sin factura',
      transaction: { id: 3, type: 'income' as const },
      origin: 'transactions'
    },
    {
      name: 'Ingreso con factura desde facturas',
      transaction: { id: 4, type: 'income' as const, invoiceId: 456 },
      origin: 'invoices'
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\n📋 Caso: ${testCase.name}`);
    const decision = determineEditor(testCase.transaction, testCase.origin);
    logEditorDecision(testCase.transaction, decision, testCase.origin);
  });
} 