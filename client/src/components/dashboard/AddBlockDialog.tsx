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

// Definición de los bloques disponibles
const AVAILABLE_BLOCKS = [
  {
    id: "result-summary",
    title: "Resumen de Resultados",
    description: "Beneficio, IVA a liquidar e IRPF con métricas clave.",
    icon: <BarChart3 className="h-8 w-8 text-green-500" />,
    type: "charts",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-green-50 py-1 px-2 flex items-center border-b">
          <BarChart3 className="h-3 w-3 text-green-600 mr-1" />
          <span className="text-[10px] font-medium text-green-800">Resumen de Resultados</span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-2">
          <div className="mb-1 text-[8px] text-center text-gray-500">Vista previa</div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-green-600">258.800 €</span>
            <span className="text-[8px] text-green-700">Resultado bruto</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "quotes-summary",
    title: "Presupuestos",
    description: "Aceptados, rechazados y pendientes con análisis de ratio.",
    icon: <FileText className="h-8 w-8 text-purple-500" />,
    type: "lists",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-purple-50 py-1 px-2 flex items-center border-b">
          <FileText className="h-3 w-3 text-purple-600 mr-1" />
          <span className="text-[10px] font-medium text-purple-800">Presupuestos</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex space-x-2 justify-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <CheckCircle className="h-2 w-2 text-green-500" />
                <span className="text-[7px] ml-0.5">Aceptados</span>
              </div>
              <span className="text-[9px] font-bold">3</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center">
                <XCircle className="h-2 w-2 text-red-500" />
                <span className="text-[7px] ml-0.5">Rechazados</span>
              </div>
              <span className="text-[9px] font-bold">1</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "invoices-summary",
    title: "Facturas",
    description: "Estado de facturas emitidas y cantidades pendientes de cobro.",
    icon: <Receipt className="h-8 w-8 text-blue-500" />,
    type: "lists",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-blue-50 py-1 px-2 flex items-center border-b">
          <Receipt className="h-3 w-3 text-blue-600 mr-1" />
          <span className="text-[10px] font-medium text-blue-800">Facturas</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <div className="flex flex-col items-center mb-1">
            <span className="text-[10px] font-bold text-blue-600">258.800 €</span>
            <span className="text-[7px] text-gray-500">Facturación total</span>
          </div>
          <div className="w-full flex items-center justify-between">
            <div className="text-[7px] flex items-center">
              <Clock className="h-2 w-2 text-amber-500 mr-0.5" />
              <span>Pendiente</span>
            </div>
            <span className="text-[7px] font-bold">0%</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "comparative-chart",
    title: "Comparativa Financiera",
    description: "Análisis trimestral de ingresos, gastos y resultados.",
    icon: <BarChart className="h-8 w-8 text-indigo-500" />,
    type: "charts",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-indigo-50 py-1 px-2 flex items-center border-b">
          <BarChart className="h-3 w-3 text-indigo-600 mr-1" />
          <span className="text-[10px] font-medium text-indigo-800">Comparativa Financiera</span>
        </div>
        <div className="flex-1 p-2 flex flex-col justify-center items-center">
          <svg width="40" height="24" viewBox="0 0 80 40" className="mt-1">
            <rect x="5" y="5" width="10" height="30" fill="#4F46E5" />
            <rect x="20" y="15" width="10" height="20" fill="#EF4444" />
            <rect x="35" y="10" width="10" height="25" fill="#10B981" />
            <rect x="50" y="18" width="10" height="17" fill="#4F46E5" />
            <rect x="65" y="25" width="10" height="10" fill="#EF4444" />
          </svg>
          <div className="mt-1 flex justify-center space-x-2">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <span className="text-[6px] ml-0.5">Ingresos</span>
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-[6px] ml-0.5">Gastos</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "expenses-by-category",
    title: "Gastos por Categoría",
    description: "Distribución de gastos clasificados por categoría.",
    icon: <PieChart className="h-8 w-8 text-yellow-500" />,
    type: "charts",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-yellow-50 py-1 px-2 flex items-center border-b">
          <PieChart className="h-3 w-3 text-yellow-600 mr-1" />
          <span className="text-[10px] font-medium text-yellow-800">Gastos por Categoría</span>
        </div>
        <div className="flex-1 p-1 flex justify-center items-center">
          <svg width="35" height="35" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ddd" strokeWidth="20" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#FBBF24" strokeWidth="20" strokeDasharray="50 200" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#34D399" strokeWidth="20" strokeDasharray="75 200" strokeDashoffset="-50" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#60A5FA" strokeWidth="20" strokeDasharray="40 200" strokeDashoffset="-125" />
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F87171" strokeWidth="20" strokeDasharray="25 200" strokeDashoffset="-165" />
          </svg>
        </div>
      </div>
    )
  },
  {
    id: "upcoming-payments",
    title: "Próximos Pagos",
    description: "Calendario de facturas y tributaciones pendientes.",
    icon: <CalendarRange className="h-8 w-8 text-red-500" />,
    type: "tables",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-red-50 py-1 px-2 flex items-center border-b">
          <CalendarRange className="h-3 w-3 text-red-600 mr-1" />
          <span className="text-[10px] font-medium text-red-800">Próximos Pagos</span>
        </div>
        <div className="flex-1 p-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-0.5 mb-0.5">
              <span className="text-[7px]">IVA T2</span>
              <span className="text-[7px] font-semibold">20/07</span>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-0.5 mb-0.5">
              <span className="text-[7px]">IRPF T2</span>
              <span className="text-[7px] font-semibold">20/07</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[7px]">Factura #12</span>
              <span className="text-[7px] font-semibold">31/07</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "cash-flow",
    title: "Flujo de Caja",
    description: "Análisis de entradas y salidas de efectivo por periodo.",
    icon: <TrendingUp className="h-8 w-8 text-green-500" />,
    type: "charts",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-green-50 py-1 px-2 flex items-center border-b">
          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
          <span className="text-[10px] font-medium text-green-800">Flujo de Caja</span>
        </div>
        <div className="flex-1 p-1 flex flex-col justify-center items-center">
          <svg width="40" height="20" viewBox="0 0 80 40">
            <polyline points="0,30 10,28 20,25 30,20 40,15 50,10 60,12 70,8 80,5" fill="none" stroke="#10B981" strokeWidth="2" />
            <polyline points="0,30 10,32 20,33 30,31 40,32 50,34 60,35 70,33 80,35" fill="none" stroke="#EF4444" strokeWidth="2" />
          </svg>
          <div className="mt-1 flex justify-center space-x-2">
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[6px] ml-0.5">Entradas</span>
            </div>
            <div className="flex items-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              <span className="text-[6px] ml-0.5">Salidas</span>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "accounts-summary",
    title: "Cuentas y Saldos",
    description: "Listado de cuentas bancarias con saldos actuales.",
    icon: <CreditCard className="h-8 w-8 text-gray-500" />,
    type: "tables",
    preview: (
      <div className="w-full h-full flex flex-col">
        <div className="bg-gray-100 py-1 px-2 flex items-center border-b">
          <CreditCard className="h-3 w-3 text-gray-600 mr-1" />
          <span className="text-[10px] font-medium text-gray-800">Cuentas y Saldos</span>
        </div>
        <div className="flex-1 p-1">
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-0.5 mb-0.5">
              <span className="text-[7px]">Cuenta Principal</span>
              <span className="text-[7px] font-semibold">152.400 €</span>
            </div>
            <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-0.5 mb-0.5">
              <span className="text-[7px]">Cuenta Ahorro</span>
              <span className="text-[7px] font-semibold">54.200 €</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[7px]">Tarjeta Crédito</span>
              <span className="text-[7px] font-semibold text-red-500">-1.850 €</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
];

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
    ? AVAILABLE_BLOCKS 
    : AVAILABLE_BLOCKS.filter(block => block.type === selectedType);
    
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