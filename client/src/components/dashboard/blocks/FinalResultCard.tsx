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
import { PiggyBank, Info } from "lucide-react";

interface FinalResultCardProps {
  data: any;
  isLoading: boolean;
}

const FinalResultCard: React.FC<FinalResultCardProps> = ({ data, isLoading }) => {
  const [, navigate] = useLocation();
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden flex-grow">
        <CardHeader className="bg-blue-50 p-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="p-3">
          <Skeleton className="h-8 w-24 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-10 w-full mt-8" />
        </CardContent>
      </Card>
    );
  }
  
  // Calcular valores brutos
  const income = data?.income || 0;
  const expenses = data?.expenses || 0;
  const result = income - expenses;
  
  // Calcular bases imponibles
  const baseImponibleIngresos = data?.baseImponible || Math.round(income / 1.21);
  const baseImponibleGastos = Math.round(expenses / 1.21);
  
  // Calcular IVA
  const ivaRepercutido = data?.ivaRepercutido || Math.round(baseImponibleIngresos * 0.21);
  const ivaSoportado = data?.ivaSoportado || Math.round(baseImponibleGastos * 0.21);
  const ivaLiquidar = ivaRepercutido - ivaSoportado;
  
  // Calcular IRPF según tus especificaciones
  const irpfPercentage = 15;
  const irpfIngresos = Math.round(baseImponibleIngresos * (irpfPercentage / 100));
  
  // Para gastos, asumimos que la mitad tiene IRPF como en tu ejemplo
  const gastoConIRPF = Math.round(baseImponibleGastos / 2);
  const irpfGastos = Math.round(gastoConIRPF * (irpfPercentage / 100));
  
  // Cálculo de valores netos
  const ingresoNeto = baseImponibleIngresos - irpfIngresos;
  const gastoNeto = baseImponibleGastos - irpfGastos;
  const resultadoFinal = ingresoNeto - gastoNeto;
  
  // Total IRPF
  const totalIRPF = irpfIngresos + irpfGastos;
  
  return (
    <Card className="overflow-hidden flex-grow">
      <CardHeader className="bg-blue-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <PiggyBank className="mr-2 h-5 w-5" />
            Resultado Final
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">El beneficio final después de descontar impuestos y retenciones</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {/* Ingresos netos */}
        <div className="mb-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-neutral-600">Ingresos netos:</span>
            <span className="font-medium text-emerald-600">{ingresoNeto.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
          </div>
        </div>
        
        {/* Gastos netos */}
        <div className="mb-3 text-sm border-t pt-1">
          <div className="flex justify-between">
            <span className="font-medium text-neutral-600">Gastos netos:</span>
            <span className="font-medium text-red-600">{gastoNeto.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
          </div>
        </div>
        
        {/* Línea divisoria */}
        <div className="border-b border-gray-300 my-2"></div>
        
        {/* Resultado final */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-blue-700">Resultado final:</h3>
          <p className="text-2xl font-bold text-blue-600">
            {resultadoFinal > 0 ? "+" : ""}{new Intl.NumberFormat('es-ES', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            }).format(resultadoFinal)} €
          </p>
        </div>
        
        {/* Información de impuestos */}
        <div className="mt-3 space-y-1 text-sm">
          <h3 className="font-medium text-neutral-700 mb-1">IVA a pagar:</h3>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">IVA ingresos:</span>
            <span className="font-medium">{ivaRepercutido.toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">- IVA gastos:</span>
            <span className="font-medium">{ivaSoportado.toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1 pl-2">
            <span className="text-neutral-600 font-medium">IVA a pagar:</span>
            <span className="font-medium text-blue-600">{ivaLiquidar.toLocaleString('es-ES')} €</span>
          </div>
          
          <h3 className="font-medium text-neutral-700 mt-3 mb-1">IRPF total retenido:</h3>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">IRPF ingresos:</span>
            <span className="font-medium">{irpfIngresos.toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between pl-2">
            <span className="text-neutral-500">+ IRPF gastos:</span>
            <span className="font-medium">{irpfGastos.toLocaleString('es-ES')} €</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1 pl-2">
            <span className="text-neutral-600 font-medium">Total IRPF:</span>
            <span className="font-medium text-blue-600">{totalIRPF.toLocaleString('es-ES')} €</span>
          </div>
        </div>
        
        <div className="mt-auto pt-4 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/analytics")}
          >
            Ver informes completos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalResultCard;