import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingDown, CalendarIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';

// Función para calcular un arco para el gráfico de donut
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  // Asegurarse de que el ángulo de inicio y fin estén en el rango [0, 360]
  startAngle = startAngle % 360;
  if (startAngle < 0) startAngle += 360;
  
  endAngle = endAngle % 360;
  if (endAngle < 0) endAngle += 360;
  
  // Si el ángulo inicial es mayor que el final, ajustar para que sea continuo
  if (startAngle > endAngle) {
    endAngle += 360;
  }
  
  // Limitar a un círculo completo como máximo
  if (endAngle - startAngle > 360) {
    endAngle = startAngle + 360;
  }
  
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  
  const d = [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
  
  return d;
}

interface ExpenseByCategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
  categoryId?: number | string;
}

const COLORS = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#5AC8FA',
  '#007AFF', '#5E5CE6', '#AF52DE', '#FF2D55', '#A2845E',
];

const ExpensesByCategoryNew: React.FC<{
  period?: string;
  onPeriodChange?: (period: string) => void;
}> = ({ period, onPeriodChange }) => {
  // Obtener las transacciones directamente - menos refrescos para mejor rendimiento
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    refetchInterval: 30000, // Refrescar cada 30 segundos en lugar de 5 para reducir carga
    refetchOnWindowFocus: false, // Desactivar refresco al volver a la ventana para mejorar rendimiento
    staleTime: 1000 * 60 * 5, // Considerar datos frescos por 5 minutos
  });
  
  // Obtener las categorías directamente - optimizado para rendimiento
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    refetchOnWindowFocus: false, // No refrescar al volver a la ventana
    staleTime: 1000 * 60 * 30, // Las categorías raramente cambian, mantener frescas por 30 minutos
  });
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period || "2025-all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    try {
      if (selectedPeriod) {
        const parts = selectedPeriod.split('-');
        const year = parts[0];
        
        if (parts.length > 1) {
          const timePeriod = parts[1];
          
          if (timePeriod.startsWith('q')) {
            // Es un trimestre (q1, q2, q3, q4)
            const quarterNum = parseInt(timePeriod.substring(1));
            if (isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
              throw new Error(`Trimestre inválido: ${timePeriod}`);
            }
            
            const startMonth = (quarterNum - 1) * 3;
            const endMonth = startMonth + 2;
            
            const startDate = new Date(parseInt(year), startMonth, 1);
            const endDate = new Date(parseInt(year), endMonth + 1, 0);
            
            const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
            const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
            
            setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
          } else if (timePeriod === 'all') {
            setPeriodLabel(`Año ${year} completo`);
          } else {
            // Es un mes específico
            const month = parseInt(timePeriod) - 1;
            if (isNaN(month) || month < 0 || month > 11) {
              throw new Error(`Mes inválido: ${timePeriod}`);
            }
            
            const startDate = new Date(parseInt(year), month, 1);
            const endDate = new Date(parseInt(year), month + 1, 0);
            
            const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
            const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
            
            setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
          }
        } else if (year === 'all') {
          setPeriodLabel(`Año ${currentYear} completo`);
        } else {
          const yearNum = parseInt(year);
          if (isNaN(yearNum)) {
            throw new Error(`Año inválido: ${year}`);
          }
          setPeriodLabel(`Año ${year} completo`);
        }
      } else {
        setPeriodLabel(`Año ${currentYear} completo`);
      }
    } catch (error) {
      console.error("Error procesando periodo:", error);
      setPeriodLabel(`Año ${currentYear} completo`);
    }
  }, [selectedPeriod]);

  // Extraer los años disponibles de las transacciones
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Crear un objeto para almacenar años únicos
      const yearsSet: {[key: number]: boolean} = {};
      
      // Recopilar años únicos
      transactions.forEach(t => {
        const date = new Date(t.date);
        const year = date.getFullYear();
        yearsSet[year] = true;
      });
      
      // Convertir a array y ordenar
      const uniqueYears = Object.keys(yearsSet)
        .map(year => parseInt(year))
        .sort((a, b) => b - a); // Ordenar de más reciente a más antiguo
      
      setAvailableYears(uniqueYears);
      
      // Si no se ha seleccionado un período, usar el año más reciente
      if (!selectedPeriod && uniqueYears.length > 0) {
        const mostRecentYear = uniqueYears[0];
        const newPeriod = `${mostRecentYear}-all`;
        setSelectedPeriod(newPeriod);
        if (onPeriodChange) {
          onPeriodChange(newPeriod);
        }
      }
    } else {
      // Si no hay transacciones, usar el año actual
      const currentYear = new Date().getFullYear();
      setAvailableYears([currentYear]);
      
      // Si no se ha seleccionado un período, usar el año actual
      if (!selectedPeriod) {
        const newPeriod = `${currentYear}-all`;
        setSelectedPeriod(newPeriod);
        if (onPeriodChange) {
          onPeriodChange(newPeriod);
        }
      }
    }
  }, [transactions, onPeriodChange, selectedPeriod]);
  
  // Manejar el cambio de período
  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
  };

  // Función para filtrar transacciones por período
  const filterTransactionsByPeriod = (periodValue: string, allTransactions: any[]) => {
    if (!periodValue || !allTransactions || allTransactions.length === 0) {
      return allTransactions;
    }
    
    try {
      const parts = periodValue.split('-');
      if (parts.length < 2) return allTransactions;
      
      const year = parseInt(parts[0]);
      const period = parts[1];
      
      if (isNaN(year)) return allTransactions;
      
      return allTransactions.filter((t) => {
        const date = new Date(t.date);
        const transactionYear = date.getFullYear();
        
        // Si el año no coincide, filtrar
        if (transactionYear !== year) return false;
        
        // Si es "all", incluir todas las transacciones del año
        if (period === 'all') return true;
        
        const month = date.getMonth() + 1; // JavaScript usa meses 0-11
        
        // Filtro por mes específico (1-12)
        if (!isNaN(parseInt(period)) && parseInt(period) > 0 && parseInt(period) <= 12) {
          return month === parseInt(period);
        }
        
        // Filtro por trimestre (q1, q2, q3, q4)
        if (period.startsWith('q')) {
          const quarter = parseInt(period.substring(1));
          if (!isNaN(quarter) && quarter >= 1 && quarter <= 4) {
            const quarterStart = (quarter - 1) * 3 + 1; // Mes de inicio del trimestre (1-indexed)
            const quarterEnd = quarter * 3; // Mes de fin del trimestre (1-indexed)
            return month >= quarterStart && month <= quarterEnd;
          }
        }
        
        return true;
      });
    } catch (error) {
      console.error("Error filtrando transacciones por período:", error);
      return allTransactions;
    }
  };

  // Actualizar los datos cuando cambie el período seleccionado o cuando cambien las transacciones
  useEffect(() => {
    if (transactions && categories && transactions.length > 0) {
      // Sin logging para mejorar el rendimiento
      
      // Filtrar transacciones por el período seleccionado
      const filteredTransactions = filterTransactionsByPeriod(selectedPeriod, transactions);
      
      const expenses = filteredTransactions.filter(t => t.type === 'expense');
      
      if (expenses.length === 0) {
        setData([]);
        return;
      }
      
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expensesByCategory: Record<string, { amount: number, count: number, name: string }> = {};
      
      expenses.forEach((transaction) => {
        // Intentamos encontrar la categoría por id primero, luego por comparación con el nombre
        const category = categories.find(c => c.id === transaction.categoryId) || 
                         categories.find(c => c.name === transaction.category);
        
        // Si tenemos un categoryId en la transacción, usarlo; si no, usar el id de la categoría encontrada o 'uncategorized'
        const categoryId = transaction.categoryId || (category ? category.id : 'uncategorized');
        
        // Nombre de la categoría: del objeto categoría, del campo category de la transacción, o 'Sin categoría'
        const categoryName = category?.name || transaction.category || 'Sin categoría';
        
        if (expensesByCategory[categoryId]) {
          expensesByCategory[categoryId].amount += Number(transaction.amount);
          expensesByCategory[categoryId].count += 1;
        } else {
          expensesByCategory[categoryId] = {
            amount: Number(transaction.amount),
            count: 1,
            name: categoryName
          };
        }
      });
      
      // Extraer datos y procesar
      let processedData = Object.entries(expensesByCategory)
        .map(([id, data], index) => {
          // Buscar la categoría por id o por nombre para obtener el color e icono
          const category = categories.find(c => c.id.toString() === id.toString()) || 
                          categories.find(c => c.name === data.name);
          
          return {
            name: data.name,
            value: data.amount,
            count: data.count,
            color: category?.color || COLORS[index % COLORS.length],
            percentage: (data.amount / totalExpenses) * 100,
            icon: category?.icon || '📊',
            categoryId: id
          };
        })
        .filter(item => item.value > 0);
      
      // Ordenar categorías por valor (de mayor a menor)
      processedData.sort((a, b) => b.value - a.value);
      
      // No limitamos la cantidad de categorías para mostrar todas
      
      setData(processedData);
    }
  }, [transactions, categories, selectedPeriod]);

  if (!data.length) {
    return (
      <Card className="h-full overflow-hidden fade-in dashboard-card mx-0 px-0">
        <CardHeader className="p-2 sm:p-3 flex justify-end">
          {/* Solo el selector de período, sin título */}
          <Select 
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {/* Generar opciones para cada año disponible */}
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
        <CardContent className="p-6 flex flex-col items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p>No hay gastos registrados para este período</p>
            <p className="text-sm mt-2">Selecciona otro período o añade gastos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Diseño adaptado a los nuevos requerimientos - sin título y con tarjeta más grande
  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card mx-0 px-0">
      <CardHeader className="p-2 sm:p-3 flex justify-end">
        {/* Solo el selector de período, sin título */}
        <Select 
          value={selectedPeriod}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {/* Generar opciones para cada año disponible */}
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
      
      <CardContent className="p-2 sm:p-4">
        
        {/* Contenido principal con donut y lista de categorías */}
        <div className="flex h-full">
          {/* Gráfico donut (alineado correctamente) */}
          <div className="w-1/2 flex items-center justify-center pl-0 sm:pl-5 pt-1">
            {/* Gráfico de donut (anillo) - con tamaño aumentado */}
            <div className="relative w-40 h-40 sm:w-52 sm:h-52">
              {/* Círculo base (agujero blanco del centro) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full"></div>
              </div>
              
              {/* Construcción del donut con segmentos circulares */}
              <svg className="w-full h-full" viewBox="0 0 100 100" style={{ zIndex: 10 }}>
                <desc>Gráfico de distribución de gastos</desc>
                {/* Círculo base (gris claro) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="transparent" 
                  stroke="#f1f1f1"
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
              
              {/* Información en el centro solo cuando hay mouse hover sobre un segmento */}
              {hoverIndex !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-3 rounded-md shadow-sm text-center w-36">
                    <p className="font-semibold text-sm truncate">{data[hoverIndex].name}</p>
                    <p className="text-red-600 text-base">{formatCurrency(data[hoverIndex].value * -1)}</p>
                    <p className="text-gray-500 text-xs">{data[hoverIndex].percentage.toFixed(2)}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Lado derecho: Lista de categorías con scroll cuando es necesario - altura aumentada */}
          <div className="w-1/2 flex flex-col h-full pl-0 max-h-[320px] overflow-y-auto custom-scrollbar pr-1 sm:pr-3 pt-3">
            {data.map((item, idx) => (
              <div 
                key={item.categoryId} 
                className={`flex items-center py-1 cursor-pointer transition-colors ${idx < 10 && (idx === activeIndex || idx === hoverIndex) ? 'bg-gray-100 rounded' : ''}`}
                onMouseOver={() => {
                  if (idx < 10) {
                    setHoverIndex(idx);
                  }
                }}
                onMouseOut={() => setHoverIndex(null)}
                onClick={() => {
                  // Solo permitir clic en elementos que están en el gráfico (primeros 10)
                  if (idx < 10) {
                    setActiveIndex(idx === activeIndex ? null : idx);
                  }
                }}
              >
                {/* Círculo con icono */}
                <div className="relative mr-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {/* Indicador de color */}
                    <div 
                      className="absolute left-0 top-0 w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    {/* Icono */}
                    <span className="text-sm sm:text-lg">{item.icon}</span>
                  </div>
                </div>
                
                {/* Información de la categoría */}
                <div className="flex-grow">
                  <div className="text-sm sm:text-base font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {item.count} {item.count === 1 ? 'trans.' : 'trans.'}
                  </div>
                </div>
                
                {/* Valores y porcentajes */}
                <div className="text-right mr-2 sm:mr-8">
                  <div className="text-base font-medium text-red-600">
                    {formatCurrency(item.value * -1)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.percentage.toFixed(2)}%
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

export default ExpensesByCategoryNew;