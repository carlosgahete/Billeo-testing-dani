/**
 * Configuración de tamaños de widget estilo Apple
 * Cada widget puede tener uno de estos tres tamaños predefinidos
 */

export type WidgetSizeType = 'small' | 'medium' | 'large';

export interface WidgetSize {
  type: WidgetSizeType;
  width: number; // Ancho en unidades de grid
  height: number; // Alto en unidades de grid
  label: string; // Etiqueta para mostrar al usuario
  description: string; // Descripción de lo que muestra este tamaño
}

// Definición de tamaños estándar para widgets
export const WIDGET_SIZES: WidgetSize[] = [
  {
    type: 'small',
    width: 4,  // 1/3 del ancho total en un grid de 12 columnas
    height: 4,
    label: 'Pequeño',
    description: 'Muestra solo la información esencial'
  },
  {
    type: 'medium',
    width: 6, // Mitad del ancho total
    height: 4,
    label: 'Mediano',
    description: 'Incluye datos adicionales y gráficos simples'
  },
  {
    type: 'large',
    width: 12, // Ancho completo
    height: 6,
    label: 'Grande',
    description: 'Visualización completa con todos los detalles'
  }
];

// Obtener configuración de tamaño por tipo
export function getWidgetSizeConfig(sizeType: WidgetSizeType): WidgetSize {
  const size = WIDGET_SIZES.find(size => size.type === sizeType);
  if (!size) {
    // Si no se encuentra, devolver tamaño pequeño por defecto
    return WIDGET_SIZES[0];
  }
  return size;
}

// Determinar el tipo de tamaño en función de las dimensiones
export function getWidgetSizeType(width: number, height: number): WidgetSizeType {
  if (width >= 12) {
    return 'large';
  } else if (width >= 6) {
    return 'medium';
  } else {
    return 'small';
  }
}