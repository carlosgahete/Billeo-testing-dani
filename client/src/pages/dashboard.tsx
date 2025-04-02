import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Loader2, 
  ChevronDown, 
  ArrowUpFromLine, 
  ArrowDownToLine, 
  PiggyBank, 
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  Eye,
  FileCheck
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";
import TaxSummary from "@/components/dashboard/TaxSummary";
import ComparisonCharts from "@/components/dashboard/ComparisonCharts";
import { PageTitle } from "@/components/ui/page-title";

// Interfaces
interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  pendingQuotes: number;
  pendingQuotesCount: number;
  baseImponible?: number;
  ivaRepercutido?: number;
  ivaSoportado?: number;
  irpfRetenidoIngresos?: number;
  totalWithholdings?: number;
  taxes: {
    vat: number;
    incomeTax: number;
    ivaALiquidar: number;
  };
  [key: string]: any;
}

// Añadir función de utilidad para depuración
const debugData = (data: any) => {
  console.log("DATOS DEL DASHBOARD:", data);
  if (data?.baseImponible) {
    console.log("Base Imponible desde API:", data.baseImponible);
  } else {
    console.log("⚠️ Base Imponible NO disponible en API");
  }
  
  if (data?.income) {
    console.log("Income Total:", data.income);
    console.log("Income sin IVA (approx):", Number((data.income / 1.21).toFixed(2)));
  }
};

