import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Receipt, 
  Upload, 
  Printer 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FileUpload from "@/components/common/FileUpload";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const QuickActions = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  const handleImportCSV = (filePath: string) => {
    toast({
      title: "CSV importado",
      description: "El archivo CSV se ha importado correctamente",
    });
    setIsImportDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200 p-4">
        <CardTitle className="font-medium text-neutral-800">Acciones rápidas</CardTitle>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="p-3 h-auto flex flex-col items-center justify-center hover:bg-neutral-50 border-neutral-200"
          onClick={() => navigate("/invoices/create")}
        >
          <PlusCircle className="h-5 w-5 text-primary-600 mb-2" />
          <span className="text-sm text-neutral-700">Nueva factura</span>
        </Button>
        
        <Button
          variant="outline"
          className="p-3 h-auto flex flex-col items-center justify-center hover:bg-neutral-50 border-neutral-200"
          onClick={() => navigate("/transactions/create")}
        >
          <Receipt className="h-5 w-5 text-primary-600 mb-2" />
          <span className="text-sm text-neutral-700">Registrar gasto</span>
        </Button>
        
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="p-3 h-auto flex flex-col items-center justify-center hover:bg-neutral-50 border-neutral-200"
            >
              <Upload className="h-5 w-5 text-primary-600 mb-2" />
              <span className="text-sm text-neutral-700">Importar CSV</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar movimientos desde CSV</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-neutral-600 mb-4">
                Sube un archivo CSV con tus movimientos bancarios para importarlos al sistema.
                El archivo debe tener columnas para fecha, descripción, importe y tipo de movimiento.
              </p>
              <FileUpload
                onUpload={handleImportCSV}
                accept=".csv"
              />
            </div>
          </DialogContent>
        </Dialog>
        
        <Button
          variant="outline"
          className="p-3 h-auto flex flex-col items-center justify-center hover:bg-neutral-50 border-neutral-200"
          onClick={() => navigate("/reports")}
        >
          <Printer className="h-5 w-5 text-primary-600 mb-2" />
          <span className="text-sm text-neutral-700">Exportar informe</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
