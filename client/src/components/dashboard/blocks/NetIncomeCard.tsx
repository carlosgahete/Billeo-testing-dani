import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpFromLine, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBlockProps } from "@/types/dashboard";
import { useLocation } from "wouter";

interface NetIncomeCardProps extends DashboardBlockProps {}

const NetIncomeCard: React.FC<NetIncomeCardProps> = ({ data, isLoading }) => {
  const [, navigate] = useLocation();
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden flex-grow">
        <CardHeader className="bg-emerald-50 p-2">
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
  
  // Obtener valores brutos y netos
  const income = data?.income || 0;
  const baseImponible = data?.baseImponible || income;
  const ivaRepercutido = data?.ivaRepercutido || 0;
  const irpfRetenidoIngresos = data?.irpfRetenidoIngresos || 0;
  
  // Valores netos (usando los nuevos campos)
  const netIncome = data?.netIncome !== undefined ? data.netIncome : (income - irpfRetenidoIngresos);
  
  // Calcular el IRPF en función del porcentaje 15%
  const irpfPercentage = 15;
  const irpfAmount = Math.round(baseImponible * (irpfPercentage / 100));
  
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
                <p className="w-[200px] text-xs">Base imponible sin IVA de tus facturas de ingresos, con desglose de IVA repercutido y el IRPF retenido.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {/* Base imponible */}
        <div className="mb-2">
          <h3 className="text-sm font-medium text-emerald-700">Base imponible</h3>
          <p className="text-2xl font-bold text-emerald-600">
            {new Intl.NumberFormat('es-ES', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            }).format(baseImponible)} €
          </p>
        </div>
        
        {/* Impuestos desglosados */}
        <div className="mb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">IVA (21%):</span>
            <span className="font-medium text-emerald-600">+{ivaRepercutido.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-neutral-500">IRPF (15%):</span>
            <span className="font-medium text-red-600">-{irpfAmount.toLocaleString('es-ES', {minimumFractionDigits: 2})} €</span>
          </div>
        </div>
        
        {/* Ingresos netos */}
        <div className="mt-3 border-t pt-2">
          <h3 className="text-sm font-medium text-gray-600">Ingreso neto para resultado final:</h3>
          <p className="text-lg font-bold text-emerald-700">
            {new Intl.NumberFormat('es-ES', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            }).format(baseImponible - irpfAmount)} €
          </p>
        </div>
        
        <div className="mt-auto pt-3 mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-emerald-600 border-emerald-300 hover:bg-emerald-50"
            onClick={() => navigate("/invoices")}
          >
            Ver facturas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default NetIncomeCard;