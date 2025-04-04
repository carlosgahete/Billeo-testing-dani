import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";

const ResultSummary: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
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
          <CardTitle className="text-lg">Resultado Final</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cálculos para el resultado
  const income = data.income || 0;
  const expenses = data.expenses || 0;
  const result = income - expenses;
  const ivaALiquidar = data.taxes?.ivaALiquidar || 0;
  const irpfTotal = data.taxes?.incomeTax || 0;
  const resultadoNeto = result - irpfTotal;  // Resultado después de IRPF

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Resultado Final</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(result)}
            </span>
            <span className="text-sm text-muted-foreground">
              Base imponible
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t pt-3">
            <div>
              <p className="text-sm text-muted-foreground">IVA a liquidar</p>
              <p className="font-medium">{formatCurrency(ivaALiquidar)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">IRPF estimado</p>
              <p className="font-medium">{formatCurrency(irpfTotal)}</p>
            </div>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Resultado neto (después de IRPF)</p>
              <p className="font-semibold">{formatCurrency(resultadoNeto)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultSummary;