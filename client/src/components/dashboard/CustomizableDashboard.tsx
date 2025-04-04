import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, ArrowUp, ArrowDown, Settings } from "lucide-react";
import { DashboardPreferences, DashboardStats } from "@/types/dashboard";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
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

// Importamos bloques especializados para el dashboard personalizable
import ResultSummary from "./blocks/ResultSummary";
import QuotesSummaryBlock from "./blocks/QuotesSummary";
import InvoicesSummaryBlock from "./blocks/InvoicesSummary";
import ComparativeChart from "./blocks/ComparativeChart";

// Layout por defecto
const DEFAULT_LAYOUT = [
  "result-summary",
  "quotes-summary",
  "invoices-summary",
  "comparative-chart"
];

// Definimos los componentes disponibles
const AVAILABLE_BLOCKS = {
  "result-summary": {
    id: "result-summary",
    title: "Resumen de Resultados",
    component: ResultSummary,
  },
  "quotes-summary": {
    id: "quotes-summary",
    title: "Presupuestos",
    component: QuotesSummaryBlock,
  },
  "invoices-summary": {
    id: "invoices-summary",
    title: "Facturas",
    component: InvoicesSummaryBlock,
  },
  "comparative-chart": {
    id: "comparative-chart",
    title: "Comparativa Financiera",
    component: ComparativeChart,
  }
};

interface CustomizableDashboardProps {
  userId: number;
}

const CustomizableDashboard = ({ userId }: CustomizableDashboardProps) => {
  const [year, setYear] = useState<string>("2025");
  const [period, setPeriod] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
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
    }
  }, [preferences]);

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
    if (!activeBlocks.includes(blockType)) {
      const newBlocks = [...activeBlocks, blockType];
      setActiveBlocks(newBlocks);
      
      // Guardamos automáticamente al añadir
      updatePreferences({
        blocks: newBlocks,
      });
    }
  };

  // Eliminar un bloque del dashboard
  const removeBlock = (blockId: string) => {
    const newBlocks = activeBlocks.filter((id) => id !== blockId);
    setActiveBlocks(newBlocks);
    
    // Guardamos automáticamente al eliminar
    updatePreferences({
      blocks: newBlocks,
    });
  };

  // Bloques disponibles para agregar (los que no están ya en el dashboard)
  const availableToAdd = Object.keys(AVAILABLE_BLOCKS).filter(
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
      {/* Sección 1: El dashboard original con 3 cards en fila (Ingresos, Gastos, Resultado Final) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-600">Ingresos</h3>
          <p className="text-2xl font-bold mb-1">{statsData?.income ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(statsData.income / 100) : "0,00 €"}</p>
          <div className="flex justify-between text-sm">
            <div>IVA repercutido: <span className="font-medium">{statsData?.taxes?.vat ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(statsData.taxes.vat / 100) : "0,00 €"}</span></div>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-red-600">Gastos</h3>
          <p className="text-2xl font-bold mb-1">{statsData?.expenses ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(statsData.expenses / 100) : "0,00 €"}</p>
          <div className="flex justify-between text-sm">
            <div>IVA soportado: <span className="font-medium">0,00 €</span></div>
          </div>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-green-600">Resultado Final</h3>
          <p className="text-2xl font-bold mb-1">{statsData?.income && statsData?.expenses ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((statsData.income - statsData.expenses) / 100) : "0,00 €"}</p>
          <div className="flex justify-between text-sm">
            <div>IVA a liquidar: <span className="font-medium">{statsData?.taxes?.ivaALiquidar ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(statsData.taxes.ivaALiquidar / 100) : "0,00 €"}</span></div>
          </div>
        </div>
      </div>
      
      {/* Sección 2: Dashboard personalizable */}
      <div className="border rounded-lg p-4 space-y-4">
        {/* Header con botones de acción */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Bloques Personalizables</h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center"
            >
              <Plus className="mr-1 h-4 w-4" />
              Añadir Bloque
            </Button>
          </div>
        </div>

        {/* Diálogo para añadir bloques */}
        <AddBlockDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSelectBlock={addBlock}
        />

        {/* Contenedor de bloques personalizables */}
        <div className="space-y-4">
          {activeBlocks.map((blockId, index) => {
            const blockConfig = AVAILABLE_BLOCKS[blockId as keyof typeof AVAILABLE_BLOCKS];
            if (!blockConfig) return null;
            
            const BlockComponent = blockConfig.component;
            
            return (
              <div key={blockId} className="relative group">
                {/* Controles del bloque */}
                <div className="absolute top-2 right-2 z-10 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Botón para mover hacia arriba */}
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/80 hover:bg-white shadow"
                      onClick={() => moveBlock(blockId, "up")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Botón para mover hacia abajo */}
                  {index < activeBlocks.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/80 hover:bg-white shadow"
                      onClick={() => moveBlock(blockId, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Botón para eliminar */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white/80 hover:bg-white shadow"
                    onClick={() => removeBlock(blockId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Componente del bloque */}
                <BlockComponent
                  data={statsData || {}}
                  isLoading={statsLoading}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomizableDashboard;