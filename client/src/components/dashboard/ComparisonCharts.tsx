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

// Componente principal
const ComparisonCharts = () => {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [chartType, setChartType] = useState("bar");
  const [comparisonType, setComparisonType] = useState("quarterly");
  
  // Datos para los gráficos
  const { data, isLoading } = useQuery({
    queryKey: ["/api/stats/dashboard"],
  });
  
  // Formateador de moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Generar datos de ejemplo para los gráficos
  const generateQuarterlyData = (): ChartData[] => {
    // En un caso real, esto vendría de la API
    return [
      { name: "Q1", ingresos: 1200, gastos: 800, resultado: 400 },
      { name: "Q2", ingresos: 1800, gastos: 1000, resultado: 800 },
      { name: "Q3", ingresos: 1500, gastos: 900, resultado: 600 },
      { name: "Q4", ingresos: 2200, gastos: 1200, resultado: 1000 },
    ];
  };
  
  const generateYearlyData = (): ChartData[] => {
    // En un caso real, esto vendría de la API
    return [
      { name: "2023", ingresos: 5000, gastos: 3000, resultado: 2000 },
      { name: "2024", ingresos: 7000, gastos: 4000, resultado: 3000 },
      { name: "2025", ingresos: 9000, gastos: 5000, resultado: 4000 },
    ];
  };
  
  // Seleccionar el conjunto de datos según el tipo de comparación
  const chartData = comparisonType === "quarterly" 
    ? generateQuarterlyData() 
    : generateYearlyData();
  
  return (
    <Card className="h-full">
      <CardHeader className="bg-indigo-50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-indigo-700 flex items-center">
            <BarChart2 className="mr-2 h-5 w-5" />
            Comparativa Financiera
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Info className="h-4 w-4 text-neutral-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
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
        <div className="h-64 mt-2">
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
                />
                <RechartTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => comparisonType === "quarterly" ? `Trimestre ${label}` : `Año ${label}`}
                />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resultado" name="Resultado" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis 
                  tickFormatter={(value) => `${value > 1000 ? `${value/1000}k` : value}€`}
                />
                <RechartTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => comparisonType === "quarterly" ? `Trimestre ${label}` : `Año ${label}`}
                />
                <Legend />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" fill="#4ade80" fillOpacity={0.3} stroke="#4ade80" />
                <Area type="monotone" dataKey="gastos" name="Gastos" fill="#f87171" fillOpacity={0.3} stroke="#f87171" />
                <Area type="monotone" dataKey="resultado" name="Resultado" fill="#60a5fa" fillOpacity={0.3} stroke="#60a5fa" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Resumen de tendencia */}
        <div className="mt-3 bg-slate-50 rounded-md p-3 border border-slate-200">
          <h3 className="text-sm font-medium flex items-center text-slate-700">
            <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
            Análisis de tendencia
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            {comparisonType === "quarterly" 
              ? "Los ingresos muestran una tendencia al alza en el último trimestre, con un aumento del resultado del 15% respecto al trimestre anterior."
              : "Crecimiento sostenido year-over-year con un aumento del resultado del 33% en 2025 respecto a 2024."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparisonCharts;