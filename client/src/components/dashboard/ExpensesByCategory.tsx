import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
  '#000000', '#5E5CE6', '#007AFF', '#64D2FF', '#5AC8FA',
  '#00C7BE', '#30C48D', '#34C759', '#BFD641', '#FFD60A',
  '#FF9500', '#FF3B30', '#FF2D55', '#AF52DE', '#A2845E',
];

const ExpensesByCategory: React.FC<{
  transactions: any[];
  categories: any[];
  period?: string;
}> = ({ transactions, categories, period }) => {
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    if (period) {
      const parts = period.split('-');
      const year = parts[0];
      
      if (parts.length > 1) {
        const timePeriod = parts[1];
        
        if (timePeriod.startsWith('Q')) {
          const quarter = parseInt(timePeriod.substring(1));
          const startMonth = (quarter - 1) * 3;
          const endMonth = startMonth + 2;
          
          const startDate = new Date(parseInt(year), startMonth, 1);
          const endDate = new Date(parseInt(year), endMonth + 1, 0);
          
          const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
          
          setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
        } else {
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
        const startDate = new Date(parseInt(year), 0, 1);
        const endDate = new Date(parseInt(year), 11, 31);
        
        const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
        const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
        
        setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
      }
    } else {
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      
      const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
      const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
      
      setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
    }
  }, [period]);

  useEffect(() => {
    if (transactions && categories && transactions.length > 0) {
      const expenses = transactions.filter(t => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expensesByCategory: Record<string, { amount: number, count: number, name: string }> = {};
      
      // Ignoramos completamente la categoría "Sin categoría" aquí
      // No la creamos para que no aparezca en absoluto
      
      expenses.forEach((transaction) => {
        if (!transaction.categoryId) {
          // Ignoramos transacciones sin categoría
          return;
        }
        
        const category = categories.find(c => c.id === transaction.categoryId);
        
        if (category) {
          if (expensesByCategory[category.id]) {
            expensesByCategory[category.id].amount += Number(transaction.amount);
            expensesByCategory[category.id].count += 1;
          } else {
            expensesByCategory[category.id] = {
              amount: Number(transaction.amount),
              count: 1,
              name: category.name
            };
          }
        }
        // Ignoramos cualquier transacción sin categoría válida
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
      
      // Verificar que tenemos exactamente 5 categorías
      console.log("TOTAL CATEGORÍAS PROCESADAS:", processedData.length);
      
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

  // Los datos ya vienen preparados directamente del useEffect
  // No es necesario procesarlos de nuevo aquí
  const categoryItems = data;

  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card">
      <CardHeader className="bg-red-50 p-3">
        <CardTitle className="text-base text-red-700 flex items-center">
          <TrendingDown className="mr-2 h-4 w-4" />
          Gastos por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {/* Título del periodo centrado arriba */}
        {periodLabel && (
          <div className="text-center text-sm text-gray-500 mb-4 mt-2">
            <strong>{periodLabel}</strong>
          </div>
        )}
        
        {/* Contenedor principal con distribución simétrica */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-4 mx-auto">
          {/* Mitad izquierda: Gráfico de donut con tamaño fijo */}
          <div className="flex justify-center items-center">
            <div className="flex items-center justify-center" style={{ 
              width: '320px',
              height: '310px'
            }}>
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
          
          {/* Mitad derecha: Lista de categorías con misma altura que el gráfico */}
          <div className="flex justify-center items-center">
            <div className="bg-white rounded-md shadow-sm" style={{ 
              width: '320px', 
              height: '310px' 
            }}>
              {/* Contenedor para centrado vertical perfecto con altura fija */}
              <div className="relative w-full h-full overflow-hidden">
                {/* SOLUCIÓN DEFINITIVA: Contenedor que oculta explícitamente el sexto elemento */}
                <style>
                  {`
                    /* Esconder específicamente el sexto elemento (Sin categoría) */
                    .category-item:nth-child(6) {
                      display: none !important;
                    }
                  `}
                </style>
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 px-3" style={{
                  /* Esconder cualquier overflow como seguridad adicional */
                  overflow: 'hidden',
                  /* Tamaño adecuado para 5 elementos */
                  maxHeight: '290px'
                }}>
                  {/* Datos ya filtrados y ordenados en el useEffect */}
                  {categoryItems.map((item, index, array) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-2 category-item"
                      style={{ marginBottom: index < array.length - 1 ? '16px' : '0' }}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" 
                        style={{ 
                          backgroundColor: `${item.color}15`,
                          color: item.color
                        }}
                      >
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategory;