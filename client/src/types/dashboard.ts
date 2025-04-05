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

// Tipo para representar un bloque de dashboard individual
export interface DashboardBlock {
  id: string; // ID único del bloque
  type: string; // Tipo de bloque (income, expenses, taxes, etc.)
  position: {
    x: number; // Posición horizontal (columna)
    y: number; // Posición vertical (fila)
    w: number; // Ancho (en unidades de grid)
    h: number; // Alto (en unidades de grid)
  };
  visible: boolean; // Si es visible o no
  config?: Record<string, any>; // Configuración específica del bloque
}

// Tipo para las preferencias de bloques en el dashboard
export interface DashboardPreferences {
  id: number;
  userId: number;
  layout: {
    blocks: DashboardBlock[] | string[]; // Soporta el nuevo formato de bloque detallado o el antiguo de string
    grid?: {
      cols: number;
      rowHeight: number;
      gap: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Propiedades comunes para los bloques del dashboard
export interface DashboardBlockProps {
  data: DashboardStats;
  isLoading: boolean;
}