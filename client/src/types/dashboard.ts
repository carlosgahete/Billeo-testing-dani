// Tipos de datos para el dashboard

// Tipo para las estadísticas generales del dashboard
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

// Tipo para las preferencias de bloques en el dashboard
export interface DashboardPreferences {
  id: number;
  userId: number;
  layout: {
    blocks: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// Propiedades comunes para los bloques del dashboard
export interface DashboardBlockProps {
  data: DashboardStats;
  isLoading: boolean;
}