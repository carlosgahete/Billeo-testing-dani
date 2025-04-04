import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, X, MoveVertical, Settings } from "lucide-react";
import { DashboardPreferences, DashboardStats } from "@/types/dashboard";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

// Importamos todos los bloques disponibles
import IncomeSummary from "./blocks/IncomeSummary";
import ExpensesSummary from "./blocks/ExpensesSummary";
import ResultSummary from "./blocks/ResultSummary";
import QuotesSummary from "./blocks/QuotesSummary";
import InvoicesSummary from "./blocks/InvoicesSummary";
import ComparativeChart from "./blocks/ComparativeChart";
import FinancialChart from "./blocks/FinancialChart";
import DashboardBlockMenu from "./DashboardBlockMenu";

// Definimos los componentes disponibles
const AVAILABLE_BLOCKS = {
  "income-summary": {
    id: "income-summary",
    title: "Resumen de Ingresos",
    component: IncomeSummary,
  },
  "expenses-summary": {
    id: "expenses-summary",
    title: "Resumen de Gastos",
    component: ExpensesSummary,
  },
  "result-summary": {
    id: "result-summary",
    title: "Resultado Final",
    component: ResultSummary,
  },
  "quotes-summary": {
    id: "quotes-summary",
    title: "Presupuestos",
    component: QuotesSummary,
  },
  "invoices-summary": {
    id: "invoices-summary",
    title: "Facturas",
    component: InvoicesSummary,
  },
  "comparative-chart": {
    id: "comparative-chart",
    title: "Comparativa Financiera",
    component: ComparativeChart,
  },
  "financial-chart": {
    id: "financial-chart",
    title: "Evolución Anual",
    component: FinancialChart,
  }
};

// Layout por defecto
const DEFAULT_LAYOUT = [
  "income-summary",
  "expenses-summary",
  "result-summary",
  "quotes-summary",
  "invoices-summary",
  "comparative-chart"
];

interface CustomizableDashboardProps {
  userId: number;
}

const CustomizableDashboard = ({ userId }: CustomizableDashboardProps) => {
  const [year, setYear] = useState<string>("2025");
  const [period, setPeriod] = useState<string>("all");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Obtener preferencias del usuario
  const { data: preferences, isLoading: preferencesLoading } = useQuery<DashboardPreferences>({
    queryKey: ["/api/dashboard/preferences"],
    enabled: !!userId,
  });
  
  // Estado local para los bloques en el dashboard
  const [activeBlocks, setActiveBlocks] = useState<string[]>(DEFAULT_LAYOUT);

  // Mutar las preferencias del usuario
  const { mutate: updatePreferences } = useMutation({
    mutationFn: (newPreferences: { blocks: string[] }) =>
      apiRequest("/api/dashboard/preferences", "POST", newPreferences),
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
    queryKey: ["/api/stats/dashboard", year, period],
    enabled: !!userId,
  });

  // Actualizar activeBlocks cuando se carguen las preferencias
  useEffect(() => {
    if (preferences && preferences.layout && preferences.layout.blocks) {
      setActiveBlocks(preferences.layout.blocks);
    }
  }, [preferences]);

  // Guardar cambios en las preferencias
  const savePreferences = () => {
    updatePreferences({
      blocks: activeBlocks,
    });
  };

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
  const addBlock = (blockId: string) => {
    if (!activeBlocks.includes(blockId)) {
      const newBlocks = [...activeBlocks, blockId];
      setActiveBlocks(newBlocks);
      
      // Guardamos automáticamente al añadir
      updatePreferences({
        blocks: newBlocks,
      });
    }
    
    setIsMenuOpen(false);
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
    <div className="space-y-4">
      {/* Header con botones de acción */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center"
          >
            <Plus className="mr-1 h-4 w-4" />
            Añadir Bloque
          </Button>
        </div>
      </div>

      {/* Menú para agregar bloques */}
      <DashboardBlockMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        availableBlocks={availableToAdd.map(id => AVAILABLE_BLOCKS[id])}
        onAddBlock={addBlock}
      />

      {/* Contenedor de bloques */}
      <div className="space-y-4">
        {activeBlocks.map((blockId, index) => {
          const block = AVAILABLE_BLOCKS[blockId];
          if (!block) return null;
          
          const BlockComponent = block.component;
          
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
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
  );
};

export default CustomizableDashboard;