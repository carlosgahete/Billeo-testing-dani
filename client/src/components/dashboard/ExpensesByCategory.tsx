import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

const ExpensesByCategory: React.FC<{
  transactions: any[];  // Transacciones
  categories: any[];    // Categorías
  period?: string;      // Período seleccionado
}> = ({ transactions, categories, period }) => {
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  
  // Efecto para generar la etiqueta del período seleccionado
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    if (period) {
      // Formato: year-quarter o year-month o 'all'
      const parts = period.split('-');
      const year = parts[0];
      
      if (parts.length > 1) {
        const timePeriod = parts[1];
        
        if (timePeriod.startsWith('Q')) {
          // Período trimestral
          const quarter = parseInt(timePeriod.substring(1));
          const startMonth = (quarter - 1) * 3;
          const endMonth = startMonth + 2;
          
          const startDate = new Date(parseInt(year), startMonth, 1);
          const endDate = new Date(parseInt(year), endMonth + 1, 0);
          
          const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
          
          setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
        } else {
          // Período mensual
          const month = parseInt(timePeriod) - 1;
          const startDate = new Date(parseInt(year), month, 1);
          const endDate = new Date(parseInt(year), month + 1, 0);
          
          const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
          
          setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
        }
      } else if (year === 'all') {
        setPeriodLabel("Todos los períodos");
      } else {
        // Año completo
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 11, 31);
        
        const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
        const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
        
        setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
      }
    } else {
      // Sin período especificado, mostrar año actual
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      
      const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
      const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
      
      setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
    }
  }, [period]);

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
        .map(([id, data], index) => {
          // Buscar la categoría para obtener el icono
          const category = id !== 'uncategorized'
            ? categories.find(c => c.id.toString() === id.toString())
            : null;
          
          return {
            name: data.name,
            value: data.amount,
            count: data.count,
            color: id === 'uncategorized' ? '#000000' : category?.color || COLORS[index % COLORS.length],
            percentage: (data.amount / totalExpenses) * 100,
            icon: category?.icon || '📊', // Emoji por defecto si no se encuentra
            categoryId: id
          };
        })
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
      <CardContent className="p-0 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Columna izquierda: Gráfico de donut */}
          <div className="p-2 flex flex-col h-[360px]">
            {/* Mostrar período encima del gráfico */}
            {periodLabel && (
              <div className="text-left text-sm text-gray-500 mb-2 pl-2">
                {periodLabel}
              </div>
            )}
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={110}
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
          </div>
          
          {/* Columna derecha: Lista de categorías */}
          <div 
            className="p-2 pr-3 relative flex flex-col"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6',
            }}
          >
            <div className="space-y-2 w-full py-2 flex-1 mb-8 overflow-y-auto max-h-[250px]">
              {data.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" 
                    style={{ 
                      backgroundColor: `${item.color}15`, // Color con 15% de opacidad
                      color: item.color
                    }}>
                    <span className="text-xl">{item.icon}</span>
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