import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";

// Definición de la estructura del bloque de dashboard
interface BlockDefinition {
  id: string;
  title: string;
  component: React.ComponentType<any>;
}

interface DashboardBlockMenuProps {
  isOpen: boolean;
  onClose: () => void;
  availableBlocks: BlockDefinition[];
  onAddBlock: (blockId: string) => void;
}

const DashboardBlockMenu: React.FC<DashboardBlockMenuProps> = ({
  isOpen,
  onClose,
  availableBlocks,
  onAddBlock,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Añadir bloques al dashboard</DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </DialogHeader>
        
        {availableBlocks.length === 0 ? (
          <div className="py-6 text-center text-gray-500">
            <p>Todos los bloques disponibles ya están en tu dashboard.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="grid gap-4 py-4">
              {availableBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <h3 className="font-medium">{block.title}</h3>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAddBlock(block.id)}
                  >
                    Añadir
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DashboardBlockMenu;