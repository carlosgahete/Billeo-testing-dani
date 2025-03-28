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
  AlertTriangle
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
import { PageTitle } from "@/components/ui/page-title";

const Dashboard = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  
  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
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
  const netProfit = Number((balanceTotal - ivaNeto - irpfToPay).toFixed(2));
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-4 gap-2">
        {/* Primera columna: Tarjeta de Ingresos con facturas pendientes debajo */}
        <div className="md:col-span-1 space-y-2">
          {/* Tarjeta de Ingresos */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-primary-700 flex items-center">
                  <ArrowUpFromLine className="mr-2 h-5 w-5" />
                  Ingresos
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">Dinero que entra en tu cuenta como resultado de tu actividad profesional</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-2xl font-bold text-primary-600">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(financialData.income.total)} €
              </p>
              
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Base imponible:</span>
                  <span className="font-medium">{financialData.income.totalWithoutVAT.toLocaleString('es-ES')} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">IVA repercutido:</span>
                  <span className="font-medium">{financialData.income.ivaRepercutido.toLocaleString('es-ES')} €</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Facturas pendientes */}
          <Card className="border border-warning-100 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="p-1 mr-2 rounded-md bg-warning-50 text-warning-700">
                  <Receipt size={18} />
                </div>
                <p className="text-neutral-600 text-sm font-medium">Facturas pendientes</p>
              </div>
              <p className="text-lg font-bold text-neutral-800 mt-1">
                {new Intl.NumberFormat('es-ES', { 
                  style: 'currency',
                  currency: 'EUR',
                }).format(stats?.pendingInvoices || 0)}
              </p>
              {(stats?.pendingCount || 0) > 0 && (
                <p className="text-xs text-warning-700 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {`${stats?.pendingCount || 0} facturas por cobrar`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Segunda columna: Tarjeta de Gastos con retenciones debajo */}
        <div className="md:col-span-1 space-y-2">
          {/* Tarjeta de Gastos */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-red-50 p-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-red-700 flex items-center">
                  <ArrowDownToLine className="mr-2 h-5 w-5" />
                  Gastos
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                        <Info className="h-4 w-4 text-neutral-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
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
            </CardContent>
          </Card>
          
          {/* Retenciones */}
          <Card className="border border-warning-100 hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="p-1 mr-2 rounded-md bg-warning-50 text-warning-700">
                  <AlertTriangle size={18} />
                </div>
                <p className="text-neutral-600 text-sm font-medium">Retenciones</p>
              </div>
              <p className="text-lg font-bold text-neutral-800 mt-1">
                {new Intl.NumberFormat('es-ES', { 
                  style: 'currency',
                  currency: 'EUR',
                }).format(stats?.totalWithholdings || 0)}
              </p>
              {(stats?.totalWithholdings || 0) > 0 && (
                <p className="text-xs text-warning-700 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  IRPF y otras
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Tarjeta de Resultado */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-neutral-50 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-neutral-700 flex items-center">
                <PiggyBank className="mr-2 h-5 w-5" />
                Resultado
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <Info className="h-4 w-4 text-neutral-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">La diferencia entre tus ingresos y tus gastos, incluyendo retenciones</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div>
              <p className="text-3xl font-bold text-neutral-900">
                {new Intl.NumberFormat('es-ES', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }).format(stats?.result || financialData.balance.netProfit || 0)} €
              </p>
              <div className="flex items-center gap-1 mt-1 text-sm">
                <span className={isPositiveMargin ? "text-primary-600" : "text-red-600"}>
                  {isPositiveMargin ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                  {profitMargin}% de margen
                </span>
              </div>
            </div>
            
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Ingresos totales:</span>
                <span className="font-medium">{financialData.income.total.toLocaleString('es-ES')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Gastos totales:</span>
                <span className="font-medium">-{financialData.expenses.total.toLocaleString('es-ES')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Retenciones:</span>
                <span className="font-medium">-{(stats?.totalWithholdings || 0).toLocaleString('es-ES')} €</span>
              </div>
            </div>
            
            <Button 
              variant="default"
              size="sm" 
              className="w-full mt-4"
              onClick={() => navigate("/reports")}
            >
              Ver informes detallados
            </Button>
          </CardContent>
        </Card>
        
        {/* Resumen de impuestos */}
        <div>
          <TaxSummary />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
