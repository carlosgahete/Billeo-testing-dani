import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import DashboardMetrics from "@/components/dashboard/DashboardMetrics";

import ComparisonCharts from "@/components/dashboard/ComparisonCharts";
import QuotesSummary from "@/components/dashboard/QuotesSummary";
import InvoicesSummary from "@/components/dashboard/InvoicesSummary";
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
    refetchOnMount: "always", // Siempre recarga al montar el componente
    refetchOnReconnect: true,
    refetchInterval: 1000, // Actualizar cada segundo para mayor reactividad
    staleTime: 0, // Considerar los datos obsoletos inmediatamente
    gcTime: 0, // No almacenar en caché (antes era cacheTime en v4)
    retry: 3, // Intentar 3 veces si falla
    retryDelay: 300, // Tiempo más corto entre reintentos
    refetchIntervalInBackground: true // Continuar actualizando incluso cuando la pestaña no está enfocada
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
  
  // Efecto para cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const yearMenu = document.getElementById('yearMenu');
      const periodMenu = document.getElementById('periodMenu');
      const yearButton = document.getElementById('yearButton');
      const periodButton = document.getElementById('periodButton');
      
      // Cerrar el menú de año si el clic no fue en él o en su botón asociado
      if (yearMenu && !yearMenu.contains(event.target as Node) && 
          yearButton && !yearButton.contains(event.target as Node)) {
        yearMenu.classList.add('hidden');
      }
      
      // Cerrar el menú de período si el clic no fue en él o en su botón asociado
      if (periodMenu && !periodMenu.contains(event.target as Node) && 
          periodButton && !periodButton.contains(event.target as Node)) {
        periodMenu.classList.add('hidden');
      }
    };
    
    // Agregar el event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpiar el event listener al desmontar el componente
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
            <div className="flex gap-3">
              {/* Nuevo botón de año completamente personalizado - Estilo Apple */}
              <div className="relative">
                <button
                  id="yearButton"
                  onClick={() => document.getElementById('yearMenu')?.classList.toggle('hidden')}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all duration-150 px-4 py-1.5 rounded-full backdrop-blur-md border-0"
                >
                  <span className="text-white text-sm font-medium mr-1">{year}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-white opacity-70" strokeWidth={2} />
                </button>
                <div 
                  id="yearMenu"
                  className="hidden absolute right-0 mt-2 w-[100px] py-1 bg-white/90 backdrop-blur-xl rounded-xl border-0 shadow-lg overflow-hidden z-50"
                >
                  {["2023", "2024", "2025"].map((yearOption) => (
                    <button
                      key={yearOption}
                      className={`w-full px-4 py-1.5 text-left text-sm transition-colors
                        ${year === yearOption ? 'bg-[#0066FF] text-white font-medium' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                      onClick={() => {
                        setYear(yearOption);
                        document.getElementById('yearMenu')?.classList.add('hidden');
                      }}
                    >
                      {yearOption}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Nuevo botón de período completamente personalizado - Estilo Apple */}
              <div className="relative">
                <button
                  id="periodButton"
                  onClick={() => document.getElementById('periodMenu')?.classList.toggle('hidden')}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all duration-150 px-4 py-1.5 rounded-full backdrop-blur-md border-0"
                >
                  <span className="text-white text-sm font-medium mr-1">
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
                  <ChevronDown className="h-3.5 w-3.5 text-white opacity-70" strokeWidth={2} />
                </button>
                <div 
                  id="periodMenu"
                  className="hidden absolute right-0 mt-2 w-[170px] py-1 bg-white/90 backdrop-blur-xl rounded-xl border-0 shadow-lg overflow-hidden z-50"
                >
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-b border-gray-100">
                      Períodos
                    </div>
                    <button
                      className={`w-full px-4 py-1.5 text-left text-sm transition-colors
                        ${period === "all" ? 'bg-[#0066FF] text-white font-medium' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                      onClick={() => {
                        setPeriod("all");
                        document.getElementById('periodMenu')?.classList.add('hidden');
                      }}
                    >
                      Todo el año
                    </button>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-t border-b border-gray-100">
                      Trimestres
                    </div>
                    {["q1", "q2", "q3", "q4"].map((quarter) => (
                      <button
                        key={quarter}
                        className={`w-full px-4 py-1.5 text-left text-sm transition-colors
                          ${period === quarter ? 'bg-[#0066FF] text-white font-medium' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                        onClick={() => {
                          setPeriod(quarter);
                          document.getElementById('periodMenu')?.classList.add('hidden');
                        }}
                      >
                        {quarter === "q1" ? "1er trimestre" : 
                         quarter === "q2" ? "2º trimestre" : 
                         quarter === "q3" ? "3er trimestre" : 
                         "4º trimestre"}
                      </button>
                    ))}
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 border-t border-b border-gray-100">
                      Meses
                    </div>
                    {[
                      {id: "m1", name: "Enero"},
                      {id: "m2", name: "Febrero"},
                      {id: "m3", name: "Marzo"},
                      {id: "m4", name: "Abril"},
                      {id: "m5", name: "Mayo"},
                      {id: "m6", name: "Junio"},
                      {id: "m7", name: "Julio"},
                      {id: "m8", name: "Agosto"},
                      {id: "m9", name: "Septiembre"},
                      {id: "m10", name: "Octubre"},
                      {id: "m11", name: "Noviembre"},
                      {id: "m12", name: "Diciembre"}
                    ].map((month) => (
                      <button
                        key={month.id}
                        className={`w-full px-4 py-1.5 text-left text-sm transition-colors
                          ${period === month.id ? 'bg-[#0066FF] text-white font-medium' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                        onClick={() => {
                          setPeriod(month.id);
                          document.getElementById('periodMenu')?.classList.add('hidden');
                        }}
                      >
                        {month.name}
                      </button>
                    ))}
                  </div>
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
                  onClick={() => navigate("/transactions?tab=income")}
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
                  onClick={() => navigate("/transactions?tab=expense")}
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
                  <span className="text-neutral-500">IVA a liquidar:</span>
                  <span className="font-medium text-red-600">{new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(ivaALiquidarCorregido)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IRPF adelantado:</span>
                  <span className="font-medium text-green-600">{new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(irpfRetencionIngresos)} €</span>
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
        
        {/* Fila para presupuestos, facturas y gráficos de comparación */}
        <div className="md:col-span-3 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Columna 1: Presupuestos (más estrecho) */}
            <div className="lg:col-span-3">
              <QuotesSummary />
            </div>
            
            {/* Columna 2: Facturas (más estrecho) */}
            <div className="lg:col-span-3">
              <InvoicesSummary />
            </div>
            
            {/* Columna 3: Gráficos de Comparación (más ancha) */}
            <div className="lg:col-span-6">
              <ComparisonCharts />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
