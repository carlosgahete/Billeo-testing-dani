export interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  pendingQuotes: number;
  pendingQuotesCount: number;
  baseImponible?: number;
  ivaRepercutido?: number;
  ivaSoportado?: number;
  irpfRetenidoIngresos?: number;
  totalWithholdings?: number;
  taxes: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
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
}

export interface DashboardPreferences {
  userId?: number;
  layout: DashboardBlock[];
}