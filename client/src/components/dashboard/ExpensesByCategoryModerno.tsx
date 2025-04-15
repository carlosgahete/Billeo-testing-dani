import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { 
  ArrowDown, 
  Filter, 
  CalendarRange, 
  ChevronDown,
  Clock
} from "lucide-react";

// Interfaces
interface CategoryExpense {
  name: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

// Configuración de categorías
const CATEGORY_CONFIG: Record<string, {
  color: string;
  icon: React.ReactNode;
  gradient: string;
}> = {
  "Oficina": {
    color: "#E63946",
    gradient: "linear-gradient(135deg, #E63946 0%, #F26670 100%)",
    icon: <span className="text-lg">🏢</span>
  },
  "Suministros": {
    color: "#F7B32B",
    gradient: "linear-gradient(135deg, #F7B32B 0%, #FCDA9B 100%)",
    icon: <span className="text-lg">💡</span>
  },
  "Material oficina": {
    color: "#2A9D8F",
    gradient: "linear-gradient(135deg, #2A9D8F 0%, #7DE2D7 100%)",
    icon: <span className="text-lg">📎</span>
  },
  "Telefonía": {
    color: "#457B9D",
    gradient: "linear-gradient(135deg, #457B9D 0%, #92C1E0 100%)",
    icon: <span className="text-lg">📱</span>
  },
  "Software": {
    color: "#6D597A",
    gradient: "linear-gradient(135deg, #6D597A 0%, #B19CD9 100%)",
    icon: <span className="text-lg">💻</span>
  },
  "Transporte": {
    color: "#4895EF",
    gradient: "linear-gradient(135deg, #4895EF 0%, #90C6FF 100%)",
    icon: <span className="text-lg">🚗</span>
  },
  "Asesoría": {
    color: "#7209B7",
    gradient: "linear-gradient(135deg, #7209B7 0%, #BE91C6 100%)",
    icon: <span className="text-lg">📋</span>
  },
  "Impuestos": {
    color: "#F94144",
    gradient: "linear-gradient(135deg, #F94144 0%, #FFA07A 100%)",
    icon: <span className="text-lg">📊</span>
  },
  "Sin categoría": {
    color: "#6C757D",
    gradient: "linear-gradient(135deg, #6C757D 0%, #ADB5BD 100%)",
    icon: <span className="text-lg">🏷️</span>
  }
};

// Función para obtener configuración por defecto
const getDefaultConfig = (name: string) => {
  // Categorías predefinidas para coincidencias parciales
  const mappings: Record<string, string> = {
    "alquiler": "Oficina",
    "oficina": "Oficina",
    "luz": "Suministros",
    "material": "Material oficina",
    "teléfono": "Telefonía",
    "telefono": "Telefonía",
    "internet": "Telefonía",
    "informático": "Software",
    "informatico": "Software",
    "transporte": "Transporte",
    "viaje": "Transporte",
    "asesor": "Asesoría",
    "gestor": "Asesoría",
    "impuesto": "Impuestos",
    "tasa": "Impuestos"
  };

  // Buscar coincidencia parcial
  const lowerName = name.toLowerCase();
  let matchedCategory = "Sin categoría";
  
  for (const [key, category] of Object.entries(mappings)) {
    if (lowerName.includes(key)) {
      matchedCategory = category;
      break;
    }
  }

  // Devolver configuración de la categoría coincidente
  return CATEGORY_CONFIG[matchedCategory] || {
    color: "#6C757D",
    gradient: "linear-gradient(135deg, #6C757D 0%, #ADB5BD 100%)",
    icon: <span className="text-lg">📦</span>
  };
};

// Componente principal
const ExpensesByCategoryModerno: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  // Estados
  const [categories, setCategories] = useState<CategoryExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<string>("Año completo");
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);

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

      // Filtrar transacciones por tipo y año
      const expenseTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return tx.type === 'expense' && txDate.getFullYear() === currentYear;
      });
      
      // Agrupar por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number,
        description: string,
        config: {
          color: string;
          gradient: string;
          icon: React.ReactNode;
        }
      }> = {};
      
      // Procesar cada transacción
      expenseTransactions.forEach(tx => {
        const categoryId = tx.categoryId;
        const category = categoryId ? categoryMap.get(categoryId) : null;
        const categoryName = category ? category.name : "Sin categoría";
        const amount = Math.abs(parseFloat(tx.amount));
        
        // Determinar la mejor categoría basada en la descripción si no hay categoría
        const description = tx.description || "";
        const config = getDefaultConfig(description);
        
        // Inicializar categoría si no existe
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            description: description,
            config: CATEGORY_CONFIG[categoryName] || config
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
          color: data.config.color,
          gradient: data.config.gradient,
          icon: data.config.icon
        };
      });
      
      // Ordenar de mayor a menor
      const sortedCategories = categoriesArray.sort((a, b) => b.amount - a.amount);
      setCategories(sortedCategories);
      setIsProcessing(false);
    }
  }, [transactions, categoriesData, currentYear, period]);

  // Estado de carga
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;

  // Renderizado durante carga
  if (isLoading) {
    return (
      <Card className="overflow-hidden shadow-lg border-0">
        <CardHeader className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full bg-gray-200" />
              <Skeleton className="h-5 w-40 bg-gray-200" />
            </div>
            <Skeleton className="h-8 w-28 rounded-full bg-gray-200" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full rounded-lg bg-gray-100" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg bg-gray-100" />
              <Skeleton className="h-12 w-full rounded-lg bg-gray-100" />
              <Skeleton className="h-12 w-full rounded-lg bg-gray-100" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sin datos
  if (categories.length === 0) {
    return (
      <Card className="overflow-hidden shadow-lg border-0">
        <CardHeader className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-slate-800">Gastos por Categoría</h3>
            </div>
            <div className="bg-gray-50 rounded-full py-1.5 px-3 flex items-center gap-1 text-sm text-gray-700 cursor-pointer">
              <CalendarRange className="h-4 w-4" />
              <span>Año {currentYear}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="py-8">
            <Filter className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay gastos registrados para mostrar</p>
            <p className="text-sm text-gray-400 mt-1">
              Todas tus transacciones aparecerán aquí automáticamente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-lg border-0">
      <CardHeader className="bg-white border-b p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-red-500" />
            <h3 className="font-medium text-slate-800">Gastos por Categoría</h3>
          </div>
          <div 
            className="bg-gray-50 hover:bg-gray-100 rounded-full py-1.5 px-3 flex items-center gap-1 text-sm text-gray-700 cursor-pointer transition-colors relative"
            onClick={() => setShowPeriodSelector(!showPeriodSelector)}
          >
            <CalendarRange className="h-4 w-4" />
            <span>Año {currentYear}</span>
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
            
            {/* Selector de período */}
            {showPeriodSelector && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-10 w-44">
                <div className="px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-100">
                  PERÍODO
                </div>
                {["Año completo", "Trim. 1", "Trim. 2", "Trim. 3", "Trim. 4"].map((item) => (
                  <div 
                    key={item}
                    className={`px-3 py-1.5 text-sm hover:bg-gray-50 cursor-pointer flex items-center ${
                      period === item ? "text-blue-600 font-medium" : "text-gray-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriod(item);
                      setShowPeriodSelector(false);
                    }}
                  >
                    {period === item && (
                      <span className="mr-2 w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    )}
                    <span className={period === item ? "ml-0" : "ml-3.5"}>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-xl font-semibold text-gray-900">
          {formatCurrency(totalExpenses)}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative">
          {/* Gráfico de barras horizontal */}
          <div className="px-4 pt-4">
            {categories.slice(0, 4).map((category, index) => (
              <div key={index} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: category.gradient }}
                    >
                      {category.icon}
                    </div>
                    <span className="font-medium text-gray-800">{category.name}</span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-red-600 font-semibold">
                      {formatCurrency(category.amount)}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{category.count} trans.</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${category.percentage}%`, 
                      background: category.gradient,
                      transition: 'width 1s cubic-bezier(0.65, 0, 0.35, 1)'
                    }}
                  />
                </div>
                
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">{category.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Resumen de otros gastos */}
          {categories.length > 4 && (
            <div className="border-t border-gray-100 mt-2 pt-2 px-4 pb-4">
              <div className="flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-lg">📦</span>
                  </div>
                  <span className="font-medium text-gray-700">
                    Otras categorías ({categories.length - 4})
                  </span>
                </div>
                <div className="text-red-600 font-semibold">
                  {formatCurrency(
                    categories
                      .slice(4)
                      .reduce((sum, cat) => sum + cat.amount, 0)
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategoryModerno;