import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, ExternalLink } from "lucide-react";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface IncomeSummaryProps {
  data: DashboardStats;
  isLoading: boolean;
}

const IncomeSummary: React.FC<IncomeSummaryProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-40 mb-4" />
          <Skeleton className="h-12 w-56 mb-2" />
          <Skeleton className="h-4 w-32" />
          <div className="mt-4">
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Obtenemos los datos calculados
  const income = data?.income || 0;
  const pendingAmount = data?.pendingInvoices || 0;
  const baseImponible = data?.baseImponible || Math.round(income / 1.21);
  const ivaRepercutido = data?.ivaRepercutido || data?.taxStats?.ivaRepercutido || income - baseImponible;
  const irpfRetenido = data?.irpfRetenidoIngresos || data?.taxStats?.irpfRetenido || 0;
  
  // Imprimir los datos para debug
  console.log("IncomeSummary rendering with data:", {
    rawData: data,
    income,
    pendingAmount,
    baseImponible,
    ivaRepercutido
  });

  // Formatear valores monetarios con el formato español
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden border-t-4 border-t-green-500">
      <CardContent className="pt-6 pb-4 md:px-6 px-4">
        {/* Cabecera con título e ícono */}
        <div className="flex items-center justify-between text-gray-600 mb-2">
          <div className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
            <span className="text-sm">Ingresos</span>
          </div>
          
          {/* Enlace compacto en móvil */}
          <a 
            href="/invoices"
            className="md:hidden text-blue-600 text-xs hover:text-blue-800"
          >
            Ver
          </a>
        </div>
        
        <div className="space-y-2">
          {/* Monto principal */}
          <div>
            <h3 className="text-2xl font-bold text-green-600">{formatCurrency(income)} €</h3>
            
            {/* Info detallada con responsive para ocultar en móvil o mostrar más compacta */}
            <div className="flex flex-col md:block">
              <p className="text-sm text-gray-500 md:block">
                <span className="md:inline">Base imponible: </span>
                <span>{formatCurrency(baseImponible)} €</span>
              </p>
              <p className="text-sm text-gray-500 md:block">
                <span className="md:inline">IVA repercutido: </span>
                <span>{formatCurrency(ivaRepercutido)} €</span>
              </p>
            </div>
          </div>
          
          {/* Elementos condicionales más compactos en móvil */}
          {irpfRetenido > 0 && (
            <div className="text-sm flex justify-between md:justify-start">
              <span className="text-gray-600">IRPF retenido:</span>
              <span className="text-amber-600 md:ml-1">{formatCurrency(irpfRetenido)} €</span>
            </div>
          )}
          
          {pendingAmount > 0 && (
            <div className="text-sm flex justify-between md:justify-start">
              <span className="text-gray-600">Pendiente:</span>
              <span className="text-orange-500 md:ml-1">{formatCurrency(pendingAmount)} €</span>
            </div>
          )}
        </div>
        
        {/* Enlace de "Ver facturas" oculto en móvil y visible en desktop */}
        <div className="mt-4 hidden md:block">
          <a 
            href="/invoices" 
            className="text-blue-600 text-sm w-full text-center border-t border-gray-100 pt-3 transition-colors hover:text-blue-800 flex items-center justify-center"
          >
            Ver facturas
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomeSummary;