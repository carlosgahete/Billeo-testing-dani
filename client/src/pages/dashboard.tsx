import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Info,
  DollarSign,
  Percent,
  Calculator
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { PageTitle } from "@/components/ui/page-title";
import { Separator } from "@/components/ui/separator";

// Componentes simplificados con estilo Apple
import SimplifiedNetIncomeCard from "@/components/dashboard/blocks/SimplifiedNetIncomeCard";
import SimplifiedNetExpensesCard from "@/components/dashboard/blocks/SimplifiedNetExpensesCard";
import SimplifiedFinalResultCard from "@/components/dashboard/blocks/SimplifiedFinalResultCard";

// Interfaces simplificadas
interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  [key: string]: any;
}

const Dashboard = () => {
  const [, navigate] = useLocation();
  const [year, setYear] = useState("2025");
  const [period, setPeriod] = useState("all");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/session"],
  });
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats/dashboard", { year, period }],
  });

  // Determinar período para mostrar en el encabezado
  const periodText = period === "all" ? "Todo el año" : 
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
    period === "m11" ? "Noviembre" : "Diciembre";

  return (
    <div className="space-y-4 min-h-screen pb-48 mb-20">
      <div className="flex flex-col gap-4 mt-4">
        <PageTitle 
          title="Dashboard Contable"
          description="Visualización estilo Apple de tus resultados financieros"
          variant="gradient"
          className="w-full"
        >
          <div className="flex justify-end items-center mt-1">
            <div className="text-white text-sm font-medium bg-white/10 px-4 py-1.5 rounded-md">
              {year} - {periodText}
            </div>
          </div>
        </PageTitle>
      </div>
      
      {/* Cards principales con efecto de vidrio y estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tarjeta de Ingresos con estilo de Apple */}
        <SimplifiedNetIncomeCard />
        
        {/* Tarjeta de Gastos con estilo de Apple */}
        <SimplifiedNetExpensesCard />
        
        {/* Tarjeta de Resultado Final con estilo de Apple */}
        <SimplifiedFinalResultCard />
      </div>
      
      {/* Título de sección de Indicadores Fiscales */}
      <div className="mt-8 mb-4">
        <h2 className="text-2xl font-semibold text-neutral-800">Indicadores Fiscales</h2>
        <Separator className="mt-2" />
      </div>
      
      {/* Indicadores fiscales en formato de tarjetas circulares */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Tarjeta de IVA Repercutido */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-[1.02]">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <DollarSign className="h-10 w-10 mb-2 opacity-80" />
            <CardTitle className="mb-1 text-xl">IVA Repercutido</CardTitle>
            <p className="text-3xl font-bold mt-3">—</p>
            <CardDescription className="text-blue-100 mt-2">Impuesto cobrado a clientes</CardDescription>
          </CardContent>
        </Card>
        
        {/* Tarjeta de IVA Soportado */}
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-[1.02]">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Calculator className="h-10 w-10 mb-2 opacity-80" />
            <CardTitle className="mb-1 text-xl">IVA Soportado</CardTitle>
            <p className="text-3xl font-bold mt-3">—</p>
            <CardDescription className="text-indigo-100 mt-2">Impuesto pagado en gastos</CardDescription>
          </CardContent>
        </Card>
        
        {/* Tarjeta de IVA a Liquidar */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-[1.02]">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Percent className="h-10 w-10 mb-2 opacity-80" />
            <CardTitle className="mb-1 text-xl">IVA a Liquidar</CardTitle>
            <p className="text-3xl font-bold mt-3">—</p>
            <CardDescription className="text-purple-100 mt-2">A pagar en declaración</CardDescription>
          </CardContent>
        </Card>
        
        {/* Tarjeta de IRPF */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-[1.02]">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <Calculator className="h-10 w-10 mb-2 opacity-80" />
            <CardTitle className="mb-1 text-xl">IRPF</CardTitle>
            <p className="text-3xl font-bold mt-3">—</p>
            <CardDescription className="text-emerald-100 mt-2">Impuesto sobre la renta</CardDescription>
          </CardContent>
        </Card>
      </div>
            
      {/* Botones de navegación con estilo Apple */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Button 
          variant="outline" 
          className="py-6 flex-col h-auto bg-gradient-to-b from-blue-50 to-blue-100 border-blue-200 hover:bg-blue-100 shadow-sm"
          onClick={() => navigate("/invoices")}
        >
          <DollarSign className="h-8 w-8 mb-2 text-blue-600" />
          <span className="text-blue-800 font-medium">Facturas</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="py-6 flex-col h-auto bg-gradient-to-b from-green-50 to-green-100 border-green-200 hover:bg-green-100 shadow-sm"
          onClick={() => navigate("/transactions?tab=income")}
        >
          <ArrowUpCircle className="h-8 w-8 mb-2 text-green-600" />
          <span className="text-green-800 font-medium">Ingresos</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="py-6 flex-col h-auto bg-gradient-to-b from-red-50 to-red-100 border-red-200 hover:bg-red-100 shadow-sm"
          onClick={() => navigate("/transactions?tab=expenses")}
        >
          <ArrowDownCircle className="h-8 w-8 mb-2 text-red-600" />
          <span className="text-red-800 font-medium">Gastos</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="py-6 flex-col h-auto bg-gradient-to-b from-purple-50 to-purple-100 border-purple-200 hover:bg-purple-100 shadow-sm"
          onClick={() => navigate("/reports")}
        >
          <Calculator className="h-8 w-8 mb-2 text-purple-600" />
          <span className="text-purple-800 font-medium">Informes</span>
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;