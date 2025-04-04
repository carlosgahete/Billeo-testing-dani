import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardStats } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface FinancialChartProps {
  data: DashboardStats;
  isLoading: boolean;
}

const FinancialChart: React.FC<FinancialChartProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Datos de ejemplo para la gráfica de líneas
  const chartData = [
    { name: "Ene", ingresos: 15000, gastos: 10000 },
    { name: "Feb", ingresos: 20000, gastos: 12000 },
    { name: "Mar", ingresos: 18000, gastos: 11000 },
    { name: "Abr", ingresos: 22000, gastos: 13000 },
    { name: "May", ingresos: 25000, gastos: 14000 },
    { name: "Jun", ingresos: 30000, gastos: 15000 },
    { name: "Jul", ingresos: 28000, gastos: 16000 },
    { name: "Ago", ingresos: 26000, gastos: 17000 },
    { name: "Sep", ingresos: 32000, gastos: 18000 },
    { name: "Oct", ingresos: 35000, gastos: 19000 },
    { name: "Nov", ingresos: 40000, gastos: 20000 },
    { name: "Dic", ingresos: 45000, gastos: 21000 },
  ];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Evolución Anual</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis 
                tickFormatter={(value) => 
                  new Intl.NumberFormat('es-ES', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(value)
                }
              />
              <Tooltip 
                formatter={(value: number) => 
                  new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(value)
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="#10b981"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="gastos" 
                name="Gastos"
                stroke="#ef4444" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialChart;