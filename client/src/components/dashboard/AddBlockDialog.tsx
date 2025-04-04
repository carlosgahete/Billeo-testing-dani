import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Definición de los bloques disponibles
const AVAILABLE_BLOCKS = [
  {
    id: "result-summary",
    title: "Resumen de Resultados",
    description: "Muestra un resumen de los resultados financieros, incluyendo el beneficio, IVA a liquidar e IRPF.",
    icon: "📊"
  },
  {
    id: "quotes-summary",
    title: "Presupuestos",
    description: "Resumen del estado de los presupuestos: aceptados, rechazados y pendientes.",
    icon: "📝"
  },
  {
    id: "invoices-summary",
    title: "Facturas",
    description: "Resumen del estado de las facturas y cantidades pendientes de cobro.",
    icon: "🧾"
  },
  {
    id: "comparative-chart",
    title: "Comparativa Financiera",
    description: "Gráfico comparativo de ingresos, gastos, IVA e IRPF.",
    icon: "📈"
  }
];

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Bloque</DialogTitle>
          <DialogDescription>
            Selecciona un bloque para añadir a tu dashboard personalizado.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4 mt-2">
            {AVAILABLE_BLOCKS.map((block) => (
              <div
                key={block.id}
                className="flex items-start p-3 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                onClick={() => {
                  onSelectBlock(block.id);
                  onOpenChange(false);
                }}
              >
                <div className="text-2xl mr-3">{block.icon}</div>
                <div>
                  <h3 className="font-medium">{block.title}</h3>
                  <p className="text-sm text-muted-foreground">{block.description}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddBlockDialog;