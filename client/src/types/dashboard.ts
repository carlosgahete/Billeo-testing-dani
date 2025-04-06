// Tipos básicos para los widgets
export type WidgetSize = 'small' | 'medium' | 'large';

export type WidgetType = 
  | 'InvoicesWidget'
  | 'ExpensesWidget'
  | 'ResultWidget'
  | 'TaxSummaryWidget'
  | 'FinancialComparisonWidget'
  | 'QuotesWidget'
  | 'ClientsWidget'
  | 'TasksWidget';

// Estructura de datos para las estadísticas del dashboard
export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  // Campos para la pantalla de facturas
  issuedCount?: number;
  yearCount?: number;
  yearIncome?: number;
  quarterCount?: number;
  quarterIncome?: number;
  // Impuestos
  taxStats?: {
    ivaRepercutido: number;
    ivaSoportado: number;
    ivaLiquidar: number;
    irpfRetenido: number;
    irpfTotal: number;
    irpfPagar: number;
  };
  // Datos de IVA e IRPF para acceso directo
  taxes?: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
  ivaRepercutido?: number;
  ivaSoportado?: number;
  baseImponible?: number;
  irpfRetenidoIngresos?: number;
  // Presupuestos 
  quotes?: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  };
  // Datos simples para presupuestos
  quotesTotal?: number;
  quotesAccepted?: number;
  quotesRejected?: number;
  quotesPending?: number;
  // Facturas
  invoicesTotal?: number;
  invoicesPending?: number;
  invoicesPaid?: number;
  invoicesOverdue?: number;
  // Clientes
  clients?: {
    total: number;
    active: number;
    new: number;
  };
  // Tareas
  tasks?: {
    total: number;
    completed: number;
    pending: number;
  };
  [key: string]: any;
}

// Estructura para la posición de un widget
export interface WidgetPosition {
  row: number;
  col: number;
}

// Estructura para un bloque de widget en el layout
export interface WidgetBlock {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  position: WidgetPosition;
}

// Estructura para el layout del dashboard
export interface WidgetLayout {
  blocks: WidgetBlock[];
}

// Estructura para las preferencias del dashboard
export interface DashboardPreferences {
  id?: number;
  userId?: number;
  layout: WidgetLayout;
  createdAt?: string;
  updatedAt?: string;
}