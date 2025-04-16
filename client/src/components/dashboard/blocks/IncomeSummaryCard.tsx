import React from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowUpFromLine, Info } from "lucide-react";

interface IncomeSummaryCardProps {
  data: any;
  isLoading: boolean;
}

const IncomeSummaryCard: React.FC<IncomeSummaryCardProps> = ({ data, isLoading }) => {
  const [, navigate] = useLocation();
  
  // Valores reales o por defecto si no hay datos
  const income = data?.income || 0;
  const ivaRepercutido = data?.taxStats?.ivaRepercutido || 0;
  const irpfRetenido = data?.irpfRetenidoIngresos || 0;
  
  // Calcular la base imponible dinámicamente
  // La base imponible debe calcularse según las facturas ingresadas
  const baseImponible = data?.baseImponible || Math.round(income / 1.21);
  
  // Formatear números para mostrar
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value / 100);
  };
  
  return (
    <Card className="overflow-hidden flex-grow">
      <CardHeader className="bg-emerald-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-emerald-700 flex items-center">
            <ArrowUpFromLine className="mr-2 h-5 w-5" />
            Ingresos
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Total de todos los ingresos facturados incluyendo IVA. Representa el valor bruto de tu actividad económica.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <p className="text-2xl font-bold text-emerald-600">
          {formatCurrency(income)} €
        </p>
        
        {/* Desglose fiscal */}
        <div className="mt-3 space-y-2 bg-gray-50 p-3 rounded-md border border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 pb-1 border-b border-gray-200">
            Desglose fiscal
          </h4>
          
          <div className="space-y-1 text-sm">
            {/* Base Imponible */}
            <div className="flex justify-between">
              <span className="text-neutral-600">Base imponible:</span>
              <span className="font-medium">{formatCurrency(baseImponible)} €</span>
            </div>
            
            {/* IVA */}
            <div className="flex justify-between">
              <span className="text-neutral-600">IVA:</span>
              <span className="font-medium text-blue-600">+{formatCurrency(ivaRepercutido)} €</span>
            </div>
            
            {/* IRPF */}
            <div className="flex justify-between">
              <span className="text-neutral-600">IRPF:</span>
              <span className="font-medium text-red-600">-{formatCurrency(irpfRetenido)} €</span>
            </div>
            
            {/* Línea divisoria */}
            <div className="border-t border-gray-200 my-1"></div>
            
            {/* Total */}
            <div className="flex justify-between">
              <span className="font-medium">Total:</span>
              <span className="font-bold">{formatCurrency(income)} €</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/invoices")}
          >
            Ver facturas
          </Button>
        </div>
        
        <div className="mt-auto pt-2 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-green-600 border-green-300 hover:bg-green-50"
            onClick={() => navigate("/transactions?tab=income")}
          >
            Ver ingresos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeSummaryCard;