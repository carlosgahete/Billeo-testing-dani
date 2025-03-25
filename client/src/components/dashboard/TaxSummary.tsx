import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  FileText, 
  Info,
  CalendarDays,
  Calendar
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
  const incomeTax = data?.taxes?.incomeTax ?? 0;
  const withholdings = data?.totalWithholdings ?? 0;
  const income = data?.income ?? 1; // Usar 1 para evitar división por cero
  const expenses = data?.expenses ?? 0;
  
  // Calcular valores trimestrales (simplificado)
  const vatQ1 = vat * 0.2; // 20% del total anual (ejemplo)
  const vatQ2 = vat * 0.3; // 30% del total anual (ejemplo)
  const vatQ3 = vat * 0.2; // 20% del total anual (ejemplo)
  const vatQ4 = vat * 0.3; // 30% del total anual (ejemplo)

  // Calcular retenciones trimestrales (simplificado)
  const withholdingsQ1 = withholdings * 0.2;
  const withholdingsQ2 = withholdings * 0.3;
  const withholdingsQ3 = withholdings * 0.2;
  const withholdingsQ4 = withholdings * 0.3;

  // IRPFEstimado total vs trimestral
  const irpfAnual = incomeTax;

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="bg-blue-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-blue-700 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Agenda Fiscal
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="h-4 w-4 text-neutral-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="w-[200px] text-xs">Resumen de impuestos por trimestres y anual</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Tabs defaultValue="trimestral" className="w-full">
          <TabsList className="w-full mb-2">
            <TabsTrigger value="trimestral" className="flex-1">
              <CalendarDays className="h-4 w-4 mr-1" />
              Trimestral
            </TabsTrigger>
            <TabsTrigger value="anual" className="flex-1">
              <Calendar className="h-4 w-4 mr-1" />
              Anual
            </TabsTrigger>
          </TabsList>
          
          {/* Vista Trimestral */}
          <TabsContent value="trimestral" className="mt-0">
            <div className="space-y-3">
              {/* IVA Trimestral */}
              <div className="p-3 bg-blue-50 shadow-sm border border-blue-100 rounded-md">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">IVA Trimestral (modelo 303)</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      1T (Ene-Mar)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-blue-800 font-medium">{formatCurrency(vatQ1)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      2T (Abr-Jun)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-blue-800 font-medium">{formatCurrency(vatQ2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      3T (Jul-Sep)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-blue-800 font-medium">{formatCurrency(vatQ3)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                      4T (Oct-Dic)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-blue-800 font-medium">{formatCurrency(vatQ4)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs mt-2 text-gray-500">
                  <span className="font-medium text-blue-600">Presentación:</span> 20 días después del fin de cada trimestre
                </div>
              </div>
              
              {/* Retenciones Trimestrales */}
              <div className="p-3 bg-amber-50 shadow-sm border border-amber-100 rounded-md">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Retenciones IRPF (modelo 111)</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                      1T (Ene-Mar)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-amber-800 font-medium">{formatCurrency(withholdingsQ1)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                      2T (Abr-Jun)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-amber-800 font-medium">{formatCurrency(withholdingsQ2)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                      3T (Jul-Sep)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-amber-800 font-medium">{formatCurrency(withholdingsQ3)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 flex items-center">
                      <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
                      4T (Oct-Dic)
                    </span>
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-amber-800 font-medium">{formatCurrency(withholdingsQ4)}</span>
                    )}
                  </div>
                </div>
                <div className="text-xs mt-2 text-gray-500">
                  <span className="font-medium text-amber-600">Presentación:</span> Del 1 al 20 del mes siguiente al fin del trimestre
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Vista Anual */}
          <TabsContent value="anual" className="mt-0">
            <div className="space-y-3">
              {/* IVA Anual */}
              <div className="p-3 bg-blue-50 shadow-sm border border-blue-100 rounded-md">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">Resumen Anual IVA (modelo 390)</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total anual</span>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <span className="text-blue-800 font-bold text-base">{formatCurrency(vat)}</span>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-3 w-full mt-2" />
                ) : (
                  <Progress 
                    value={100} 
                    className="h-3 bg-blue-100 mt-2"
                    indicatorClassName="bg-blue-600"
                  />
                )}
                <div className="text-xs mt-2 text-gray-500">
                  <span className="font-medium text-blue-600">Presentación:</span> Del 1 al 30 de enero
                </div>
              </div>
              
              {/* IRPF Anual */}
              <div className="p-3 bg-green-50 shadow-sm border border-green-100 rounded-md">
                <h3 className="text-sm font-semibold text-green-800 mb-2">IRPF Anual (modelo 100)</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">IRPF estimado</span>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <span className="text-green-800 font-bold text-base">{formatCurrency(irpfAnual)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-600 text-xs">Retenciones acumuladas</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="text-gray-700 font-medium text-xs">{formatCurrency(withholdings)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600 text-xs">IRPF a pagar</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="text-gray-700 font-medium text-xs">{formatCurrency(Math.max(0, irpfAnual - withholdings))}</span>
                  )}
                </div>
                <div className="text-xs mt-2 text-gray-500">
                  <span className="font-medium text-green-600">Presentación:</span> De abril a junio del año siguiente
                </div>
              </div>
              
              {/* Retenciones Anuales */}
              <div className="p-3 bg-amber-50 shadow-sm border border-amber-100 rounded-md">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">Retenciones IRPF (modelo 190)</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total anual</span>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <span className="text-amber-800 font-bold text-base">{formatCurrency(withholdings)}</span>
                  )}
                </div>
                {isLoading ? (
                  <Skeleton className="h-3 w-full mt-2" />
                ) : (
                  <Progress 
                    value={100} 
                    className="h-3 bg-amber-100 mt-2"
                    indicatorClassName="bg-amber-600"
                  />
                )}
                <div className="text-xs mt-2 text-gray-500">
                  <span className="font-medium text-amber-600">Presentación:</span> Del 1 al 31 de enero
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Button 
          variant="default" 
          size="sm" 
          className="w-full mt-3"
          onClick={() => navigate("/reports")}
        >
          Ver informes fiscales detallados
        </Button>
      </CardContent>
    </Card>
  );
};

export default TaxSummary;
