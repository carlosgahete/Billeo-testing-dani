import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3,
  Table,
  ListFilter,
  Text,
  Star,
  X,
  BarChart,
  FileText,
  Receipt,
  TrendingUp,
  DollarSign,
  CalendarRange,
  PieChart,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

// Importamos la configuración centralizada de bloques disponibles
import { DASHBOARD_BLOCK_CATALOG } from "../../config/dashboardBlocks";

// Mapeo de tipos a iconos para el menú superior
const TYPE_ICONS = {
  all: {
    icon: <Star className="h-5 w-5" />,
    label: "Todos"
  },
  charts: {
    icon: <BarChart3 className="h-5 w-5" />,
    label: "Gráficos"
  },
  tables: {
    icon: <Table className="h-5 w-5" />,
    label: "Tablas"
  },
  lists: {
    icon: <ListFilter className="h-5 w-5" />,
    label: "Listas"
  },
  text: {
    icon: <Text className="h-5 w-5" />,
    label: "Texto"
  },
  favorites: {
    icon: <Star className="h-5 w-5" />,
    label: "Favoritos"
  }
};

interface AddBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBlock: (blockId: string) => void;
}

const AddBlockDialog: React.FC<AddBlockDialogProps> = ({ 
  open, 
  onOpenChange,
  onSelectBlock
}) => {
  const [selectedType, setSelectedType] = useState<string>("all");
  
  // Filtrar bloques según el tipo seleccionado
  const filteredBlocks = selectedType === "all" 
    ? DASHBOARD_BLOCK_CATALOG
    : DASHBOARD_BLOCK_CATALOG.filter(block => block.type === selectedType);
    
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between bg-gray-100 px-6 py-4">
          <h2 className="text-xl font-semibold">Añadir Bloque</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="rounded-full h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Menú de filtros por tipo */}
        <div className="px-6 py-3 border-b">
          <Tabs 
            defaultValue="all" 
            value={selectedType}
            onValueChange={setSelectedType}
            className="w-full"
          >
            <TabsList className="grid grid-cols-6 gap-2">
              {Object.entries(TYPE_ICONS).map(([key, { icon, label }]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="flex flex-col items-center py-2 gap-1"
                  title={label}
                >
                  {icon}
                  <span className="text-xs">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <ScrollArea className="max-h-[65vh] p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBlocks.map((block) => (
              <div
                key={block.id}
                className="group relative border rounded-xl overflow-hidden hover:shadow-md hover:border-primary cursor-pointer transition-all"
                onClick={() => {
                  onSelectBlock(block.id);
                  onOpenChange(false);
                }}
              >
                {/* Miniatura del bloque (imagen representativa) */}
                <div className="h-32 bg-gray-50 flex items-center justify-center">
                  {/* Miniatura del bloque */}
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-4/5 h-4/5 border rounded-md shadow-sm overflow-hidden bg-white">
                      {block.preview}
                    </div>
                  </div>
                </div>
                
                {/* Overlay al hacer hover */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Button variant="secondary" size="sm" className="shadow-md">
                    Agregar
                  </Button>
                </div>
                
                {/* Info del bloque */}
                <div className="p-3">
                  <h3 className="font-medium text-lg">{block.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{block.description}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="px-6 py-4 bg-gray-50">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddBlockDialog;