import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowRight, 
  ReceiptText, 
  FileText, 
  PiggyBank, 
  TrendingDown,
  TrendingUp,
  ShoppingCart
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
    <div className="grid gap-4">
      {/* Tarjeta de Resultado */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-medium text-gray-800 text-base">Resultado</CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-1">
                Resumen de ingresos y gastos
              </CardDescription>
            </div>
            <PiggyBank className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className={`text-3xl font-bold ${(income - expenses) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(income - expenses)}
                </p>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  {(income - expenses) >= 0 ? (
                    <><TrendingUp className="h-3 w-3 mr-1 text-green-500" /> {((income - expenses) / Math.max(1, income) * 100).toFixed(1)}% de margen</>
                  ) : (
                    <><TrendingDown className="h-3 w-3 mr-1 text-red-500" /> {Math.abs((income - expenses) / Math.max(1, income) * 100).toFixed(1)}% de pérdidas</>
                  )}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Ingresos totales:</span>
                  <span className="text-sm font-medium">{formatCurrency(income)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gastos totales:</span>
                  <span className="text-sm font-medium">{formatCurrency(expenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Retenciones:</span>
                  <span className="text-sm font-medium">{formatCurrency(withholdings)}</span>
                </div>
              </div>
              
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full bg-primary-50 text-primary-700 hover:bg-primary-100 border-primary-200"
                  onClick={() => navigate("/reports")}
                >
                  Ver informes detallados
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Resumen fiscal - más ancho, menos alto */}
      <Card className="shadow-sm mt-4">
        <CardHeader className="border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-medium text-gray-800 text-base">Resumen fiscal</CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-1">
                Valores estimados del trimestre
              </CardDescription>
            </div>
            <FileText className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IVA */}
            <div className="p-3 bg-white shadow-sm border border-gray-100 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700 font-medium flex items-center">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  IVA a pagar
                </span>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <span className="text-sm font-semibold">{formatCurrency(vat)}</span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress 
                  value={vatPercentage} 
                  className="h-2.5 bg-gray-100"
                  indicatorClassName="bg-blue-500"
                />
              )}
              <p className="text-xs text-gray-500 mt-1.5">
                {vatPercentage > 0 ? `${vatPercentage.toFixed(1)}% sobre facturación` : "Sin datos suficientes"}
              </p>
            </div>
            
            {/* IRPF */}
            <div className="p-3 bg-white shadow-sm border border-gray-100 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700 font-medium flex items-center">
                  <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                  IRPF estimado
                </span>
                {isLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <span className="text-sm font-semibold">{formatCurrency(incomeTax)}</span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress 
                  value={incomeTaxPercentage} 
                  className="h-2.5 bg-gray-100"
                  indicatorClassName="bg-amber-500"
                />
              )}
              <p className="text-xs text-gray-500 mt-1.5">
                {incomeTaxPercentage > 0 ? `${incomeTaxPercentage.toFixed(1)}% sobre beneficio` : "Sin datos suficientes"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxSummary;
