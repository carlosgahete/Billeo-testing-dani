import { useQuery } from "@tanstack/react-query";
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Calculator, 
  Receipt, 
  ArrowDownRight, 
  FileBarChart2, 
  BarChart3, 
  FileCheck, 
  CalendarClock, 
  Percent, 
  LightbulbIcon, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw 
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// Componentes para gráficos
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";

// Función auxiliar para formatear moneda
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Colores para los gráficos
const COLORS = [
  "#2563EB", // Azul (primario)
  "#16A34A", // Verde
  "#DC2626", // Rojo
  "#CA8A04", // Amarillo
  "#7C3AED", // Púrpura
  "#0EA5E9", // Azul claro
  "#D97706", // Naranja
  "#4F46E5", // Índigo
];

// Componente principal
const AnalyticsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("financial");
  const [timeFrame, setTimeFrame] = useState("yearly");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Obtener datos del dashboard para los análisis con actualización en tiempo real
  const {
    data: dashboardStats,
    isLoading,
    error,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["/api/stats/dashboard"],
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refrescar cada 5 segundos
    staleTime: 1000, // Los datos se consideran obsoletos después de 1 segundo
  });

  // Consultar facturas para análisis con actualización en tiempo real
  const {
    data: invoices = [],
    isLoading: isLoadingInvoices,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ["/api/invoices"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refrescar cada 5 segundos
    staleTime: 1000, // Los datos se consideran obsoletos después de 1 segundo
  });

  // Consultar presupuestos para análisis con actualización en tiempo real
  const {
    data: quotes = [],
    isLoading: isLoadingQuotes,
    refetch: refetchQuotes, 
  } = useQuery({
    queryKey: ["/api/quotes"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refrescar cada 5 segundos
    staleTime: 1000, // Los datos se consideran obsoletos después de 1 segundo
  });

  // Consultar transacciones para análisis con actualización en tiempo real
  const {
    data: transactions = [],
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["/api/transactions"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refrescar cada 5 segundos
    staleTime: 1000, // Los datos se consideran obsoletos después de 1 segundo
  });
  
  // Efecto para forzar actualización manual de todos los datos al cambiar de pestaña
  useEffect(() => {
    const refreshAllData = () => {
      refetchDashboard();
      refetchInvoices();
      refetchQuotes();
      refetchTransactions();
      setLastUpdate(new Date()); // Actualizar la marca de tiempo
    };
    
    // Refrescar datos cuando cambie la pestaña activa
    refreshAllData();
    
    // También configuramos un intervalo para refrescar los datos regularmente
    const refreshInterval = setInterval(refreshAllData, 10000); // Cada 10 segundos
    
    return () => {
      clearInterval(refreshInterval); // Limpiar intervalo al desmontar
    };
  }, [activeTab, timeFrame, refetchDashboard, refetchInvoices, refetchQuotes, refetchTransactions]);

  // Mostrar mensaje de error si hay algún problema
  useEffect(() => {
    if (error) {
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar los datos para el análisis.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Función para obtener datos de ingresos mensuales (histórico)
  const getMonthlyIncomeData = () => {
    // Agrupar facturas por mes
    const monthlyData: Record<string, number> = {};
    const currentYear = new Date().getFullYear();
    
    // Inicializar con todos los meses en 0 para el año actual
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${(i + 1).toString().padStart(2, "0")}`;
      monthlyData[monthKey] = 0;
    }
    
    // Sumar los importes de facturas por mes
    invoices.forEach((invoice: any) => {
      if (invoice.status === "paid") {
        const date = new Date(invoice.issueDate);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth() + 1;
          const monthKey = `${currentYear}-${month.toString().padStart(2, "0")}`;
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(invoice.total);
        }
      }
    });
    
    // Convertir a formato para gráficos
    return Object.entries(monthlyData).map(([month, amount]) => {
      const [year, monthNum] = month.split("-");
      const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      return {
        month: monthNames[parseInt(monthNum) - 1],
        ingresos: amount,
      };
    });
  };

  // Función para obtener datos de ratio conversión presupuestos/facturas
  const getConversionRateData = () => {
    const acceptedQuotes = quotes.filter((quote: any) => quote.status === "accepted").length;
    const totalQuotes = quotes.length;
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;
    
    return [
      { name: "Aceptados", value: acceptedQuotes },
      { name: "No convertidos", value: totalQuotes - acceptedQuotes },
    ];
  };

  // Función para obtener datos de comparación de ingresos y gastos por mes
  const getIncomeExpenseComparisonData = () => {
    const monthlyData: Record<string, { month: string, ingresos: number, gastos: number }> = {};
    const currentYear = new Date().getFullYear();
    
    // Inicializar con todos los meses en 0 para el año actual
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    for (let i = 0; i < 12; i++) {
      const monthKey = `${currentYear}-${(i + 1).toString().padStart(2, "0")}`;
      monthlyData[monthKey] = {
        month: monthNames[i],
        ingresos: 0,
        gastos: 0
      };
    }
    
    // Sumar los importes de facturas por mes (ingresos)
    invoices.forEach((invoice: any) => {
      if (invoice.status === "paid") {
        const date = new Date(invoice.issueDate);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth() + 1;
          const monthKey = `${currentYear}-${month.toString().padStart(2, "0")}`;
          monthlyData[monthKey].ingresos += Number(invoice.total);
        }
      }
    });
    
    // Sumar las transacciones de gastos por mes
    transactions
      .filter((tx: any) => tx.type === "expense")
      .forEach((transaction: any) => {
        const date = new Date(transaction.date);
        if (date.getFullYear() === currentYear) {
          const month = date.getMonth() + 1;
          const monthKey = `${currentYear}-${month.toString().padStart(2, "0")}`;
          monthlyData[monthKey].gastos += Number(transaction.amount);
        }
      });
    
    // Convertir a formato para gráficos
    return Object.values(monthlyData);
  };
  
  // Función para obtener datos de distribución de gastos por categoría (mantenida por compatibilidad)
  const getExpensesByCategory = () => {
    const categoryMap: Record<string, number> = {};
    
    // Agrupar transacciones de gastos por categoría
    transactions
      .filter((tx: any) => tx.type === "expense")
      .forEach((transaction: any) => {
        const categoryName = transaction.categoryId 
          ? transaction.categoryName || "Sin categoría" 
          : "Sin categoría";
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + Number(transaction.amount);
      });
    
    // Convertir a formato para gráficos
    return Object.entries(categoryMap).map(([category, amount]) => ({
      name: category,
      value: amount,
    }));
  };

  // Función para obtener datos de impuestos
  const getTaxData = () => {
    if (!dashboardStats) return null;
    
    return [
      { name: "IVA repercutido", value: dashboardStats.taxes?.vat || dashboardStats.taxes?.ivaALiquidar || 0 },
      { name: "IVA soportado", value: dashboardStats.taxes?.ivaSoportado || 0 },
      { name: "IVA a liquidar", value: dashboardStats.taxes?.ivaALiquidar || dashboardStats.taxes?.vat || 0 },
      { name: "IRPF retenido", value: dashboardStats.irpfRetenidoIngresos || 0 },
      { name: "IRPF a pagar", value: dashboardStats.taxes?.incomeTax || 0 },
    ];
  };
  
  // Función para obtener desglose detallado de impuestos IRPF
  const getIRPFBreakdownData = () => {
    if (!dashboardStats) return [];
    
    return [
      { 
        name: "IRPF Retenido", 
        value: dashboardStats.irpfRetenidoIngresos || 0,
        fill: "#4F46E5"  // Azul índigo
      },
      { 
        name: "IRPF a Pagar", 
        value: dashboardStats.taxes?.incomeTax || 0,
        fill: "#7C3AED"  // Púrpura
      }
    ];
  };
  
  // Función para obtener desglose de IVA
  const getIVABreakdownData = () => {
    if (!dashboardStats) return [];
    
    return [
      { 
        name: "IVA Repercutido", 
        value: dashboardStats.ivaRepercutido || 0,
        fill: "#2563EB"  // Azul primario
      },
      { 
        name: "IVA Soportado", 
        value: dashboardStats.ivaSoportado || 0,
        fill: "#16A34A"  // Verde
      },
      { 
        name: "IVA a Liquidar", 
        value: dashboardStats.taxes?.ivaALiquidar || dashboardStats.taxes?.vat || 0,
        fill: "#CA8A04"  // Amarillo
      }
    ];
  };

  // Componente de renderizado de tooltip personalizado para gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-semibold text-gray-800">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Renderizado condicional de carga
  if (isLoading || isLoadingInvoices || isLoadingQuotes || isLoadingTransactions) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analítica</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Datos para KPIs y estadísticas
  const statsData = {
    ingresos: dashboardStats?.income || 0,
    gastos: dashboardStats?.expenses || 0,
    beneficio: (dashboardStats?.income || 0) - (dashboardStats?.expenses || 0),
    facturasPendientes: dashboardStats?.pendingInvoices || 0,
    conversionRate: getConversionRateData()[0].value / (quotes.length || 1) * 100,
    margenBeneficio: dashboardStats?.income ? 
      ((dashboardStats.income - dashboardStats.expenses) / dashboardStats.income * 100) : 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-8 fade-in">
      {/* Cabecera estilo Apple */}
      <div className="mb-6 fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-800 tracking-tight">
              Analítica Empresarial
            </h1>
            <p className="text-gray-500 text-sm mt-1 flex items-center">
              <span className="flex items-center mr-3">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Actualización en tiempo real
              </span>
              <span className="text-gray-400">Última actualización: {lastUpdate.toLocaleTimeString()}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Select
              value={timeFrame}
              onValueChange={setTimeFrame}
            >
              <SelectTrigger className="bg-[#F5F5F7] border-none text-gray-800 rounded-full hover:bg-[#EBEBED] transition-colors">
                <Calendar className="h-4 w-4 mr-2 text-gray-600" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Periodo</SelectLabel>
                  <SelectItem value="yearly">Anual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tarjetas de KPIs - Estilo Apple */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI 1: Ingresos */}
        <div className="dashboard-card fade-in scale-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#E8F5EE] p-3 rounded-full mr-3">
                <TrendingUp className="h-5 w-5 text-[#34C759]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Ingresos</h3>
                <p className="text-sm text-gray-500">Total período</p>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="text-3xl font-medium text-[#34C759] pt-2">
                {formatCurrency(statsData.ingresos)}
              </div>
            </div>
            
            <div className="mt-4 bg-[#F7FFF9] p-3 rounded-xl border border-[#E3FFE9]">
              <p className="text-sm text-gray-600 flex items-center">
                <span className="inline-block bg-[#34C759] p-1 rounded-full mr-1.5">
                  <ChevronUp className="h-3 w-3 text-white" />
                </span>
                <span>Facturas emitidas en período actual</span>
              </p>
            </div>
          </div>
        </div>

        {/* KPI 2: Gastos */}
        <div className="dashboard-card fade-in scale-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#FEF2F2] p-3 rounded-full mr-3">
                <TrendingDown className="h-5 w-5 text-[#FF3B30]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Gastos</h3>
                <p className="text-sm text-gray-500">Total período</p>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="text-3xl font-medium text-[#FF3B30] pt-2">
                {formatCurrency(statsData.gastos)}
              </div>
            </div>
            
            <div className="mt-4 bg-[#FFF5F5] p-3 rounded-xl border border-[#FFE5E5]">
              <p className="text-sm text-gray-600 flex items-center">
                <span className="inline-block bg-[#FF3B30] p-1 rounded-full mr-1.5">
                  <ChevronDown className="h-3 w-3 text-white" />
                </span>
                <span>Gastos registrados en período actual</span>
              </p>
            </div>
          </div>
        </div>

        {/* KPI 3: Beneficio Neto */}
        <div className="dashboard-card fade-in scale-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#EEF6FF] p-3 rounded-full mr-3">
                <DollarSign className="h-5 w-5 text-[#007AFF]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Beneficio</h3>
                <p className="text-sm text-gray-500">Resultado neto</p>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="text-3xl font-medium text-[#007AFF] pt-2">
                {formatCurrency(statsData.beneficio)}
              </div>
            </div>
            
            <div className="mt-4 bg-[#F5F9FF] p-3 rounded-xl border border-[#E0EDFF]">
              <p className="text-sm text-gray-600 flex items-center">
                <span className="inline-block bg-[#007AFF] p-1 rounded-full mr-1.5">
                  <RefreshCw className="h-3 w-3 text-white" />
                </span>
                <span>Resultado después de gastos</span>
              </p>
            </div>
          </div>
        </div>

        {/* KPI 4: Margen de Beneficio */}
        <div className="dashboard-card fade-in scale-in">
          <div className="p-6">
            <div className="flex items-center mb-5">
              <div className="bg-[#F0F1FF] p-3 rounded-full mr-3">
                <Calculator className="h-5 w-5 text-[#5856D6]" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800">Margen</h3>
                <p className="text-sm text-gray-500">Rentabilidad</p>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="text-3xl font-medium text-[#5856D6] pt-2">
                {statsData.margenBeneficio.toFixed(1)}%
              </div>
            </div>
            
            <div className="mt-4 bg-[#F8F8FC] p-3 rounded-xl border border-[#EEEEFF]">
              <p className="text-sm text-gray-600 flex items-center">
                <span className="inline-block bg-[#5856D6] p-1 rounded-full mr-1.5">
                  <Percent className="h-3 w-3 text-white" />
                </span>
                <span>Beneficio respecto a ingresos</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas para diferentes vistas analíticas - Estilo Apple */}
      <div className="mb-6 mt-10 fade-in">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-medium text-gray-800 tracking-tight">Análisis detallado</h2>
            <TabsList className="bg-[#F5F5F7] p-1 rounded-full border-none">
              <TabsTrigger 
                value="financial" 
                className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm transition-all"
              >
                <LineChart className="h-4 w-4 mr-2" />
                Financiera
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm transition-all"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendario
              </TabsTrigger>
              <TabsTrigger 
                value="taxes" 
                className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm transition-all"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Impuestos
              </TabsTrigger>
            </TabsList>
          </div>

        {/* Contenido de pestaña: Análisis Financiero */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de tendencias de ingresos mensuales */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ingresos</CardTitle>
                <CardDescription>Evolución de ingresos mensuales</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={getMonthlyIncomeData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k€`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      name="Ingresos"
                      stroke="#2563EB"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de comparación de ingresos vs gastos por mes */}
            <Card>
              <CardHeader>
                <CardTitle>Comparativa Ingresos vs Gastos</CardTitle>
                <CardDescription>Evolución mensual</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={getIncomeExpenseComparisonData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k€`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#16A34A" />
                    <Bar dataKey="gastos" name="Gastos" fill="#DC2626" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="px-6 pb-4">
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Análisis: </span>
                    Esta comparativa te ayuda a visualizar la relación entre ingresos y gastos a lo largo del año, 
                    identificando puntos críticos donde puedes necesitar ajustar tu estrategia financiera.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Contenido de pestaña: Análisis de Negocio */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de tasa de conversión de presupuestos */}
            <Card>
              <CardHeader>
                <CardTitle>Conversión de Presupuestos</CardTitle>
                <CardDescription>Presupuestos aceptados vs. total</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={getConversionRateData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      <Cell fill="#2563EB" />
                      <Cell fill="#E5E7EB" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="px-6 pb-6">
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Ratio de conversión: </span>
                    {statsData.conversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </Card>

            {/* Calendario fiscal con próximos vencimientos */}
            <Card>
              <CardHeader>
                <CardTitle>Calendario Fiscal</CardTitle>
                <CardDescription>Próximos vencimientos y obligaciones</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="space-y-5">
                  <div className="relative">
                    <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    <div className="ml-6 space-y-6">
                      <div className="relative">
                        <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-blue-700">IVA Trimestral</p>
                            <span className="text-xs font-medium text-white bg-blue-600 px-2 py-1 rounded-full">
                              20 abr
                            </span>
                          </div>
                          <p className="text-sm text-blue-800">
                            Modelo 303 - Autoliquidación del IVA correspondiente al 1er trimestre del 2025
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white"></div>
                        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-indigo-700">Pago IRPF</p>
                            <span className="text-xs font-medium text-white bg-indigo-600 px-2 py-1 rounded-full">
                              20 abr
                            </span>
                          </div>
                          <p className="text-sm text-indigo-800">
                            Modelo 130 - Pago fraccionado IRPF por actividades económicas
                          </p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute -left-6 mt-1 w-4 h-4 rounded-full bg-purple-500 border-2 border-white"></div>
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-1">
                            <p className="font-semibold text-purple-700">Declaración anual</p>
                            <span className="text-xs font-medium text-white bg-purple-600 px-2 py-1 rounded-full">
                              30 jun
                            </span>
                          </div>
                          <p className="text-sm text-purple-800">
                            Declaración de la Renta 2024 - Periodo voluntario hasta 30 de junio
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contenido de pestaña: Análisis de Impuestos */}
        <TabsContent value="taxes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel de resumen de impuestos */}
            <Card className="lg:col-span-2 overflow-hidden border-0 shadow-md">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileBarChart2 className="h-5 w-5 mr-2 text-blue-600" />
                  Panel Fiscal
                </CardTitle>
                <CardDescription>
                  Resumen de impuestos y obligaciones fiscales
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* IVA a Liquidar */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="bg-blue-200 rounded-full p-2">
                        <Calculator className="h-5 w-5 text-blue-700" />
                      </div>
                      <h3 className="font-medium text-blue-700">IVA a Liquidar</h3>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      {formatCurrency(dashboardStats?.taxes?.ivaALiquidar || dashboardStats?.taxes?.vat || dashboardStats?.taxStats?.ivaLiquidar || 0)}
                    </div>
                    <div className="mt-1 text-xs text-blue-600">
                      Próximo vencimiento: 20 de abril
                    </div>
                  </div>
                  
                  {/* IRPF Estimado */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="bg-purple-200 rounded-full p-2">
                        <Percent className="h-5 w-5 text-purple-700" />
                      </div>
                      <h3 className="font-medium text-purple-700">IRPF Estimado</h3>
                    </div>
                    <div className="text-2xl font-bold text-purple-800">
                      {formatCurrency(dashboardStats?.taxes?.incomeTax || dashboardStats?.taxStats?.irpfPagar || 0)}
                    </div>
                    <div className="mt-1 text-xs text-purple-600">
                      Retenciones acumuladas: {formatCurrency(dashboardStats?.irpfRetenidoIngresos || dashboardStats?.taxStats?.irpfRetenido || 0)}
                    </div>
                  </div>
                  
                  {/* Bases Imponibles */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="bg-green-200 rounded-full p-2">
                        <FileCheck className="h-5 w-5 text-green-700" />
                      </div>
                      <h3 className="font-medium text-green-700">Base Imponible</h3>
                    </div>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(dashboardStats?.baseImponible || (dashboardStats?.income || 0) - (dashboardStats?.expenses || 0))}
                    </div>
                    <div className="mt-1 text-xs text-green-600">
                      Margen: {((dashboardStats?.income ? (dashboardStats.income - (dashboardStats.expenses || 0)) / dashboardStats.income * 100 : 0)).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Gráfico de desglose de IVA */}
            <Card>
              <CardHeader>
                <CardTitle>Desglose de IVA</CardTitle>
                <CardDescription>Análisis del IVA repercutido, soportado y a liquidar</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={getIVABreakdownData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    barSize={60}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k€`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Importe" fill="#2563EB">
                      {getIVABreakdownData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="px-6 pb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-700 mb-1">Información sobre el IVA</h4>
                      <p className="text-sm text-blue-600">
                        El IVA a liquidar es la diferencia entre el IVA repercutido (cobrado en facturas) 
                        y el IVA soportado (pagado en gastos). Este es el importe a ingresar en Hacienda trimestralmente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Gráfico de IRPF */}
            <Card>
              <CardHeader>
                <CardTitle>Análisis IRPF</CardTitle>
                <CardDescription>Estimación de retenciones y pagos</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={getIRPFBreakdownData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getIRPFBreakdownData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
              <div className="px-6 pb-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <LightbulbIcon className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-indigo-700 mb-1">Información sobre el IRPF</h4>
                      <p className="text-sm text-indigo-600">
                        Como autónomo, debes realizar pagos trimestrales a cuenta del IRPF (mod. 130/131). 
                        Las retenciones que te han practicado en facturas se restan de la cuota anual.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Panel de calendario fiscal */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Calendario Tributario 2025</CardTitle>
                <CardDescription>Fechas clave para obligaciones fiscales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 1er Trimestre */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-blue-600 text-white p-2 text-center font-medium">
                      1er Trimestre
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 303 (IVA)</span>
                        <span className="font-medium">20 Abril</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 130 (IRPF)</span>
                        <span className="font-medium">20 Abril</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 111 (Retenciones)</span>
                        <span className="font-medium">20 Abril</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 2º Trimestre */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-green-600 text-white p-2 text-center font-medium">
                      2º Trimestre
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 303 (IVA)</span>
                        <span className="font-medium">20 Julio</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 130 (IRPF)</span>
                        <span className="font-medium">20 Julio</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 111 (Retenciones)</span>
                        <span className="font-medium">20 Julio</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 3er Trimestre */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-amber-600 text-white p-2 text-center font-medium">
                      3er Trimestre
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 303 (IVA)</span>
                        <span className="font-medium">20 Octubre</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 130 (IRPF)</span>
                        <span className="font-medium">20 Octubre</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Mod. 111 (Retenciones)</span>
                        <span className="font-medium">20 Octubre</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Información de última actualización */}
      <div className="text-xs text-gray-500 text-right mt-4 flex items-center justify-end">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
        <span>Última actualización: {lastUpdate.toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default AnalyticsPage;