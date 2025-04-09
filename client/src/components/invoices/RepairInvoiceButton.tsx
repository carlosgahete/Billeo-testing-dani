import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCcw, CircleDollarSign } from "lucide-react";

const RepairInvoiceButton = () => {
  const { toast } = useToast();
  const [isRepairing, setIsRepairing] = useState(false);
  
  const handleRepairInvoiceTransactions = async () => {
    if (isRepairing) return;
    
    setIsRepairing(true);
    try {
      // Realizar la petición POST para reparar las transacciones
      const response = await fetch('/api/repair/invoice-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      // Refrescar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
      
      // Mostrar confirmación de éxito
      toast({
        title: "Reparación completada",
        description: `Se han procesado ${result.totalCreated} transacciones para facturas pagadas.`,
        variant: "default"
      });

      // Recargar la página después de un momento para mostrar los cambios
      setTimeout(() => {
        window.location.href = '/invoices';
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error al reparar transacciones",
        description: error.message || "No se pudieron reparar las transacciones de facturas pagadas.",
        variant: "destructive"
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 text-sm bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
            onClick={handleRepairInvoiceTransactions}
            disabled={isRepairing}
          >
            {isRepairing ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <CircleDollarSign className="h-4 w-4" />
            )}
            {isRepairing ? "Reparando..." : "Crear transacciones"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Crear transacciones de ingreso automáticas para facturas pagadas</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default RepairInvoiceButton;