const Dashboard = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
    queryFn: async () => {
      // Añadir un timestamp y encabezados no-cache para garantizar datos frescos siempre
      const timestamp = Date.now();
      const res = await fetch(`/api/stats/dashboard?year=${year}&period=${period}&nocache=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 2000, // Refrescar cada 2 segundos para mantener los datos actualizados
    staleTime: 0, // Considerar los datos obsoletos inmediatamente
    gcTime: 0, // No almacenar en caché (antes era cacheTime en v4)
    retry: 3, // Intentar 3 veces si falla
    retryDelay: 500 // Esperar 500ms entre reintentos
  });

  const isLoading = userLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  // Depurar datos cuando se cargan
  debugData(stats);
  
  // Usar datos reales del sistema o valores por defecto si no hay datos
  const incomeTotal = stats?.income || 0;
  const expensesTotal = stats?.expenses || 0;
  
  // Obtener IVA e IRPF directamente de la API
  // Estos valores vienen ya calculados desde el servidor con las reglas correctas
  const ivaRepercutido = stats?.ivaRepercutido || 0; // IVA cobrado en facturas emitidas
  const ivaSoportado = stats?.ivaSoportado || 0; // IVA pagado en gastos
  const irpfRetenidoIngresos = stats?.irpfRetenidoIngresos || 0; // IRPF retenido en facturas emitidas
  const irpfFromExpensesInvoices = stats?.totalWithholdings || 0; // IRPF retenido en facturas recibidas
  
  // Base imponible (beneficio antes de impuestos)
  const baseImponible = stats?.baseImponible || Number((incomeTotal - expensesTotal).toFixed(2));
  
  // Cálculo del IVA neto a liquidar (repercutido - soportado)
  const ivaNeto = Number((ivaRepercutido - ivaSoportado).toFixed(2));
  
  // Balance total (ingresos - gastos)
  const balanceTotal = Number((incomeTotal - expensesTotal).toFixed(2));
  
  // Impuesto sobre la renta a pagar (información del backend)
  const incomeTax = stats?.taxes?.incomeTax || 0;
  
  // Cálculos para mostrar el análisis financiero según especificaciones
  // Extraer la base imponible (subtotal) de los datos que recibimos del servidor
  // Si no está disponible en stats.baseImponible, calculamos aproximadamente restando el IVA del total
  const baseIncomeSinIVA = stats?.baseImponible || 
    Number((incomeTotal / 1.21).toFixed(2)); // Usando la tasa estándar de IVA (21%) para aproximar
  const baseExpensesSinIVA = expensesTotal - ivaSoportado; // Gastos sin IVA
  
  // Total bruto es el valor que incluye IVA
  const totalBruto = incomeTotal; // Este es el total que ya viene del backend (1060€)
  
  // 3. IRPF calculado como porcentaje de la base imponible
  const irpfRate = 0.15; // Tasa estándar de IRPF
  const irpfCalculado = irpfRetenidoIngresos || Number((baseIncomeSinIVA * irpfRate).toFixed(2));
  
  // 4. Total neto es lo que realmente se cobra tras aplicar retenciones
  const totalNeto = Number((totalBruto - irpfCalculado).toFixed(2));
  
  // 5. Lo que realmente se paga por los gastos
  const totalPagado = Number((expensesTotal).toFixed(2));
  
  // 6. Beneficio neto real
  const netProfit = Number((totalNeto - totalPagado).toFixed(2));
  
  // Datos financieros organizados
  const financialData = {
    income: {
      total: incomeTotal,
      ivaRepercutido: ivaRepercutido,
      totalWithoutVAT: baseIncomeSinIVA
    },
    expenses: {
      total: expensesTotal,
      ivaSoportado: ivaSoportado,
      totalWithoutVAT: baseExpensesSinIVA
    },
    balance: {
      total: balanceTotal,
      ivaNeto: ivaNeto,
      irpfCalculado: irpfCalculado,
      incomeTax: incomeTax,
      netProfit: netProfit
    },
    taxes: {
      vat: stats?.taxes?.vat || 0,
      incomeTax: stats?.taxes?.incomeTax || 0,
      ivaALiquidar: stats?.taxes?.ivaALiquidar || ivaNeto || 0
    }
  };

  // Cálculo de rentabilidad (con manejo seguro para división por cero)
  const profitMargin = incomeTotal > 0 
    ? ((balanceTotal / incomeTotal) * 100).toFixed(1) 
    : "0.0";
  const isPositiveMargin = balanceTotal > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 mt-4">
        <PageTitle 
          title="Resumen Contable"
          description="Visión general de tu actividad económica"
          variant="gradient"
          className="w-full overflow-visible"
        >
          <div className="flex justify-end items-center mt-1">
            <div className="flex bg-white/10 backdrop-blur-md p-2 rounded-full gap-4">
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="bg-white/10 hover:bg-white/20 transition-colors duration-150 rounded-full border-0 w-[80px] h-8 min-h-0">
                  <span className="text-white text-sm font-semibold">{year}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="w-px h-5 bg-white/20 self-center"></div>
              
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="bg-white/10 hover:bg-white/20 transition-colors duration-150 rounded-full border-0 w-[140px] h-8 min-h-0">
                  <span className="text-white text-sm font-semibold">
                    {period === "all" ? "Todo el año" : 
                     period.startsWith("q") ? `${period.replace("q", "")}º trimestre` : 
                     period === "m1" ? "Enero" :
                     period === "m2" ? "Febrero" :
                     period === "m3" ? "Marzo" :
                     period === "m4" ? "Abril" :
                     period === "m5" ? "Mayo" :
                     period === "m6" ? "Junio" :
                     period === "m7" ? "Julio" :
                     period === "m8" ? "Agosto" :
                     period === "m9" ? "Septiembre" :
                     period === "m10" ? "Octubre" :
                     period === "m11" ? "Noviembre" : "Diciembre"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el año</SelectItem>
                  <SelectItem value="q1">1er trimestre</SelectItem>
                  <SelectItem value="q2">2º trimestre</SelectItem>
                  <SelectItem value="q3">3er trimestre</SelectItem>
                  <SelectItem value="q4">4º trimestre</SelectItem>
                  <SelectItem value="m1">Enero</SelectItem>
                  <SelectItem value="m2">Febrero</SelectItem>
                  <SelectItem value="m3">Marzo</SelectItem>
                  <SelectItem value="m4">Abril</SelectItem>
                  <SelectItem value="m5">Mayo</SelectItem>
                  <SelectItem value="m6">Junio</SelectItem>
                  <SelectItem value="m7">Julio</SelectItem>
                  <SelectItem value="m8">Agosto</SelectItem>
                  <SelectItem value="m9">Septiembre</SelectItem>
                  <SelectItem value="m10">Octubre</SelectItem>
                  <SelectItem value="m11">Noviembre</SelectItem>
                  <SelectItem value="m12">Diciembre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PageTitle>
      </div>
      
      {/* Métricas principales */}
      <DashboardMetrics userId={user?.user?.id || 0} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-2 mt-4">
        {/* Primera columna: Tarjeta de Ingresos */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col">
          {/* Tarjeta de Ingresos */}
          <Card className="overflow-hidden flex-grow">
            <CardHeader className="bg-emerald-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-emerald-700 flex items-center">
                  <ArrowUpFromLine className="mr-2 h-5 w-5" />
                  Ingresos
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[250px] text-xs">Base imponible de todas las facturas cobradas (sin IVA). Representa el valor real de tu actividad económica.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-emerald-600">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(financialData.income.totalWithoutVAT)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA repercutido:</span>
                  <span className="font-medium">{financialData.income.ivaRepercutido.toLocaleString('es-ES')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total facturado:</span>
                  <span className="font-medium">{financialData.income.total.toLocaleString('es-ES')} €</span>
                </div>
              </div>
              
              <div className="mt-8 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => navigate("/invoices")}
                >
                  Ver facturas
                </Button>
              </div>
              
              <div className="mt-auto pt-2 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => navigate("/income-expense?tab=income")}
                >
                  Ver ingresos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Segunda columna: Tarjeta de Gastos */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col">
          {/* Tarjeta de Gastos */}
          <Card className="overflow-hidden flex-grow">
            <CardHeader className="bg-red-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-red-700 flex items-center">
                  <ArrowDownToLine className="mr-2 h-5 w-5" />
                  Gastos
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[200px] text-xs">Dinero que sale para cubrir los costos de tu actividad profesional</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(financialData.expenses.total)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA incluido en los gastos:</span>
                  <span className="font-medium">{financialData.expenses.ivaSoportado.toLocaleString('es-ES')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IRPF retenido en los gastos:</span>
                  <span className="font-medium">{Math.round(financialData.expenses.totalWithoutVAT * 0.15).toLocaleString('es-ES')} €</span>
                </div>
              </div>
              
              <div className="mt-auto pt-8 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => navigate("/income-expense?tab=expense")}
                >
                  Ver gastos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        

        {/* Cuarta columna: Tarjeta de Resultado Final */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col">
          <Card className="overflow-hidden flex-grow">
            <CardHeader className="bg-blue-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-blue-700 flex items-center">
                  <PiggyBank className="mr-2 h-5 w-5" />
                  Resultado Final
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[200px] text-xs">El beneficio final después de descontar impuestos y retenciones</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(financialData.income.total - financialData.expenses.total)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA a liquidar:</span>
                  <span className="font-medium text-red-600">{new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(stats?.taxes?.vat || 0)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IRPF a liquidar:</span>
                  <span className="font-medium text-red-600">{new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(stats?.taxes?.incomeTax || 0)} €</span>
                </div>
              </div>
              
              <div className="mt-auto pt-8 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => navigate("/reports")}
                >
                  Ver informes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Fila para el resumen fiscal (ocupa todo el ancho) */}
        <div className="md:col-span-3 mt-6">
          {/* Sección de Resumen Fiscal y Gráficos de Comparación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TaxSummary />
            <ComparisonCharts />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
