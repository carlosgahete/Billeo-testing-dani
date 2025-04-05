// Utilidades para implementar el sistema de "grid snapping" estilo Apple
// Permite que los widgets se ajusten a una cuadrícula invisible al moverlos o redimensionarlos

// Configuración del grid de snapping
export interface GridSnapConfig {
  // Tamaño de la celda base en píxeles (cuando no se proporciona un elemento de referencia)
  cellSize: number;
  
  // Umbral de snap: distancia en píxeles a partir de la cual se activa el snapping
  threshold: number;
  
  // Elemento de referencia para calcular tamaño de celda (opcional)
  gridRef?: React.RefObject<HTMLElement>;
  
  // Número de columnas del grid (para calcular tamaño de celda automáticamente)
  cols: number;
  
  // Separación entre celdas
  gap: number;
}

// Configuración por defecto
export const DEFAULT_SNAP_CONFIG: GridSnapConfig = {
  cellSize: 20, // Predeterminado, se calculará dinámicamente si hay referencia
  threshold: 15, // 15px es un buen punto medio para activar snapping
  cols: 12,     // Grid de 12 columnas como estándar
  gap: 8,       // 8px de separación
};

/**
 * Calcula el tamaño de celda real basado en el contenedor de referencia
 */
export function calculateCellSize(config: GridSnapConfig): number {
  if (!config.gridRef?.current) return config.cellSize;
  
  // Calcular tamaño real de celda basado en ancho del contenedor
  const containerWidth = config.gridRef.current.clientWidth;
  const totalGapWidth = (config.cols - 1) * config.gap;
  return (containerWidth - totalGapWidth) / config.cols;
}

/**
 * Ajusta una coordenada a la cuadrícula
 */
export function snapToGrid(value: number, cellSize: number, threshold: number): number {
  const mod = value % cellSize;
  
  // Si está cerca del borde de la celda, ajustar
  if (mod < threshold) {
    return value - mod; // Ajustar al inicio de la celda
  } 
  else if (mod > cellSize - threshold) {
    return value + (cellSize - mod); // Ajustar al final de la celda
  }
  
  // No está lo suficientemente cerca para ajustar
  return value;
}

/**
 * Convierte posición en píxeles a coordenadas de grid
 */
export function pixelsToGridPosition(
  x: number, 
  y: number, 
  config: GridSnapConfig
): { col: number, row: number } {
  const realCellSize = calculateCellSize(config);
  
  // Considerar gap en el cálculo
  const col = Math.round(x / (realCellSize + config.gap));
  const row = Math.round(y / (realCellSize + config.gap));
  
  return { col, row };
}

/**
 * Convierte coordenadas de grid a píxeles
 */
export function gridPositionToPixels(
  col: number, 
  row: number, 
  config: GridSnapConfig
): { x: number, y: number } {
  const realCellSize = calculateCellSize(config);
  
  // Considerar gap en el cálculo
  const x = col * (realCellSize + config.gap);
  const y = row * (realCellSize + config.gap);
  
  return { x, y };
}

/**
 * Ajusta una posición a la cuadrícula más cercana
 */
export function snapPositionToGrid(
  x: number, 
  y: number, 
  config: GridSnapConfig
): { x: number, y: number } {
  const realCellSize = calculateCellSize(config);
  
  // Aplicar snap a ambas coordenadas
  const snappedX = snapToGrid(x, realCellSize + config.gap, config.threshold);
  const snappedY = snapToGrid(y, realCellSize + config.gap, config.threshold);
  
  return { x: snappedX, y: snappedY };
}

/**
 * Ajusta un tamaño (ancho y alto) a la cuadrícula
 */
export function snapSizeToGrid(
  width: number, 
  height: number, 
  config: GridSnapConfig
): { width: number, height: number } {
  const realCellSize = calculateCellSize(config);
  const cellWithGap = realCellSize + config.gap;
  
  // Redondear ancho y alto a múltiplos de tamaño de celda
  const gridW = Math.max(1, Math.round(width / cellWithGap));
  const gridH = Math.max(1, Math.round(height / cellWithGap));
  
  return {
    width: gridW * cellWithGap - config.gap, 
    height: gridH * cellWithGap - config.gap
  };
}

/**
 * Efecto visual de snapping para mostrar la cuadrícula durante la interacción
 */
export function createSnapVisualEffect(
  container: HTMLElement,
  config: GridSnapConfig,
  duration: number = 500 // ms
): void {
  // Crear un elemento temporal para mostrar la cuadrícula
  const overlay = document.createElement('div');
  overlay.className = 'grid-snap-overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '100';
  overlay.style.opacity = '0.2';
  
  // Crear el patrón de cuadrícula
  const realCellSize = calculateCellSize(config);
  overlay.style.backgroundSize = `${realCellSize + config.gap}px ${realCellSize + config.gap}px`;
  overlay.style.backgroundImage = 'linear-gradient(to right, #ddd 1px, transparent 1px), linear-gradient(to bottom, #ddd 1px, transparent 1px)';
  
  // Añadir al contenedor
  container.appendChild(overlay);
  
  // Animar entrada
  overlay.style.transition = 'opacity 0.15s ease-in-out';
  setTimeout(() => {
    overlay.style.opacity = '0.4';
  }, 0);
  
  // Eliminar después de un tiempo
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => container.removeChild(overlay), 150);
  }, duration);
}