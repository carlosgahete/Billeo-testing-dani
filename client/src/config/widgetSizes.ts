// Definición de tamaños predefinidos para los widgets (estilo Apple)

// Tamaños predefinidos para bloques del dashboard en formato grid
export const WIDGET_SIZES = {
  // Tamaño pequeño (1x1)
  small: {
    w: 3,
    h: 3
  },
  
  // Tamaño mediano (2x2)
  medium: {
    w: 6,
    h: 4
  },
  
  // Tamaño grande (anchura completa)
  large: {
    w: 12,
    h: 6
  }
};

// Tamaños ideales por tipo de widget (para determinar cuáles son los mejores)
export const IDEAL_WIDGET_SIZES: Record<string, Array<keyof typeof WIDGET_SIZES>> = {
  // Widgets que funcionan mejor en formato pequeño, mediano o grande
  "income-summary": ["small", "medium"],
  "expenses-summary": ["small", "medium"],
  "result-card": ["small", "medium"],
  "quotes-summary": ["small", "medium"],
  "invoices-summary": ["small", "medium"],
  "tax-summary": ["medium", "large"],
  "recent-expenses": ["medium", "large"],
  "expenses-by-category": ["medium", "large"],
  
  // Widgets que funcionan mejor en formato mediano o grande
  "expenses-by-category-chart": ["medium", "large"],
  "comparative-chart": ["medium", "large"],
  
  // Widgets que solo se ven bien en formato grande
  "recent-transactions": ["large"],
  "tasks-list": ["large"]
};

// Función para obtener el siguiente tamaño disponible para un tipo de widget
export function getNextSize(blockType: string, currentSize: { w: number, h: number }): { w: number, h: number } {
  // Obtener la lista de tamaños ideales para este tipo de widget
  const idealSizes = IDEAL_WIDGET_SIZES[blockType] || ["small", "medium", "large"];
  
  // Identificar el tamaño actual
  let currentSizeKey: keyof typeof WIDGET_SIZES | null = null;
  
  if (currentSize.w <= WIDGET_SIZES.small.w && currentSize.h <= WIDGET_SIZES.small.h) {
    currentSizeKey = "small";
  } else if (currentSize.w <= WIDGET_SIZES.medium.w && currentSize.h <= WIDGET_SIZES.medium.h) {
    currentSizeKey = "medium";
  } else {
    currentSizeKey = "large";
  }
  
  // Encontrar el índice del tamaño actual en la lista de tamaños ideales
  const currentIndex = idealSizes.indexOf(currentSizeKey);
  
  // Si no se encuentra o es el último, volvemos al primero
  if (currentIndex === -1 || currentIndex === idealSizes.length - 1) {
    return WIDGET_SIZES[idealSizes[0]];
  }
  
  // De lo contrario, avanzamos al siguiente tamaño ideal
  return WIDGET_SIZES[idealSizes[currentIndex + 1]];
}