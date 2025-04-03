import { useQuery } from "@tanstack/react-query";
import { LineChart, BarChart, PieChart, TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, Calculator } from "lucide-react";
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
      { name: "IVA repercutido", value: dashboardStats.taxStats?.ivaRepercutido || 0 },
      { name: "IVA soportado", value: dashboardStats.taxStats?.ivaSoportado || 0 },
      { name: "IVA a liquidar", value: dashboardStats.taxStats?.ivaLiquidar || 0 },
      { name: "IRPF retenido", value: dashboardStats.taxStats?.irpfRetenido || 0 },
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
    <div className="container mx-auto py-6 space-y-8">
      {/* Cabecera con título y filtros */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-lg p-4 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white mb-3 md:mb-0">Analítica Empresarial</h1>
            <div className="ml-3 px-2 py-1 bg-white/15 rounded-full flex items-center text-xs text-white">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Actualización en tiempo real
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Select
              value={timeFrame}
              onValueChange={setTimeFrame}
            >
              <SelectTrigger className="w-32 bg-white/15 border-none text-white">
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

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI 1: Ingresos */}
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="h-2 bg-gradient-to-r from-green-500 to-green-300"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-green-700 text-lg">Ingresos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(statsData.ingresos)}
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Gastos */}
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="h-2 bg-gradient-to-r from-red-500 to-red-300"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-red-700 text-lg">Gastos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {formatCurrency(statsData.gastos)}
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Beneficio Neto */}
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-300"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-blue-700 text-lg">Beneficio</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(statsData.beneficio)}
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Margen de Beneficio */}
        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-300"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-purple-700 text-lg">Margen</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {statsData.margenBeneficio.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pestañas para diferentes vistas analíticas */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
          <TabsTrigger value="financial" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <LineChart className="h-4 w-4 mr-2" />
            Financiera
          </TabsTrigger>
          <TabsTrigger value="business" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <BarChart className="h-4 w-4 mr-2" />
            Negocio
          </TabsTrigger>
          <TabsTrigger value="taxes" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            <Calculator className="h-4 w-4 mr-2" />
            Impuestos
          </TabsTrigger>
        </TabsList>

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
        <TabsContent value="business" className="space-y-6">
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
            {/* Gráfico de estado de IVA e IRPF */}
            <Card>
              <CardHeader>
                <CardTitle>Situación Fiscal</CardTitle>
                <CardDescription>Estado de IVA e IRPF</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={getTaxData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k€`} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="value" name="Importe" fill="#2563EB" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resumen de situación fiscal */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen Fiscal</CardTitle>
                <CardDescription>IVA e IRPF a pagar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      IVA (Liquidación Trimestral)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">IVA Repercutido</p>
                        <p className="text-lg font-semibold text-blue-800">
                          {formatCurrency(dashboardStats?.taxStats?.ivaRepercutido || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">IVA Soportado</p>
                        <p className="text-lg font-semibold text-green-700">
                          {formatCurrency(dashboardStats?.taxStats?.ivaSoportado || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-blue-800">IVA a Liquidar</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(dashboardStats?.taxStats?.ivaLiquidar || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-700 mb-2 flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      IRPF (Liquidación Trimestral)
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">IRPF Facturación</p>
                        <p className="text-lg font-semibold text-purple-800">
                          {formatCurrency(dashboardStats?.taxStats?.irpfTotal || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">IRPF Retenido</p>
                        <p className="text-lg font-semibold text-green-700">
                          {formatCurrency(dashboardStats?.taxStats?.irpfRetenido || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-purple-800">IRPF a Pagar</p>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(dashboardStats?.taxStats?.irpfPagar || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notas adicionales */}
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones Fiscales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-full mr-3 mt-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Fechas clave</p>
                    <p className="text-sm text-gray-600">
                      Próxima liquidación trimestral de IVA: <span className="font-semibold">20 de abril de 2025</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-yellow-100 p-2 rounded-full mr-3 mt-1">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Recomendación</p>
                    <p className="text-sm text-gray-600">
                      Considera registrar más gastos deducibles para optimizar tu carga fiscal.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-green-100 p-2 rounded-full mr-3 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Previsión fiscal</p>
                    <p className="text-sm text-gray-600">
                      Con las facturas actuales, estás en el tramo del 20% del IRPF. Consulta a tu asesor fiscal para más información.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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