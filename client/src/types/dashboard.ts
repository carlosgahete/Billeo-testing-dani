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
  taxStats?: {
    ivaRepercutido: number;
    ivaSoportado: number;
    ivaLiquidar: number;
    irpfRetenido: number;
    irpfTotal: number;
    irpfPagar: number;
  };
  quotes?: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
  };
  clients?: {
    total: number;
    active: number;
    new: number;
  };
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