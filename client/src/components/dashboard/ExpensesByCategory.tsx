import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { 
  FileDown, 
  Receipt, 
  TrendingDown, 
  ShoppingBag,
  Home, 
  Car, 
  Coffee, 
  Utensils,
  PieChart as PieChartIcon,
  Briefcase,
  LightbulbIcon,
  Wifi,
  Globe,
  Monitor,
  Smartphone
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Tipo para los datos de gastos por categoría
interface ExpenseByCategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
  categoryId?: number | string;
}

// Colores para el gráfico - Estilo Apple
const COLORS = [
  '#000000', // Negro
  '#5E5CE6', // Violeta
  '#007AFF', // Azul
  '#64D2FF', // Azul claro
  '#5AC8FA', // Cyan
  '#00C7BE', // Turquesa
  '#30C48D', // Verde turquesa
  '#34C759', // Verde
  '#BFD641', // Verde lima
  '#FFD60A', // Amarillo
  '#FF9500', // Naranja
  '#FF3B30', // Rojo
  '#FF2D55', // Rosa
  '#AF52DE', // Morado
  '#A2845E', // Marrón
];

// Función para obtener el icono según el nombre de la categoría
const getCategoryIcon = (categoryName: string) => {
  const normalizedName = categoryName.toLowerCase();
  
  // Mapeo de nombres de categorías a iconos
  if (normalizedName.includes('alimentación') || normalizedName.includes('comida') || normalizedName.includes('restaurante')) {
    return <Utensils size={14} />;
  } else if (normalizedName.includes('transporte') || normalizedName.includes('coche') || normalizedName.includes('vehículo')) {
    return <Car size={14} />;
  } else if (normalizedName.includes('hogar') || normalizedName.includes('casa') || normalizedName.includes('alquiler')) {
    return <Home size={14} />;
  } else if (normalizedName.includes('compras') || normalizedName.includes('ropa')) {
    return <ShoppingBag size={14} />;
  } else if (normalizedName.includes('café') || normalizedName.includes('bebida')) {
    return <Coffee size={14} />;
  } else if (normalizedName.includes('internet') || normalizedName.includes('wifi') || normalizedName.includes('datos')) {
    return <Wifi size={14} />;
  } else if (normalizedName.includes('web') || normalizedName.includes('website') || normalizedName.includes('online')) {
    return <Globe size={14} />;
  } else if (normalizedName.includes('luz') || normalizedName.includes('electricidad') || normalizedName.includes('energía')) {
    return <LightbulbIcon size={14} />;
  } else if (normalizedName.includes('trabajo') || normalizedName.includes('negocio')) {
    return <Briefcase size={14} />;
  } else if (normalizedName.includes('móvil') || normalizedName.includes('teléfono') || normalizedName.includes('celular')) {
    return <Smartphone size={14} />;
  } else if (normalizedName.includes('software') || normalizedName.includes('ordenador') || normalizedName.includes('computadora')) {
    return <Monitor size={14} />;
  } else if (normalizedName === 'sin categoría' || normalizedName === 'otros') {
    return <PieChartIcon size={14} />;
  }
  
  // Icono por defecto
  return <Receipt size={14} />;
};

const ExpensesByCategory: React.FC<{
  transactions: any[];  // Transacciones
  categories: any[];    // Categorías
}> = ({ transactions, categories }) => {
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  
  useEffect(() => {
    if (transactions && categories && transactions.length > 0) {
      // Filtrar solo los gastos
      const expenses = transactions.filter(t => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Agrupar gastos por categoría
      const expensesByCategory: Record<string, { amount: number, count: number, name: string }> = {};
      
      // Añadir categoría "Sin categoría"
      expensesByCategory['uncategorized'] = { 
        amount: 0, 
        count: 0,
        name: 'Sin categoría'
      };
      
      // Procesar todas las transacciones de gasto
      expenses.forEach((transaction) => {
        // Si no tiene categoría, añadir a "Sin categoría"
        if (!transaction.categoryId) {
          expensesByCategory['uncategorized'].amount += Number(transaction.amount);
          expensesByCategory['uncategorized'].count += 1;
          return;
        }
        
        // Buscar la categoría
        const category = categories.find(c => c.id === transaction.categoryId);
        
        if (category) {
          // Si la categoría existe en nuestro agrupamiento, actualizar
          if (expensesByCategory[category.id]) {
            expensesByCategory[category.id].amount += Number(transaction.amount);
            expensesByCategory[category.id].count += 1;
          } else {
            // Si no existe, crear nueva entrada
            expensesByCategory[category.id] = {
              amount: Number(transaction.amount),
              count: 1,
              name: category.name
            };
          }
        } else {
          // Si no se encuentra la categoría, añadir a "Sin categoría"
          expensesByCategory['uncategorized'].amount += Number(transaction.amount);
          expensesByCategory['uncategorized'].count += 1;
        }
      });
      
      // Convertir a array y ordenar por monto (de mayor a menor)
      const sortedData = Object.entries(expensesByCategory)
        .map(([id, data], index) => ({
          name: data.name,
          value: data.amount,
          count: data.count,
          color: id === 'uncategorized' ? '#000000' : COLORS[index % COLORS.length],
          percentage: (data.amount / totalExpenses) * 100
        }))
        .filter(item => item.value > 0) // Eliminar categorías sin gastos
        .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor
      
      setData(sortedData);
    }
  }, [transactions, categories]);

  // Renderizado condicional si no hay datos
  if (!data.length) {
    return (
      <Card className="h-full">
        <CardHeader className="bg-red-50 p-4">
          <CardTitle className="text-lg text-red-700 flex items-center">
            <TrendingDown className="mr-2 h-5 w-5" />
            Gastos por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p>No hay gastos registrados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card">
      <CardHeader className="bg-red-50 p-3">
        <CardTitle className="text-base text-red-700 flex items-center">
          <TrendingDown className="mr-2 h-4 w-4" />
          Gastos por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Gráfico de donut */}
          <div className="p-3 flex items-center justify-center h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '8px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                    border: 'none',
                    padding: '6px',
                    fontSize: '10px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Lista de categorías */}
          <div className="p-3 overflow-y-auto h-[200px]">
            <div className="space-y-2">
              {data.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
                    style={{ 
                      backgroundColor: `${item.color}15`, // Color con 15% de opacidad
                      color: item.color
                    }}>
                    {getCategoryIcon(item.name)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                      <span className="font-medium text-gray-900 text-sm">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{item.count} transacciones</span>
                      <span>{item.percentage.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategory;