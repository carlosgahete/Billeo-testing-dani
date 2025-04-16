/**
 * Definición de tipos para el dashboard personalizable
 */

// Tipo para la configuración de la cuadrícula
export interface GridConfig {
  cols: number;
  rowHeight: number;
  gap: number;
}

// Interfaz para la posición y dimensiones de un bloque en el grid
export interface BlockPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Tamaño de widget: pequeño, mediano o grande
export type WidgetSizeType = 'small' | 'medium' | 'large';
export type WidgetSize = WidgetSizeType;

// Interfaz para un bloque de dashboard
export interface DashboardBlock {
  id: string;           // Identificador único del bloque
  type: string;         // Tipo de bloque (coincide con las claves en DASHBOARD_BLOCKS)
  position: BlockPosition; // Posición y dimensiones en el grid
  visible: boolean;     // Si el bloque es visible o no
  sizeType?: WidgetSizeType; // Tamaño del widget (nuevo)
}

// Interfaz para las estadísticas que se pasan a los componentes
export interface DashboardStats {
  // Valores brutos
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  pendingQuotes: number;
  pendingQuotesCount: number;
  
  // Información impositiva
  baseImponible?: number;      // Base imponible para ingresos
  baseImponibleGastos?: number; // Base imponible para gastos
  ivaRepercutido?: number;
  ivaSoportado?: number;
  irpfRetenidoIngresos?: number;
  totalWithholdings?: number;
  
  // Valores netos (nuevos campos)
  netIncome?: number;      // Ingresos netos (descontando IRPF)
  netExpenses?: number;    // Gastos netos (descontando IRPF)
  netResult?: number;      // Resultado neto final
  
  // Datos para el gráfico de gastos por categoría
  expensesByCategory?: Record<string, { amount: number, count: number }>;
  
  // Datos de impuestos
  taxes: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
  
  [key: string]: any;  // Para permitir propiedades adicionales
}

// Interfaz para las preferencias del dashboard
export interface DashboardPreferences {
  userId: number;
  layout: {
    blocks: DashboardBlock[] | string[];
    grid?: GridConfig;
  };
}

// Interfaz para las propiedades comunes de los bloques del dashboard
export interface DashboardBlockProps {
  data: any;            // Datos que recibe el bloque
  isLoading: boolean;   // Indica si los datos están cargando
}