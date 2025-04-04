import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

const ComparativeChart: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Formato para moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value / 100);
  };
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Comparativa Financiera</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Datos para el gráfico
  const chartData = [
    {
      name: "Ingresos",
      total: data.income || 0,
      iva: data.taxes?.vat || 0,
      irpf: data.taxes?.incomeTax || 0
    },
    {
      name: "Gastos",
      total: data.expenses || 0,
      iva: 0, // No hay datos de IVA soportado en la API actual
      irpf: 0
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Comparativa Financiera</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                labelStyle={{ color: '#333' }}
              />
              <Legend />
              <Bar dataKey="total" name="Total" fill="#4f46e5" />
              <Bar dataKey="iva" name="IVA" fill="#10b981" />
              <Bar dataKey="irpf" name="IRPF" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComparativeChart;