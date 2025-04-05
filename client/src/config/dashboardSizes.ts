// Tamaños estandarizados para los widgets del dashboard
// Definimos solo el ancho ya que la altura está controlada por BaseBlock

export const DASHBOARD_SIZES = {
  // Widget pequeño (1 columna)
  small: {
    height: '', // La altura está controlada por BaseBlock
    width: 'lg:col-span-1', // 1/3 del ancho en pantallas grandes
  },
  
  // Widget mediano (2 columnas)
  medium: {
    height: '', // La altura está controlada por BaseBlock
    width: 'lg:col-span-2', // 2/3 del ancho en pantallas grandes
  },
  
  // Widget grande (ancho completo)
  large: {
    height: '', // La altura está controlada por BaseBlock
    width: 'lg:col-span-3', // Ancho completo en pantallas grandes
  }
};

// Asigna un tamaño predeterminado a cada tipo de bloque
export const BLOCK_SIZE_MAP: Record<string, keyof typeof DASHBOARD_SIZES> = {
  // Bloques de tamaño pequeño (1 columna)
  "income-summary": "small",
  "expenses-summary": "small",
  "income-card": "small",
  "expenses-card": "small",
  "result-card": "small",
  "quotes-summary": "small",
  "invoices-summary": "small",
  "expenses-by-category": "small",
  "tax-summary": "small",
  "recent-expenses": "small",
  
  // Bloques de tamaño mediano (2 columnas)
  "result-summary": "medium",
  "expenses-by-category-chart": "medium",
  
  // Bloques de ancho completo (3 columnas)
  "comparative-chart": "large"
};

// Obtener el tamaño de un bloque específico
export function getBlockSize(blockId: string): {
  height: string;
  width: string;
} {
  const sizeKey = BLOCK_SIZE_MAP[blockId] || "small"; // Por defecto small
  return DASHBOARD_SIZES[sizeKey];
}