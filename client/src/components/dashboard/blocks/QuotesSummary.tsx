import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText 
} from "lucide-react";

const QuotesSummary: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Presupuestos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-32" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Datos de presupuestos
  const quotesTotal = 5; // Usando un valor fijo por ahora
  const quotesAccepted = 3;
  const quotesRejected = 1;
  const quotesPending = 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Presupuestos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {quotesTotal}
            </span>
            <span className="text-sm text-muted-foreground">
              Presupuestos totales
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-3">
            <div className="flex flex-col items-center justify-center p-2 border rounded-md">
              <CheckCircle2 className="h-6 w-6 text-green-500 mb-1" />
              <p className="text-sm text-muted-foreground">Aceptados</p>
              <p className="font-medium text-lg">{quotesAccepted}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-2 border rounded-md">
              <XCircle className="h-6 w-6 text-red-500 mb-1" />
              <p className="text-sm text-muted-foreground">Rechazados</p>
              <p className="font-medium text-lg">{quotesRejected}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-2 border rounded-md">
              <Clock className="h-6 w-6 text-yellow-500 mb-1" />
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="font-medium text-lg">{quotesPending}</p>
            </div>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center">
                <FileText className="h-4 w-4 mr-1 text-blue-500" />
                Tasa de aceptación
              </p>
              <p className="font-semibold">
                {quotesTotal > 0 
                  ? Math.round((quotesAccepted / quotesTotal) * 100) 
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuotesSummary;