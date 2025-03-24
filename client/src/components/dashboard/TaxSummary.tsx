import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

// Define the expected data structure
interface DashboardStats {
  taxes: {
    vat: number;
    incomeTax: number;
  };
  totalWithholdings: number;
  income: number;
  expenses: number;
  result: number;
}

const TaxSummary = () => {
  const [, navigate] = useLocation();
  
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  };

  // Default tax values when data is not available
  const vat = data?.taxes?.vat ?? 0;
  const incomeTax = data?.taxes?.incomeTax ?? 0;
  const withholdings = data?.totalWithholdings ?? 0;
  const income = data?.income ?? 1; // Usar 1 para evitar división por cero
  
  // Calculate percentages for progress bars - como porcentaje de ingresos para ser más relevante
  const vatPercentage = Math.min(Math.max((vat / income) * 100, 0), 100);
  const incomeTaxPercentage = Math.min(Math.max((incomeTax / income) * 100, 0), 100);
  const withholdingsPercentage = Math.min(Math.max((withholdings / income) * 100, 0), 100);

  return (
    <Card>
      <CardHeader className="border-b border-neutral-200 p-4">
        <CardTitle className="font-medium text-neutral-800">Resumen de impuestos</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-neutral-600">IVA (Trimestre actual)</span>
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="text-sm font-medium">{formatCurrency(vat)}</span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <Progress value={vatPercentage} className="h-2 bg-neutral-200" />
          )}
          <p className="text-xs text-neutral-500 mt-1">
            {vatPercentage > 0 ? `${vatPercentage.toFixed(1)}% sobre facturación` : "Sin datos"}
          </p>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-neutral-600">IRPF (Trimestre actual)</span>
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="text-sm font-medium">{formatCurrency(incomeTax)}</span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <Progress 
              value={incomeTaxPercentage} 
              className="h-2 bg-neutral-200" 
            />
          )}
          <p className="text-xs text-neutral-500 mt-1">
            {incomeTaxPercentage > 0 ? `${incomeTaxPercentage.toFixed(1)}% sobre facturación` : "Sin datos"}
          </p>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-neutral-600">Retenciones</span>
            {isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              <span className="text-sm font-medium">{formatCurrency(withholdings)}</span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <Progress 
              value={withholdingsPercentage} 
              className="h-2 bg-neutral-200" 
            />
          )}
          <p className="text-xs text-neutral-500 mt-1">
            {withholdingsPercentage > 0 ? `${withholdingsPercentage.toFixed(1)}% sobre facturación` : "Sin datos"}
          </p>
        </div>
        
        <div className="text-center mt-6">
          <Button
            variant="outline"
            className="bg-primary-50 text-primary-700 hover:bg-primary-100 border-primary-200"
            onClick={() => navigate("/reports")}
          >
            Ver informe completo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxSummary;
