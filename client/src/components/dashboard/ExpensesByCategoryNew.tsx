import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpenseByCategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
  categoryId?: number | string;
}

const COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA',
  '#007AFF', '#5E5CE6', '#AF52DE', '#FF2D55', '#A2845E',
];

const ExpensesByCategoryNew: React.FC<{
  transactions: any[];
  categories: any[];
  period?: string;
}> = ({ transactions, categories, period }) => {
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    try {
      if (period) {
        const parts = period.split('-');
        const year = parts[0];
        
        if (parts.length > 1) {
          const timePeriod = parts[1];
          
          if (timePeriod.startsWith('q')) {
            // Es un trimestre (q1, q2, q3, q4)
            const quarterNum = parseInt(timePeriod.substring(1));
            if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
              throw new Error(`Trimestre inválido: ${timePeriod}`);
            }
            
            const startMonth = (quarterNum - 1) * 3;
            const endMonth = startMonth + 2;
            
            const startDate = new Date(parseInt(year), startMonth, 1);
            const endDate = new Date(parseInt(year), endMonth + 1, 0);
            
            const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
            const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
            
            setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
          } else {
            // Es un mes específico
            const month = parseInt(timePeriod) - 1;
            if (isNaN(month) || month < 0 || month > 11) {
              throw new Error(`Mes inválido: ${timePeriod}`);
            }
            
            const startDate = new Date(parseInt(year), month, 1);
            const endDate = new Date(parseInt(year), month + 1, 0);
            
            const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
            const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
            
            setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
          }
        } else if (year === 'all') {
          setPeriodLabel(`Año ${currentYear} completo`);
        } else {
          const yearNum = parseInt(year);
          if (isNaN(yearNum)) {
            throw new Error(`Año inválido: ${year}`);
          }
          setPeriodLabel(`Año ${year} completo`);
        }
      } else {
        setPeriodLabel(`Año ${currentYear} completo`);
      }
    } catch (error) {
      console.error("Error procesando periodo:", error);
      setPeriodLabel(`Año ${currentYear} completo`);
    }
  }, [period]);

  useEffect(() => {
    if (transactions && categories && transactions.length > 0) {
      const expenses = transactions.filter(t => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expensesByCategory: Record<string, { amount: number, count: number, name: string }> = {};
      
      expenses.forEach((transaction) => {
        const category = categories.find(c => c.id === transaction.categoryId);
        const categoryId = transaction.categoryId || 'uncategorized';
        const categoryName = category?.name || 'Sin categoría';
        
        if (expensesByCategory[categoryId]) {
          expensesByCategory[categoryId].amount += Number(transaction.amount);
          expensesByCategory[categoryId].count += 1;
        } else {
          expensesByCategory[categoryId] = {
            amount: Number(transaction.amount),
            count: 1,
            name: categoryName
          };
        }
      });
      
      // Extraer datos y procesar
      let processedData = Object.entries(expensesByCategory)
        .map(([id, data], index) => {
          const category = categories.find(c => c.id.toString() === id.toString());
          
          return {
            name: data.name,
            value: data.amount,
            count: data.count,
            color: category?.color || COLORS[index % COLORS.length],
            percentage: (data.amount / totalExpenses) * 100,
            icon: category?.icon || '📊',
            categoryId: id
          };
        })
        .filter(item => item.value > 0);
      
      // Encontrar la categoría "Comida"
      const comidaIndex = processedData.findIndex(item => item.name === "Comida");
      
      // Si existe "Comida", moverla al final
      if (comidaIndex !== -1) {
        const comida = processedData[comidaIndex];
        processedData.splice(comidaIndex, 1); // Eliminarla de su posición actual
        
        // Ordenar el resto por valor
        processedData.sort((a, b) => b.value - a.value);
        
        // Limitar a 4 elementos para dejar espacio para "Comida"
        processedData = processedData.slice(0, 4);
        
        // Añadir "Comida" al final
        processedData.push(comida);
      } else {
        // Si no existe "Comida", simplemente ordenar y limitar a 5
        processedData.sort((a, b) => b.value - a.value);
        processedData = processedData.slice(0, 5);
      }
      
      setData(processedData);
    }
  }, [transactions, categories]);

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

  // Diseño completamente nuevo
  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card">
      <CardHeader className="bg-red-50 p-3">
        <CardTitle className="text-base text-red-700 flex items-center">
          <TrendingDown className="mr-2 h-4 w-4" />
          Gastos por Categoría
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4">
        {/* Título del periodo */}
        <div className="mb-3 text-gray-700 text-sm">
          {periodLabel}
        </div>
        
        {/* Lista simple y directa de categorías */}
        <div className="grid gap-2">
          {data.map((item) => (
            <div 
              key={item.categoryId}
              className="bg-gray-50 rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-all"
            >
              <div className="flex items-center">
                {/* Icono a la izquierda */}
                <div 
                  className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center mr-3"
                  style={{ backgroundColor: item.color }}
                >
                  <span className="text-white text-lg">{item.icon}</span>
                </div>
                
                {/* Nombre y conteo de transacciones */}
                <div className="flex-grow">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.count} {item.count === 1 ? 'transacción' : 'transacciones'}
                  </div>
                </div>
                
                {/* Valores y porcentajes */}
                <div className="text-right">
                  <div className="text-gray-800 font-semibold">{formatCurrency(item.value)}</div>
                  <div className="text-xs text-gray-500">{item.percentage.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategoryNew;