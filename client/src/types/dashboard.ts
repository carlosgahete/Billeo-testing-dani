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