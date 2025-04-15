import React, { useState, useEffect } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Rectangle, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip, TooltipProps } from "recharts";
import { Info, TrendingDown } from "lucide-react";

// Los iconos para cada categoría se asignarán según el nombre
const CATEGORY_ICONS: Record<string, string> = {
  "Sin categoría": "💰",
  "Suministros": "💡",
  "Material oficina": "📎",
  "Software y suscripciones": "🔒",
  "Marketing": "📣",
  "Transporte": "🚗",
  "Alimentación": "🍔",
  "Alojamiento": "🏨",
  "Telefonía": "📱",
  "Internet": "🌐",
  "Seguros": "🛡️",
  "Formación": "📚",
  "Asesoría": "📋",
  "Impuestos": "📊",
  "Otros": "📦"
};

// Los colores para cada categoría
const CATEGORY_COLORS: Record<string, string> = {
  "Sin categoría": "#718096",
  "Suministros": "#4355b9",
  "Material oficina": "#5c6bc0",
  "Software y suscripciones": "#6f42c1",
  "Marketing": "#3355b9",
  "Transporte": "#42a5f5",
  "Alimentación": "#26a69a",
  "Alojamiento": "#66bb6a",
  "Telefonía": "#ec407a",
  "Internet": "#7e57c2",
  "Seguros": "#5c6bc0",
  "Formación": "#26a69a",
  "Asesoría": "#8d6e63",
  "Impuestos": "#ef5350",
  "Otros": "#78909c"
};

// Función para obtener un color aleatorio para categorías sin color predefinido
const getRandomColor = () => {
  return "#" + Math.floor(Math.random()*16777215).toString(16);
};

interface ExpenseByCategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
  categoryId?: number | string | null;
}

// Función para formatear moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
};

// Componente para tooltip personalizado
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length > 0) {
    const value = payload[0]?.value;
    const name = payload[0]?.name;
    
    if (value !== undefined && name !== undefined) {
      return (
        <div className="bg-white p-2 border shadow-sm rounded-md text-xs">
          <p className="font-medium">{String(name)}</p>
          <p className="text-red-600">{formatCurrency(-(value as number))}</p>
        </div>
      );
    }
  }
  return null;
};

const ExpensesByCategorySimple: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  // Estado para guardar las categorías procesadas
  const [processedCategories, setProcessedCategories] = useState<ExpenseByCategoryData[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Obtener las transacciones
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Obtener las categorías
  const { data: categories, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Efecto para procesar las transacciones cuando cambia alguna dependencia
  useEffect(() => {
    // Solo procesar si tenemos transacciones y categorías
    if (transactions && categories) {
      setIsProcessing(true);

      // Creamos un mapa de categorías por ID para acceso rápido
      const categoryMap = new Map<number, any>();
      categories.forEach(category => {
        categoryMap.set(category.id, category);
      });

      // Filtramos las transacciones por tipo (gasto)
      const filteredTransactions = transactions.filter(transaction => 
        transaction.type === 'expense'
      );

      // Agrupamos por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number, 
        categoryId: number | null,
        categoryName: string,
        color: string
      }> = {};

      filteredTransactions.forEach(tx => {
        const categoryId = tx.categoryId;
        const category = categoryId ? categoryMap.get(categoryId) : null;
        const categoryName = category ? category.name : "Sin categoría";
        const amount = parseFloat(tx.amount);

        // Inicializar si no existe
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            categoryId: categoryId,
            categoryName: categoryName,
            color: category?.color || CATEGORY_COLORS[categoryName] || getRandomColor()
          };
        }

        // Acumular
        expensesByCategory[categoryName].total += Math.abs(amount);
        expensesByCategory[categoryName].count += 1;
      });

      // Calcular el total de gastos
      const totalExpense = Object.values(expensesByCategory)
        .reduce((sum, cat) => sum + cat.total, 0);

      // Convertir a array y calcular porcentajes
      const categoriesArray: ExpenseByCategoryData[] = Object.entries(expensesByCategory)
        .map(([name, data]) => {
          const percentage = totalExpense > 0 
            ? parseFloat(((data.total * 100) / totalExpense).toFixed(1))
            : 0;
            
          return {
            name,
            value: data.total,
            count: data.count,
            color: data.color,
            percentage,
            icon: CATEGORY_ICONS[name] || "📦",
            categoryId: data.categoryId
          };
        })
        .sort((a, b) => b.value - a.value);  // Ordenar de mayor a menor

      setProcessedCategories(categoriesArray);
      setIsProcessing(false);
    }
  }, [transactions, categories]);
  
  // Determinar si está cargando
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg overflow-hidden border">
        <div className="flex items-center p-3 bg-gray-50 border-b">
          <Skeleton className="h-5 w-5 mr-2" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-11/12" />
            <Skeleton className="h-8 w-10/12" />
            <Skeleton className="h-8 w-9/12" />
            <Skeleton className="h-8 w-8/12" />
          </div>
        </div>
      </div>
    );
  }

  if (processedCategories.length === 0) {
    return (
      <div className="rounded-lg overflow-hidden border">
        <div className="flex items-center justify-between p-3 bg-red-50 border-b">
          <div className="flex items-center">
            <div className="text-2xl mr-2">📊</div>
            <div>
              <h3 className="text-lg font-medium text-red-800">Gastos por Categoría</h3>
            </div>
          </div>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">No hay gastos registrados para mostrar</p>
        </div>
      </div>
    );
  }

  // Tomar solo las 5 principales categorías para el gráfico
  const topCategories = processedCategories.slice(0, 5);
  
  // Datos para el gráfico de barras
  const chartData = topCategories.map(cat => ({
    name: cat.name,
    value: cat.value,
    color: cat.color,
    icon: cat.icon
  }));

  return (
    <div className="rounded-lg border overflow-hidden bg-white">
      <div className="flex items-center justify-between p-3 bg-red-50 border-b">
        <div className="flex items-center">
          <div className="text-xl mr-2">📊</div>
          <div>
            <h3 className="text-base font-medium text-red-800">Gastos por Categoría</h3>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex flex-col">
          {/* Gráfico de barras horizontales */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#666' }}
                  width={80}
                  tickMargin={5}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 8)}...` : value}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  background={{ fill: '#f5f5f5' }}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  shape={<Rectangle radius={3} />}
                  label={{ 
                    position: 'right', 
                    fill: '#666',
                    fontSize: 10,
                    formatter: (value: number) => formatCurrency(-value).replace('€', '')
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Lista de categorías con porcentajes */}
          <div className="w-full space-y-2 mt-2">
            {topCategories.map((category, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-7 text-center flex-shrink-0">
                  <span className="text-lg">{category.icon}</span>
                </div>
                
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium truncate">{category.name}</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(-category.value)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full" 
                      style={{ 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Mostrar "Otros" si hay más de 5 categorías */}
            {processedCategories.length > 5 && (
              <div className="flex justify-between items-center py-1 mt-1 border-t pt-2">
                <div className="flex items-center">
                  <span className="text-lg mr-2">📦</span>
                  <span className="text-sm font-medium">Otros ({processedCategories.length - 5})</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(-processedCategories.slice(5).reduce((sum, cat) => sum + cat.value, 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesByCategorySimple;