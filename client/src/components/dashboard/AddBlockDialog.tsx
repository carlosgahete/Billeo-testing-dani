import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  LineChart,
  PieChart,
  LayoutDashboard,
  CreditCard,
  FileText,
  Calendar,
  List,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockOption {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: React.ReactNode;
}

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (blockType: string) => void;
}

const AddBlockDialog: React.FC<AddBlockDialogProps> = ({
  open,
  onOpenChange,
  onSelectBlock,
}) => {
  const [selectedBlockType, setSelectedBlockType] = React.useState<string | null>(null);

  const blockOptions: BlockOption[] = [
    {
      id: "income-summary",
      name: "Resumen de Ingresos",
      type: "income-summary",
      description: "Muestra un resumen de tus ingresos por periodo.",
      icon: <BarChart className="h-5 w-5 text-blue-500" />,
    },
    {
      id: "expenses-summary",
      name: "Resumen de Gastos",
      type: "expenses-summary",
      description: "Muestra un resumen de tus gastos por periodo.",
      icon: <CreditCard className="h-5 w-5 text-red-500" />,
    },
    {
      id: "tax-summary",
      name: "Resumen Fiscal",
      type: "tax-summary",
      description: "Resumen de impuestos (IVA, IRPF) por trimestre o anual.",
      icon: <PieChart className="h-5 w-5 text-purple-500" />,
    },
    {
      id: "recent-invoices",
      name: "Facturas Recientes",
      type: "recent-invoices",
      description: "Lista de las últimas facturas emitidas o recibidas.",
      icon: <FileText className="h-5 w-5 text-indigo-500" />,
    },
    {
      id: "recent-transactions",
      name: "Transacciones Recientes",
      type: "recent-transactions",
      description: "Lista de las últimas transacciones registradas.",
      icon: <List className="h-5 w-5 text-orange-500" />,
    },
    {
      id: "upcoming-tasks",
      name: "Tareas Pendientes",
      type: "upcoming-tasks",
      description: "Muestra las próximas tareas y eventos programados.",
      icon: <Calendar className="h-5 w-5 text-emerald-500" />,
    },
    {
      id: "quick-stats",
      name: "Estadísticas Rápidas",
      type: "quick-stats",
      description: "Indicadores clave de rendimiento de tu negocio.",
      icon: <Star className="h-5 w-5 text-amber-500" />,
    },
    {
      id: "financial-chart",
      name: "Gráfico Financiero",
      type: "financial-chart",
      description: "Visualización gráfica de tu situación financiera.",
      icon: <LineChart className="h-5 w-5 text-teal-500" />,
    },
  ];

  const handleAddBlock = () => {
    if (selectedBlockType) {
      onSelectBlock(selectedBlockType);
      setSelectedBlockType(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Añadir bloque
          </DialogTitle>
          <DialogDescription>
            Selecciona el tipo de bloque que deseas añadir a tu dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
          {blockOptions.map((block) => (
            <div
              key={block.id}
              className={cn(
                "flex items-center p-3 border rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all",
                selectedBlockType === block.type
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200"
              )}
              onClick={() => setSelectedBlockType(block.type)}
            >
              <div className="mr-4 p-2 rounded-md bg-white border">
                {block.icon}
              </div>
              <div>
                <h3 className="font-medium">{block.name}</h3>
                <p className="text-sm text-gray-500">{block.description}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddBlock} disabled={!selectedBlockType}>
            Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddBlockDialog;