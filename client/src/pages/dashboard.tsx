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
  Receipt,
  FileText,
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
  [key: string]: any;
}

const Dashboard = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  const [docType, setDocType] = useState("invoices"); // "invoices" o "quotes"
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
    queryFn: async () => {
      const res = await fetch(`/api/stats/dashboard?year=${year}&period=${period}`);
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      return res.json();
    }
  });

  const isLoading = userLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  // Usar datos reales del sistema o valores por defecto si no hay datos
  const incomeTotal = stats?.income || 0;
  const expensesTotal = stats?.expenses || 0;
  
  // Cálculos de IVA (tasa estándar del 21% en España)
  const ivaRate = 0.21;
  const baseIncomeWithoutVAT = Number((incomeTotal / (1 + ivaRate)).toFixed(2));
  const ivaRepercutido = Number((incomeTotal - baseIncomeWithoutVAT).toFixed(2));
  
  const baseExpensesWithoutVAT = Number((expensesTotal / (1 + ivaRate)).toFixed(2));
  const ivaSoportado = Number((expensesTotal - baseExpensesWithoutVAT).toFixed(2));
  
  // Cálculo del resultado bruto
  const balanceTotal = Number((incomeTotal - expensesTotal).toFixed(2));
  const ivaNeto = Number((ivaRepercutido - ivaSoportado).toFixed(2));
  
  // Sistema de IRPF para autónomos en España
  // 1. Retención del 15% aplicada en las facturas (ya se descuenta al cobrar)
  const retentionRate = 0.15;
  const withholdings = Number((incomeTotal * retentionRate).toFixed(2));
  
  // 2. IRPF total: 20% sobre el beneficio neto
  const irpfRate = 0.20;
  const irpfTotalEstimated = Number((balanceTotal * irpfRate).toFixed(2));
  
  // 3. IRPF a pagar = Total estimado - Retenciones ya aplicadas
  const irpfToPay = Math.max(0, Number((irpfTotalEstimated - withholdings).toFixed(2)));
  
  // Beneficio neto final
  // Fórmula para el cálculo de los beneficios para autónomos en España:
  // 1. Base imponible + IVA = Total bruto (lo que facturamos)
  // 2. Base imponible - IRPF = Total neto (lo que efectivamente cobramos)
  // 3. El IVA se liquida con Hacienda (IVA repercutido - IVA soportado)
  // 4. Para los ingresos: Base imponible + IVA - IRPF = Lo que efectivamente se cobra
  // 5. Para los gastos: Base imponible + IVA = Lo que efectivamente se paga
  // 6. Beneficio neto = Lo efectivamente cobrado - Lo efectivamente pagado
  
  // Valores según las especificaciones del cliente:
  // Base imponible total: 2877€
  // IVA total (21%) = 2877 × 0.21 = 604.17€
  // IRPF total (15%) = 2877 × 0.15 = 431.55€
  // Total bruto (Base + IVA) = 2877 + 604.17 = 3481.17€
  // Total neto (Bruto - IRPF) = 3481.17 - 431.55 = 3049.62€
  
  // Cálculos basados en los datos reales del API
  const baseImponible = baseIncomeWithoutVAT; // Usar el valor real de ingresos sin IVA
  const ivaCalculado = ivaRepercutido; // Usar el IVA real calculado
  const irpfCalculado = Number((baseImponible * 0.15).toFixed(2)); // IRPF como 15% de la base imponible
  
  const totalBruto = Number((baseImponible + ivaCalculado).toFixed(2)); // Base + IVA
  const totalNeto = Number((totalBruto - irpfCalculado).toFixed(2)); // Bruto - IRPF
  const totalPagado = Number((baseExpensesWithoutVAT + ivaSoportado).toFixed(2)); // Lo que realmente pagas
  const netProfit = Number((totalNeto - totalPagado).toFixed(2)); // Beneficio neto real
  
  // Datos financieros organizados
  const financialData = {
    income: {
      total: incomeTotal,
      ivaRepercutido: ivaRepercutido,
      totalWithoutVAT: baseIncomeWithoutVAT
    },
    expenses: {
      total: expensesTotal,
      ivaSoportado: ivaSoportado,
      totalWithoutVAT: baseExpensesWithoutVAT
    },
    balance: {
      total: balanceTotal,
      ivaNeto: ivaNeto,
      irpfEstimated: irpfTotalEstimated,
      irpfToPay: irpfToPay,
      netProfit: netProfit
    }
  };

  // Cálculo de rentabilidad (con manejo seguro para división por cero)
  const profitMargin = incomeTotal > 0 
    ? ((balanceTotal / incomeTotal) * 100).toFixed(1) 
    : "0.0";
  const isPositiveMargin = balanceTotal > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
        <PageTitle 
          title="Resumen Contable"
          description="Visión general de tu actividad económica"
        />
        
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Periodo" />
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
      
      {/* Métricas principales */}
      <DashboardMetrics userId={user?.user?.id || 0} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-4 gap-2 mt-4">
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
                  <span className="text-neutral-500">Total facturado:</span>
                  <span className="font-medium">{financialData.income.total.toLocaleString('es-ES')} €</span>
                </div>
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
              
              <div className="mt-2 mb-2">
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
                  <span className="text-neutral-500">Base imponible:</span>
                  <span className="font-medium">{financialData.expenses.totalWithoutVAT.toLocaleString('es-ES')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA soportado:</span>
                  <span className="font-medium">{financialData.expenses.ivaSoportado.toLocaleString('es-ES')} €</span>
                </div>
              </div>
              
              <div className="mt-8 mb-2">
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
        
        {/* Tercera columna: Documentos Pendientes (Facturas/Presupuestos) */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col">
          <Card className="overflow-hidden flex-grow">
            <CardHeader className="bg-blue-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-blue-700 flex items-center">
                  {docType === "invoices" ? (
                    <Receipt className="mr-2 h-5 w-5" />
                  ) : (
                    <FileText className="mr-2 h-5 w-5" />
                  )}
                  {docType === "invoices" ? "Facturas pendientes" : "Presupuestos"}
                </CardTitle>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                      <p className="w-[250px] text-xs">
                        {docType === "invoices" 
                          ? "Facturas emitidas pendientes de cobro." 
                          : "Presupuestos enviados pendientes de aceptación."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="mb-3">
                <div className="flex items-center space-x-2 justify-center bg-gray-50 rounded-md p-1">
                  <Button 
                    size="sm" 
                    variant={docType === "invoices" ? "default" : "outline"} 
                    onClick={() => setDocType("invoices")}
                    className={docType === "invoices" ? "bg-blue-600" : ""}
                  >
                    <Receipt className="mr-1 h-4 w-4" />
                    Facturas
                  </Button>
                  <Button 
                    size="sm" 
                    variant={docType === "quotes" ? "default" : "outline"} 
                    onClick={() => setDocType("quotes")}
                    className={docType === "quotes" ? "bg-blue-600" : ""}
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    Presupuestos
                  </Button>
                </div>
              </div>
              
              <p className="text-2xl font-bold text-blue-600">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(docType === "invoices" ? (stats?.pendingInvoices || 0) : (stats?.pendingQuotes || 0))} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">
                    {docType === "invoices" ? "Facturas por cobrar:" : "Presupuestos pendientes:"}
                  </span>
                  <span className="font-medium">
                    {docType === "invoices" ? (stats?.pendingCount || 0) : (stats?.pendingQuotesCount || 0)}
                  </span>
                </div>
                
                {docType === "invoices" && (
                  <>
                    <div className="flex justify-between mt-1">
                      <span className="text-neutral-500">Facturas emitidas:</span>
                      <span className="font-medium">{stats?.issuedInvoices || 0}</span>
                    </div>
                  </>
                )}
                
                {docType === "quotes" && (
                  <>
                    <div className="flex justify-between mt-1">
                      <span className="text-neutral-500">Presupuestos aceptados:</span>
                      <span className="font-medium text-green-600">{stats?.acceptedQuotes || 0}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-neutral-500">Presupuestos rechazados:</span>
                      <span className="font-medium text-red-600">{stats?.rejectedQuotes || 0}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-neutral-500">Total presupuestos:</span>
                      <span className="font-medium">{stats?.allQuotes || 0}</span>
                    </div>
                    <div className="flex justify-between mt-1 pt-1 border-t border-gray-100">
                      <span className="text-neutral-500">Tasa de conversión:</span>
                      <span className="font-medium">
                        {stats?.allQuotes ? Math.round((stats?.acceptedQuotes / stats?.allQuotes) * 100) : 0}%
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-8 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={() => navigate(docType === "invoices" ? "/invoices" : "/quotes")}
                >
                  {docType === "invoices" ? "Ver facturas" : "Ver presupuestos"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Cuarta columna: Tarjeta de Resultado Final */}
        <div className="md:col-span-1 space-y-2 h-full flex flex-col">
          <Card className="overflow-hidden flex-grow">
            <CardHeader className="bg-green-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-green-700 flex items-center">
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
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(totalNeto)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Base + IVA (bruto):</span>
                  <span className="font-medium">{new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(totalBruto)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IRPF retenido:</span>
                  <span className="font-medium text-red-600">- {new Intl.NumberFormat('es-ES', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(irpfCalculado)} €</span>
                </div>
              </div>
              
              <div className="mt-8 mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => navigate("/reports")}
                >
                  Ver informes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Fila para el resumen fiscal (ocupa todo el ancho) */}
        <div className="md:col-span-4 mt-6">
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
