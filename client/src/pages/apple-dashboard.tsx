import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  Loader2, 
  ChevronDown, 
  ArrowUpRight, 
  ArrowDownRight, 
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
  CardContent
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
import { PageTitle } from "@/components/ui/page-title";
import { formatCurrency } from "@/lib/utils";

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

// Error boundary para capturar errores en el dashboard
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Actualizar el estado para mostrar la UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Registrar el error en la consola
    console.error("Error en el componente de dashboard:", error);
  }

  render() {
    if (this.state.hasError) {
      // Renderizar UI de fallback
      return (
        <div className="p-6 bg-red-50 rounded-lg border border-red-100 text-center">
          <h3 className="text-xl font-semibold text-red-600 mb-2">
            Error al cargar el dashboard
          </h3>
          <p className="text-gray-600 mb-4">
            Ha ocurrido un error al cargar la visualización del dashboard. 
            Por favor, intenta recargar la página o contacta con soporte.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppleDashboard = () => {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Usar datos reales del sistema o valores por defecto si no hay datos
  const incomeTotal = stats?.income || 0;
  const expensesTotal = stats?.expenses || 0;
  
  // Obtener IVA e IRPF directamente de la API
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
  
  const financialData = {
    income: {
      total: totalBruto,
      ivaRepercutido: ivaRepercutidoCorregido,
      totalWithoutVAT: baseIncomeSinIVA
    },
    expenses: {
      total: totalPagado,
      ivaSoportado: ivaSoportadoCorregido,
      totalWithoutVAT: baseExpensesSinIVA
    },
    balance: {
      total: baseIncomeSinIVA - baseExpensesSinIVA,
      ivaNeto: ivaRepercutidoCorregido - ivaSoportadoCorregido,
      irpfAdelantado: irpfRetencionIngresos,
      netProfit: netProfit
    },
    taxes: {
      vat: ivaALiquidarCorregido,
      incomeTax: irpfRetencionIngresos,
      ivaALiquidar: ivaALiquidarCorregido
    }
  };

  // Cálculo de rentabilidad (con manejo seguro para división por cero)
  const profitMargin = incomeTotal > 0 
    ? ((balanceTotal / incomeTotal) * 100).toFixed(1) 
    : "0.0";
  const isPositiveMargin = balanceTotal > 0;

  return (
    <div className="container-apple">
      <div className="section-header mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        
        <div className="flex items-center gap-3">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px] select-apple">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px] select-apple">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el año</SelectItem>
              <SelectItem value="q1">Trimestre 1</SelectItem>
              <SelectItem value="q2">Trimestre 2</SelectItem>
              <SelectItem value="q3">Trimestre 3</SelectItem>
              <SelectItem value="q4">Trimestre 4</SelectItem>
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
      
      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 mt-6">
        {/* Widget de Ingresos */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Ingresos</h3>
              <div className="p-2 rounded-full bg-green-50">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
            </div>
            
            <div className="stat-value mb-3">
              {formatCurrency(financialData.income.totalWithoutVAT)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Base imponible (sin IVA)
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-900">{formatCurrency(financialData.income.totalWithoutVAT)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA repercutido (21%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(financialData.income.ivaRepercutido)}</span>
              </div>
            </div>
            
            <button 
              className="button-apple-secondary w-full"
              onClick={() => navigate("/invoices")}
            >
              Ver facturas
            </button>
          </div>
        </div>

        {/* Widget de Gastos */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Gastos</h3>
              <div className="p-2 rounded-full bg-red-50">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
            
            <div className="stat-value mb-3" style={{background: "linear-gradient(90deg, #ff3b30, #ff9500)"}}>
              {formatCurrency(financialData.expenses.totalWithoutVAT)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Base imponible (sin IVA)
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-900">{formatCurrency(financialData.expenses.totalWithoutVAT)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA soportado (21%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(financialData.expenses.ivaSoportado)}</span>
              </div>
            </div>
            
            <button 
              className="button-apple-secondary w-full"
              onClick={() => navigate("/income-expense?tab=expenses")}
            >
              Ver gastos
            </button>
          </div>
        </div>

        {/* Widget de Resultado */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Resultado Final</h3>
              <div className={`p-2 rounded-full ${isPositiveMargin ? 'bg-blue-50' : 'bg-amber-50'}`}>
                <PiggyBank className={`h-5 w-5 ${isPositiveMargin ? 'text-blue-600' : 'text-amber-600'}`} />
              </div>
            </div>
            
            <div className="stat-value mb-3" style={{background: isPositiveMargin 
              ? "linear-gradient(90deg, #007AFF, #5AC8FA)" 
              : "linear-gradient(90deg, #FF9500, #FFCC00)"}}>
              {formatCurrency(financialData.balance.total)}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              {isPositiveMargin ? 'Beneficio neto (base imponible)' : 'Pérdida neta (base imponible)'}
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible ingresos:</span>
                <span className="font-medium text-green-600">{formatCurrency(financialData.income.totalWithoutVAT)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible gastos:</span>
                <span className="font-medium text-red-600">-{formatCurrency(financialData.expenses.totalWithoutVAT)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                <span className="text-gray-700 font-medium">Resultado:</span>
                <span className={`font-bold ${isPositiveMargin ? 'text-blue-600' : 'text-amber-600'}`}>
                  {formatCurrency(financialData.balance.total)}
                </span>
              </div>
            </div>
            
            <button 
              className="button-apple-secondary w-full"
              onClick={() => navigate("/complete-dashboard")}
            >
              Ver dashboard completo
            </button>
          </div>
        </div>
      </div>
      
      {/* Impuestos y estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Resumen de IVA */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Resumen de IVA</h3>
              <div className="p-2 rounded-full bg-blue-50">
                <FileCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">IVA a liquidar ({period === 'all' ? 'Año' : 'Trimestre'} {year})</span>
                <span className="bg-blue-100 text-xs py-0.5 px-2 rounded-full text-blue-700">21% IVA</span>
              </div>
              <div className="text-2xl font-semibold mb-1 text-blue-600">
                {formatCurrency(financialData.taxes.ivaALiquidar)}
              </div>
              <div className="text-xs text-gray-500">
                {period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' 
                  ? `Modelo 303 (${period === 'q1' ? 'Ene-Mar' : period === 'q2' ? 'Abr-Jun' : period === 'q3' ? 'Jul-Sep' : 'Oct-Dic'})` 
                  : 'Resumen anual (modelo 390)'}
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA repercutido:</span>
                <span className="font-medium text-gray-900">{formatCurrency(financialData.income.ivaRepercutido)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">IVA soportado:</span>
                <span className="font-medium text-gray-900">-{formatCurrency(financialData.expenses.ivaSoportado)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">IVA a liquidar:</span>
                <span className="font-bold text-blue-600">{formatCurrency(financialData.taxes.ivaALiquidar)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resumen de IRPF */}
        <div className="dashboard-card">
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Resumen de IRPF</h3>
              <div className="p-2 rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-700">IRPF retenido ({period === 'all' ? 'Año' : 'Trimestre'} {year})</span>
                <span className="bg-amber-100 text-xs py-0.5 px-2 rounded-full text-amber-700">15% IRPF</span>
              </div>
              <div className="text-2xl font-semibold mb-1 text-amber-600">
                {formatCurrency(financialData.taxes.incomeTax)}
              </div>
              <div className="text-xs text-gray-500">
                {period === 'q1' || period === 'q2' || period === 'q3' || period === 'q4' 
                  ? `Modelo 130 (${period === 'q1' ? 'Ene-Mar' : period === 'q2' ? 'Abr-Jun' : period === 'q3' ? 'Jul-Sep' : 'Oct-Dic'})` 
                  : 'Resumen anual (modelo 190)'}
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Base imponible:</span>
                <span className="font-medium text-gray-900">{formatCurrency(financialData.balance.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Rentabilidad:</span>
                <span className={`font-medium ${isPositiveMargin ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">IRPF retenido:</span>
                <span className="font-bold text-amber-600">{formatCurrency(financialData.taxes.incomeTax)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <button 
          className="button-apple flex items-center justify-center gap-2"
          onClick={() => navigate("/income-expense")}
        >
          <Eye className="h-5 w-5" />
          Ver todos los movimientos
        </button>
        
        <button 
          className="button-apple flex items-center justify-center gap-2"
          onClick={() => navigate("/invoices")}
        >
          <FileCheck className="h-5 w-5" />
          Gestionar facturas
        </button>
        
        <button 
          className="button-apple flex items-center justify-center gap-2"
          onClick={() => navigate("/document-scan")}
        >
          <Eye className="h-5 w-5" />
          Escanear documentos
        </button>
      </div>
    </div>
  );
};

export default function DashboardWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <AppleDashboard />
    </ErrorBoundary>
  );
}