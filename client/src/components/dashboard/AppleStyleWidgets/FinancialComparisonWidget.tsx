import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';

interface FinancialComparisonWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const FinancialComparisonWidget: React.FC<FinancialComparisonWidgetProps> = ({ data, size }) => {
  if (!data) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }
  
  // Generar datos de ejemplo para comparaciones (esto debería venir de la API real)
  const currentYear = new Date().getFullYear();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  // Datos de ejemplo para la comparación mensual
  const monthlyData = months.map((month, index) => {
    // Simular algunos datos usando el índice actual + datos reales disponibles
    const income = index < 3 ? (data.income || 0) / 4 * (Math.random() * 0.5 + 0.75) : 0;
    const expenses = index < 3 ? (data.expenses || 0) / 4 * (Math.random() * 0.5 + 0.75) : 0;
    const profit = income - expenses;
    
    return {
      name: month,
      income,
      expenses,
      profit
    };
  });
  
  // Comparativa trimestral
  const quarterlyData = [
    { 
      name: '1T', 
      income: monthlyData.slice(0, 3).reduce((sum, m) => sum + m.income, 0), 
      expenses: monthlyData.slice(0, 3).reduce((sum, m) => sum + m.expenses, 0),
      profit: 0 // Inicializamos el profit
    },
    { name: '2T', income: 0, expenses: 0, profit: 0 },
    { name: '3T', income: 0, expenses: 0, profit: 0 },
    { name: '4T', income: 0, expenses: 0, profit: 0 },
  ];
  
  // Calculamos el profit para cada trimestre
  quarterlyData.forEach(q => {
    q.profit = q.income - q.expenses;
  });
  
  // Para tamaño pequeño, mostrar solo un resumen
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Comparativa</p>
          <p className="text-xl font-semibold">T1 {currentYear}</p>
        </div>
      </div>
    );
  }
  
  // Formatear valores para los tooltips en el gráfico
  const formatTooltipValue = (value: number) => {
    return `${formatCurrency(value)}`;
  };
  
  // Colores para el gráfico
  const colors = {
    income: '#4f46e5',
    expenses: '#ef4444',
    profit: '#10b981'
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium">Comparativa Financiera</h4>
        <div className="flex space-x-1">
          <button className="px-2 py-1 text-xs bg-primary text-white rounded-md">Mensual</button>
          <button className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md">Trimestral</button>
          <button className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-md">Anual</button>
        </div>
      </div>
      
      <div className="flex-1 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={monthlyData}
            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis 
              tickFormatter={(value) => value === 0 ? '0' : `${Math.round(value / 1000)}k`}
              fontSize={11}
              width={30}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{ 
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar 
              dataKey="income" 
              name="Ingresos" 
              fill={colors.income} 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="expenses" 
              name="Gastos" 
              fill={colors.expenses} 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="profit" 
              name="Beneficio" 
              fill={colors.profit} 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Ingresos T1</p>
          <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(quarterlyData[0].income)}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Gastos T1</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(quarterlyData[0].expenses)}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Beneficio T1</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(quarterlyData[0].profit)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialComparisonWidget;