import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { TrendingDown } from "lucide-react";

// Interfaces
interface CategoryExpense {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

// Iconos de categorías
const CATEGORY_ICONS: Record<string, string> = {
  "Sin categoría": "🏷️",
  "Suministros": "💡",
  "Material oficina": "📎",
  "Software": "💻",
  "Marketing": "📣",
  "Transporte": "🚗",
  "Alimentación": "🍽️",
  "Alojamiento": "🏨",
  "Telefonía": "📱",
  "Internet": "🌐",
  "Seguros": "🛡️",
  "Formación": "📚",
  "Asesoría": "📋",
  "Impuestos": "📊",
  "Alquiler": "🏢",
  "Otros": "📦"
};

// Colores de categorías (estilo Apple)
const CATEGORY_COLORS: Record<string, string> = {
  "Sin categoría": "#8E8E93", // gris
  "Suministros": "#30B0C7",  // azul claro
  "Material oficina": "#64D2FF", // celeste
  "Software": "#5E5CE6", // azul índigo
  "Marketing": "#BF5AF2", // morado
  "Transporte": "#FF9F0A", // naranja
  "Alimentación": "#FF375F", // rosa
  "Alojamiento": "#5856D6", // violeta
  "Telefonía": "#FF2D55", // rosa fresa
  "Internet": "#007AFF", // azul
  "Seguros": "#4CD964", // verde
  "Formación": "#32D74B", // verde manzana
  "Asesoría": "#AC8E68", // marrón
  "Impuestos": "#FF3B30", // rojo
  "Alquiler": "#AF52DE", // púrpura
  "Otros": "#A2845E"  // beige
};

// Función para obtener color aleatorio estilo Apple
const getRandomAppleColor = () => {
  const appleColors = [
    "#FF3B30", "#FF9500", "#FFCC00", "#4CD964",
    "#5AC8FA", "#007AFF", "#5856D6", "#FF2D55"
  ];
  return appleColors[Math.floor(Math.random() * appleColors.length)];
};

// Componente principal
const ExpensesByCategoryModerno: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  // Estados
  const [categories, setCategories] = useState<CategoryExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("year");

  // Consultas
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Procesamiento de datos
  useEffect(() => {
    if (transactions && categoriesData) {
      setIsProcessing(true);
      
      // Crear mapa de categorías para acceso rápido
      const categoryMap = new Map();
      categoriesData.forEach(category => {
        categoryMap.set(category.id, category);
      });

      // Filtrar transacciones por tipo
      const expenseTransactions = transactions.filter(tx => tx.type === 'expense');
      
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
        const amount = Math.abs(parseFloat(tx.amount));
        
        // Inicializar categoría si no existe
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            color: category?.color || CATEGORY_COLORS[categoryName] || getRandomAppleColor()
          };
        }
        
        // Acumular valores
        expensesByCategory[categoryName].total += amount;
        expensesByCategory[categoryName].count += 1;
      });
      
      // Calcular total
      const total = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.total, 0);
      setTotalExpenses(total);
      
      // Convertir a array para ordenar
      const categoriesArray = Object.entries(expensesByCategory).map(([name, data]) => {
        // Calcular porcentaje con precisión de un decimal
        const percentage = total > 0 
          ? Number(((data.total * 100) / total).toFixed(1)) 
          : 0;
          
        return {
          name,
          amount: data.total,
          count: data.count,
          percentage,
          color: data.color,
          icon: CATEGORY_ICONS[name] || "📦"
        };
      });
      
      // Ordenar de mayor a menor
      const sortedCategories = categoriesArray.sort((a, b) => b.amount - a.amount);
      setCategories(sortedCategories);
      setIsProcessing(false);
    }
  }, [transactions, categoriesData, selectedPeriod]);

  // Estado de carga
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;

  // Renderizado durante carga
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full bg-white/20" />
              <Skeleton className="h-5 w-40 bg-white/20" />
            </div>
            <Skeleton className="h-4 w-20 bg-white/20" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sin datos
  if (categories.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              <h3 className="font-medium text-lg">Gastos por Categoría</h3>
            </div>
            <span className="text-sm">{formatCurrency(0)}</span>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No hay gastos registrados para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  // Limitar a 5 categorías principales
  const topCategories = categories.slice(0, 5);
  const otherCategories = categories.slice(5);
  const otherAmount = otherCategories.reduce((sum, cat) => sum + cat.amount, 0);
  const otherPercentage = totalExpenses > 0 
    ? Number(((otherAmount * 100) / totalExpenses).toFixed(1)) 
    : 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            <h3 className="font-medium text-lg">Gastos por Categoría</h3>
          </div>
          <span className="text-sm font-medium">{formatCurrency(totalExpenses)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 space-y-4">
          {/* Gráfico circular minimalista */}
          <div className="relative h-40 mx-auto max-w-[240px]">
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle 
                cx="50" 
                cy="50" 
                r="40" 
                fill="none" 
                stroke="#f1f1f1" 
                strokeWidth="15"
              />
              
              {/* Renderizar segmentos del gráfico */}
              {categories.reduce((elements, category, index) => {
                const previousStrokeDashOffset = index === 0 ? 0 : 
                  elements[index - 1].props.strokeDashoffset - elements[index - 1].props.strokeDasharray;
                
                const circumference = 2 * Math.PI * 40;
                const strokeDasharray = (category.percentage / 100) * circumference;
                const strokeDashoffset = previousStrokeDashOffset;
                
                elements.push(
                  <circle 
                    key={index}
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke={category.color} 
                    strokeWidth="15"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500 ease-in-out"
                    style={{ 
                      transition: `stroke-dasharray 1s ease-in-out ${index * 0.1}s, 
                                  stroke-dashoffset 1s ease-in-out ${index * 0.1}s` 
                    }}
                  />
                );
                
                return elements;
              }, [] as React.ReactElement[])}
            </svg>
            
            {/* Total en el centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-xl font-bold">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
          
          {/* Lista de categorías */}
          <div className="space-y-3">
            {topCategories.map((category, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div 
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  {category.icon}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex-1 truncate">
                      <span className="font-medium text-sm">{category.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{category.percentage}%</span>
                      <span className="font-semibold text-sm text-red-600">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${category.percentage}%`, 
                        backgroundColor: category.color,
                        transition: 'width 1s ease-in-out'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {/* Categoría "Otros" si hay más de 5 */}
            {otherCategories.length > 0 && (
              <div className="flex items-center space-x-3 mt-2 pt-2 border-t border-gray-100">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  📦
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">
                      Otros ({otherCategories.length})
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{otherPercentage}%</span>
                      <span className="font-semibold text-sm text-red-600">
                        {formatCurrency(otherAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategoryModerno;