import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Los iconos para cada categoría
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

// Función para obtener un color aleatorio
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

// Formatter memoizado para números de moneda
const formatCurrency = React.useCallback((value: number) => {
  // Usamos Intl.NumberFormat para dar formato de moneda española
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}, []);

const ExpensesByCategoryCard: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  // Estado para guardar las categorías procesadas
  const [processedCategories, setProcessedCategories] = useState<ExpenseByCategoryData[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);

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
      const filteredTransactions = transactions.filter(
        transaction => transaction.type === 'expense'
      );

      // Agrupamos por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number, 
        categoryId: number | null,
        categoryName: string,
        color: string
      }> = {};

      // Procesamos todas las transacciones de gastos
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
      const total = Object.values(expensesByCategory)
        .reduce((sum, cat) => sum + cat.total, 0);
      
      setTotalExpenses(total);

      // Convertir a array y calcular porcentajes
      const categoriesArray: ExpenseByCategoryData[] = Object.entries(expensesByCategory)
        .map(([name, data]) => {
          const percentage = total > 0 
            ? parseFloat(((data.total * 100) / total).toFixed(1))
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
        .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

      setProcessedCategories(categoriesArray);
      setIsProcessing(false);
    }
  }, [transactions, categories]);
  
  // Determinar si está cargando
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;
  
  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="bg-red-50 pb-2">
          <div className="flex items-center">
            <Skeleton className="h-6 w-6 mr-2" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (processedCategories.length === 0) {
    return (
      <Card>
        <CardHeader className="bg-red-50 pb-2">
          <div className="flex items-center">
            <span className="text-xl mr-2">📊</span>
            <h3 className="text-base font-medium text-red-800">Gastos por Categoría</h3>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No hay gastos registrados para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  // Tomar solo las 5 principales categorías para mostrar - memoizado para evitar recálculos
  const topCategories = useMemo(() => 
    processedCategories.slice(0, 5), 
    [processedCategories]);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-red-50 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg mr-2">📊</span>
            <h3 className="font-medium text-red-800">Gastos por Categoría</h3>
          </div>
          <span className="text-sm font-bold text-red-700">
            {formatCurrency(totalExpenses)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 divide-y">
          {topCategories.map((category, index) => (
            <div 
              key={index} 
              className="p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center mb-1">
                <div className="flex items-center flex-1 overflow-hidden">
                  <span className="text-lg mr-2">{category.icon}</span>
                  <span className="font-medium text-sm truncate">{category.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(-category.value)}
                  </span>
                  <span className="text-xs text-gray-500">{category.percentage}%</span>
                </div>
              </div>
              
              <Progress 
                value={category.percentage} 
                className="h-1.5 bg-gray-100"
                indicatorClassName="bg-current"
                style={{ color: category.color }}
              />
            </div>
          ))}
          
          {/* Mostrar "Otros" si hay más de 5 categorías */}
          {processedCategories.length > 5 && (
            <div className="p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-2">📦</span>
                  <span className="text-sm font-medium">Otros ({processedCategories.length - 5})</span>
                </div>
                <span className="text-sm font-bold text-red-600">
                  {formatCurrency(-processedCategories.slice(5).reduce((sum, cat) => sum + cat.value, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Aplicar memoización al componente para evitar renderizados innecesarios
export default React.memo(ExpensesByCategoryCard);