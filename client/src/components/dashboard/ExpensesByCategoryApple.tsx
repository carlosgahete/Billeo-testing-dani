import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, ArrowDownToLine, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSimpleDashboardFilters } from '@/hooks/useSimpleDashboardFilters';
import { useQuery } from '@tanstack/react-query';

// Definición de tipos
interface ExpenseCategory {
  categoryId: number;
  name: string;
  icon: React.ReactNode;
  color: string;
  value: number;
  percentage: number;
  count: number;
}

interface ExpensesByCategoryAppleProps {
  className?: string;
  showTitle?: boolean;
}

// Función para obtener el trimestre a partir de una fecha
function getQuarterFromDate(date: Date): string {
  const month = date.getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
}

const ExpensesByCategoryApple: React.FC<ExpensesByCategoryAppleProps> = ({ 
  className = '', 
  showTitle = true 
}) => {
  const { year: currentYear, period: currentPeriod } = useSimpleDashboardFilters();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Obtener las categorías
  const { data: categoriesData } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  // Obtener las transacciones (gastos)
  const { data: transactionsData } = useQuery<any[]>({
    queryKey: ['/api/transactions'],
  });

  // Procesar datos cuando estén disponibles
  useEffect(() => {
    if (transactionsData && categoriesData) {
      setIsLoading(true);
      
      try {
        // Filtrar transacciones por año y trimestre si es necesario
        const filteredTransactions = transactionsData.filter(transaction => {
          // Solo considerar gastos, no ingresos
          if (transaction.type !== 'expense') return false;

          // Convertir la fecha de string a objeto Date
          const transactionDate = new Date(transaction.date);
          const transactionYear = transactionDate.getFullYear().toString();
          
          // Verificar si coincide con el año seleccionado
          if (transactionYear !== currentYear) return false;
          
          // Si estamos filtrando por trimestre específico (no "all")
          if (currentPeriod !== 'all' && currentPeriod.startsWith('q')) {
            const transactionQuarter = getQuarterFromDate(transactionDate);
            const filterQuarter = currentPeriod.toUpperCase();
            return transactionQuarter === filterQuarter;
          }
          
          // Si estamos filtrando por mes específico
          if (currentPeriod !== 'all' && currentPeriod.startsWith('m')) {
            const transactionMonth = transactionDate.getMonth() + 1; // getMonth es 0-indexed
            const filterMonth = parseInt(currentPeriod.substring(1));
            return transactionMonth === filterMonth;
          }
          
          // Si no hay filtro específico (all), incluir todas las transacciones del año
          return true;
        });

        // Calcular el total de gastos
        const total = filteredTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);
        setTotalExpenses(total);

        // Crear un mapa de categorías con sus gastos asociados
        const categoryMap: Record<number, ExpenseCategory> = {};
        
        // Inicializar el mapa con las categorías disponibles
        categoriesData.forEach(category => {
          categoryMap[category.id] = {
            categoryId: category.id,
            name: category.name,
            icon: getCategoryIcon(category.name),
            color: getCategoryColor(category.id),
            value: 0,
            percentage: 0,
            count: 0
          };
        });

        // Sumar los gastos por categoría
        filteredTransactions.forEach(transaction => {
          if (categoryMap[transaction.categoryId]) {
            categoryMap[transaction.categoryId].value += Number(transaction.amount);
            categoryMap[transaction.categoryId].count += 1;
          }
        });

        // Calcular los porcentajes y filtrar categorías sin gastos
        const processedCategories = Object.values(categoryMap)
          .filter(cat => cat.value > 0)
          .map(cat => ({
            ...cat,
            percentage: total > 0 ? (cat.value / total) * 100 : 0
          }))
          .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

        setCategories(processedCategories);
        setIsLoading(false);
      } catch (err) {
        console.error('Error al procesar datos de gastos por categoría:', err);
        setError('Error al procesar los datos');
        setIsLoading(false);
      }
    }
  }, [transactionsData, categoriesData, currentYear, currentPeriod]);

  // Función para obtener un color basado en el ID de categoría
  function getCategoryColor(categoryId: number): string {
    const colors = [
      '#FF6384', // Rosa
      '#36A2EB', // Azul
      '#FFCE56', // Amarillo
      '#4BC0C0', // Turquesa
      '#9966FF', // Púrpura
      '#FF9F40', // Naranja
      '#C9CBCF', // Gris
      '#7FD6C2', // Verde agua
      '#FFA7A7', // Rojo claro
      '#B5D99C'  // Verde claro
    ];
    
    return colors[categoryId % colors.length];
  }

  // Función para obtener un icono basado en el nombre de la categoría
  function getCategoryIcon(categoryName: string): React.ReactNode {
    // Simplificado: se podría mejorar con un mapa de iconos específicos para cada categoría
    return <span className="text-xs">📊</span>;
  }

  // Calcular ángulos para el gráfico de donut
  const calculateStrokeDashArray = (percentage: number) => {
    const circumference = 2 * Math.PI * 40; // 2πr donde r=40
    return `${(percentage / 100) * circumference} ${circumference}`;
  };

  // Calcular desplazamiento para cada segmento del gráfico
  const calculateStrokeDashOffset = (index: number) => {
    const circumference = 2 * Math.PI * 40;
    let offset = 0;
    
    for (let i = 0; i < index; i++) {
      offset -= (categories[i].percentage / 100) * circumference;
    }
    
    return offset;
  };

  return (
    <Card className={`overflow-hidden h-full ${className}`}>
      <CardHeader className="bg-gray-50 p-2 dark:bg-gray-800">
        <div className="flex justify-between items-center">
          {showTitle && (
            <CardTitle className="text-lg flex items-center">
              <PieChart className="mr-2 h-5 w-5 text-red-500" />
              Gastos por Categoría
            </CardTitle>
          )}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer">
                  <Info className="h-4 w-4 text-neutral-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5} className="bg-white z-50 shadow-lg">
                <p className="w-[200px] text-xs">
                  Distribución de gastos por categoría en estilo Apple.
                  {currentPeriod !== 'all' 
                    ? ` Filtrado por ${currentPeriod.startsWith('q') 
                        ? `trimestre ${currentPeriod.toUpperCase()}` 
                        : `mes ${parseInt(currentPeriod.substring(1))}`} de ${currentYear}.` 
                    : ` Datos de ${currentYear}.`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 flex flex-col items-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 w-full">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mb-2"></div>
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 w-full">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 w-full">
            <ArrowDownToLine className="h-8 w-8 text-neutral-300 mb-2" />
            <p className="text-sm text-muted-foreground">No hay gastos registrados</p>
          </div>
        ) : (
          <>
            {/* Gráfico estilo Apple */}
            <div className="relative w-40 h-40 mb-4">
              {/* Círculo base */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
                  <div className="text-center">
                    <p className="font-bold text-2xl">{totalExpenses.toLocaleString('es-ES')}&nbsp;€</p>
                    <p className="text-xs text-neutral-500">Total gastos</p>
                  </div>
                </div>
              </div>
              
              {/* Gráfico circular */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Círculo de fondo (gris claro) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#f5f5f7" 
                  strokeWidth="12"
                />
                
                {/* Segmentos de categorías */}
                {categories.map((category, index) => (
                  <circle 
                    key={category.categoryId}
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="transparent" 
                    stroke={category.color} 
                    strokeWidth="12"
                    strokeDasharray={calculateStrokeDashArray(category.percentage)}
                    strokeDashoffset={calculateStrokeDashOffset(index)}
                    className="transition-all duration-500 ease-out"
                  />
                ))}
              </svg>
            </div>
            
            {/* Leyenda de categorías */}
            <div className="w-full space-y-2">
              {categories.slice(0, 5).map(category => (
                <div key={category.categoryId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: category.color }}
                    ></div>
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">{category.value.toLocaleString('es-ES')} €</span>
                    <span className="text-xs text-neutral-500 ml-2">({category.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
              
              {/* Mostrar indicador de más categorías si hay más de 5 */}
              {categories.length > 5 && (
                <div className="text-xs text-neutral-500 text-center mt-2">
                  + {categories.length - 5} categorías más
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategoryApple;