import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, ExternalLink, BarChart4 } from "lucide-react";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ComparativeChartProps {
  data: DashboardStats;
  isLoading: boolean;
}

const ComparativeChart: React.FC<ComparativeChartProps> = ({ data, isLoading }) => {
  const [period, setPeriod] = useState<string>("Q2");
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-purple-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-purple-700 flex items-center">
              <BarChart4 className="mr-2 h-5 w-5" />
              Comparativa Financiera
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Datos de ejemplo para la comparativa trimestral
  const chartData = [
    { name: "Q1", ingresos: 0, gastos: 0, resultado: 0 },
    { name: "Q2", ingresos: 102000, gastos: 10000, resultado: 92000 },
    { name: "Q3", ingresos: 120000, gastos: 20000, resultado: 100000 },
    { name: "Q4", ingresos: 0, gastos: 0, resultado: 0 },
  ];

  // Formatear para barras
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Análisis de tendencia para el período seleccionado
  const selectedPeriodData = chartData.find(item => item.name === period);
  const trendText = selectedPeriodData ? `Ingresos: ${formatCurrency(selectedPeriodData.ingresos)} · Gastos: ${formatCurrency(selectedPeriodData.gastos)} · Resultado: ${formatCurrency(selectedPeriodData.resultado)}` : "";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-purple-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-purple-700 flex items-center">
            <BarChart4 className="mr-2 h-5 w-5" />
            Comparativa Financiera
          </CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[100px] h-7 text-xs bg-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={{ stroke: '#e0e0e0' }} 
                tickLine={false}
              />
              <YAxis 
                axisLine={{ stroke: '#e0e0e0' }} 
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value)]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="ingresos" 
                name="Ingresos" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="gastos" 
                name="Gastos" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                dataKey="resultado" 
                name="Resultado" 
                fill="#7e22ce" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <span className="font-medium">Análisis de tendencia</span>
            <p>{trendText}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparativeChart;