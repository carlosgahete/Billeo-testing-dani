export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  [key: string]: any;
}

export interface DashboardBlockPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardBlock {
  id: string;
  type: string;
  position: DashboardBlockPosition;
  visible: boolean;
  config?: Record<string, any>;
}

export interface DashboardPreferences {
  layout: DashboardBlock[];
  theme?: string;
  defaultView?: string;
}

export interface TaxStats {
  ivaRepercutido: number;
  ivaSoportado: number;
  ivaLiquidar: number;
  irpfRetenido: number;
  irpfTotal: number;
  irpfPagar: number;
}

export interface InvoiceSummary {
  id: number;
  clientName: string;
  amount: number;
  status: string;
  date: Date;
  dueDate: Date;
}

export interface TransactionSummary {
  id: number;
  title: string;
  amount: number;
  type: string;
  date: Date;
  category: string;
}

export interface TaskItem {
  id: number;
  title: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  type: 'task' | 'tax' | 'invoice';
}

export interface ChartData {
  label: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface BlockConfigOption {
  id: string;
  label: string;
  type: 'select' | 'checkbox' | 'radio' | 'input';
  options?: { value: string; label: string }[];
  default: any;
}