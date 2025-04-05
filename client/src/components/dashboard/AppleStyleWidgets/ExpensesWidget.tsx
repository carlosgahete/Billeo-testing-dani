import React from 'react';
import { DashboardStats, WidgetSize } from '@/types/dashboard';
import { formatCurrency } from '@/lib/utils';

interface ExpensesWidgetProps {
  data?: DashboardStats;
  size: WidgetSize;
}

const ExpensesWidget: React.FC<ExpensesWidgetProps> = ({ data, size }) => {
  if (!data) {
    return <div className="flex items-center justify-center h-full">Cargando datos...</div>;
  }

  // Renderizado según tamaño
  if (size === 'small') {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-2xl font-bold text-red-500">
          {formatCurrency(data.expenses || 0)}
        </span>
        <span className="text-xs text-muted-foreground">Total gastos</span>
      </div>
    );
  }

  // Para tamaño mediano y grande, mostrar más detalles
  // Estos son datos de ejemplo, se necesitaría integrar con datos reales
  const expenseCategories = [
    { name: "Oficina", amount: data.expenses * 0.25, icon: "🏢" },
    { name: "Servicios", amount: data.expenses * 0.35, icon: "💡" },
    { name: "Material", amount: data.expenses * 0.2, icon: "📦" },
    { name: "Otros", amount: data.expenses * 0.2, icon: "📌" }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col mb-4">
        <span className="text-3xl font-bold text-red-500">
          {formatCurrency(data.expenses || 0)}
        </span>
        <span className="text-sm text-muted-foreground">Total de gastos</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-2">
        {expenseCategories.map((category, index) => (
          <div 
            key={index} 
            className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 flex items-center"
          >
            <div className="mr-3 text-lg">{category.icon}</div>
            <div>
              <p className="text-sm font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(category.amount)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpensesWidget;