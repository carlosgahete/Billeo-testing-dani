import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowUp, ArrowDown, X, Save, Settings, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DashboardStats } from "@/types/dashboard";
import { DashboardBlock } from "@/types/dashboard";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Componentes de bloques
import IncomeSummary from "./blocks/IncomeSummary";
import ExpensesSummary from "./blocks/ExpensesSummary";
import TaxSummary from "./blocks/TaxSummary";
import RecentInvoices from "./blocks/RecentInvoices";
import RecentTransactions from "./blocks/RecentTransactions";
import UpcomingTasks from "./blocks/UpcomingTasks";
import QuickStats from "./blocks/QuickStats";
import FinancialChart from "./blocks/FinancialChart";

interface CustomizableDashboardProps {
  userId: number;
  dashboardStats: DashboardStats;
  isLoading: boolean;
}

// Tipo para asignar componentes a tipos de bloques
type BlockComponentMap = {
  [key: string]: React.FC<{ data: DashboardStats; isLoading: boolean }>;
};

const blockComponentMap: BlockComponentMap = {
  "income-summary": IncomeSummary,
  "expenses-summary": ExpensesSummary,
  "tax-summary": TaxSummary,
  "recent-invoices": RecentInvoices,
  "recent-transactions": RecentTransactions,
  "upcoming-tasks": UpcomingTasks,
  "quick-stats": QuickStats,
  "financial-chart": FinancialChart,
};

// Lista de bloques disponibles para añadir
const availableBlocks = [
  { id: "income-summary", name: "Resumen de Ingresos", type: "income-summary" },
  { id: "expenses-summary", name: "Resumen de Gastos", type: "expenses-summary" },
  { id: "tax-summary", name: "Resumen Fiscal", type: "tax-summary" },
  { id: "recent-invoices", name: "Facturas Recientes", type: "recent-invoices" },
  { id: "recent-transactions", name: "Transacciones Recientes", type: "recent-transactions" },
  { id: "upcoming-tasks", name: "Tareas Pendientes", type: "upcoming-tasks" },
  { id: "quick-stats", name: "Estadísticas Rápidas", type: "quick-stats" },
  { id: "financial-chart", name: "Gráfico Financiero", type: "financial-chart" },
];

const CustomizableDashboard = ({ userId, dashboardStats, isLoading }: CustomizableDashboardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [blocks, setBlocks] = useState<DashboardBlock[]>([]);
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState<string | null>(null);

  // Consulta para obtener las preferencias del dashboard
  const { data: preferences, isLoading: prefsLoading } = useQuery({
    queryKey: ["/api/dashboard/preferences"],
  });

  // Establecer los bloques cuando se cargan las preferencias
  useEffect(() => {
    if (preferences && preferences.layout) {
      setBlocks(preferences.layout);
    }
  }, [preferences]);

  // Manejo de error para la carga de preferencias
  useEffect(() => {
    if (!prefsLoading && !preferences) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las preferencias del dashboard",
        variant: "destructive",
      });
    }
  }, [prefsLoading, preferences, toast]);

  // Mutación para guardar las preferencias del dashboard
  const saveMutation = useMutation({
    mutationFn: (layout: DashboardBlock[]) => {
      return fetch("/api/dashboard/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ layout }),
      }).then(res => {
        if (!res.ok) {
          throw new Error("Error al guardar las preferencias");
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/preferences"] });
      toast({
        title: "Guardado",
        description: "Las preferencias del dashboard se han guardado",
      });
      setIsEditMode(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar las preferencias",
        variant: "destructive",
      });
    },
  });

  // Cargar bloques por defecto si no hay preferencias
  useEffect(() => {
    if (!prefsLoading && !preferences) {
      // Configuración por defecto si no hay preferencias guardadas
      setBlocks([
        {
          id: "income-summary",
          type: "income-summary",
          position: { x: 0, y: 0, w: 6, h: 2 },
          visible: true,
        },
        {
          id: "expenses-summary",
          type: "expenses-summary",
          position: { x: 6, y: 0, w: 6, h: 2 },
          visible: true,
        },
        {
          id: "tax-summary",
          type: "tax-summary",
          position: { x: 0, y: 2, w: 12, h: 3 },
          visible: true,
        },
        {
          id: "recent-invoices",
          type: "recent-invoices",
          position: { x: 0, y: 5, w: 6, h: 4 },
          visible: true,
        },
        {
          id: "recent-transactions",
          type: "recent-transactions",
          position: { x: 6, y: 5, w: 6, h: 4 },
          visible: true,
        },
      ]);
    }
  }, [prefsLoading, preferences]);

  // Mover un bloque hacia arriba
  const moveBlockUp = (index: number) => {
    if (index === 0) return; // Ya está al principio
    const updatedBlocks = [...blocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[index - 1];
    updatedBlocks[index - 1] = temp;
    setBlocks(updatedBlocks);
  };

  // Mover un bloque hacia abajo
  const moveBlockDown = (index: number) => {
    if (index === blocks.length - 1) return; // Ya está al final
    const updatedBlocks = [...blocks];
    const temp = updatedBlocks[index];
    updatedBlocks[index] = updatedBlocks[index + 1];
    updatedBlocks[index + 1] = temp;
    setBlocks(updatedBlocks);
  };

  // Guardar cambios
  const saveChanges = () => {
    saveMutation.mutate(blocks);
  };

  // Alternar visibilidad de un bloque
  const toggleBlockVisibility = (blockId: string) => {
    setBlocks(
      blocks.map((block) =>
        block.id === blockId ? { ...block, visible: !block.visible } : block
      )
    );
  };

  // Eliminar un bloque
  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((block) => block.id !== blockId));
  };

  // Añadir un nuevo bloque
  const addBlock = () => {
    if (!selectedBlockType) return;

    const blockToAdd = availableBlocks.find(block => block.type === selectedBlockType);
    if (!blockToAdd) return;

    // Generar un ID único si ya existe un bloque de este tipo
    const existingCount = blocks.filter(b => b.type === selectedBlockType).length;
    const newId = existingCount > 0 
      ? `${selectedBlockType}-${existingCount + 1}` 
      : blockToAdd.id;

    // Calcular posición para el nuevo bloque (al final del dashboard)
    const newPosition = { x: 0, y: blocks.length * 2, w: 12, h: 3 };

    const newBlock: DashboardBlock = {
      id: newId,
      type: selectedBlockType,
      position: newPosition,
      visible: true,
    };

    setBlocks([...blocks, newBlock]);
    setIsAddBlockOpen(false);
    setSelectedBlockType(null);

    toast({
      title: "Bloque añadido",
      description: `Se ha añadido "${blockToAdd.name}" al dashboard`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Barra de herramientas de edición */}
      <div className="flex justify-between items-center mb-4">
        <div></div> {/* Espacio vacío para mantener el justify-between */}
        <div className="flex space-x-2">
          {isEditMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddBlockOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir bloque
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={saveChanges}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Guardar cambios
                  </>
                )}
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setIsEditMode(false)}
              >
                Cancelar
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditMode(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Personalizar dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard personalizable */}
      {isEditMode ? (
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className={`transition-all duration-200 ${
                !block.visible ? "opacity-50" : ""
              }`}
            >
              <Card className="relative border-dashed border-2">
                <div
                  className="absolute top-2 right-2 flex space-x-1 z-10"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleBlockVisibility(block.id)}
                  >
                    {block.visible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    onClick={() => removeBlock(block.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  {/* Botones para mover el bloque */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => moveBlockUp(index)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => moveBlockDown(index)}
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Renderizar el componente del bloque */}
                <div className={`${!block.visible ? "filter blur-sm" : ""}`}>
                  {blockComponentMap[block.type] && (
                    blockComponentMap[block.type]({
                      data: dashboardStats,
                      isLoading: isLoading,
                    })
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        // Vista normal (no editable)
        <div className="space-y-4">
          {blocks
            .filter((block) => block.visible)
            .map((block) => (
              <div key={block.id}>
                {blockComponentMap[block.type] && (
                  blockComponentMap[block.type]({
                    data: dashboardStats,
                    isLoading: isLoading,
                  })
                )}
              </div>
            ))}
        </div>
      )}

      {/* Diálogo para añadir bloque */}
      <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir nuevo bloque</DialogTitle>
            <DialogDescription>
              Selecciona el tipo de bloque que deseas añadir a tu dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={selectedBlockType || ""}
              onValueChange={(value) => setSelectedBlockType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tipo de bloque" />
              </SelectTrigger>
              <SelectContent>
                {availableBlocks.map((block) => (
                  <SelectItem key={block.type} value={block.type}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddBlockOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addBlock} disabled={!selectedBlockType}>
              Añadir bloque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomizableDashboard;