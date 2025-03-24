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
  Info
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
  
  // Cálculos de IVA (asumiendo una tasa de IVA estándar del 21% en España)
  const ivaRate = 0.21;
  const baseIncomeWithoutVAT = Number((incomeTotal / (1 + ivaRate)).toFixed(2));
  const ivaRepercutido = Number((incomeTotal - baseIncomeWithoutVAT).toFixed(2));
  
  const baseExpensesWithoutVAT = Number((expensesTotal / (1 + ivaRate)).toFixed(2));
  const ivaSoportado = Number((expensesTotal - baseExpensesWithoutVAT).toFixed(2));
  
  // Cálculo del resultado y estimaciones de impuestos
  const balanceTotal = Number((incomeTotal - expensesTotal).toFixed(2));
  const ivaNeto = Number((ivaRepercutido - ivaSoportado).toFixed(2));
  
  // Estimación de IRPF (asumimos una retención del 15% sobre el beneficio)
  const irpfRate = 0.15;
  const irpfEstimated = Number((baseIncomeWithoutVAT * irpfRate).toFixed(2));
  
  // Beneficio neto estimado
  const netProfit = Number((balanceTotal - ivaNeto - irpfEstimated).toFixed(2));
  
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
      irpfEstimated: irpfEstimated,
      netProfit: netProfit
    }
  };

  // Cálculo de rentabilidad (con manejo seguro para división por cero)
  const profitMargin = incomeTotal > 0 
    ? ((balanceTotal / incomeTotal) * 100).toFixed(1) 
    : "0.0";
  const isPositiveMargin = balanceTotal > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Resumen Contable</h1>
          <p className="text-neutral-500">
            Visión general de tu actividad económica
          </p>
        </div>
        
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Tarjeta de Ingresos */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary-50 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-primary-700 flex items-center">
                <ArrowUpFromLine className="mr-2 h-5 w-5" />
                Ingresos
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-primary-600">{financialData.income.total.toLocaleString('es-ES')} €</p>
            
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Base imponible:</span>
                <span className="font-medium">{financialData.income.totalWithoutVAT.toLocaleString('es-ES')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA repercutido:</span>
                <span className="font-medium">{financialData.income.ivaRepercutido.toLocaleString('es-ES')} €</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => navigate("/invoices")}
            >
              Ver facturas emitidas
            </Button>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Gastos */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-red-50 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg text-red-700 flex items-center">
                <ArrowDownToLine className="mr-2 h-5 w-5" />
                Gastos
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-red-600">{financialData.expenses.total.toLocaleString('es-ES')} €</p>
            
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Base imponible:</span>
                <span className="font-medium">{financialData.expenses.totalWithoutVAT.toLocaleString('es-ES')} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">IVA soportado:</span>
                <span className="font-medium">{financialData.expenses.ivaSoportado.toLocaleString('es-ES')} €</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={() => navigate("/transactions")}
            >
              Ver gastos
            </Button>
          </CardContent>
        </Card>
        
        {/* Tarjeta de Resultado */}
        <Card className="overflow-hidden md:col-span-2">
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
                    <p className="w-[200px] text-xs">La diferencia entre tus ingresos y tus gastos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-3xl font-bold text-neutral-900">{financialData.balance.total.toLocaleString('es-ES')} €</p>
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <span className={isPositiveMargin ? "text-primary-600" : "text-red-600"}>
                    {isPositiveMargin ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
                    {profitMargin}% de margen
                  </span>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 border-t md:border-t-0 md:border-l border-dashed border-neutral-200 pt-4 md:pt-0 md:pl-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 mr-4">IVA a liquidar (trimestral):</span>
                    <span className="font-medium">{financialData.balance.ivaNeto.toLocaleString('es-ES')} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 mr-4">IRPF estimado (trimestral):</span>
                    <span className="font-medium">{financialData.balance.irpfEstimated.toLocaleString('es-ES')} €</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-100">
                    <span className="text-neutral-500 mr-4 font-medium">Beneficio neto estimado:</span>
                    <span className="font-bold">{financialData.balance.netProfit.toLocaleString('es-ES')} €</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              variant="outline"
              size="sm" 
              className="w-full mt-6"
              onClick={() => navigate("/reports")}
            >
              Ver informes detallados
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
