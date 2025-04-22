import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader
} from "@/components/ui/card";
import {
  MdFoodBank, MdDirectionsCar, MdHomeWork,
  MdLocalGroceryStore, MdHealthAndSafety, MdSchool,
  MdDevices, MdCardGiftcard, MdEvent, MdMiscellaneousServices,
  MdMoreHoriz, MdOutlineBarChart
} from 'react-icons/md';
import { useQuery } from '@tanstack/react-query';
import { useDashboardData } from "@/hooks/useDashboardData";
import { useSimpleDashboardFilters } from "@/hooks/useSimpleDashboardFilters";
import { formatCurrency } from "@/lib/utils";

// Interface para categoría y datos de gasto
interface ExpenseCategory {
  categoryId: number;
  name: string;
  icon: React.ReactNode;
  color: string;
  value: number;
  percentage: number;
  count: number;
}

// Paleta de colores estilo Apple (colores más suaves y elegantes)
const categoryColors: Record<number, string> = {
  1: '#FF6B6B', // Comida y bebida
  2: '#4ECDC4', // Transporte
  3: '#FF9F1C', // Vivienda
  4: '#2EC4B6', // Compras
  5: '#FFBF69', // Salud
  6: '#9BC1BC', // Educación
  7: '#FA7070', // Tecnología
  8: '#6ABCE5', // Regalos
  9: '#A8DEF0', // Entretenimiento
  10: '#E07A5F', // Servicios profesionales
  11: '#8881C5', // Seguros
  12: '#7987AC', // Telefonía
  13: '#5D7597', // Internet
  14: '#5C8E70', // Formación
  15: '#6D6875', // Impuestos
  0: '#9D9D9D', // Otros/Sin categoría
};

// Iconos para categorías (estilo Material Design para consistencia)
const categoryIcons: Record<number, React.ReactNode> = {
  1: <MdFoodBank />,
  2: <MdDirectionsCar />,
  3: <MdHomeWork />,
  4: <MdLocalGroceryStore />,
  5: <MdHealthAndSafety />,
  6: <MdSchool />,
  7: <MdDevices />,
  8: <MdCardGiftcard />,
  9: <MdEvent />,
  10: <MdMiscellaneousServices />,
  0: <MdMoreHoriz />,
};

// Mapeo de nombres de categorías (mantenemos español y legibilidad)
const categoryNameMap: Record<string, string> = {
  "Sin categoría": "Sin categoría",
  "Suministros": "Suministros",
  "Material oficina": "Material oficina",
  "Software": "Software",
  "Marketing": "Marketing",
  "Transporte": "Transporte",
  "Alimentación": "Alimentación",
  "Alojamiento": "Alojamiento",
  "Telefonía": "Telefonía",
  "Internet": "Internet",
  "Seguros": "Seguros",
  "Formación": "Formación",
  "Asesoría": "Asesoría",
  "Impuestos": "Impuestos",
  "Otros": "Otros",
};

