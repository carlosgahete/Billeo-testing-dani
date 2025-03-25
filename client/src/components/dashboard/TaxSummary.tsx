import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowRight, 
  ReceiptText, 
  FileText, 
  PiggyBank, 
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  Info
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

// Componente para los tipos de IVA
const VATTypes = () => {
  return (
    <div className="mt-3 bg-slate-50 p-3 rounded-md border border-slate-200">
      <h4 className="text-xs font-medium text-slate-700 mb-2">Tipos de IVA en España</h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-600 rounded-full mr-1"></span>
          <span className="text-slate-600">21% General</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
          <span className="text-slate-600">10% Reducido</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-amber-500 rounded-full mr-1"></span>
          <span className="text-slate-600">4% Superreducido</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-gray-400 rounded-full mr-1"></span>
          <span className="text-slate-600">0% Exento</span>
        </div>
      </div>
    </div>
  );
};

// Componente para los tipos de IRPF
const IRPFTypes = () => {
  return (
    <div className="mt-3 bg-slate-50 p-3 rounded-md border border-slate-200">
      <h4 className="text-xs font-medium text-slate-700 mb-2">Retenciones IRPF</h4>
      <div className="grid gap-1 text-xs">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-blue-600 rounded-full mr-1"></span>
          <span className="text-slate-600">15% General para autónomos</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
          <span className="text-slate-600">7% Primeros años de actividad</span>
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-purple-500 rounded-full mr-1"></span>
          <span className="text-slate-600">Otros % específicos por profesión</span>
        </div>
      </div>
    </div>
  );
};

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
  const incomeTax = data?.taxes?.incomeTax ?? 0;
  const withholdings = data?.totalWithholdings ?? 0;
  const income = data?.income ?? 1; // Usar 1 para evitar división por cero
  const expenses = data?.expenses ?? 0;
  
  // Calculate percentages for progress bars - como porcentaje de ingresos para ser más relevante
  const vatPercentage = Math.min(Math.max((vat / income) * 100, 0), 100);
  const incomeTaxPercentage = Math.min(Math.max((incomeTax / income) * 100, 0), 100);
  const withholdingsPercentage = Math.min(Math.max((withholdings / income) * 100, 0), 100);
  const expensesPercentage = Math.min(Math.max((expenses / income) * 100, 0), 100);

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Resumen fiscal
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="h-4 w-4 text-neutral-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[200px] text-xs">Resumen de los impuestos trimestrales estimados</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* IVA - Con estilo destacado */}
        <div className="p-3 bg-blue-50 shadow-sm border border-blue-100 rounded-md">
          <div className="flex justify-between items-center mb-1">
            <span className="text-base text-blue-700 font-medium flex items-center">
              <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
              IVA a pagar
            </span>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <span className="text-base font-bold text-blue-700">{formatCurrency(vat)}</span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-3 w-full" />
          ) : (
            <Progress 
              value={vatPercentage} 
              className="h-4 bg-blue-100"
              indicatorClassName="bg-blue-600"
            />
          )}
          <p className="text-xs text-blue-600 mt-1 font-medium">
            Tipo impositivo: 21%
          </p>
        </div>
        
        {/* IRPF */}
        <div className="p-3 bg-white shadow-sm border border-gray-100 rounded-md mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-700 font-medium flex items-center">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-1"></span>
              IRPF estimado
            </span>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-sm font-semibold">{formatCurrency(incomeTax)}</span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-3 w-full" />
          ) : (
            <Progress 
              value={incomeTaxPercentage} 
              className="h-3 bg-gray-100"
              indicatorClassName="bg-amber-500"
            />
          )}
          <p className="text-xs text-gray-500 mt-1">
            Retención: 15%
          </p>
        </div>
        
        {/* Retenciones acumuladas */}
        <div className="p-3 bg-white shadow-sm border border-gray-100 rounded-md mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-700 font-medium flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
              Retenciones acumuladas
            </span>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-sm font-semibold">{formatCurrency(withholdings)}</span>
            )}
          </div>
          {isLoading ? (
            <Skeleton className="h-3 w-full" />
          ) : (
            <Progress 
              value={withholdings > 0 ? 100 : 0}
              className="h-3 bg-gray-100" 
              indicatorClassName="bg-green-500"
            />
          )}
          <p className="text-xs text-gray-500 mt-1">
            Retenciones practicadas en facturas
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
