import React from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText
} from "lucide-react";
import BaseBlock from "./BaseBlock";

const QuotesSummary: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <BaseBlock
        title="Presupuestos"
        icon={<Skeleton className="h-5 w-5" />}
        bgColor="bg-purple-50"
      >
        <Skeleton className="h-7 w-24 mb-2" />
        <div className="space-y-4 flex-1">
          <Skeleton className="h-20 w-full" />
          <div className="border-t pt-2">
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </BaseBlock>
    );
  }

  // Obtener los datos de presupuestos
  const totalQuotes = data.quotes?.total || data.allQuotes || 0;
  const acceptedQuotes = data.quotes?.accepted || data.acceptedQuotes || 0;
  const rejectedQuotes = data.quotes?.rejected || data.rejectedQuotes || 0;
  const pendingQuotesCount = data.quotes?.pending || data.pendingQuotesCount || 0;
  
  // Calcular tasa de aceptación
  const acceptanceRate = totalQuotes > 0 
    ? Math.round((acceptedQuotes / totalQuotes) * 100) 
    : 0;

  return (
    <BaseBlock
      title="Presupuestos"
      icon={<FileText className="h-5 w-5" />}
      bgColor="bg-purple-50"
      iconColor="text-purple-600"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold">{totalQuotes}</span>
            <span className="text-sm text-muted-foreground">Total de presupuestos</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-sm font-medium">Aceptados</p>
              </div>
              <p className="text-xl font-medium text-green-500">{acceptedQuotes}</p>
            </div>
            
            <div className="flex flex-col items-center p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                <p className="text-sm font-medium">Rechazados</p>
              </div>
              <p className="text-xl font-medium text-red-500">{rejectedQuotes}</p>
            </div>
            
            <div className="flex flex-col items-center p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <Clock className="h-4 w-4 text-amber-500 mr-1" />
                <p className="text-sm font-medium">Pendientes</p>
              </div>
              <p className="text-xl font-medium text-amber-500">{pendingQuotesCount}</p>
            </div>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Tasa de aceptación</p>
              <div className="flex items-center">
                <div className="h-2 w-24 bg-gray-200 rounded-full mr-2 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ width: `${acceptanceRate}%` }}
                  />
                </div>
                <p className="font-semibold">{acceptanceRate}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
            Ver presupuestos
          </button>
        </div>
      </div>
    </BaseBlock>
  );
};

export default QuotesSummary;