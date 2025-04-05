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
  XCircle,
  Maximize,
  Minimize
} from "lucide-react";

// Importamos la configuración centralizada de bloques disponibles
import { DASHBOARD_BLOCK_CATALOG } from "../../config/dashboardBlocks";
import { WIDGET_SIZES, WidgetSizeType } from "../../config/widgetSizes";

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
  onSelectBlock: (blockId: string, sizeType?: WidgetSizeType) => void;
}

const AddBlockDialog: React.FC<AddBlockDialogProps> = ({ 
  open, 
  onOpenChange,
  onSelectBlock
}) => {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  
  // Filtrar bloques según el tipo seleccionado
  const filteredBlocks = selectedType === "all" 
    ? DASHBOARD_BLOCK_CATALOG
    : DASHBOARD_BLOCK_CATALOG.filter(block => block.type === selectedType);
    
  // Si hay un bloque seleccionado, mostrar la vista de selección de tamaño
  const selectedBlockData = selectedBlock 
    ? DASHBOARD_BLOCK_CATALOG.find(block => block.id === selectedBlock) 
    : null;
    
  // Manejar la selección de tamaño y bloque final
  const handleSelectSize = (blockId: string, sizeType: WidgetSizeType) => {
    onSelectBlock(blockId, sizeType);
    onOpenChange(false);
  };
  
  // Volver a la vista de selección de bloque
  const handleBackToBlocks = () => {
    setSelectedBlock(null);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between bg-gray-100 px-6 py-4">
          <h2 className="text-xl font-semibold">
            {selectedBlock ? `Elige el tamaño para "${selectedBlockData?.title}"` : "Añadir Widget"}
          </h2>
          <div className="flex items-center space-x-2">
            {selectedBlock && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToBlocks}
                className="flex items-center"
              >
                <span className="mr-1">Volver</span>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {!selectedBlock ? (
          // Vista de selección de bloque
          <>
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
                      setSelectedBlock(block.id);
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
                        Seleccionar
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
          </>
        ) : (
          // Vista de selección de tamaño
          <div className="p-6">
            <h3 className="text-sm text-gray-500 mb-3">Selecciona el tamaño para el widget:</h3>
            
            <div className="grid grid-cols-1 gap-6 mb-4">
              {WIDGET_SIZES.map((size) => (
                <div 
                  key={size.type}
                  className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-all hover:border-primary"
                  onClick={() => handleSelectSize(selectedBlock, size.type)}
                >
                  <div className="flex items-start">
                    {/* Icono y descripción de tamaño */}
                    <div className="mr-4 mt-1">
                      {size.type === 'small' && <Minimize className="h-6 w-6 text-blue-500" />}
                      {size.type === 'medium' && <Maximize className="h-6 w-6 text-green-500" />}
                      {size.type === 'large' && <Maximize className="h-6 w-6 text-purple-500" />}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-md">{size.label}</h4>
                      <p className="text-sm text-gray-500 mt-1">{size.description}</p>
                      
                      <div className="text-xs text-gray-400 mt-1">
                        Tamaño: {size.width} x {size.height} unidades
                      </div>
                    </div>
                    
                    {/* Vista previa del tamaño */}
                    <div className="flex items-center">
                      <div className={`relative border rounded bg-gray-50 flex items-center justify-center 
                        ${size.type === 'small' ? 'w-16 h-16' : size.type === 'medium' ? 'w-24 h-16' : 'w-32 h-24'}`}>
                        {/* Añadimos una versión muy simplificada de la previsualización */}
                        <div className="text-xs text-gray-400 font-medium">
                          {selectedBlockData?.title}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-gray-400 bg-yellow-50 p-3 rounded border border-yellow-200">
              <strong>Nota:</strong> Cada tamaño muestra una versión optimizada del widget con diferentes niveles de detalle.
            </div>
          </div>
        )}
        
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