import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BarChart, BarChartHorizontal, PieChart, FileBarChart, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos
interface ExpenseCategoryItem {
  name: string;
  amount: number;
  count: number;
  color: string;
  icon: string;
  percentage: number;
}

interface ExpensesByCategoryProps {
  year?: string;
  period?: string;
  className?: string;
}

// Colores estilo Apple
const APPLE_COLORS = [
  "#5E97F6", // Azul
  "#33AC71", // Verde
  "#F6BE00", // Amarillo
  "#FF5252", // Rojo
  "#8B75D7", // Púrpura
  "#26C6DA", // Cian
  "#FF9800", // Naranja
  "#78909C", // Gris azulado
  "#EC407A", // Rosa
  "#66BB6A", // Verde claro
  "#9E9E9E", // Gris
  "#5C6BC0", // Índigo
];

// Iconos predeterminados para categorías
const CATEGORY_ICONS: Record<string, string> = {
  "Alimentación": "🍽️",
  "Transporte": "🚗",
  "Vivienda": "🏠",
  "Servicios": "📱",
  "Ocio": "🎭",
  "Tecnología": "💻",
  "Marketing": "📢",
  "Software": "🖥️",
  "Material": "📦",
  "Viajes": "✈️",
  "Formación": "📚",
  "Salud": "🏥",
  "Seguros": "🔒",
  "Impuestos": "📊",
  "Suministros": "🔌",
  "Oficina": "📎",
  "Otros": "📋"
};

// Componente principal
const ExpensesByCategoryApple: React.FC<ExpensesByCategoryProps> = ({ 
  year = new Date().getFullYear().toString(),
  period = "all",
  className
}) => {
  // Estados
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [processedData, setProcessedData] = useState<ExpenseCategoryItem[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  // Obtener transacciones con refetch para actualizar datos
  const { 
    data: transactions = [], 
    isLoading: txLoading,
    refetch: refetchTransactions 
  } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    staleTime: 30000 // 30 segundos antes de considerar los datos antiguos
  });
  
  // Obtener categorías
  const { 
    data: categories = [], 
    isLoading: catLoading
  } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    staleTime: 60000 // 1 minuto antes de considerar los datos antiguos
  });

  // Función para refrescar datos manualmente
  const refreshData = useCallback(async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await refetchTransactions();
      setTimeout(() => setIsUpdating(false), 700); // Efecto visual de actualización
    } catch (error) {
      console.error("Error al actualizar datos de gastos por categoría:", error);
      setIsUpdating(false);
    }
  }, [refetchTransactions, isUpdating]);

  // Formateo de números
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  // Formateo de porcentajes
  const formatPercentage = useCallback((percentage: number) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
      style: 'percent'
    }).format(percentage / 100);
  }, []);

  // Función para filtrar transacciones por periodo
  const filterTransactionsByPeriod = useCallback((transactions: any[]) => {
    return transactions.filter(tx => {
      // Solo incluir gastos
      if (tx.type !== 'expense') return false;
      
      // Verificar si la fecha está dentro del periodo seleccionado
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear().toString();
      
      // Filtrar por año
      if (txYear !== year) return false;
      
      // Si es todo el año, no filtrar más
      if (period === 'all') return true;
      
      // Filtrar por trimestre
      const txMonth = txDate.getMonth() + 1; // 1-12
      
      if (period === 'q1') return txMonth >= 1 && txMonth <= 3;
      if (period === 'q2') return txMonth >= 4 && txMonth <= 6;
      if (period === 'q3') return txMonth >= 7 && txMonth <= 9;
      if (period === 'q4') return txMonth >= 10 && txMonth <= 12;
      
      return true;
    });
  }, [year, period]);

  // Procesamiento de datos memoizado 
  const processData = useCallback(() => {
    if (txLoading || catLoading || !transactions.length || !categories.length) {
      return { processedData: [], totalExpenses: 0 };
    }
    
    // Crear un mapa de categorías por ID para acceso rápido
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category.id, category);
    });
    
    // Filtrar transacciones según el periodo seleccionado
    const filteredTransactions = filterTransactionsByPeriod(transactions);
    
    // Si no hay transacciones filtradas, mostrar datos vacíos
    if (filteredTransactions.length === 0) {
      return { processedData: [], totalExpenses: 0 };
    }
    
    // Agrupar por categoría
    const expensesByCategory: Record<string, ExpenseCategoryItem> = {};
    
    // Usar el campo baseImponible si está disponible, de lo contrario usar amount
    filteredTransactions.forEach(tx => {
      const categoryId = tx.categoryId;
      const category = categoryId ? categoryMap.get(categoryId) : null;
      const categoryName = category ? category.name : "Sin categoría";
      // Asignar un color consistente basado en el nombre de la categoría si no tiene uno
      const colorIndex = !category?.color ? categoryName.charCodeAt(0) % APPLE_COLORS.length : 0;
      const categoryColor = category?.color || APPLE_COLORS[colorIndex];
      const categoryIcon = category?.icon || CATEGORY_ICONS[categoryName] || "📋";
      
      // Usar baseImponible si existe, de lo contrario usar amount
      const amount = Math.abs(parseFloat(tx.baseImponible || tx.amount));
      
      // Inicializar o actualizar categoría
      if (!expensesByCategory[categoryName]) {
        expensesByCategory[categoryName] = {
          name: categoryName,
          amount: 0,
          count: 0,
          color: categoryColor,
          icon: categoryIcon,
          percentage: 0
        };
      }
      
      // Acumular
      expensesByCategory[categoryName].amount += amount;
      expensesByCategory[categoryName].count += 1;
    });
    
    // Calcular totales y porcentajes
    const total = Object.values(expensesByCategory).reduce((sum, cat) => sum + cat.amount, 0);
    
    // Convertir a array y calcular porcentajes
    const data = Object.values(expensesByCategory).map(cat => ({
      ...cat,
      percentage: total > 0 ? (cat.amount / total) * 100 : 0
    }));
    
    // Ordenar de mayor a menor
    data.sort((a, b) => b.amount - a.amount);
    
    return { processedData: data, totalExpenses: total };
  }, [transactions, categories, filterTransactionsByPeriod, txLoading, catLoading]);

  // Efecto para procesar los datos cuando cambian las dependencias
  useEffect(() => {
    const { processedData: newData, totalExpenses: newTotal } = processData();
    setProcessedData(newData);
    setTotalExpenses(newTotal);
  }, [processData]);

  // Efecto para registrar un listener para actualizaciones de transacciones
  useEffect(() => {
    // Función para observar eventos de websocket e invalidar la cache cuando se necesite
    const handleWebsocketEvent = (event: any) => {
      // Extraer datos del evento personalizado
      const messageData = event.detail || event;
      
      if (
        messageData.type === 'transaction-created' || 
        messageData.type === 'transaction-updated' || 
        messageData.type === 'invoice-paid' ||
        messageData.type === 'dashboard-refresh-required'
      ) {
        console.log(`🔄 ExpensesByCategoryApple: Detectado evento ${messageData.type}, actualizando datos...`);
        
        // Invalidar la caché para que se recarguen los datos
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        
        // También podríamos optar por un refresh manual inmediato
        setIsUpdating(true);
        setTimeout(() => {
          refetchTransactions().finally(() => {
            setIsUpdating(false);
          });
        }, 300);
      }
    };
    
    // Registrar el listener en el objeto global window para eventos personalizados
    window.addEventListener('dashboard-websocket-event', handleWebsocketEvent);
    
    // Limpiar el listener al desmontar
    return () => {
      window.removeEventListener('dashboard-websocket-event', handleWebsocketEvent);
    };
  }, [queryClient, refetchTransactions]);

  // Texto del periodo para mostrar
  const periodText = useMemo(() => {
    if (period === 'all') return `Año ${year}`;
    if (period === 'q1') return `1er trimestre ${year}`;
    if (period === 'q2') return `2do trimestre ${year}`;
    if (period === 'q3') return `3er trimestre ${year}`;
    if (period === 'q4') return `4to trimestre ${year}`;
    return `Año ${year}`;
  }, [year, period]);

  // Determinar si estamos en estado de carga
  const isLoading = txLoading || catLoading;

  // Estado de carga
  if (isLoading && !isUpdating) {
    return (
      <Card className={`h-full overflow-hidden ${className}`}>
        <CardHeader className="p-4 flex justify-between items-center">
          <h3 className="text-lg font-medium">Gastos por Categoría</h3>
        </CardHeader>
        <CardContent className="p-4 flex flex-col items-center justify-center h-[200px]">
          <div className="animate-pulse flex flex-col items-center space-y-4 w-full">
            <div className="h-4 bg-gray-200 rounded-md w-1/3"></div>
            <div className="space-y-2 w-full">
              <div className="h-4 bg-gray-200 rounded-md w-full"></div>
              <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded-md w-4/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no hay datos, mostrar mensaje
  if (processedData.length === 0 && !isUpdating) {
    return (
      <Card className={`h-full overflow-hidden ${className}`}>
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Gastos por Categoría</h3>
            <span className="text-sm font-medium text-gray-600">{periodText}</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex flex-col items-center justify-center h-[200px]">
          <FileBarChart className="h-12 w-12 text-gray-300 mb-4" />
          <p className="font-medium text-gray-700">No hay gastos registrados</p>
          <p className="text-sm text-gray-500">No hay transacciones en este periodo</p>
        </CardContent>
      </Card>
    );
  }

  // Renderizado del componente con datos
  return (
    <Card className={`h-full overflow-hidden ${className}`}>
      <CardHeader className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Gastos por Categoría</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">{periodText}</span>
            <button 
              onClick={refreshData}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 text-gray-500 ${isUpdating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Listado de categorías con estilo Apple */}
          {processedData.map((category, index) => (
            <div
              key={index}
              className="flex items-center justify-between space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <span>{category.icon}</span>
                </div>
                <div>
                  <p className="font-medium">{category.name}</p>
                </div>
              </div>
              <div className="text-right font-medium">
                {formatCurrency(category.amount)} €
              </div>
            </div>
          ))}
        </div>
        
        {/* Indicador de total - estilo Apple */}
        <div className="mt-6 flex justify-between items-center bg-gray-50 p-3 rounded-lg">
          <span className="font-medium">Total</span>
          <span className="font-bold">{formatCurrency(totalExpenses)} €</span>
        </div>
        
        {/* Gráfico de barras estilo Apple */}
        <div className="mt-4 space-y-3">
          {processedData.slice(0, 5).map((category, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>{category.name}</span>
                <span>{formatPercentage(category.percentage)}</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${category.percentage}%`,
                    backgroundColor: category.color 
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategoryApple;