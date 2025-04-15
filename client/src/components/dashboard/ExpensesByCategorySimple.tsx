import React, { useState, useEffect } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Info } from "lucide-react";

// Los iconos para cada categoría se asignarán según el nombre
// Esto se puede ampliar según las categorías que tengan los usuarios
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

interface ExpensesByCategoryProps {
  transactions: any[];
  categories: any[];
  period?: string;
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
      const filteredTransactions = transactions.filter(transaction => {
        // Solo incluir gastos
        if (transaction.type !== 'expense') return false;
        
        // Considerar todas las transacciones de gastos (podrías agregar filtros adicionales aquí)
        return true;
      });

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

  // Datos para el gráfico circular
  const chartData = processedCategories.map(cat => ({
    name: cat.name,
    value: cat.value,
    color: cat.color
  }));

  // Mostrar solo las 5 categorías principales para el gráfico
  const topCategoriesForChart = chartData.slice(0, 5);
  
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
          <div className="flex justify-center mb-2">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
          <div className="space-y-2 mt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
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

  // Renderizador personalizado para la leyenda
  const renderLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <ul className="flex flex-col gap-1 mt-2 pl-2">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center text-xs">
            <span style={{ 
              backgroundColor: entry.color,
              width: '8px',
              height: '8px',
              display: 'inline-block',
              marginRight: '5px',
              borderRadius: '2px'
            }}></span>
            <span className="truncate max-w-[100px]">{entry.name}</span>
          </li>
        ))}
      </ul>
    );
  };

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
        <div className="flex flex-col items-center justify-center">
          {/* Gráfico de sectores en el centro */}
          <div className="flex justify-center items-center">
            <PieChart width={300} height={190}>
              <Pie
                data={topCategoriesForChart}
                cx={95}
                cy={95}
                innerRadius={40}
                outerRadius={70}
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {topCategoriesForChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend 
                content={renderLegend}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ right: 10, top: 30 }}
              />
            </PieChart>
          </div>
          
          {/* Lista de categorías con porcentajes */}
          <div className="w-full mt-3 space-y-1.5">
            {processedCategories.slice(0, 4).map((category, index) => (
              <div key={index} className="flex justify-between items-center py-1">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(-category.value)}
                  </p>
                  <p className="text-xs text-gray-500">{category.percentage}%</p>
                </div>
              </div>
            ))}
            
            {/* Mostrar "Otros" si hay más de 4 categorías */}
            {processedCategories.length > 4 && (
              <div className="flex justify-between items-center py-1 border-t pt-2">
                <div className="flex items-center">
                  <span className="text-lg mr-2">📦</span>
                  <span className="text-sm font-medium">Otros ({processedCategories.length - 4})</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(-processedCategories.slice(4).reduce((sum, cat) => sum + cat.value, 0))}
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