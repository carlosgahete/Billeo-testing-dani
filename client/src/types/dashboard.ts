/**
 * Definición de tipos para el dashboard simplificado
 */

// Interfaz para las estadísticas del dashboard
export interface DashboardStats {
  // Valores principales
  income: number;           // Ingresos totales 
  expenses: number;         // Gastos totales
  pendingInvoices: number;  // Valor de facturas pendientes
  pendingCount: number;     // Número de facturas pendientes
  pendingQuotes: number;    // Valor de presupuestos pendientes
  pendingQuotesCount: number; // Número de presupuestos pendientes
  
  // Valores fiscales
  baseImponible?: number;       // Base imponible para ingresos (sin IVA)
  baseImponibleGastos?: number; // Base imponible para gastos (sin IVA)
  ivaRepercutido?: number;      // IVA cobrado en ventas
  ivaSoportado?: number;        // IVA pagado en compras
  irpfRetenidoIngresos?: number; // IRPF retenido en ingresos
  totalWithholdings?: number;    // Retenciones en gastos
  
  // Valores netos
  netIncome?: number;      // Ingresos netos (descontando IRPF)
  netExpenses?: number;    // Gastos netos (descontando IRPF)
  netResult?: number;      // Resultado neto final
  
  // Resumen de impuestos
  taxes: {
    vat: number;           // IVA a pagar
    incomeTax: number;     // IRPF a pagar
    ivaALiquidar: number;  // IVA a liquidar
  };
  
  // Para permitir propiedades adicionales futuras
  [key: string]: any;
}

// Interfaz para filtros del dashboard
export interface DashboardFilters {
  year: string;
  period: string;
}

// Interfaz para la respuesta de la API de estadísticas
export interface DashboardResponse extends DashboardStats {
  year: string;
  period: string;
}