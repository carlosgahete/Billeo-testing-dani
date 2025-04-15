import React, { useState, useEffect } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

// Iconos para categorías
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
  "Alquiler": "🏢",
  "Otros": "📦"
};

// Colores para categorías
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
  "Alquiler": "#8e44ad",
  "Otros": "#78909c"
};

// Función para color aleatorio
const getRandomColor = () => {
  return "#" + Math.floor(Math.random()*16777215).toString(16);
};

// Detección de categoría por descripción
const detectCategory = (description: string): string => {
  const descriptionLower = description.toLowerCase();
  
  if (descriptionLower.includes('alquiler')) return 'Alquiler';
  if (descriptionLower.includes('material') && (descriptionLower.includes('oficina') || descriptionLower.includes('informático'))) return 'Material oficina';
  if (descriptionLower.includes('luz') || descriptionLower.includes('agua') || descriptionLower.includes('electricidad')) return 'Suministros';
  if (descriptionLower.includes('teléfono') || descriptionLower.includes('móvil') || descriptionLower.includes('movil')) return 'Telefonía';
  if (descriptionLower.includes('internet') || descriptionLower.includes('fibra')) return 'Internet';
  
  return 'Sin categoría';
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
const DonutExpensesByCategory: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);

  // Consultas de datos
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: categoryData, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Procesar datos
  useEffect(() => {
    if (transactions && categoryData) {
      setIsProcessing(true);

      // Mapa de categorías
      const categoryMap = new Map<number, any>();
      categoryData.forEach(category => {
        categoryMap.set(category.id, category);
      });

      // Filtrar transacciones de gastos
      const expenseTransactions = transactions.filter(
        transaction => transaction.type === 'expense'
      );

      // Agrupar por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number, 
        color: string
      }> = {};

      // Procesar transacciones
      expenseTransactions.forEach(tx => {
        let categoryName;
        const categoryId = tx.categoryId;
        
        if (categoryId && categoryMap.has(categoryId)) {
          categoryName = categoryMap.get(categoryId).name;
        } else {
          categoryName = detectCategory(tx.description || '');
        }
        
        const amount = parseFloat(tx.amount);

        // Inicializar categoría
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            color: CATEGORY_COLORS[categoryName] || getRandomColor()
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

      // Convertir a array con porcentajes
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
        .sort((a, b) => b.value - a.value);

      setCategories(categoriesArray);
      setIsProcessing(false);
    }
  }, [transactions, categoryData]);
  
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;
  
  // Estado de carga
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden shadow-sm">
        <div className="flex items-center p-3 bg-red-50 border-b">
          <div className="h-5 w-5 bg-gray-200 rounded-md animate-pulse mr-2"></div>
          <div className="h-5 w-40 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="flex justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // Sin datos
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border overflow-hidden shadow-sm">
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

  // Procesar datos para rosquilla
  const topCategories = categories.slice(0, 5);
  const totalPercentage = topCategories.reduce((sum, cat) => sum + cat.percentage, 0);
  const otherPercentage = 100 - totalPercentage;
  
  // Crear segmentos de rosquilla
  let cumulativeAngle = 0;
  const segments = topCategories.map((category, index) => {
    const startAngle = cumulativeAngle;
    const angle = (category.percentage / 100) * 360;
    cumulativeAngle += angle;
    
    return {
      color: category.color,
      startAngle,
      angle
    };
  });
  
  // Añadir segmento "Otros" si es necesario
  if (otherPercentage > 0) {
    segments.push({
      color: "#9ca3af", // gris
      startAngle: cumulativeAngle,
      angle: (otherPercentage / 100) * 360
    });
  }
  
  return (
    <div className="rounded-lg border overflow-hidden bg-white shadow-sm">
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
        {/* Rosquilla SVG centrada y pequeña */}
        <div className="flex justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Círculo base gris claro */}
              <circle cx="50" cy="50" r="40" fill="#f3f4f6" />
              
              {/* Segmentos de la rosquilla */}
              {segments.map((segment, index) => {
                // Convertir ángulos a coordenadas
                const startRad = (segment.startAngle - 90) * (Math.PI / 180);
                const endRad = (segment.startAngle + segment.angle - 90) * (Math.PI / 180);
                
                // Puntos del arco
                const x1 = 50 + 40 * Math.cos(startRad);
                const y1 = 50 + 40 * Math.sin(startRad);
                const x2 = 50 + 40 * Math.cos(endRad);
                const y2 = 50 + 40 * Math.sin(endRad);
                
                // Determinar si es arco largo (más de 180 grados)
                const largeArcFlag = segment.angle > 180 ? 1 : 0;
                
                return (
                  <path
                    key={index}
                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={segment.color}
                  />
                );
              })}
              
              {/* Círculo interno blanco para crear efecto de rosquilla */}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>
            
            {/* Total en el centro */}
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-sm font-bold text-red-600">{formatCurrency(total)}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="space-y-2 mt-2">
          {topCategories.map((category, index) => (
            <div key={index} className="flex items-center text-sm">
              <div 
                className="w-3 h-3 rounded-sm mr-2" 
                style={{ backgroundColor: category.color }}
              ></div>
              <span className="flex-1 truncate">{category.name}</span>
              <span className="text-gray-600 text-xs">{category.percentage}%</span>
            </div>
          ))}
          
          {/* Entrada para "Otros" si es necesario */}
          {otherPercentage > 0 && (
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-sm mr-2 bg-gray-400"></div>
              <span className="flex-1 truncate">Otros ({categories.length - 5})</span>
              <span className="text-gray-600 text-xs">{otherPercentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonutExpensesByCategory;