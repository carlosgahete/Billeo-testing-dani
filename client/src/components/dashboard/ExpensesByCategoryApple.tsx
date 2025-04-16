import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  MdFoodBank, MdDirectionsCar, MdHomeWork,
  MdLocalGroceryStore, MdHealthAndSafety, MdSchool,
  MdDevices, MdCardGiftcard, MdEvent, MdMiscellaneousServices,
  MdMoreHoriz
} from 'react-icons/md';
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";

// Ya no necesitamos estos valores porque los filtros vienen del dashboard principal

type ExpenseCategory = {
  categoryId: number;
  name: string;
  icon: React.ReactNode;
  color: string;
  value: number;
  percentage: number;
  count: number;
};

// Define colores para diferentes categorías (paleta más atractiva)
const categoryColors: Record<number, string> = {
  1: '#FF6B6B', // Comida y bebida (rojo suave)
  2: '#4ECDC4', // Transporte (turquesa)
  3: '#FF9F1C', // Vivienda (naranja)
  4: '#2EC4B6', // Compras (verde azulado)
  5: '#FFBF69', // Salud (melocotón)
  6: '#CBF3F0', // Educación (menta claro)
  7: '#FFCBF2', // Tecnología (rosa claro)
  8: '#C8E7FF', // Regalos (azul claro)
  9: '#F4F1DE', // Entretenimiento (beige)
  10: '#E07A5F', // Servicios profesionales (terracota)
  0: '#6B705C', // Otros (gris verdoso)
};

// Asignar iconos a las categorías
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

// Mapeo de ID de categoría a nombres
const categoryNames: Record<number, string> = {
  1: 'Comida y bebida',
  2: 'Transporte',
  3: 'Vivienda',
  4: 'Compras',
  5: 'Salud',
  6: 'Educación',
  7: 'Tecnología',
  8: 'Regalos',
  9: 'Entretenimiento',
  10: 'Servicios prof.',
  0: 'Otros',
};

// Definimos una interfaz clara para un gasto por categoría
interface ExpenseCategoryItem {
  amount: number;
  count: number;
}

// Definimos la interfaz de props
interface ExpensesByCategoryProps {
  expensesByCategory?: Record<string | number, ExpenseCategoryItem>;
  // Eliminamos las props específicas de filtrado para usar el filtro global
}

const ExpensesByCategoryApple: React.FC<ExpensesByCategoryProps> = ({ 
  expensesByCategory: propExpensesByCategory
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  // Obtener datos del dashboard usando el hook centralizado
  const { data: dashboardData } = useDashboardData();
  
  // Usamos los datos de categorías que vienen del prop si están disponibles,
  // o los del dashboardData si el prop está vacío
  const expensesByCategory = useMemo(() => {
    // Depuración para ver qué datos están disponibles
    console.log("ExpensesByCategory - datos recibidos:", { 
      props: propExpensesByCategory, 
      dashboard: dashboardData?.expensesByCategory,
      dashboardData: dashboardData
    });
    
    if (propExpensesByCategory && Object.keys(propExpensesByCategory).length > 0) {
      return propExpensesByCategory;
    } else if (dashboardData?.expensesByCategory) {
      return dashboardData.expensesByCategory;
    }
    return {};
  }, [propExpensesByCategory, dashboardData?.expensesByCategory]);

  // Procesar los datos para el gráfico
  const data = useMemo(() => {
    // Crear una versión tipada de los datos para evitar errores
    const typedExpenses: Record<string, ExpenseCategoryItem> = {};
    
    // Convertir los datos de forma segura
    Object.keys(expensesByCategory).forEach(key => {
      const entry = expensesByCategory[key];
      if (entry && typeof entry === 'object' && 'amount' in entry && 'count' in entry) {
        typedExpenses[key] = {
          amount: Number(entry.amount),
          count: Number(entry.count)
        };
      }
    });
    
    // Calcular el total de gastos
    let totalExpenses = 0;
    Object.values(typedExpenses).forEach(item => {
      totalExpenses += Math.abs(item.amount);
    });

    // Crear los datos con porcentajes
    return Object.entries(typedExpenses).map(([categoryId, item]) => {
      const amount = item.amount;
      const count = item.count;
      
      // Manejar correctamente "Sin categoría" o valores nulos/undefined
      let numericId: number;
      let categoryName: string;
      let categoryIcon: React.ReactNode;
      let categoryColor: string;
      
      console.log("Procesando categoría:", categoryId, typeof categoryId);
      
      // Si es "null", "undefined", o "Sin categoría"
      if (categoryId === "null" || categoryId === "undefined" || categoryId === "Sin categoría") {
        numericId = 0;
        categoryName = "Sin categoría";
        categoryIcon = <MdMoreHoriz />;
        categoryColor = "#6B705C"; // Color para "Sin categoría"
      } else {
        // Intentar convertir a número
        numericId = parseInt(categoryId);
        
        // Si no es un número válido, usar ID 0 (Otros/Sin categoría)
        if (isNaN(numericId)) {
          numericId = 0;
          categoryName = categoryId; // Usar el ID como nombre
          categoryIcon = <MdMoreHoriz />;
          categoryColor = "#888888";
        } else {
          categoryName = categoryNames[numericId] || 'Categoría desconocida';
          categoryIcon = categoryIcons[numericId] || <MdMoreHoriz />;
          categoryColor = categoryColors[numericId] || '#888888';
        }
      }
      
      const absAmount = Math.abs(amount); // Asegurar que el valor sea positivo para cálculos
      
      return {
        categoryId: numericId,
        name: categoryName,
        icon: categoryIcon,
        color: categoryColor,
        value: amount, // Mantener el valor original con signo para la visualización
        percentage: totalExpenses ? (absAmount / totalExpenses) * 100 : 0,
        count,
      };
    }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // Ordenar por valor absoluto descendente
  }, [expensesByCategory]);

  // Si no hay datos, mostrar un mensaje con estilo Apple
  if (data.length === 0 || Object.keys(expensesByCategory).length === 0) {
    return (
      <Card className="h-full overflow-hidden fade-in dashboard-card">
        <CardHeader className="p-3 sm:p-4">
          <h3 className="text-lg font-medium">Gastos por Categoría</h3>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center h-[300px]">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600 font-medium text-lg">No hay gastos registrados</p>
            <p className="text-sm mt-2 text-gray-400">No hay transacciones en este periodo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Diseño estilo Apple - minimalista, simétrico y con espacio para respirar
  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card mx-0 px-0">
      <CardHeader className="p-3 sm:p-4 flex justify-between">
        <h3 className="text-lg font-medium">Gastos por Categoría</h3>
      </CardHeader>
      
      <CardContent className="p-4 pb-6 sm:p-6 sm:pb-8">
        {/* Layout al estilo Apple con más aire y simetría perfecta */}
        <div className="flex flex-col sm:flex-row h-full gap-6">
          {/* Gráfico donut perfectamente centrado (estilo Apple) */}
          <div className="flex justify-center items-center w-full sm:w-1/2 py-4 sm:py-0">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              {/* Círculo base (agujero central con sombra sutil) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-full shadow-inner"></div>
              </div>
              
              {/* Construcción del donut con segmentos circulares */}
              <svg className="w-full h-full" viewBox="0 0 100 100" style={{ zIndex: 10 }}>
                <desc>Gráfico de distribución de gastos</desc>
                {/* Círculo base (gris muy claro) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#f5f5f7"
                  strokeWidth="20"
                />
                {data.slice(0, Math.min(10, data.length)).map((item, idx) => {
                  // Calcular el desplazamiento y el dasharray para este segmento
                  const percentages = data.slice(0, Math.min(10, data.length)).map(c => c.percentage);
                  let offset = 0;
                  
                  for (let i = 0; i < idx; i++) {
                    offset += percentages[i];
                  }
                  
                  return (
                    <g key={item.categoryId}>
                      {/* Usamos una combinación de circle y eventos internos en g */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="transparent" 
                        stroke={item.color} 
                        strokeWidth="20"
                        strokeDasharray={`${item.percentage * 2.51} ${100 * 2.51}`}
                        strokeDashoffset={`${-offset * 2.51}`}
                        transform="rotate(-90 50 50)"
                      />
                      
                      {/* Área sensible para eventos sobrepuesta en el segmento */}
                      <path 
                        d={`M 50 50 L ${50 + 45*Math.cos((-90+offset*3.6)*Math.PI/180)} ${50 + 45*Math.sin((-90+offset*3.6)*Math.PI/180)} A 45 45 0 ${item.percentage > 50 ? 1 : 0} 1 ${50 + 45*Math.cos((-90+(offset+item.percentage)*3.6)*Math.PI/180)} ${50 + 45*Math.sin((-90+(offset+item.percentage)*3.6)*Math.PI/180)} Z`}
                        fill="transparent"
                        stroke="transparent"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => {
                          // Protección contra eventos fantasma
                          if (typeof document !== 'undefined' && document.hasFocus()) {
                            setHoverIndex(idx);
                          }
                        }}
                        onMouseLeave={() => {
                          // Protección contra eventos fantasma
                          if (typeof document !== 'undefined' && document.hasFocus()) {
                            setHoverIndex(null);
                          }
                        }}
                        onClick={() => {
                          // Protección contra eventos fantasma
                          if (typeof document !== 'undefined' && document.hasFocus()) {
                            setActiveIndex(idx === activeIndex ? null : idx);
                          }
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
              
              {/* Información en el centro con estilo Apple (más sutil y suave) */}
              {hoverIndex !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm text-center w-40">
                    <p className="font-semibold text-sm truncate">{data[hoverIndex].name}</p>
                    <p className="text-red-600 text-base font-medium">{formatCurrency(data[hoverIndex].value * -1)}</p>
                    <p className="text-gray-500 text-xs">{data[hoverIndex].percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Lista de categorías con estilo Apple (más limpio y minimalista) */}
          <div className="w-full sm:w-1/2 flex flex-col max-h-[320px] overflow-y-auto custom-scrollbar pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
            {data.map((item, idx) => (
              <div 
                key={item.categoryId} 
                className={`flex items-center py-2.5 cursor-pointer transition-all duration-200 ${idx < 10 && (idx === activeIndex || idx === hoverIndex) ? 'bg-gray-50 rounded-lg' : ''}`}
                onMouseOver={() => {
                  // Protección contra eventos fantasma
                  if (idx < 10 && typeof document !== 'undefined' && document.hasFocus()) {
                    setHoverIndex(idx);
                  }
                }}
                onMouseOut={() => {
                  // Protección contra eventos fantasma
                  if (typeof document !== 'undefined' && document.hasFocus()) {
                    setHoverIndex(null);
                  }
                }}
                onClick={() => {
                  // Protección contra eventos fantasma
                  if (idx < 10 && typeof document !== 'undefined' && document.hasFocus()) {
                    setActiveIndex(idx === activeIndex ? null : idx);
                  }
                }}
              >
                {/* Círculo con icono (estilo Apple con tamaño perfecto) */}
                <div className="relative mr-3">
                  <div className="w-10 h-10 sm:w-10 sm:h-10 bg-gray-50 rounded-full flex items-center justify-center">
                    {/* Indicador de color con diseño más sutil */}
                    <div 
                      className="absolute left-0 top-0 w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    {/* Icono */}
                    <span className="text-base text-gray-600">{item.icon}</span>
                  </div>
                </div>
                
                {/* Información de la categoría (tipografía mejorada) */}
                <div className="flex-grow">
                  <div className="text-sm font-medium text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.count} {item.count === 1 ? 'transacción' : 'transacciones'}
                  </div>
                </div>
                
                {/* Valores y porcentajes (alineado y espaciado perfecto) */}
                <div className="text-right pl-2">
                  <div className="text-base font-medium text-red-600">
                    {formatCurrency(item.value * -1)}
                  </div>
                  <div className="text-xs text-gray-400">
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

// Versión centralizada que ahora usa los filtros globales del dashboard
export default ExpensesByCategoryApple;