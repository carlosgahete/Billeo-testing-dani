import React, { useState, useEffect } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

// Definir los iconos para cada categoría
const CATEGORY_ICONS: Record<string, string> = {
  "Sin categoría": "💰",
  "Suministros": "💡",
  "Material oficina": "📎",
  "Software": "🔒",
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
  "Software": "#6f42c1",
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

// Función para formatear moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
};

// Función para obtener un color aleatorio
const getRandomColor = () => {
  return "#" + Math.floor(Math.random()*16777215).toString(16);
};

// Interfaz para datos de categoría
interface CategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
}

// Componente principal
const SimpleExpensesByCategory: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  // Estado para categorías procesadas y total
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);

  // Obtener transacciones
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Obtener categorías
  const { data: categoryData, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Procesar datos cuando se cargan
  useEffect(() => {
    if (transactions && categoryData) {
      setIsProcessing(true);

      // Crear mapa de categorías por ID
      const categoryMap = new Map<number, any>();
      categoryData.forEach(category => {
        categoryMap.set(category.id, category);
      });

      // Filtrar solo transacciones de gastos
      const expenseTransactions = transactions.filter(
        transaction => transaction.type === 'expense'
      );

      // Agrupar por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number, 
        color: string
      }> = {};

      // Procesar cada transacción
      expenseTransactions.forEach(tx => {
        const categoryId = tx.categoryId;
        const category = categoryId ? categoryMap.get(categoryId) : null;
        const categoryName = category ? category.name : "Sin categoría";
        const amount = parseFloat(tx.amount);

        // Inicializar categoría si no existe
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            color: category?.color || CATEGORY_COLORS[categoryName] || getRandomColor()
          };
        }

        // Acumular datos
        expensesByCategory[categoryName].total += Math.abs(amount);
        expensesByCategory[categoryName].count += 1;
      });

      // Calcular total
      const totalExpenses = Object.values(expensesByCategory)
        .reduce((sum, cat) => sum + cat.total, 0);
      
      setTotal(totalExpenses);

      // Convertir a array y calcular porcentajes
      const categoriesArray: CategoryData[] = Object.entries(expensesByCategory)
        .map(([name, data]) => {
          const percentage = totalExpenses > 0 
            ? parseFloat(((data.total * 100) / totalExpenses).toFixed(1))
            : 0;
            
          return {
            name,
            value: data.total,
            count: data.count,
            color: data.color,
            percentage,
            icon: CATEGORY_ICONS[name] || "📦"
          };
        })
        .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

      setCategories(categoriesArray);
      setIsProcessing(false);
    }
  }, [transactions, categoryData]);
  
  // Estado de carga
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;
  
  // Mostrar skeleton durante la carga
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center p-3 bg-red-50 border-b">
          <div className="h-5 w-5 bg-gray-200 rounded-md animate-pulse mr-2"></div>
          <div className="h-5 w-40 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
            <Skeleton className="h-6 w-3/6" />
          </div>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no hay datos
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center p-3 bg-red-50 border-b">
          <div className="text-xl mr-2">📊</div>
          <h3 className="text-lg font-medium text-red-800">Gastos por Categoría</h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-500">No hay gastos registrados para mostrar</p>
        </div>
      </div>
    );
  }

  // Mostrar solo las 5 primeras categorías
  const topCategories = categories.slice(0, 5);
  
  return (
    <div className="rounded-lg border overflow-hidden bg-white">
      <div className="flex items-center justify-between p-3 bg-red-50 border-b">
        <div className="flex items-center">
          <div className="text-xl mr-2">📊</div>
          <h3 className="text-lg font-medium text-red-800">Gastos por Categoría</h3>
        </div>
        <div className="font-bold text-red-700">
          {formatCurrency(total)}
        </div>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {topCategories.map((category, index) => (
            <div key={index} className="flex items-center">
              <div className="flex items-center w-7 mr-3">
                <span className="text-xl">{category.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{category.name}</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(-category.value)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${category.percentage}%`, 
                      backgroundColor: category.color 
                    }}
                  ></div>
                </div>
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-500">{category.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
          
          {/* Mostrar "Otros" si hay más de 5 categorías */}
          {categories.length > 5 && (
            <div className="flex items-center pt-2 mt-2 border-t">
              <div className="flex items-center w-7 mr-3">
                <span className="text-xl">📦</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Otros ({categories.length - 5})</span>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(-categories.slice(5).reduce((sum, cat) => sum + cat.value, 0))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleExpensesByCategory;