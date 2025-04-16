import React, { useState, useEffect, useMemo } from 'react';
import { ComponentStabilizer } from '@/components/ui/component-stabilizer';
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

// Año predeterminado fijo para facilitar desarrollo y pruebas
const CURRENT_YEAR = 2025;
// Generamos los últimos 3 años para seleccionar
const availableYears = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

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
  period?: string;
  periodLabel?: string;
  onPeriodChange?: (period: string) => void;
}

const ExpensesByCategoryApple: React.FC<ExpensesByCategoryProps> = ({ 
  expensesByCategory: propExpensesByCategory, 
  period = `${CURRENT_YEAR}-all`,
  periodLabel = `Año ${CURRENT_YEAR} completo`, 
  onPeriodChange 
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period);
  
  // Obtener datos del dashboard usando el hook centralizado
  const { data: dashboardData } = useDashboardData();
  
  // Actualizar el período seleccionado cuando cambie el prop period
  useEffect(() => {
    setSelectedPeriod(period);
  }, [period]);
  
  // Usamos los datos de categorías que vienen del prop si están disponibles,
  // o los del dashboardData si el prop está vacío
  const expensesByCategory = useMemo(() => {
    console.log("📊 ExpensesByCategoryApple: Actualizando datos para período", selectedPeriod);
    if (propExpensesByCategory && Object.keys(propExpensesByCategory).length > 0) {
      console.log("📊 ExpensesByCategoryApple: Usando datos de prop");
      return propExpensesByCategory;
    } else if (dashboardData?.expensesByCategory) {
      console.log("📊 ExpensesByCategoryApple: Usando datos de dashboardData");
      return dashboardData.expensesByCategory;
    }
    console.log("📊 ExpensesByCategoryApple: No hay datos disponibles");
    return {};
  }, [propExpensesByCategory, dashboardData?.expensesByCategory, selectedPeriod]);

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
      const numericId = parseInt(categoryId);
      const absAmount = Math.abs(amount); // Asegurar que el valor sea positivo para cálculos
      
      return {
        categoryId: numericId,
        name: categoryNames[numericId] || 'Categoría desconocida',
        icon: categoryIcons[numericId] || <MdMoreHoriz />,
        color: categoryColors[numericId] || '#888888',
        value: amount, // Mantener el valor original con signo para la visualización
        percentage: totalExpenses ? (absAmount / totalExpenses) * 100 : 0,
        count,
      };
    }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // Ordenar por valor absoluto descendente
  }, [expensesByCategory]);

  // Manejar el cambio de período
  const handlePeriodChange = (value: string) => {
    console.log('✅ Cambiando período a:', value);
    setSelectedPeriod(value);
    if (onPeriodChange) {
      onPeriodChange(value);
    }
  };

  // Añadir un log para depurar la carga de datos
  useEffect(() => {
    console.log("ExpensesByCategoryApple - Estado actual:", {
      periodo: selectedPeriod, 
      hayDatos: Object.keys(expensesByCategory).length > 0,
      datosTransformados: data.length
    });
  }, [selectedPeriod, expensesByCategory, data]);

  // Si no hay datos, mostrar un mensaje con estilo Apple
  if (data.length === 0 || Object.keys(expensesByCategory).length === 0) {
    return (
      <Card className="h-full overflow-hidden fade-in dashboard-card">
        <CardHeader className="p-3 sm:p-4 flex justify-end">
          <Select 
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="w-44 h-8 text-xs bg-gray-50 border-0 rounded-full shadow-sm hover:bg-gray-100 transition-colors">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent className="rounded-lg shadow-md">
              {availableYears.map(year => [
                <SelectItem key={`${year}-all`} value={`${year}-all`}>Año {year} completo</SelectItem>,
                <SelectItem key={`${year}-q1`} value={`${year}-q1`}>Q1 {year} (Ene-Mar)</SelectItem>,
                <SelectItem key={`${year}-q2`} value={`${year}-q2`}>Q2 {year} (Abr-Jun)</SelectItem>,
                <SelectItem key={`${year}-q3`} value={`${year}-q3`}>Q3 {year} (Jul-Sep)</SelectItem>,
                <SelectItem key={`${year}-q4`} value={`${year}-q4`}>Q4 {year} (Oct-Dic)</SelectItem>,
                <SelectItem key={`${year}-1`} value={`${year}-1`}>Enero {year}</SelectItem>,
                <SelectItem key={`${year}-2`} value={`${year}-2`}>Febrero {year}</SelectItem>,
                <SelectItem key={`${year}-3`} value={`${year}-3`}>Marzo {year}</SelectItem>,
                <SelectItem key={`${year}-4`} value={`${year}-4`}>Abril {year}</SelectItem>,
                <SelectItem key={`${year}-5`} value={`${year}-5`}>Mayo {year}</SelectItem>,
                <SelectItem key={`${year}-6`} value={`${year}-6`}>Junio {year}</SelectItem>,
                <SelectItem key={`${year}-7`} value={`${year}-7`}>Julio {year}</SelectItem>,
                <SelectItem key={`${year}-8`} value={`${year}-8`}>Agosto {year}</SelectItem>,
                <SelectItem key={`${year}-9`} value={`${year}-9`}>Septiembre {year}</SelectItem>,
                <SelectItem key={`${year}-10`} value={`${year}-10`}>Octubre {year}</SelectItem>,
                <SelectItem key={`${year}-11`} value={`${year}-11`}>Noviembre {year}</SelectItem>,
                <SelectItem key={`${year}-12`} value={`${year}-12`}>Diciembre {year}</SelectItem>
              ])}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 flex flex-col items-center justify-center h-[300px]">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-600 font-medium text-lg">No hay gastos registrados</p>
            <p className="text-sm mt-2 text-gray-400">Selecciona otro período o añade gastos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Diseño estilo Apple - minimalista, simétrico y con espacio para respirar
  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card mx-0 px-0">
      <CardHeader className="p-3 sm:p-4 flex justify-end">
        {/* Selector de período con estilo Apple */}
        <Select 
          value={selectedPeriod}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger className="w-44 h-8 text-xs bg-gray-50 border-0 rounded-full shadow-sm hover:bg-gray-100 transition-colors">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent className="rounded-lg shadow-md">
            {availableYears.map(year => [
              <SelectItem key={`${year}-all`} value={`${year}-all`}>Año {year} completo</SelectItem>,
              <SelectItem key={`${year}-q1`} value={`${year}-q1`}>Q1 {year} (Ene-Mar)</SelectItem>,
              <SelectItem key={`${year}-q2`} value={`${year}-q2`}>Q2 {year} (Abr-Jun)</SelectItem>,
              <SelectItem key={`${year}-q3`} value={`${year}-q3`}>Q3 {year} (Jul-Sep)</SelectItem>,
              <SelectItem key={`${year}-q4`} value={`${year}-q4`}>Q4 {year} (Oct-Dic)</SelectItem>,
              <SelectItem key={`${year}-1`} value={`${year}-1`}>Enero {year}</SelectItem>,
              <SelectItem key={`${year}-2`} value={`${year}-2`}>Febrero {year}</SelectItem>,
              <SelectItem key={`${year}-3`} value={`${year}-3`}>Marzo {year}</SelectItem>,
              <SelectItem key={`${year}-4`} value={`${year}-4`}>Abril {year}</SelectItem>,
              <SelectItem key={`${year}-5`} value={`${year}-5`}>Mayo {year}</SelectItem>,
              <SelectItem key={`${year}-6`} value={`${year}-6`}>Junio {year}</SelectItem>,
              <SelectItem key={`${year}-7`} value={`${year}-7`}>Julio {year}</SelectItem>,
              <SelectItem key={`${year}-8`} value={`${year}-8`}>Agosto {year}</SelectItem>,
              <SelectItem key={`${year}-9`} value={`${year}-9`}>Septiembre {year}</SelectItem>,
              <SelectItem key={`${year}-10`} value={`${year}-10`}>Octubre {year}</SelectItem>,
              <SelectItem key={`${year}-11`} value={`${year}-11`}>Noviembre {year}</SelectItem>,
              <SelectItem key={`${year}-12`} value={`${year}-12`}>Diciembre {year}</SelectItem>
            ])}
          </SelectContent>
        </Select>
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
                        onMouseEnter={() => setHoverIndex(idx)}
                        onMouseLeave={() => setHoverIndex(null)}
                        onClick={() => setActiveIndex(idx === activeIndex ? null : idx)}
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
                  if (idx < 10) setHoverIndex(idx);
                }}
                onMouseOut={() => setHoverIndex(null)}
                onClick={() => {
                  if (idx < 10) setActiveIndex(idx === activeIndex ? null : idx);
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

// Versión final con estabilizador para evitar eventos fantasma
const StabilizedExpensesByCategoryApple: React.FC<ExpensesByCategoryProps> = (props) => {
  return (
    <ComponentStabilizer stabilityDelay={2000} showDebugInfo={true}>
      <ExpensesByCategoryApple {...props} />
    </ComponentStabilizer>
  );
};

export default StabilizedExpensesByCategoryApple;