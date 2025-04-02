import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  
  // React Query para refrescar datos
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
    queryFn: async ({ queryKey }) => {
      // Extraer parámetros del queryKey para garantizar los datos más actualizados
      const [_, params] = queryKey as [string, { year: string, period: string }];
      
      // Añadir un timestamp y encabezados no-cache para garantizar datos frescos siempre
      const timestamp = Date.now();
      console.log(`📊 Consultando datos fiscales [periodo: ${params.period}, año: ${params.year}]`);
      
      const res = await fetch(`/api/stats/dashboard?year=${params.year}&period=${params.period}&nocache=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      return res.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: false, // Desactivamos la actualización automática
    staleTime: 0, // Considerar los datos obsoletos inmediatamente
    gcTime: 60 * 1000, // Mantener en caché por 1 minuto
    retry: 1, // Intentar una vez más si falla
    enabled: Boolean(year && period), // Solo consultar cuando tenemos año y periodo
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
  
  // DEPURACIÓN EXTENDIDA - Mostrar exactamente lo que está llegando en baseImponible
  console.log("VALOR DE BASE IMPONIBLE:", {
    directBaseImponible: stats?.baseImponible,
    tipoBaseImponible: typeof stats?.baseImponible,
    statsCompleto: stats
  });
  
  // Usar datos reales del sistema o valores por defecto si no hay datos
  const incomeTotal = stats?.income || 0;
  const expensesTotal = stats?.expenses || 0;
  
  // Obtener IVA e IRPF directamente de la API
  // Estos valores vienen ya calculados desde el servidor con las reglas correctas
  const ivaRepercutido = stats?.ivaRepercutido || 0; // IVA cobrado en facturas emitidas
  const ivaSoportado = stats?.ivaSoportado || 0; // IVA pagado en gastos
  const irpfFromAPI = stats?.irpfRetenidoIngresos || 0; // IRPF retenido en facturas emitidas
  const irpfFromExpensesInvoices = stats?.totalWithholdings || 0; // IRPF retenido en facturas recibidas
  
  // Base imponible (beneficio antes de impuestos)
  const baseImponible = stats?.baseImponible || Number((incomeTotal - expensesTotal).toFixed(2));
  
  // Cálculo del IVA neto a liquidar (repercutido - soportado)
  const ivaNeto = Number((ivaRepercutido - ivaSoportado).toFixed(2));
  
  // Balance total (ingresos - gastos)
  const balanceTotal = Number((incomeTotal - expensesTotal).toFixed(2));
  
  // Impuesto sobre la renta a pagar (información del backend)
  const incomeTax = stats?.taxes?.incomeTax || 0;
  
  // Usamos exclusivamente los valores directamente de la API para evitar problemas de cálculo
  // Esto garantiza que las actualizaciones de facturas (ediciones hacia arriba o abajo)
  // se reflejen correctamente en el dashboard
  
  // 1. INFORMACIÓN DE INGRESOS
  // Base imponible - La API ya hace el cálculo correcto considerando las ediciones de facturas
  const baseIncomeSinIVA = stats?.baseImponible || Math.round(incomeTotal / 1.21);
  
  // IVA repercutido - Obtenido directamente de la API
  const ivaRepercutidoCorregido = stats?.ivaRepercutido || Math.round(baseIncomeSinIVA * 0.21);
  
  // IRPF retenido - Obtenido directamente de la API
  const irpfRetencionIngresos = stats?.irpfRetenidoIngresos || 0;
  
  // Total bruto con IVA - Viene directamente de la API
  const totalBruto = incomeTotal;
  
  // 2. INFORMACIÓN DE GASTOS
  // Base imponible de gastos - Usar el total de gastos directamente
  const baseExpensesSinIVA = expensesTotal;
  
  // IVA soportado - La API calcula esto correctamente
  const ivaSoportadoCorregido = stats?.ivaSoportado || Math.round(baseExpensesSinIVA * 0.21);
  
  // IRPF en gastos - El cálculo viene de la API
  const irpfGastos = stats?.totalWithholdings || Math.round(baseExpensesSinIVA * 0.15);
  
  // 3. CÁLCULOS DE IMPUESTOS
  // IVA a liquidar - La API ya calcula correctamente al editar facturas
  const ivaALiquidarCorregido = stats?.taxes?.ivaALiquidar || stats?.taxes?.vat || 
                                (ivaRepercutidoCorregido - ivaSoportadoCorregido);
  
  // IRPF total - Calculado a partir de los valores de la API
  const irpfTotal = irpfRetencionIngresos - irpfGastos;
  
  // 4. CÁLCULOS DERIVADOS
  // Beneficio antes de impuestos - Base imponible de ingresos menos base de gastos
  const beneficioAntesImpuestos = baseIncomeSinIVA - baseExpensesSinIVA;
  
  // Total pagado por gastos con IVA - Directamente del API
  const totalPagado = expensesTotal;
  
  // Resultado final después de impuestos
  const netProfit = beneficioAntesImpuestos - irpfTotal;
  
  // Log para depuración
  console.log("VALORES FINANCIEROS ACTUALIZADOS:", {
    ingresos: {
      baseImponible: baseIncomeSinIVA,
      totalConIVA: totalBruto,
      ivaRepercutido: ivaRepercutidoCorregido,
      irpfRetenido: irpfRetencionIngresos
    },
    gastos: {
      baseImponible: baseExpensesSinIVA,
      totalConIVA: totalPagado,
      ivaSoportado: ivaSoportadoCorregido,
      irpfEnGastos: irpfGastos
    },
    resultados: {
      beneficioAntesImpuestos,
      ivaALiquidar: ivaALiquidarCorregido,
      irpfTotal,
      resultadoFinal: netProfit
    }
  });
  
  const financialData = {
    income: {
      total: totalBruto, // 10600€
      ivaRepercutido: ivaRepercutidoCorregido, // 2100€
      totalWithoutVAT: baseIncomeSinIVA // 10000€
    },
    expenses: {
      total: totalPagado, // 1210€
      ivaSoportado: ivaSoportadoCorregido, // 210€
      totalWithoutVAT: baseExpensesSinIVA // 1000€
    },
    balance: {
      total: baseIncomeSinIVA - baseExpensesSinIVA, // 9000€ (base imponible)
      ivaNeto: ivaRepercutidoCorregido - ivaSoportadoCorregido, // 1890€
      irpfAdelantado: irpfRetencionIngresos, // 1500€
      netProfit: netProfit // 7650€
    },
    taxes: {
      vat: ivaALiquidarCorregido, // 1890€
      incomeTax: irpfRetencionIngresos, // 1500€
      ivaALiquidar: ivaALiquidarCorregido // 1890€
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
          <div className="flex justify-end items-center mt-2">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10 shadow-lg">
              <p className="text-white/80 text-xs mb-2 font-medium">Filtrar por período</p>
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <label className="text-white/70 text-[10px] block ml-1">Ejercicio fiscal</label>
                  <Select value={year} onValueChange={(value) => {
                    setYear(value);
                    console.log("Cambiando año a:", value, "período:", period);
                    // Invalidar caché y forzar una nueva consulta
                    queryClient.invalidateQueries({
                      queryKey: ["/api/stats/dashboard"]
                    });
                  }}>
                    <SelectTrigger className="bg-white/15 hover:bg-white/25 focus:bg-white/30 transition-colors duration-150 rounded-md border-0 w-[90px] h-9">
                      <span className="text-white text-sm font-semibold">{year}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-px h-10 bg-white/20 self-center"></div>
                
                <div className="space-y-1">
                  <label className="text-white/70 text-[10px] block ml-1">Período</label>
                  <Select value={period} onValueChange={(value) => {
                    setPeriod(value);
                    console.log("Cambiando período a:", value, "año:", year);
                    // Invalidar caché y forzar una nueva consulta
                    queryClient.invalidateQueries({
                      queryKey: ["/api/stats/dashboard"]
                    });
                  }}>
                    <SelectTrigger className="bg-white/15 hover:bg-white/25 focus:bg-white/30 transition-colors duration-150 rounded-md border-0 w-[160px] h-9">
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
                }).format(financialData.expenses.totalWithoutVAT)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA incluido en los gastos:</span>
                  <span className="font-medium">{financialData.expenses.ivaSoportado.toLocaleString('es-ES')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IRPF a liquidar por gastos:</span>
                  <span className="font-medium text-red-600">-{Math.round(financialData.expenses.totalWithoutVAT * 0.15).toLocaleString('es-ES')} €</span>
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
                }).format(financialData.income.totalWithoutVAT - financialData.expenses.totalWithoutVAT)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Margen de beneficio:</span>
                  <span className={`font-medium ${isPositiveMargin ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Base imponible:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('es-ES', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    }).format(financialData.balance.total)} €
                  </span>
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
        
        {/* Fila para el resumen fiscal y gráficos de comparación */}
        <div className="md:col-span-3 mt-6">
          {/* Sección de Resumen Fiscal y Gráficos de Comparación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Resumen Fiscal */}
            <Card className="overflow-hidden shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-400 p-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-white flex items-center">
                    <PiggyBank className="mr-2 h-5 w-5" />
                    Resumen Fiscal
                  </CardTitle>
                </div>
                <CardDescription className="text-white/80 text-xs mt-1">
                  {period === "all" ? "Año completo" : 
                  period.startsWith("q") ? `${period.replace("q", "")}º trimestre` : 
                  "Mes seleccionado"} ({year})
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {/* IVA Repercutido */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">IVA Repercutido</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-blue-600">
                          {new Intl.NumberFormat('es-ES', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          }).format(stats?.ivaRepercutido || 0)} €
                        </span>
                      </div>
                    </div>
                    
                    {/* IVA Soportado */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">IVA Soportado</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-blue-600">
                          {new Intl.NumberFormat('es-ES', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          }).format(stats?.ivaSoportado || 0)} €
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-px bg-gray-100 w-full my-2"></div>
                  
                  {/* IRPF Adelantado */}
                  <div className="bg-white border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-600">IRPF Adelantado</h3>
                      <p className="text-xs text-gray-500 mt-1">Retenciones a tu favor</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-green-600">
                        {new Intl.NumberFormat('es-ES', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }).format(stats?.irpfRetenidoIngresos || 0)} €
                      </span>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-pointer ml-2">
                              <Info className="h-4 w-4 text-neutral-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                            <p className="w-[250px] text-xs">IRPF retenido en tus facturas emitidas. Este importe se descontará de tu declaración anual.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {/* IVA a Liquidar */}
                  <div className="bg-white border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-600">IVA a Liquidar</h3>
                      <p className="text-xs text-gray-500 mt-1">Declaración trimestral</p>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-red-600">
                        {new Intl.NumberFormat('es-ES', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        }).format(stats?.taxes?.ivaALiquidar || 0)} €
                      </span>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-pointer ml-2">
                              <Info className="h-4 w-4 text-neutral-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                            <p className="w-[250px] text-xs">Diferencia entre el IVA que has cobrado y el que has pagado. Este importe deberás ingresarlo a Hacienda.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Comparativa Financiera */}
            <ComparisonCharts year={year} period={period} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
