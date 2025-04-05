import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowUp, ArrowDown, Settings, Pencil, Check, PieChart, Move, Save } from "lucide-react";
import { DashboardPreferences, DashboardStats, DashboardBlock } from "@/types/dashboard";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AddBlockDialog from "./AddBlockDialog";

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

  // Manejar el cambio de posición de un bloque
  const handlePositionChange = (blockId: string, newPosition: { x: number; y: number }) => {
    setDashboardBlocks(prevBlocks => {
      const updatedBlocks = [...prevBlocks];
      const blockIndex = updatedBlocks.findIndex(block => block.id === blockId);
      
      if (blockIndex >= 0) {
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          position: {
            ...updatedBlocks[blockIndex].position,
            x: newPosition.x,
            y: newPosition.y
          }
        };
      }
      
      setHasUnsavedChanges(true);
      return updatedBlocks;
    });
  };

  // Manejar el cambio de tamaño de un bloque
  const handleResizeBlock = (blockId: string, newSize: { w: number; h: number }) => {
    setDashboardBlocks(prevBlocks => {
      const updatedBlocks = [...prevBlocks];
      const blockIndex = updatedBlocks.findIndex(block => block.id === blockId);
      
      if (blockIndex >= 0) {
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          position: {
            ...updatedBlocks[blockIndex].position,
            w: newSize.w,
            h: newSize.h
          }
        };
      }
      
      setHasUnsavedChanges(true);
      return updatedBlocks;
    });
  };

  // Agregar un bloque al dashboard
  const addBlock = (blockType: string) => {
    // Calcular posición para el nuevo bloque
    // Por defecto, lo colocamos en la primera fila disponible
    let maxY = 0;
    dashboardBlocks.forEach(block => {
      const bottomY = block.position.y + block.position.h;
      if (bottomY > maxY) {
        maxY = bottomY;
      }
    });
    
    // Crear el nuevo bloque con un id único
    const newBlock: DashboardBlock = {
      id: `${blockType}-${generateId()}`,
      type: blockType,
      position: {
        x: 0,  // Empezamos en la columna 0
        y: maxY > 0 ? maxY + 1 : 0, // Si hay bloques, lo ponemos después del último
        w: 4,  // Ancho predeterminado (1/3 del ancho total)
        h: 4   // Alto predeterminado
      },
      visible: true
    };
    
    // Añadir el nuevo bloque al dashboard
    const newBlocks = [...dashboardBlocks, newBlock];
    setDashboardBlocks(newBlocks);
    
    // Guardar en la base de datos
    saveLayout(newBlocks);
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
    
    // Calcular el desplazamiento del ratón
    const deltaX = e.clientX - initialMousePosition.x;
    const deltaY = e.clientY - initialMousePosition.y;
    
    // Obtener las dimensiones del dashboard
    const rect = dashboardRef.current.getBoundingClientRect();
    
    // Calcular el tamaño de una celda de la cuadrícula
    const cellWidth = (rect.width - (gridConfig.cols - 1) * gridConfig.gap) / gridConfig.cols;
    const cellHeight = gridConfig.rowHeight + gridConfig.gap;
    
    // Calcular el número de celdas que se ha movido
    const gridDeltaX = Math.round(deltaX / cellWidth);
    const gridDeltaY = Math.round(deltaY / cellHeight);
    
    // Calcular la nueva posición del bloque
    const newX = Math.max(0, Math.min(gridConfig.cols - 1, initialBlockPosition.x + gridDeltaX));
    const newY = Math.max(0, initialBlockPosition.y + gridDeltaY);
    
    // Actualizar la posición del bloque
    handlePositionChange(draggedBlockId, { x: newX, y: newY });
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
  
  // Limpieza de eventos al desmontar el componente
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calcular la posición en unidades de grid
      const gridX = Math.floor(x / ((rect.width - (gridConfig.cols - 1) * gridConfig.gap) / gridConfig.cols));
      const gridY = Math.floor(y / (gridConfig.rowHeight + gridConfig.gap));
      
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
          onSelectBlock={addBlock}
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
                  className={`relative ${isEditMode ? 'cursor-move ring-2 ring-blue-200 rounded-lg' : ''}`}
                  style={blockStyle}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, block.id)}
                  onDragEnd={handleDragEnd}
                  onMouseDown={(e) => handleMouseDown(e, block.id)}
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
                    
                    {/* Indicador de arrastre en modo edición */}
                    {isEditMode && (
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
                    />
                  </div>
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