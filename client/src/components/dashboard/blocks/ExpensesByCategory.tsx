import React from "react";
import { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, LightbulbIcon, Laptop, MegaphoneIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface CategoryExpense {
  name: string;
  value: number;
  percent: number;
  transactions: number;
  color: string;
  icon: React.ReactNode;
}

const ExpensesByCategory: React.FC<DashboardBlockProps> = ({ data, isLoading }) => {
  // Formato para moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(value / 100);
  };
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center p-3 bg-gray-50">
          <Skeleton className="h-5 w-5 mr-2" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4">
          <Skeleton className="h-7 w-24 mb-2" />
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Datos de ejemplo para gastos por categoría
  // En un entorno real, estos datos vendrían del backend
  const categories: CategoryExpense[] = [
    {
      name: "Sin etiquetas",
      value: 3452200,
      percent: 84.52,
      transactions: 47,
      color: "#000000",
      icon: <Banknote className="h-5 w-5 text-white" />
    },
    {
      name: "Suministros",
      value: 214971,
      percent: 5.26,
      transactions: 7,
      color: "#4355b9",
      icon: <LightbulbIcon className="h-5 w-5 text-white" />
    },
    {
      name: "Software y suscripciones",
      value: 131014,
      percent: 3.21,
      transactions: 16,
      color: "#6f42c1",
      icon: <Laptop className="h-5 w-5 text-white" />
    },
    {
      name: "Marketing",
      value: 120522,
      percent: 2.95,
      transactions: 9,
      color: "#3355b9",
      icon: <MegaphoneIcon className="h-5 w-5 text-white" />
    }
  ];

  // Datos para el gráfico circular
  const chartData = categories.map(cat => ({
    name: cat.name,
    value: cat.value,
    color: cat.color
  }));

  // Calcular el total de gastos
  const totalExpenses = categories.reduce((sum, cat) => sum + cat.value, 0);

  // Año actual para el título
  const currentYear = new Date().getFullYear();

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center">
          <h3 className="text-lg font-medium">Pagos</h3>
        </div>
        <div className="text-sm text-gray-500">1 ene {currentYear} - 31 dic {currentYear}</div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Gráfico de sectores */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Lista de categorías */}
          <div className="lg:col-span-3 space-y-3">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-3" style={{ backgroundColor: category.color + '20' }}>
                    <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ backgroundColor: category.color }}>
                      {category.icon}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-gray-500">{category.transactions} transacciones</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(-category.value)}</p>
                  <p className="text-sm text-gray-500">{category.percent}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesByCategory;