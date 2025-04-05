import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowUp, ArrowDown, Settings, Pencil, Check, PieChart } from "lucide-react";
import { DashboardPreferences, DashboardStats } from "@/types/dashboard";
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
import { getBlockSize } from "../../config/dashboardSizes";

// Layout por defecto vacío para personalización completa
const DEFAULT_LAYOUT: string[] = [];

// Ya no definimos los componentes disponibles aquí, sino que los importamos desde config/dashboardBlocks.tsx

interface CustomizableDashboardProps {
  userId: number;
}

const CustomizableDashboard = ({ userId }: CustomizableDashboardProps) => {
  const [year, setYear] = useState<string>("2025");
  const [period, setPeriod] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Obtener preferencias del usuario
  const { data: preferences, isLoading: preferencesLoading } = useQuery<DashboardPreferences>({
    queryKey: ["/api/dashboard/preferences"],
    enabled: !!userId,
  });
  
  // Estado local para los bloques en el dashboard
  const [activeBlocks, setActiveBlocks] = useState<string[]>(DEFAULT_LAYOUT);

  // Mutar las preferencias del usuario
  const { mutate: updatePreferences } = useMutation({
    mutationFn: async (newPreferences: { blocks: string[] }) => {
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

  // Actualizar activeBlocks cuando se carguen las preferencias
  useEffect(() => {
    if (preferences && preferences.layout && preferences.layout.blocks) {
      setActiveBlocks(preferences.layout.blocks);
    } else if (!preferencesLoading) {
      // Si no hay preferencias guardadas, utilizamos el layout por defecto
      updatePreferences({
        blocks: DEFAULT_LAYOUT
      });
    }
  }, [preferences, preferencesLoading]);

  // Manejar el reordenamiento de bloques (simple reordenamiento sin drag & drop)
  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const currentIndex = activeBlocks.indexOf(blockId);
    if (currentIndex < 0) return;
    
    const newBlocks = [...activeBlocks];
    
    if (direction === "up" && currentIndex > 0) {
      // Mover hacia arriba
      [newBlocks[currentIndex], newBlocks[currentIndex - 1]] = 
      [newBlocks[currentIndex - 1], newBlocks[currentIndex]];
    } else if (direction === "down" && currentIndex < newBlocks.length - 1) {
      // Mover hacia abajo
      [newBlocks[currentIndex], newBlocks[currentIndex + 1]] = 
      [newBlocks[currentIndex + 1], newBlocks[currentIndex]];
    } else {
      // No se puede mover más
      return;
    }
    
    setActiveBlocks(newBlocks);
    
    // Guardamos automáticamente al reordenar
    updatePreferences({
      blocks: newBlocks,
    });
  };

  // Agregar un bloque al dashboard
  const addBlock = (blockType: string) => {
    console.log("Función addBlock llamada con:", blockType);
    console.log("Estado actual de activeBlocks:", activeBlocks);
    
    if (!activeBlocks.includes(blockType)) {
      console.log("El bloque no está en la lista, se agregará");
      // Añadimos el nuevo bloque al principio del array para que aparezca primero
      const newBlocks = [blockType, ...activeBlocks];
      console.log("Nueva lista de bloques:", newBlocks);
      
      setActiveBlocks(newBlocks);
      
      // Guardamos automáticamente al añadir
      updatePreferences({
        blocks: newBlocks,
      });
    } else {
      console.log("El bloque ya está en la lista, no se agregará");
    }
  };

  // Eliminar un bloque del dashboard
  const removeBlock = (blockId: string) => {
    console.log("Intentando eliminar bloque:", blockId);
    console.log("Bloques actuales:", activeBlocks);
    
    try {
      // Filtramos el bloque a eliminar (asegurando comparación estricta por valor)
      const blockIndex = activeBlocks.indexOf(blockId);
      console.log("Índice del bloque a eliminar:", blockIndex);
      
      if (blockIndex === -1) {
        console.error("Error: No se encontró el bloque en la lista de bloques activos");
        toast({
          title: "Error al eliminar",
          description: "No se encontró el bloque en el dashboard.",
          variant: "destructive",
        });
        return;
      }
      
      const newBlocksArray = [...activeBlocks];
      newBlocksArray.splice(blockIndex, 1);
      console.log("Nuevos bloques tras eliminar:", newBlocksArray);
      
      // Actualizamos el estado local
      setActiveBlocks(newBlocksArray);
      
      // Guardamos en la base de datos
      updatePreferences({
        blocks: newBlocksArray,
      });
      
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

  // Bloques disponibles para agregar (los que no están ya en el dashboard)
  const availableToAdd = Object.keys(DASHBOARD_BLOCKS).filter(
    (blockId) => !activeBlocks.includes(blockId)
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
                </div>
              </div>
            )}
            
            <Button
              variant={isEditMode ? "outline" : "default"}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center ${isEditMode ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}`}
            >
              {isEditMode ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Guardar cambios
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
        {activeBlocks.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {activeBlocks.map((blockId, index) => {
              const blockConfig = DASHBOARD_BLOCKS[blockId as keyof typeof DASHBOARD_BLOCKS];
              if (!blockConfig) return null;
              
              const BlockComponent = blockConfig.component;
              
              // Obtener el tamaño apropiado para este bloque usando la función centralizada
              const { width, height } = getBlockSize(blockId);
              
              return (
                <div 
                  key={blockId} 
                  className={`relative group ${width} ${height} ${isEditMode ? 'ring-2 ring-blue-200 rounded-lg' : ''}`}
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
                    
                    {/* Botón para mover hacia arriba */}
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-white/80 hover:bg-white shadow-sm"
                        onClick={() => moveBlock(blockId, "up")}
                        title="Mover hacia arriba"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Botón para mover hacia abajo */}
                    {index < activeBlocks.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 bg-white/80 hover:bg-white shadow-sm"
                        onClick={() => moveBlock(blockId, "down")}
                        title="Mover hacia abajo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Botón para eliminar */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-600 shadow-sm"
                      onClick={() => removeBlock(blockId)}
                      title="Eliminar bloque"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Componente del bloque */}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizableDashboard;