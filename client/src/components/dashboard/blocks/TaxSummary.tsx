import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeDollarSign, Info, AlertTriangle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

interface TaxSummaryProps {
  data: DashboardStats;
  isLoading: boolean;
}

const TaxSummary = ({ data, isLoading }: TaxSummaryProps) => {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-blue-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-blue-700 flex items-center">
              <BadgeDollarSign className="mr-2 h-5 w-5" />
              Impuestos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[120px]" />
            <Skeleton className="h-[120px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usar datos reales o valores por defecto
  const ivaRepercutido = data?.ivaRepercutido || 0;
  const ivaSoportado = data?.ivaSoportado || 0;
  const ivaALiquidar = data?.taxes?.ivaALiquidar || (ivaRepercutido - ivaSoportado);
  const irpfRetenido = data?.irpfRetenidoIngresos || 0;
  
  // Determinar si hay alertas
  const ivaAlerta = ivaALiquidar > 1000;
  const irpfAlerta = irpfRetenido > 1000;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-blue-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <BadgeDollarSign className="mr-2 h-5 w-5" />
            Impuestos
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Resumen de impuestos (IVA, IRPF) a liquidar en tus próximas declaraciones trimestrales.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tarjeta de IVA */}
          <div className={`border rounded-md p-3 ${ivaAlerta ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-700">IVA a liquidar</h3>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(ivaALiquidar)} €
                </p>
              </div>
              {ivaAlerta && (
                <div className="bg-orange-100 p-1 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
              )}
            </div>
            
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA repercutido:</span>
                <span>{ivaRepercutido.toLocaleString('es-ES')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA soportado:</span>
                <span>{ivaSoportado.toLocaleString('es-ES')} €</span>
              </div>
            </div>
          </div>
          
          {/* Tarjeta de IRPF */}
          <div className={`border rounded-md p-3 ${irpfAlerta ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-700">IRPF adelantado</h3>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(irpfRetenido)} €
                </p>
              </div>
              {irpfAlerta && (
                <div className="bg-orange-100 p-1 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
              )}
            </div>
            
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Retenciones en facturas:</span>
                <span>{irpfRetenido.toLocaleString('es-ES')} €</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => navigate("/tax-visualization")}
          >
            Ver panel fiscal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxSummary;