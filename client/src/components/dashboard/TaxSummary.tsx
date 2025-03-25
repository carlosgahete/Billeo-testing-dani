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
      {/* Resumen fiscal - más ancho, menos alto */}
      <Card className="shadow-sm">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* IVA */}
            <div className="mb-3 md:mb-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  IVA a pagar
                </span>
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <span className="text-sm font-medium">{formatCurrency(vat)}</span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress 
                  value={vatPercentage} 
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-blue-500"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                {vatPercentage > 0 ? `${vatPercentage.toFixed(1)}% sobre facturación` : "Sin datos suficientes"}
              </p>
            </div>
            
            {/* IRPF */}
            <div className="mb-3 md:mb-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                  IRPF estimado
                </span>
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
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-amber-500"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                {incomeTaxPercentage > 0 ? `${incomeTaxPercentage.toFixed(1)}% sobre beneficio` : "Sin datos suficientes"}
              </p>
            </div>
            
            {/* Retenciones */}
            <div className="mb-3 md:mb-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Retenciones aplicadas
                </span>
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
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-emerald-500"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                {withholdingsPercentage > 0 ? `${withholdingsPercentage.toFixed(1)}% sobre facturación` : "Sin retenciones"}
              </p>
            </div>
            
            {/* Gastos deducibles */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Gastos deducibles
                </span>
                {isLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <span className="text-sm font-medium">{formatCurrency(expenses)}</span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress 
                  value={expensesPercentage} 
                  className="h-2 bg-gray-100"
                  indicatorClassName="bg-red-500"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                {expensesPercentage > 0 ? `${expensesPercentage.toFixed(1)}% de la facturación` : "Sin gastos registrados"}
              </p>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <Button
              variant="outline"
              className="bg-primary-50 text-primary-700 hover:bg-primary-100 border-primary-200"
              onClick={() => navigate("/reports")}
            >
              Ver informe completo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Gastos deducibles */}
      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="font-medium text-gray-800 text-base">Gastos deducibles</CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-1">
                Escanea facturas para registrar gastos
              </CardDescription>
            </div>
            <ReceiptText className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-1 text-gray-500" />
                Documentación fiscal
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                Para que un gasto sea deducible, necesitas conservar las facturas que acrediten los gastos con:
              </p>
              <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                <li>NIF emisor y receptor</li>
                <li>Fecha y número de factura</li>
                <li>Descripción del servicio o producto</li>
                <li>Base imponible, IVA y total</li>
              </ul>
            </div>
            
            <div>
              <div className="mb-5">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-1 text-gray-500" />
                  Añadir gastos
                </h3>
                <p className="text-xs text-gray-600 mb-2">
                  Puedes añadir gastos subiendo facturas o manualmente:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => navigate("/transactions/create")}
                  >
                    Añadir manual
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => navigate("/document-scan")}
                  >
                    Escanear factura
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <PiggyBank className="h-4 w-4 mr-1 text-gray-500" />
                  Tipos de impuestos
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className="text-xs bg-gray-50 border border-gray-200 rounded p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate("/reports")}
                  >
                    <p className="font-medium text-gray-700">IVA</p>
                    <p className="text-gray-600">General: 21%</p>
                    <p className="text-gray-600">Reducido: 10%</p>
                    <p className="text-gray-600">Superr.: 4%</p>
                  </div>
                  <div 
                    className="text-xs bg-gray-50 border border-gray-200 rounded p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate("/reports")}
                  >
                    <p className="font-medium text-gray-700">IRPF</p>
                    <p className="text-gray-600">General: 15%</p>
                    <p className="text-gray-600">Inicial: 7%</p>
                    <p className="text-gray-600">Otros: Variable</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxSummary;
