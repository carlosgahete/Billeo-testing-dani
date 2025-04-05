import React from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  Receipt 
} from "lucide-react";
import BaseBlock from "./BaseBlock";

const InvoicesSummary: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Formato para moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(value / 100);
  };
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <BaseBlock 
        title="Facturas" 
        icon={<Skeleton className="h-5 w-5" />}
        bgColor="bg-blue-50"
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

  // Datos de facturación
  const invoicesTotal = data.income || 0;
  const pendingInvoices = data.pendingInvoices || 0;
  const pendingCount = data.pendingCount || 0;
  
  // Calcular porcentaje pendiente
  const pendingPercentage = invoicesTotal > 0 
    ? Math.round((pendingInvoices / invoicesTotal) * 100) 
    : 0;

  return (
    <BaseBlock 
      title="Facturas" 
      icon={<Receipt className="h-5 w-5" />}
      bgColor="bg-blue-50"
      iconColor="text-blue-600"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-semibold">
              {formatCurrency(invoicesTotal)}
            </span>
            <span className="text-sm text-muted-foreground">
              Facturación total
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <Receipt className="h-4 w-4 text-amber-500 mr-1" />
                <p className="text-sm font-medium">Pendientes de cobro</p>
              </div>
              <p className="text-xl font-medium text-amber-500">{formatCurrency(pendingInvoices)}</p>
              <p className="text-xs text-muted-foreground">{pendingCount} facturas</p>
            </div>
            
            <div className="flex flex-col p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" />
                <p className="text-sm font-medium">Cobrado</p>
              </div>
              <p className="text-xl font-medium text-green-500">{formatCurrency(invoicesTotal - pendingInvoices)}</p>
              <p className="text-xs text-muted-foreground">{4 - pendingCount} facturas</p>
            </div>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1 text-amber-500" />
                Pendiente de cobro
              </p>
              <div className="flex items-center">
                <div className="h-2 w-24 bg-gray-200 rounded-full mr-2 overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${pendingPercentage}%` }}
                  />
                </div>
                <p className="font-semibold">{pendingPercentage}%</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <button className="text-blue-600 text-sm w-full border border-blue-600 rounded-md py-1.5 hover:bg-blue-50 transition">
            Ver facturas
          </button>
        </div>
      </div>
    </BaseBlock>
  );
};

export default InvoicesSummary;