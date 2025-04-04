import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Receipt 
} from "lucide-react";

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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Datos de facturación
  const invoicesTotal = data.income || 0;
  const pendingInvoices = data.pendingInvoices || 0;
  const pendingCount = data.pendingCount || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Facturas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(invoicesTotal)}
            </span>
            <span className="text-sm text-muted-foreground">
              Facturación total
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="flex flex-col p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <Receipt className="h-5 w-5 text-blue-500 mr-2" />
                <p className="text-sm font-medium">Pendientes de cobro</p>
              </div>
              <p className="text-xl font-medium text-amber-500">{formatCurrency(pendingInvoices)}</p>
              <p className="text-xs text-muted-foreground">{pendingCount} facturas</p>
            </div>
            
            <div className="flex flex-col p-2 border rounded-md">
              <div className="flex items-center mb-1">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
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
              <p className="font-semibold">
                {invoicesTotal > 0 
                  ? Math.round((pendingInvoices / invoicesTotal) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicesSummary;