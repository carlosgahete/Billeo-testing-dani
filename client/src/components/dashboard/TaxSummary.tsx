import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  FileText, 
  Info,
  CalendarDays
} from "lucide-react";

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
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(value);
  };

  // Default tax values when data is not available
  const vat = data?.taxes?.vat ?? 0;
  const withholdings = data?.totalWithholdings ?? 0;
  
  // Calcular valores trimestrales (simplificado)
  const vatQ1 = vat * 0.2; // 20% del total anual (ejemplo)
  const vatQ2 = vat * 0.3; // 30% del total anual (ejemplo)
  const vatQ3 = vat * 0.2; // 20% del total anual (ejemplo)
  const vatQ4 = vat * 0.3; // 30% del total anual (ejemplo)

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Resumen Fiscal
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="h-4 w-4 text-neutral-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[200px] text-xs">IVA a pagar por trimestres y retenciones acumuladas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* IVA Trimestral */}
        <div className="p-3 bg-blue-50 shadow-sm border border-blue-100 rounded-md">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
            <CalendarDays className="mr-1 h-4 w-4" />
            IVA por Trimestres
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">1T (Ene-Mar)</span>
              {isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-blue-800 font-medium">{formatCurrency(vatQ1)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">2T (Abr-Jun)</span>
              {isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-blue-800 font-medium">{formatCurrency(vatQ2)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">3T (Jul-Sep)</span>
              {isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-blue-800 font-medium">{formatCurrency(vatQ3)}</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">4T (Oct-Dic)</span>
              {isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : (
                <span className="text-blue-800 font-medium">{formatCurrency(vatQ4)}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* IVA Anual */}
        <div className="p-3 bg-blue-50 shadow-sm border border-blue-100 rounded-md mt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-800">IVA anual</span>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-blue-800 font-bold text-lg">{formatCurrency(vat)}</span>
            )}
          </div>
        </div>
        
        {/* Retenciones acumuladas */}
        <div className="p-3 bg-amber-50 shadow-sm border border-amber-100 rounded-md mt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-amber-800">Retenciones acumuladas</span>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-amber-800 font-bold text-lg">{formatCurrency(withholdings)}</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Retenciones ya practicadas en tus facturas (15%)
          </p>
        </div>
        
        <Button 
          variant="default" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => navigate("/reports")}
        >
          Ver informes fiscales
        </Button>
      </CardContent>
    </Card>
  );
};

export default TaxSummary;