// Componente ExpensesByCategoryApple que cumple con los requerimientos estilo Apple
const ExpensesByCategoryApple: React.FC = () => {
  // Estados para interactividad
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  // Obtenemos los filtros actuales del dashboard (año y trimestre)
  const { year, period } = useSimpleDashboardFilters();
  
  // Obtenemos los datos del dashboard con los filtros aplicados
  const { data: dashboardData } = useDashboardData();
  
  // Obtenemos todas las transacciones
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Obtenemos todas las categorías
  const { data: categories, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Creamos un mensaje descriptivo del periodo
  const periodLabel = useMemo(() => {
    if (!period || period === 'all') {
      return `Año ${year}`;
    }
    const quarterMap: Record<string, string> = {
      'Q1': 'Primer trimestre',
      'Q2': 'Segundo trimestre',
      'Q3': 'Tercer trimestre',
      'Q4': 'Cuarto trimestre'
    };
    return `${quarterMap[period.toUpperCase()] || period} ${year}`;
  }, [year, period]);

  // Procesamos los datos para mostrar gastos por categoría con el filtro aplicado
  const processedData = useMemo(() => {
    if (!transactions || !categories || !year) return [];

    // Crear un mapa de categorías por ID para acceso rápido
    const categoryMap = new Map();
    categories.forEach(category => {
      categoryMap.set(category.id, category);
    });

    // Filtrar solo las transacciones de tipo "expense" (gasto)
    const expenseTransactions = transactions.filter(tx => 
      tx.type === 'expense' && 
      // Aplicar filtro por año
      new Date(tx.date).getFullYear().toString() === year &&
      // Aplicar filtro por trimestre si está seleccionado
      (period === 'all' || period.toLowerCase() === 'all' || 
       getQuarterFromDate(new Date(tx.date)) === period.toUpperCase())
    );

    // Función para obtener el trimestre de una fecha
    function getQuarterFromDate(date: Date): string {
      const month = date.getMonth();
      if (month < 3) return 'Q1';
      if (month < 6) return 'Q2';
      if (month < 9) return 'Q3';
      return 'Q4';
    }

    // Agrupar gastos por categoría
    const expensesByCategory: Record<string, { total: number, count: number }> = {};
    
    expenseTransactions.forEach(tx => {
      // Obtener la categoría o usar "Sin categoría" como fallback
      const categoryId = tx.categoryId;
      const category = categoryId ? categoryMap.get(categoryId) : null;
      const categoryName = category ? category.name : "Sin categoría";
      
      // Convertir el monto a número (puede venir como string)
      const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
      
      // Inicializar la categoría si no existe
      if (!expensesByCategory[categoryName]) {
        expensesByCategory[categoryName] = { 
          total: 0, 
          count: 0 
        };
      }
      
      // Usar el valor absoluto para sumar (los gastos suelen almacenarse como negativos)
      expensesByCategory[categoryName].total += Math.abs(amount);
      expensesByCategory[categoryName].count += 1;
    });

    // Calcular el total de gastos para los porcentajes
    const totalExpenses = Object.values(expensesByCategory)
      .reduce((sum, cat) => sum + cat.total, 0);

    // Crear el array final con todos los datos procesados
    const result = Object.entries(expensesByCategory).map(([name, data], index) => {
      // Asignar un color e icono basado en el nombre o índice
      const mappedName = categoryNameMap[name] || name;
      // Buscamos el ID de la categoría por nombre
      const categoryEntry = Array.from(categoryMap.values()).find(c => c.name === name);
      const categoryId = categoryEntry ? categoryEntry.id : index;
      
      return {
        categoryId,
        name: mappedName,
        // Usar el color de la categoría o asignar uno basado en el ID
        color: categoryColors[categoryId % Object.keys(categoryColors).length] || '#9D9D9D',
        // Usar el icono de la categoría o uno genérico
        icon: categoryIcons[categoryId % Object.keys(categoryIcons).length] || <MdMoreHoriz />,
        value: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
      };
    })
    // Ordenamos por valor descendente (más gastos primero)
    .sort((a, b) => b.value - a.value);

    return result;
  }, [transactions, categories, year, period]);

  // Estado de carga
  const isLoading = transactionsLoading || categoriesLoading;

  // Si está cargando, mostrar estado de carga estilo Apple
  if (isLoading) {
    return (
      <Card className="h-full overflow-hidden dashboard-card">
        <CardHeader className="p-3 sm:p-4 border-b">
          <h3 className="text-lg font-medium text-gray-800">Gastos por Categoría</h3>
        </CardHeader>
        <CardContent className="p-5 flex flex-col items-center justify-center h-64">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="h-2.5 w-24 bg-gray-200 rounded-full"></div>
            <div className="h-2 w-16 bg-gray-200 rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si no hay datos para el periodo seleccionado, mostrar mensaje estilo Apple
  if (processedData.length === 0) {
    return (
      <Card className="h-full overflow-hidden dashboard-card">
        <CardHeader className="p-3 sm:p-4 border-b">
          <h3 className="text-lg font-medium text-gray-800">Gastos por Categoría</h3>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center justify-center h-64">
          <div className="text-center">
            <MdOutlineBarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 font-medium text-lg">No hay gastos registrados</p>
            <p className="text-sm mt-2 text-gray-400">No hay transacciones en este periodo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Diseño principal estilo Apple (limpio y minimalista)
  return (
    <Card className="h-full overflow-hidden dashboard-card">
      <CardHeader className="p-3 sm:p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">Gastos por Categoría</h3>
          <span className="text-sm text-gray-500">{periodLabel}</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row h-full gap-5">
          {/* Gráfico circular estilo Apple */}
          <div className="w-full sm:w-1/2 flex justify-center items-center py-3">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52">
              {/* Círculo base con sombra interna */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-26 sm:h-26 bg-white rounded-full shadow-inner"></div>
              </div>
              
              {/* Gráfico SVG */}
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Círculo base gris claro */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#f5f5f7" 
                  strokeWidth="18"
                />
                
                {/* Segmentos de categorías */}
                {processedData.slice(0, 8).map((item, idx) => {
                  // Calcular posición en el círculo
                  const percentages = processedData.slice(0, 8).map(c => c.percentage);
                  let offset = 0;
                  for (let i = 0; i < idx; i++) {
                    offset += percentages[i];
                  }
                  
                  return (
                    <g key={`segment-${idx}`}>
                      {/* Segmento coloreado */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke={item.color} 
                        strokeWidth="18"
                        strokeDasharray={`${item.percentage * 2.51} ${100 * 2.51}`}
                        strokeDashoffset={`${-offset * 2.51}`}
                        transform="rotate(-90 50 50)"
                      />
                      
                      {/* Área interactiva */}
                      <path 
                        d={`M 50 50 L ${50 + 45*Math.cos((-90+offset*3.6)*Math.PI/180)} ${50 + 45*Math.sin((-90+offset*3.6)*Math.PI/180)} A 45 45 0 ${item.percentage > 50 ? 1 : 0} 1 ${50 + 45*Math.cos((-90+(offset+item.percentage)*3.6)*Math.PI/180)} ${50 + 45*Math.sin((-90+(offset+item.percentage)*3.6)*Math.PI/180)} Z`}
                        fill="transparent"
                        stroke="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoverIndex(idx)}
                        onMouseLeave={() => setHoverIndex(null)}
                        onClick={() => setSelectedIndex(idx === selectedIndex ? null : idx)}
                      />
                    </g>
                  );
                })}
              </svg>
              
              {/* Tooltip para segmento seleccionado */}
              {hoverIndex !== null && hoverIndex < processedData.length && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm text-center w-40">
                    <p className="font-semibold text-sm truncate">{processedData[hoverIndex].name}</p>
                    <p className="text-red-600 text-base font-medium">{formatCurrency(processedData[hoverIndex].value)}</p>
                    <p className="text-gray-500 text-xs">{processedData[hoverIndex].percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Lista de categorías estilo Apple */}
          <div className="w-full sm:w-1/2 flex flex-col max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
            {processedData.map((item, idx) => (
              <div 
                key={`category-${idx}`}
                className={`flex items-center py-2 px-1 rounded-lg transition-all cursor-pointer
                  ${(idx === selectedIndex || idx === hoverIndex) ? 'bg-gray-50' : ''}`}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => setSelectedIndex(idx === selectedIndex ? null : idx)}
              >
                {/* Icono con indicador de color */}
                <div className="mr-3">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <span className="text-base" style={{ color: item.color }}>{item.icon}</span>
                  </div>
                </div>
                
                {/* Información de categoría */}
                <div className="flex-grow min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.count} {item.count === 1 ? 'transacción' : 'transacciones'}
                  </div>
                </div>
                
                {/* Valor y porcentaje */}
                <div className="text-right pl-2">
                  <div className="text-sm font-semibold text-red-600">
                    {formatCurrency(item.value)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategoryApple;