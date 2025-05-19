import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowUp, ArrowDown, Settings, Pencil, Check, PieChart, Move, Save, Maximize, Minimize } from "lucide-react";
import { DashboardPreferences, DashboardStats, DashboardBlock } from "@/types/dashboard";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AddBlockDialog from "./AddBlockDialog";

// Importamos las utilidades para grid snapping
import { 
  GridSnapConfig, 
  DEFAULT_SNAP_CONFIG, 
  snapPositionToGrid, 
  snapSizeToGrid,
  createSnapVisualEffect 
} from "../../utils/gridSnapping";

// Importamos la configuración para tamaños de widgets
import {
  WidgetSizeType,
  getWidgetSizeConfig
} from "../../config/widgetSizes";

// Importamos los componentes del dashboard existente
import ComparisonCharts from "./ComparisonCharts";
import InvoicesSummary from "./InvoicesSummary";
import QuickActions from "./QuickActions";
import QuotesSummary from "./QuotesSummary";
import RecentInvoices from "./RecentInvoices";
import RecentTransactions from "./RecentTransactions";
import TasksList from "./TasksList";
import TaxSummary from "./TaxSummary";

// Importamos la configuración centralizada de bloques y tamaños
import { DASHBOARD_BLOCKS } from "../../config/dashboardBlocks";
import { getBlockSize, DASHBOARD_SIZES } from "../../config/dashboardSizes";

// Grid predeterminado para el dashboard
const DEFAULT_GRID_CONFIG = {
  cols: 12,      // 12 columnas
  rowHeight: 60, // Altura de fila en píxeles
  gap: 16        // Espacio entre widgets en píxeles
};

// Layout por defecto vacío para personalización completa
const DEFAULT_LAYOUT: DashboardBlock[] = [];

// Función para generar un ID único
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Convierte los bloques del formato antiguo (string[]) al nuevo formato (DashboardBlock[])
const convertOldBlocksFormat = (blocks: string[]): DashboardBlock[] => {
  // Asignamos posiciones iniciales
  return blocks.map((blockId, index) => ({
    id: blockId,
    type: blockId,
    position: {
      x: (index % 3) * 4, // Distribuir en 3 columnas (de 4 unidades cada una)
      y: Math.floor(index / 3) * 4, // Cada 3 bloques, nueva fila
      w: 4, // Ancho predeterminado (1/3 del total)
      h: 4  // Alto predeterminado
    },
    visible: true
  }));
};

interface CustomizableDashboardProps {
  userId: number;
}

const CustomizableDashboard = ({ userId }: CustomizableDashboardProps) => {
  const [year, setYear] = useState<string>("2025");
  const [period, setPeriod] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [initialSize, setInitialSize] = useState<{w: number, h: number} | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Referencia al contenedor del dashboard
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Obtener preferencias del usuario
  const { data: preferences, isLoading: preferencesLoading } = useQuery<DashboardPreferences>({
    queryKey: ["/api/dashboard/preferences"],
    enabled: !!userId,
  });
  
  // Estado local para los bloques en el dashboard (nuevo formato)
  const [dashboardBlocks, setDashboardBlocks] = useState<DashboardBlock[]>(DEFAULT_LAYOUT);
  const [gridConfig, setGridConfig] = useState(DEFAULT_GRID_CONFIG);

  // Mutar las preferencias del usuario
  const { mutate: updatePreferences } = useMutation({
    mutationFn: async (newPreferences: { blocks: DashboardBlock[] }) => {
      const response = await fetch("/api/dashboard/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPreferences),
      });
      
      if (!response.ok) {
        throw new Error("Error al guardar preferencias");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/preferences"] });
      setHasUnsavedChanges(false);
      toast({
        title: "Dashboard actualizado",
        description: "Tus preferencias han sido guardadas con éxito.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar tus preferencias. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Consulta de estadísticas del dashboard
  const { data: statsData, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
    enabled: !!userId,
  });

  // Actualizar dashboardBlocks cuando se carguen las preferencias
  useEffect(() => {
    if (preferences && preferences.layout) {
      // Configuración de la cuadrícula
      if (preferences.layout.grid) {
        setGridConfig(preferences.layout.grid);
      }
      
      // Bloques del dashboard
      if (preferences.layout.blocks) {
        if (Array.isArray(preferences.layout.blocks)) {
          // Verificar si es un arreglo de strings o de DashboardBlock
          if (preferences.layout.blocks.length > 0) {
            // Si no hay bloques, usar array vacío
            if (typeof preferences.layout.blocks[0] === 'string') {
              // Es un arreglo de strings, convertirlo al nuevo formato
              const convertedBlocks = convertOldBlocksFormat(preferences.layout.blocks as string[]);
              setDashboardBlocks(convertedBlocks);
            } else {
              // Ya es un arreglo de DashboardBlock
              setDashboardBlocks(preferences.layout.blocks as DashboardBlock[]);
            }
          } else {
            setDashboardBlocks([]); // Array vacío
          }
        }
      }
    } else if (!preferencesLoading) {
      // Si no hay preferencias guardadas, utilizamos el layout por defecto
      saveLayout(DEFAULT_LAYOUT);
    }
  }, [preferences, preferencesLoading]);

  // Guardar el layout en la base de datos
  const saveLayout = (blocks: DashboardBlock[]) => {
    updatePreferences({
      blocks: blocks,
    });
  };

  // Manejar el cambio de posición de un bloque con reordenamiento automático
  const handlePositionChange = (blockId: string, newPosition: { x: number; y: number }) => {
    setDashboardBlocks(prevBlocks => {
      // Encontrar el bloque que se está moviendo
      const blockIndex = prevBlocks.findIndex(block => block.id === blockId);
      if (blockIndex < 0) return prevBlocks;
      
      const movingBlock = prevBlocks[blockIndex];
      const blockWidth = movingBlock.position.w;
      const blockHeight = movingBlock.position.h;
      
      // Crear una copia de los bloques
      const updatedBlocks = [...prevBlocks];
      
      // Asegurarse de que la nueva posición está dentro de los límites
      const safeX = Math.max(0, Math.min(gridConfig.cols - blockWidth, newPosition.x));
      const safeY = Math.max(0, newPosition.y);
      
      // Actualizar la posición del bloque en movimiento
      const updatedMovingBlock = {
        ...movingBlock,
        position: {
          ...movingBlock.position,
          x: safeX,
          y: safeY
        }
      };
      updatedBlocks[blockIndex] = updatedMovingBlock;
      
      // Crear una matriz para representar qué celdas están ocupadas
      const grid = Array(gridConfig.cols).fill(0).map(() => Array(100).fill(null)); // 100 filas como máximo
      
      // Marcar las celdas ocupadas por el bloque en movimiento
      for (let x = safeX; x < safeX + blockWidth; x++) {
        for (let y = safeY; y < safeY + blockHeight; y++) {
          if (x >= 0 && x < gridConfig.cols && y >= 0) {
            grid[x][y] = blockId;
          }
        }
      }
      
      // Función para comprobar si un bloque colisiona en una posición dada
      const checkCollision = (block: DashboardBlock, posX: number, posY: number) => {
        for (let x = posX; x < posX + block.position.w; x++) {
          for (let y = posY; y < posY + block.position.h; y++) {
            if (x >= 0 && x < gridConfig.cols && y >= 0 && grid[x][y] !== null && grid[x][y] !== block.id) {
              return true; // Hay colisión
            }
          }
        }
        return false; // No hay colisión
      };
      
      // Función para marcar un bloque en el grid
      const markBlockInGrid = (block: DashboardBlock) => {
        for (let x = block.position.x; x < block.position.x + block.position.w; x++) {
          for (let y = block.position.y; y < block.position.y + block.position.h; y++) {
            if (x >= 0 && x < gridConfig.cols && y >= 0) {
              grid[x][y] = block.id;
            }
          }
        }
      };
      
      // Reorganizar los bloques restantes si hay colisiones
      for (let i = 0; i < updatedBlocks.length; i++) {
        if (i === blockIndex) continue; // Saltar el bloque que estamos moviendo
        
        const currentBlock = updatedBlocks[i];
        const originalPosition = { ...currentBlock.position };
        
        // Comprobar si hay colisión en la posición actual
        if (checkCollision(currentBlock, currentBlock.position.x, currentBlock.position.y)) {
          // Si hay colisión, mover hacia abajo hasta encontrar un espacio libre
          let newY = currentBlock.position.y;
          
          // Intentar mover hacia abajo hasta encontrar un espacio libre
          while (checkCollision(currentBlock, currentBlock.position.x, newY)) {
            newY++;
          }
          
          // Actualizar la posición del bloque
          updatedBlocks[i] = {
            ...currentBlock,
            position: {
              ...currentBlock.position,
              y: newY
            }
          };
        }
        
        // Marcar este bloque en el grid para las siguientes comprobaciones
        markBlockInGrid(updatedBlocks[i]);
      }
      
      setHasUnsavedChanges(true);
      return updatedBlocks;
    });
  };

  // Manejar el cambio de tamaño de un bloque con reordenamiento automático
  const handleResizeBlock = (blockId: string, newSize: { w: number; h: number }) => {
    setDashboardBlocks(prevBlocks => {
      // Crear una copia de los bloques
      const updatedBlocks = [...prevBlocks];
      
      // Encontrar el bloque que se está redimensionando
      const blockIndex = updatedBlocks.findIndex(block => block.id === blockId);
      if (blockIndex < 0) return prevBlocks;
      
      const resizingBlock = updatedBlocks[blockIndex];
      const oldWidth = resizingBlock.position.w;
      const oldHeight = resizingBlock.position.h;
      
      // Actualizar el tamaño del bloque
      updatedBlocks[blockIndex] = {
        ...resizingBlock,
        position: {
          ...resizingBlock.position,
          w: newSize.w,
          h: newSize.h
        }
      };
      
      // Si el tamaño no ha cambiado, no hacer nada más
      if (oldWidth === newSize.w && oldHeight === newSize.h) {
        return prevBlocks;
      }
      
      // Crear una matriz para representar qué celdas están ocupadas
      const grid = Array(gridConfig.cols).fill(0).map(() => Array(100).fill(null)); // 100 filas como máximo
      
      // Función para comprobar si un bloque colisiona en una posición dada
      const checkCollision = (block: DashboardBlock, posX: number, posY: number) => {
        for (let x = posX; x < posX + block.position.w; x++) {
          for (let y = posY; y < posY + block.position.h; y++) {
            if (x >= 0 && x < gridConfig.cols && y >= 0 && grid[x][y] !== null && grid[x][y] !== block.id) {
              return true; // Hay colisión
            }
          }
        }
        return false; // No hay colisión
      };
      
      // Función para marcar un bloque en el grid
      const markBlockInGrid = (block: DashboardBlock) => {
        for (let x = block.position.x; x < block.position.x + block.position.w; x++) {
          for (let y = block.position.y; y < block.position.y + block.position.h; y++) {
            if (x >= 0 && x < gridConfig.cols && y >= 0) {
              grid[x][y] = block.id;
            }
          }
        }
      };
      
      // Marcar las celdas ocupadas por el bloque redimensionado
      markBlockInGrid(updatedBlocks[blockIndex]);
      
      // Reorganizar los bloques restantes si hay colisiones
      for (let i = 0; i < updatedBlocks.length; i++) {
        if (i === blockIndex) continue; // Saltar el bloque que estamos redimensionando
        
        const currentBlock = updatedBlocks[i];
        
        // Comprobar si hay colisión en la posición actual
        if (checkCollision(currentBlock, currentBlock.position.x, currentBlock.position.y)) {
          // Si hay colisión, mover hacia abajo hasta encontrar un espacio libre
          let newY = currentBlock.position.y;
          
          while (checkCollision(currentBlock, currentBlock.position.x, newY)) {
            newY++;
          }
          
          // Actualizar la posición del bloque
          updatedBlocks[i] = {
            ...currentBlock,
            position: {
              ...currentBlock.position,
              y: newY
            }
          };
        }
        
        // Marcar este bloque en el grid para las siguientes comprobaciones
        markBlockInGrid(updatedBlocks[i]);
      }
      
      setHasUnsavedChanges(true);
      return updatedBlocks;
    });
  };

  // Agregar un bloque al dashboard
  const addBlock = (blockType: string, sizeType?: WidgetSizeType) => {
    // Calcular posición para el nuevo bloque
    // Por defecto, lo colocamos en la primera fila disponible
    let maxY = 0;
    dashboardBlocks.forEach(block => {
      const bottomY = block.position.y + block.position.h;
      if (bottomY > maxY) {
        maxY = bottomY;
      }
    });
    
    // Determinar dimensiones según el tipo de tamaño
    let width = 4;  // Tamaño predeterminado (small)
    let height = 4;
    
    if (sizeType) {
      // Obtener configuración de tamaño desde la configuración centralizada
      const sizeConfig = getWidgetSizeConfig(sizeType);
      width = sizeConfig.width;
      height = sizeConfig.height;
    }
    
    // Crear el nuevo bloque con un id único
    const newBlock: DashboardBlock = {
      id: `${blockType}-${generateId()}`,
      type: blockType,
      position: {
        x: 0,  // Empezamos en la columna 0
        y: maxY > 0 ? maxY + 1 : 0, // Si hay bloques, lo ponemos después del último
        w: width,
        h: height
      },
      visible: true,
      sizeType: sizeType || 'small' // Guardar el tipo de tamaño
    };
    
    // Añadir el nuevo bloque al dashboard
    const newBlocks = [...dashboardBlocks, newBlock];
    setDashboardBlocks(newBlocks);
    
    // Guardar en la base de datos
    saveLayout(newBlocks);
  };

  // Cambiar el tamaño de un widget a la siguiente medida predefinida
  const changeBlockSize = (blockId: string) => {
    const blockIndex = dashboardBlocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;
    
    const blockToResize = dashboardBlocks[blockIndex];
    let nextSizeType: WidgetSizeType;
    
    // Determinar el siguiente tipo de tamaño
    if (blockToResize.sizeType === 'small') {
      nextSizeType = 'medium';
    } else if (blockToResize.sizeType === 'medium') {
      nextSizeType = 'large';
    } else {
      nextSizeType = 'small';
    }
    
    // Obtener las dimensiones para el nuevo tamaño
    const sizeConfig = getWidgetSizeConfig(nextSizeType);
    const nextSize = {
      w: sizeConfig.width,
      h: sizeConfig.height
    };
    
    // Aplicar el cambio de tamaño y actualizar el tipo de tamaño
    handleResizeBlock(blockId, nextSize);
    
    // Actualizar el tipo de tamaño en el bloque
    setDashboardBlocks(prevBlocks => {
      return prevBlocks.map(block => {
        if (block.id === blockId) {
          return {
            ...block,
            sizeType: nextSizeType
          };
        }
        return block;
      });
    });
    
    // Notificar al usuario
    toast({
      title: `Tamaño cambiado (${sizeConfig.label})`,
      description: sizeConfig.description,
      variant: "default",
    });
  };

  // Eliminar un bloque del dashboard
  const removeBlock = (blockId: string) => {
    try {
      // Filtramos el bloque a eliminar
      const newBlocks = dashboardBlocks.filter(block => block.id !== blockId);
      
      // Actualizamos el estado local
      setDashboardBlocks(newBlocks);
      
      // Guardamos en la base de datos
      saveLayout(newBlocks);
      
      // Notificamos al usuario
      toast({
        title: "Bloque eliminado",
        description: "El bloque ha sido eliminado correctamente.",
        variant: "default",
      });
    } catch (err) {
      console.error("Error al eliminar bloque:", err);
      toast({
        title: "Error al eliminar",
        description: "Ocurrió un error al eliminar el bloque.",
        variant: "destructive",
      });
    }
  };

  // Eventos de movimiento con mouse
  const [initialMousePosition, setInitialMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [initialBlockPosition, setInitialBlockPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Eventos para manejo de arrastrar con ratón
  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    if (!isEditMode) return;
    
    // Prevenir comportamiento por defecto
    e.preventDefault();
    
    // Guardar la posición inicial del ratón
    setInitialMousePosition({ x: e.clientX, y: e.clientY });
    
    // Buscar la posición inicial del bloque
    const block = dashboardBlocks.find(b => b.id === blockId);
    if (block) {
      setInitialBlockPosition({ x: block.position.x, y: block.position.y });
      setDraggedBlockId(blockId);
      setIsDragging(true);
      
      // Añadir eventos globales para capturar el movimiento y soltar
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isEditMode || !isDragging || !draggedBlockId || !initialMousePosition || !initialBlockPosition || !dashboardRef.current) return;
    
    // Obtener las dimensiones del dashboard
    const rect = dashboardRef.current.getBoundingClientRect();
    
    // Configurar el grid snapping
    const snapConfig: GridSnapConfig = {
      ...DEFAULT_SNAP_CONFIG,
      cols: gridConfig.cols,
      gap: gridConfig.gap,
      gridRef: dashboardRef,
      threshold: 20 // Umbral de snap ligeramente mayor para mejor UX
    };
    
    // Calcular el tamaño de una celda de la cuadrícula
    const cellWidth = (rect.width - (gridConfig.cols - 1) * gridConfig.gap) / gridConfig.cols;
    const cellHeight = gridConfig.rowHeight + gridConfig.gap;
    
    // Calcular la posición absoluta del ratón en términos de grid
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Aplicar snapping a la posición del ratón
    const snappedPosition = snapPositionToGrid(mouseX, mouseY, snapConfig);
    
    // Convertir la posición snapped a coordenadas de grid
    const gridX = Math.round(snappedPosition.x / (cellWidth + gridConfig.gap));
    const gridY = Math.round(snappedPosition.y / (cellHeight));
    
    // Determinar el bloque que estamos moviendo
    const currentBlock = dashboardBlocks.find(b => b.id === draggedBlockId);
    if (!currentBlock) return;
    
    // Solo actualizar si la posición es diferente
    if (currentBlock.position.x !== gridX || currentBlock.position.y !== gridY) {
      // Mostrar efecto visual de la cuadrícula durante el arrastre (solo ocasionalmente)
      if (Math.random() < 0.1) { // Limitamos para no crear demasiados elementos
        createSnapVisualEffect(dashboardRef.current, snapConfig, 300);
      }
      
      // Actualizar la posición del bloque
      handlePositionChange(draggedBlockId, { 
        x: Math.max(0, Math.min(gridConfig.cols - currentBlock.position.w, gridX)), 
        y: Math.max(0, gridY) 
      });
    }
  };
  
  const handleMouseUp = () => {
    if (!isEditMode || !isDragging) return;
    
    // Limpiar estado
    setIsDragging(false);
    setDraggedBlockId(null);
    setInitialMousePosition(null);
    setInitialBlockPosition(null);
    
    // Guardar cambios en la base de datos
    saveLayout(dashboardBlocks);
    
    // Eliminar eventos globales
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Iniciar redimensionamiento
  const handleResizeStart = (e: React.MouseEvent, blockId: string, direction: string) => {
    if (!isEditMode) return;
    
    // Prevenir eventos por defecto
    e.preventDefault();
    e.stopPropagation();
    
    // Encontrar el bloque
    const block = dashboardBlocks.find(b => b.id === blockId);
    if (!block) return;
    
    // Guardar tamaño inicial
    setInitialSize({ w: block.position.w, h: block.position.h });
    setInitialMousePosition({ x: e.clientX, y: e.clientY });
    
    // Activar estado de redimensionamiento
    setResizingBlockId(blockId);
    setResizeDirection(direction);
    setIsResizing(true);
    
    // Añadir eventos globales
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Manejar el movimiento durante el redimensionamiento
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizingBlockId || !initialMousePosition || !initialSize || !dashboardRef.current) return;
    
    // Obtener el bloque que se está redimensionando
    const blockIndex = dashboardBlocks.findIndex(b => b.id === resizingBlockId);
    if (blockIndex < 0) return;
    
    const block = dashboardBlocks[blockIndex];
    
    // Obtener dimensiones del dashboard
    const rect = dashboardRef.current.getBoundingClientRect();
    
    // Configurar el grid snapping
    const snapConfig: GridSnapConfig = {
      ...DEFAULT_SNAP_CONFIG,
      cols: gridConfig.cols,
      gap: gridConfig.gap,
      gridRef: dashboardRef,
      threshold: 15 // Umbral de snap para redimensionamiento
    };
    
    // Calcular tamaño de celda
    const cellWidth = (rect.width - (gridConfig.cols - 1) * gridConfig.gap) / gridConfig.cols;
    const cellHeight = gridConfig.rowHeight + gridConfig.gap;
    
    // Calcular la posición del mouse con snapping
    const mousePosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Aplicar snapping a la posición del ratón
    const snappedPosition = snapPositionToGrid(mousePosition.x, mousePosition.y, snapConfig);
    
    // Calcular cambio en unidades de grid
    const deltaX = Math.round((snappedPosition.x - (initialMousePosition.x - rect.left)) / cellWidth);
    const deltaY = Math.round((snappedPosition.y - (initialMousePosition.y - rect.top)) / cellHeight);
    
    // Calcular nuevo tamaño según la dirección
    let newWidth = initialSize.w;
    let newHeight = initialSize.h;
    
    switch(resizeDirection) {
      case 'bottomRight':
        newWidth = Math.max(1, initialSize.w + deltaX);
        newHeight = Math.max(1, initialSize.h + deltaY);
        break;
      case 'bottomLeft':
        newWidth = Math.max(1, initialSize.w - deltaX);
        newHeight = Math.max(1, initialSize.h + deltaY);
        break;
      case 'bottom':
        newHeight = Math.max(1, initialSize.h + deltaY);
        break;
      case 'right':
        newWidth = Math.max(1, initialSize.w + deltaX);
        break;
    }
    
    // Asegurarse de que el ancho no exceda el grid
    newWidth = Math.min(gridConfig.cols, newWidth);
    
    // Mostrar efecto visual de la cuadrícula durante el redimensionamiento (ocasionalmente)
    if (Math.random() < 0.05) { // Probabilidad baja para no crear demasiados elementos
      createSnapVisualEffect(dashboardRef.current, snapConfig, 300);
    }
    
    // Aplicar los cambios de tamaño al bloque
    if (newWidth !== block.position.w || newHeight !== block.position.h) {
      handleResizeBlock(resizingBlockId, { w: newWidth, h: newHeight });
    }
  };
  
  // Finalizar redimensionamiento
  const handleResizeEnd = () => {
    if (!isResizing) return;
    
    // Limpiar estados
    setIsResizing(false);
    setResizingBlockId(null);
    setResizeDirection(null);
    setInitialSize(null);
    setInitialMousePosition(null);
    
    // Guardar cambios en la base de datos
    saveLayout(dashboardBlocks);
    
    // Eliminar eventos globales
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Limpieza de eventos al desmontar el componente
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);
  
  // Eventos de drag and drop como fallback para dispositivos táctiles
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    if (!isEditMode) return;
    
    setIsDragging(true);
    setDraggedBlockId(blockId);
    
    // Configurar la imagen de arrastre
    if (e.dataTransfer) {
      // Si quieres que sea invisible
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
      e.dataTransfer.setDragImage(img, 0, 0);
      
      // Configurar efectos de arrastre
      e.dataTransfer.effectAllowed = 'move';
    }
    
    // Buscar la posición inicial del bloque
    const block = dashboardBlocks.find(b => b.id === blockId);
    if (block) {
      setInitialBlockPosition({ x: block.position.x, y: block.position.y });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode || !isDragging || !draggedBlockId) return;
    e.preventDefault();
    e.stopPropagation();
    
    // Calcular la posición en el grid
    if (dashboardRef.current) {
      const rect = dashboardRef.current.getBoundingClientRect();
      
      // Configurar el grid snapping
      const snapConfig: GridSnapConfig = {
        ...DEFAULT_SNAP_CONFIG,
        cols: gridConfig.cols,
        gap: gridConfig.gap,
        gridRef: dashboardRef,
        threshold: 20 // Umbral de snap para arrastre
      };
      
      // Posición del mouse en el dashboard
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Aplicar snapping a la posición
      const snappedPosition = snapPositionToGrid(mouseX, mouseY, snapConfig);
      
      // Calcular la posición en unidades de grid con snapping
      const cellWidth = (rect.width - (gridConfig.cols - 1) * gridConfig.gap) / gridConfig.cols;
      const cellHeight = gridConfig.rowHeight + gridConfig.gap;
      
      const gridX = Math.round(snappedPosition.x / (cellWidth + gridConfig.gap));
      const gridY = Math.round(snappedPosition.y / cellHeight);
      
      // Mostrar efecto visual de la cuadrícula ocasionalmente durante el arrastre
      if (Math.random() < 0.05) {
        createSnapVisualEffect(dashboardRef.current, snapConfig, 300);
      }
      
      // Actualizar la posición del bloque arrastrado
      handlePositionChange(draggedBlockId, { x: gridX, y: gridY });
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (!isEditMode) return;
    
    setIsDragging(false);
    setDraggedBlockId(null);
    setInitialBlockPosition(null);
    
    // Guardar cambios en la base de datos
    saveLayout(dashboardBlocks);
  };

  // Bloques disponibles para agregar (los que no están ya en el dashboard)
  const availableToAdd = Object.keys(DASHBOARD_BLOCKS).filter(
    (blockId) => !dashboardBlocks.some(block => block.type === blockId)
  );

  // Si todo está cargando, mostrar skeleton
  if (preferencesLoading && statsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard personalizable */}
      <div className="space-y-4">
        {/* Header con botones de acción */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Dashboard</h2>
          <div className="flex items-center space-x-3">
            {isEditMode && (
              <div className="flex items-center bg-yellow-50 py-1 px-3 rounded-md border border-yellow-200">
                <span className="text-sm text-yellow-700 mr-2">Modo edición</span>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddDialogOpen(true)}
                    className="flex items-center text-xs h-7"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Añadir
                  </Button>
                  
                  {hasUnsavedChanges && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => saveLayout(dashboardBlocks)}
                      className="flex items-center text-xs h-7 ml-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      <Save className="mr-1 h-3 w-3" />
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
            )}
            
            <Button
              variant={isEditMode ? "outline" : "default"}
              size="sm"
              onClick={() => {
                if (isEditMode && hasUnsavedChanges) {
                  // Guardar los cambios al salir del modo edición
                  saveLayout(dashboardBlocks);
                }
                setIsEditMode(!isEditMode);
              }}
              className={`flex items-center ${isEditMode ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}`}
            >
              {isEditMode ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Finalizar edición
                </>
              ) : (
                <>
                  <Pencil className="mr-1 h-4 w-4" />
                  Personalizar dashboard
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Diálogo para añadir bloques */}
        <AddBlockDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSelectBlock={(blockId, sizeType) => addBlock(blockId, sizeType)}
        />

        {/* Contenedor de bloques personalizables con grid o mensaje si está vacío */}
        {dashboardBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-gray-50">
            <div className="text-center space-y-5">
              <PieChart className="h-16 w-16 mx-auto text-gray-300" />
              <div>
                <h3 className="text-lg font-medium text-gray-800">Dashboard personalizable</h3>
                <p className="text-gray-500 mt-1">El dashboard está vacío. Añade widgets para personalizar tu experiencia.</p>
              </div>
              <Button 
                variant="default" 
                onClick={() => {
                  setIsEditMode(true);
                  setIsAddDialogOpen(true);
                }}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir tu primer widget
              </Button>
            </div>
          </div>
        ) : (
          <div 
            ref={dashboardRef}
            className="relative min-h-[600px]"
            onDragOver={handleDragOver}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
              gap: `${gridConfig.gap}px`,
              gridAutoRows: `${gridConfig.rowHeight}px`,
            }}
          >
            {dashboardBlocks.map((block) => {
              const blockConfig = DASHBOARD_BLOCKS[block.type as keyof typeof DASHBOARD_BLOCKS];
              if (!blockConfig) return null;
              
              const BlockComponent = blockConfig.component;
              
              // Calcular el estilo de posicionamiento basado en las coordenadas del grid
              const blockStyle = {
                gridColumn: `${block.position.x + 1} / span ${block.position.w}`,
                gridRow: `${block.position.y + 1} / span ${block.position.h}`,
              };
              
              return (
                <div 
                  key={block.id} 
                  className={`relative rounded-lg shadow-sm ${
                    isEditMode 
                      ? 'ring-2 ' + 
                        (draggedBlockId === block.id 
                          ? 'ring-blue-400 shadow-lg scale-[1.02] z-10' 
                          : isResizing && resizingBlockId === block.id 
                            ? 'ring-green-400 shadow-lg z-10' 
                            : 'ring-blue-200')
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    ...blockStyle,
                    transition: (isDragging && draggedBlockId === block.id) || 
                               (isResizing && resizingBlockId === block.id) 
                               ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease',
                    cursor: isEditMode ? 'move' : 'default',
                    transform: (isResizing && resizingBlockId === block.id) 
                              ? 'scale(1.01)' 
                              : (isDragging && draggedBlockId === block.id)
                                ? 'scale(1.02)' 
                                : 'scale(1)'
                  }}
                  draggable={isEditMode && !isResizing}
                  onDragStart={(e) => handleDragStart(e, block.id)}
                  onDragEnd={handleDragEnd}
                  onMouseDown={(e) => {
                    // Solo iniciar arrastre si no estamos en un controlador de redimensionamiento
                    if (!e.currentTarget.closest('.resize-handle')) {
                      handleMouseDown(e, block.id);
                    }
                  }}
                >
                  {/* Controles del bloque - Visibles siempre en modo edición o al pasar el cursor */}
                  <div 
                    className={`absolute top-2 right-2 z-10 flex space-x-1
                      ${isEditMode 
                        ? 'opacity-100 bg-white/90 p-1 rounded-md shadow-md border border-gray-200' 
                        : 'opacity-0 group-hover:opacity-100 transition-opacity'}
                    `}
                  >
                    {isEditMode && (
                      <div className="flex items-center mr-2">
                        <span className="text-xs text-gray-500 font-medium">
                          {blockConfig.title}
                        </span>
                      </div>
                    )}
                    
                    {/* Controles en modo edición */}
                    {isEditMode && (
                      <>
                        {/* Indicador de arrastre */}
                        <div 
                          className="h-7 w-7 flex items-center justify-center text-gray-400 cursor-move"
                          onMouseDown={(e) => {
                            // Evitar que los clics en el handle afecten otros elementos
                            e.stopPropagation();
                            handleMouseDown(e, block.id);
                          }}
                        >
                          <Move className="h-4 w-4" />
                        </div>
                      </>
                    )}
                    
                    {/* Botón para cambiar tamaño */}
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-white/80 hover:bg-blue-50 text-gray-600 hover:text-blue-600 shadow-sm"
                        onClick={() => changeBlockSize(block.id)}
                        title="Cambiar tamaño"
                      >
                        <Maximize className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Botón para eliminar */}
                    {isEditMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-600 shadow-sm"
                        onClick={() => removeBlock(block.id)}
                        title="Eliminar bloque"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Componente del bloque */}
                  <div className="h-full">
                    <BlockComponent
                      data={statsData || {
                        income: 0,
                        expenses: 0,
                        pendingInvoices: 0,
                        pendingCount: 0,
                        pendingQuotes: 0,
                        pendingQuotesCount: 0,
                        // Propiedades para los presupuestos
                        totalQuotes: 0,
                        acceptedQuotes: 0, 
                        rejectedQuotes: 0,
                        // Propiedades para los impuestos
                        taxes: { 
                          vat: 0, 
                          incomeTax: 0, 
                          ivaALiquidar: 0 
                        },
                        // Propiedades para datos fiscales
                        taxStats: {
                          ivaRepercutido: 0,
                          ivaSoportado: 0,
                          ivaLiquidar: 0,
                          irpfRetenido: 0,
                          irpfTotal: 0,
                          irpfPagar: 0
                        }
                      }}
                      isLoading={statsLoading}
                      sizeType={block.sizeType || 'small'}
                    />
                  </div>
                  
                  {/* Controladores de redimensionamiento - solo en modo edición */}
                  {isEditMode && (
                    <>
                      {/* Esquina inferior derecha */}
                      <div 
                        className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-70 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (typeof handleResizeStart === 'function') {
                            handleResizeStart(e, block.id, 'bottomRight');
                          }
                        }}
                      >
                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Esquina inferior izquierda */}
                      <div 
                        className="resize-handle absolute bottom-0 left-0 w-6 h-6 cursor-nesw-resize opacity-70 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (typeof handleResizeStart === 'function') {
                            handleResizeStart(e, block.id, 'bottomLeft');
                          }
                        }}
                      >
                        <div className="absolute bottom-1 left-1 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Parte inferior */}
                      <div 
                        className="resize-handle absolute bottom-0 left-1/2 transform -translate-x-1/2 w-10 h-6 cursor-ns-resize opacity-70 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (typeof handleResizeStart === 'function') {
                            handleResizeStart(e, block.id, 'bottom');
                          }
                        }}
                      >
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      
                      {/* Parte derecha */}
                      <div 
                        className="resize-handle absolute top-1/2 right-0 transform -translate-y-1/2 h-10 w-6 cursor-ew-resize opacity-70 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (typeof handleResizeStart === 'function') {
                            handleResizeStart(e, block.id, 'right');
                          }
                        }}
                      >
                        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizableDashboard;