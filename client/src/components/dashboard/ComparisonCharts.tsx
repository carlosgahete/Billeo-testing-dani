import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartTooltip, Legend } from "recharts";
import { AreaChart, Area } from "recharts";
import { BarChart2, TrendingUp, Info } from "lucide-react";

// Interfaces
interface ChartData {
  name: string;
  ingresos: number;
  gastos: number;
  resultado: number;
}

interface DashboardStats {
  income: number;
  expenses: number;
  pendingInvoices: number;
  pendingCount: number;
  [key: string]: any;
}

// Componente principal
const ComparisonCharts = () => {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [chartType, setChartType] = useState("bar");
  const [comparisonType, setComparisonType] = useState("quarterly");
  
  // Datos para los gráficos - Año completo
  const { data, isLoading } = useQuery<DashboardStats>({
    // Incluimos comparisonType en la queryKey para que se recargue cuando cambie
    queryKey: ["/api/stats/dashboard-fix", { year: selectedYear, period: "all", comparisonType }],
    queryFn: async () => {
      const res = await fetch(`/api/stats/dashboard-fix?year=${selectedYear}&period=all`);
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      
      // Si estamos en modo trimestral, cargamos los datos de cada trimestre
      const data = await res.json();
      
      if (comparisonType === "quarterly") {
        // Hacemos consultas paralelas para cada trimestre usando el endpoint correcto
        // Cambiamos a usar el endpoint -fix que tiene la lógica corregida
        const [q1Data, q2Data, q3Data, q4Data] = await Promise.all([
          fetch(`/api/stats/dashboard-fix?year=${selectedYear}&period=Q1`).then(r => r.ok ? r.json() : null),
          fetch(`/api/stats/dashboard-fix?year=${selectedYear}&period=Q2`).then(r => r.ok ? r.json() : null),
          fetch(`/api/stats/dashboard-fix?year=${selectedYear}&period=Q3`).then(r => r.ok ? r.json() : null),
          fetch(`/api/stats/dashboard-fix?year=${selectedYear}&period=Q4`).then(r => r.ok ? r.json() : null)
        ]);
        
        // Añadimos los datos trimestrales al resultado
        data.quarterData = {
          q1: q1Data,
          q2: q2Data,
          q3: q3Data,
          q4: q4Data
        };
      }
      
      return data;
    }
  });
  
  // Formateador de moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Generar datos basados en los datos reales por trimestre
  const generateQuarterlyData = (): ChartData[] => {
    // Usar los datos del trimestre recibido de la API
    const quarterData = data?.quarterData || {};
    
    // Extraer los datos de cada trimestre
    const q1Data = quarterData.q1 || {};
    const q2Data = quarterData.q2 || {};
    const q3Data = quarterData.q3 || {};
    const q4Data = quarterData.q4 || {};
    
    // Crear un array con los datos reales de cada trimestre
    const result = [
      { 
        name: "Q1", 
        ingresos: q1Data.income || 0,
        gastos: q1Data.expenses || 0,
        resultado: (q1Data.income || 0) - (q1Data.expenses || 0)
      },
      { 
        name: "Q2", 
        ingresos: q2Data.income || 0,
        gastos: q2Data.expenses || 0,
        resultado: (q2Data.income || 0) - (q2Data.expenses || 0)
      },
      { 
        name: "Q3", 
        ingresos: q3Data.income || 0,
        gastos: q3Data.expenses || 0,
        resultado: (q3Data.income || 0) - (q3Data.expenses || 0)
      },
      { 
        name: "Q4", 
        ingresos: q4Data.income || 0,
        gastos: q4Data.expenses || 0,
        resultado: (q4Data.income || 0) - (q4Data.expenses || 0)
      }
    ];
    
    console.log("Quarterly data for financial comparison (net values):", {
      Q1: { Ingresos: result[0].ingresos, Gastos: result[0].gastos, Resultado: result[0].resultado },
      Q2: { Ingresos: result[1].ingresos, Gastos: result[1].gastos, Resultado: result[1].resultado },
      Q3: { Ingresos: result[2].ingresos, Gastos: result[2].gastos, Resultado: result[2].resultado },
      Q4: { Ingresos: result[3].ingresos, Gastos: result[3].gastos, Resultado: result[3].resultado }
    });
    
    return result;
  };
  
  const generateYearlyData = (): ChartData[] => {
    // Usar los datos reales del año actual
    const currentYearData = data || {};
    
    // Extraer los valores reales del año seleccionado
    const incomeBase = currentYearData.income || 0;
    const expensesBase = currentYearData.expenses || 0;
    const resultado = incomeBase - expensesBase;
    
    // Usamos datos reales para el año seleccionado y ceros para los demás (demo)
    return [
      { 
        name: "2023", 
        ingresos: selectedYear === "2023" ? incomeBase : 0, 
        gastos: selectedYear === "2023" ? expensesBase : 0, 
        resultado: selectedYear === "2023" ? resultado : 0
      },
      { 
        name: "2024", 
        ingresos: selectedYear === "2024" ? incomeBase : 0, 
        gastos: selectedYear === "2024" ? expensesBase : 0, 
        resultado: selectedYear === "2024" ? resultado : 0
      },
      { 
        name: "2025", 
        ingresos: selectedYear === "2025" ? incomeBase : 0, 
        gastos: selectedYear === "2025" ? expensesBase : 0, 
        resultado: selectedYear === "2025" ? resultado : 0
      },
    ];
  };
  
  // Seleccionar el conjunto de datos según el tipo de comparación
  const [chartData, setChartData] = useState<ChartData[]>([]);
  
  // Actualizamos los datos cuando cambian los filtros
  useEffect(() => {
    const newData = comparisonType === "quarterly" 
      ? generateQuarterlyData() 
      : generateYearlyData();
    
    setChartData(newData);
  }, [comparisonType, selectedYear, data]);
  
  return (
    <Card className="h-full">
      <CardHeader className="bg-purple-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-purple-700 flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            Comparativa Financiera
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">Visualiza y compara tus resultados financieros por trimestres o años</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Controles del gráfico */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Select value={comparisonType} onValueChange={setComparisonType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Comparar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
          
          <Tabs defaultValue="bar" className="w-[180px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bar" onClick={() => setChartType("bar")}>Barras</TabsTrigger>
              <TabsTrigger value="area" onClick={() => setChartType("area")}>Área</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Área del gráfico */}
        <div className="h-[180px] mt-2">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : chartType === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis 
                  tickFormatter={(value) => `${value > 1000 ? `${value/1000}k` : value}€`}
                  width={40}
                />
                <RechartTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => comparisonType === "quarterly" ? `Trimestre ${label}` : `Año ${label}`}
                />
                <Legend verticalAlign="bottom" height={25} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resultado" name="Resultado" fill="#9333ea" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis 
                  tickFormatter={(value) => `${value > 1000 ? `${value/1000}k` : value}€`}
                  width={40}
                />
                <RechartTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => comparisonType === "quarterly" ? `Trimestre ${label}` : `Año ${label}`}
                />
                <Legend verticalAlign="bottom" height={25} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" fill="#4ade80" fillOpacity={0.3} stroke="#4ade80" />
                <Area type="monotone" dataKey="gastos" name="Gastos" fill="#f87171" fillOpacity={0.3} stroke="#f87171" />
                <Area type="monotone" dataKey="resultado" name="Resultado" fill="#9333ea" fillOpacity={0.3} stroke="#9333ea" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Resumen de tendencia */}
        <div className="mt-3 bg-slate-50 rounded-md p-2 border border-slate-200">
          <h3 className="text-sm font-medium flex items-center text-slate-700">
            <TrendingUp className="h-4 w-4 mr-1 text-purple-500" />
            Análisis de tendencia
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            {comparisonType === "quarterly" 
              ? `Ingresos: ${formatCurrency(data?.income || 0)} | Gastos: ${formatCurrency(data?.expenses || 0)} | Resultado: ${formatCurrency((data?.income || 0) - (data?.expenses || 0))}`
              : `En ${selectedYear} los ingresos totales ascienden a ${formatCurrency(data?.income || 0)} con un resultado neto de ${formatCurrency((data?.income || 0) - (data?.expenses || 0))}.`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonCharts;