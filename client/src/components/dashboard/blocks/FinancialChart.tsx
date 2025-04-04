import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface FinancialChartProps {
  data: DashboardStats;
  isLoading: boolean;
}

const FinancialChart = ({ data, isLoading }: FinancialChartProps) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-teal-50 p-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-teal-700 flex items-center">
              <AreaChart className="mr-2 h-5 w-5" />
              Evolución financiera
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Datos ficticios para la demostración
  const chartData = [
    { name: "Ene", ingresos: 1500, gastos: 1000, balance: 500 },
    { name: "Feb", ingresos: 2500, gastos: 1200, balance: 1300 },
    { name: "Mar", ingresos: 2000, gastos: 1800, balance: 200 },
    { name: "Abr", ingresos: 3500, gastos: 2000, balance: 1500 },
    { name: "May", ingresos: 2800, gastos: 2100, balance: 700 },
    { name: "Jun", ingresos: 3200, gastos: 1700, balance: 1500 },
  ];

  // Función para formatear números en euros
  const formatEuros = (value: number) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-teal-50 p-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg text-teal-700 flex items-center">
            <AreaChart className="mr-2 h-5 w-5" />
            Evolución financiera
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[250px] text-xs">Evolución de ingresos, gastos y balance a lo largo del tiempo.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                axisLine={{ stroke: '#e0e0e0' }} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
              />
              <YAxis 
                axisLine={{ stroke: '#e0e0e0' }} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#666' }}
                tickFormatter={formatEuros}
              />
              <RechartsTooltip 
                formatter={(value: number) => formatEuros(value)}
                labelStyle={{ color: '#333', fontWeight: 'bold' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #f0f0f0',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line 
                type="monotone" 
                dataKey="ingresos" 
                stroke="#10b981" 
                strokeWidth={2} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="Ingresos"
              />
              <Line 
                type="monotone" 
                dataKey="gastos" 
                stroke="#ef4444" 
                strokeWidth={2} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="Gastos"
              />
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke="#3b82f6" 
                strokeWidth={2} 
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialChart;