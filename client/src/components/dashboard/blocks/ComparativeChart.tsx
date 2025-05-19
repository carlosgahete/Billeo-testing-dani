import React, { useState, useMemo, useCallback } from "react";
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
import { LineChart, AreaChart } from "lucide-react";

const ComparativeChart: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Formato para moneda - memoizado para evitar recreaciones en cada renderizado
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(value / 100);
  }, []);
  
  // Opciones de periodo
  const [period, setPeriod] = useState("Trimestral");
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center p-3 bg-purple-50">
          <Skeleton className="h-5 w-5 mr-2" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4">
          <div className="flex justify-between mb-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  // Datos para el gráfico - memoizados para evitar recálculos en cada renderizado
  const chartData = useMemo(() => [
    {
      name: "Q1",
      ingresos: data.income * 0.25 || 0,
      gastos: data.expenses * 0.24 || 0,
      resultado: (data.income * 0.25) - (data.expenses * 0.24) || 0
    },
    {
      name: "Q2",
      ingresos: data.income * 0.35 || 0,
      gastos: data.expenses * 0.26 || 0,
      resultado: (data.income * 0.35) - (data.expenses * 0.26) || 0
    },
    {
      name: "Q3",
      ingresos: data.income * 0.3 || 0,
      gastos: data.expenses * 0.3 || 0,
      resultado: (data.income * 0.3) - (data.expenses * 0.3) || 0
    },
    {
      name: "Q4",
      ingresos: data.income * 0.1 || 0,
      gastos: data.expenses * 0.2 || 0,
      resultado: (data.income * 0.1) - (data.expenses * 0.2) || 0
    },
  ], [data.income, data.expenses]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center p-3 bg-purple-50">
        <LineChart className="h-5 w-5 text-purple-600 mr-2" />
        <h3 className="text-lg font-medium">Comparativa Financiera</h3>
        <div className="ml-auto">
          <button className="text-gray-400 hover:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <div className="inline-flex items-center space-x-1 text-sm border rounded-md overflow-hidden">
            <button 
              className={`px-3 py-1.5 ${period === "Trimestral" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              onClick={useCallback(() => setPeriod("Trimestral"), [])}
            >
              Trimestral
            </button>
            <button 
              className={`px-3 py-1.5 ${period === "2025" ? "bg-blue-50 text-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              onClick={useCallback(() => setPeriod("2025"), [])}
            >
              2025
            </button>
          </div>
          
          <div className="inline-flex items-center space-x-1 text-sm border rounded-md overflow-hidden">
            <button 
              className="px-3 py-1.5 bg-blue-50 text-blue-600"
            >
              Barras
            </button>
            <button 
              className="px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50"
            >
              Área
            </button>
          </div>
        </div>
        
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 5,
                left: 5,
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
              <Bar dataKey="ingresos" name="Ingresos" fill="#4f46e5" />
              <Bar dataKey="gastos" name="Gastos" fill="#ef4444" />
              <Bar dataKey="resultado" name="Resultado" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="text-xs text-gray-500 text-center mt-2">
          Análisis de tendencia
        </div>
        
        <div className="flex justify-center items-center space-x-4 mt-1 text-xs text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-1"></div>
            <span>Ingresos: {formatCurrency(data.income)}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            <span>Gastos: {formatCurrency(data.expenses)}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            <span>Resultado: {formatCurrency(data.income - data.expenses)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparativeChart;