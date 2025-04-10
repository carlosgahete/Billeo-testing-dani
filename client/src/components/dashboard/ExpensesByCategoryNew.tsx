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
  transactions: any[];
  categories: any[];
  period?: string;
  onPeriodChange?: (period: string) => void;
}> = ({ transactions, categories, period, onPeriodChange }) => {
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period || "2025-all");
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    try {
      if (period) {
        const parts = period.split('-');
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
  }, [period]);

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
    } else {
      // Si no hay transacciones, usar el año actual
      setAvailableYears([new Date().getFullYear()]);
    }
  }, [transactions]);
  
  // Manejar el cambio de período
  const handlePeriodChange = (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
  };

  useEffect(() => {
    if (transactions && categories && transactions.length > 0) {
      const expenses = transactions.filter(t => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expensesByCategory: Record<string, { amount: number, count: number, name: string }> = {};
      
      expenses.forEach((transaction) => {
        const category = categories.find(c => c.id === transaction.categoryId);
        const categoryId = transaction.categoryId || 'uncategorized';
        const categoryName = category?.name || 'Sin categoría';
        
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
          const category = categories.find(c => c.id.toString() === id.toString());
          
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
      
      // Encontrar la categoría "Comida"
      const comidaIndex = processedData.findIndex(item => item.name === "Comida");
      
      // Si existe "Comida", moverla al final
      if (comidaIndex !== -1) {
        const comida = processedData[comidaIndex];
        processedData.splice(comidaIndex, 1); // Eliminarla de su posición actual
        
        // Ordenar el resto por valor
        processedData.sort((a, b) => b.value - a.value);
        
        // Limitar a 4 elementos para dejar espacio para "Comida"
        processedData = processedData.slice(0, 4);
        
        // Añadir "Comida" al final
        processedData.push(comida);
      } else {
        // Si no existe "Comida", simplemente ordenar y limitar a 5
        processedData.sort((a, b) => b.value - a.value);
        processedData = processedData.slice(0, 5);
      }
      
      setData(processedData);
    }
  }, [transactions, categories]);

  if (!data.length) {
    return (
      <Card className="h-full">
        <CardHeader className="bg-red-50 p-4">
          <CardTitle className="text-lg text-red-700 flex items-center">
            <TrendingDown className="mr-2 h-5 w-5" />
            Gastos por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-[300px]">
          <div className="text-center text-gray-500">
            <p>No hay gastos registrados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Diseño exactamente como la imagen de referencia
  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card">
      <CardHeader className="bg-red-50 p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-red-700 flex items-center">
            <TrendingDown className="mr-2 h-4 w-4" />
            Gastos por Categoría
          </CardTitle>
          
          {/* Selector de período */}
          <Select 
            value={selectedPeriod}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="w-32 h-7 text-xs bg-white/80">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              {/* Generar opciones para cada año disponible */}
              {availableYears.map(year => (
                <React.Fragment key={year}>
                  <SelectItem value={`${year}-all`}>Año {year} completo</SelectItem>
                  <SelectItem value={`${year}-q1`}>Q1 {year} (Ene-Mar)</SelectItem>
                  <SelectItem value={`${year}-q2`}>Q2 {year} (Abr-Jun)</SelectItem>
                  <SelectItem value={`${year}-q3`}>Q3 {year} (Jul-Sep)</SelectItem>
                  <SelectItem value={`${year}-q4`}>Q4 {year} (Oct-Dic)</SelectItem>
                  <SelectItem value={`${year}-1`}>Enero {year}</SelectItem>
                  <SelectItem value={`${year}-2`}>Febrero {year}</SelectItem>
                  <SelectItem value={`${year}-3`}>Marzo {year}</SelectItem>
                  <SelectItem value={`${year}-4`}>Abril {year}</SelectItem>
                  <SelectItem value={`${year}-5`}>Mayo {year}</SelectItem>
                  <SelectItem value={`${year}-6`}>Junio {year}</SelectItem>
                  <SelectItem value={`${year}-7`}>Julio {year}</SelectItem>
                  <SelectItem value={`${year}-8`}>Agosto {year}</SelectItem>
                  <SelectItem value={`${year}-9`}>Septiembre {year}</SelectItem>
                  <SelectItem value={`${year}-10`}>Octubre {year}</SelectItem>
                  <SelectItem value={`${year}-11`}>Noviembre {year}</SelectItem>
                  <SelectItem value={`${year}-12`}>Diciembre {year}</SelectItem>
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        {/* Título del periodo */}
        <div className="mb-2 text-gray-700 text-xs">
          {periodLabel}
        </div>
        
        {/* Contenido principal con donut y lista de categorías */}
        <div className="flex h-full">
          {/* Lado izquierdo: Gráfico donut como en la imagen de referencia */}
          <div className="w-[45%] flex items-center justify-start pl-2.5 pr-0">
            {/* Gráfico de donut (anillo) */}
            <div className="relative w-44 h-44">
              {/* Círculo base (agujero blanco del centro) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white rounded-full"></div>
              </div>
              
              {/* Construcción del donut con segmentos circulares */}
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <desc>Gráfico de distribución de gastos</desc>
                {data.slice(0, 5).map((item, idx) => {
                  // Calcular el desplazamiento y el dasharray para este segmento
                  const percentages = data.slice(0, 5).map(c => c.percentage);
                  let offset = 0;
                  
                  for (let i = 0; i < idx; i++) {
                    offset += percentages[i];
                  }
                  
                  return (
                    <g key={item.categoryId}>
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
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setActiveIndex(idx === activeIndex ? null : idx)}
                      />
                    </g>
                  );
                })}
              </svg>
              
              {/* Información tooltip en el centro */}
              {activeIndex !== null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-2 rounded-md shadow-sm text-center w-28">
                    <p className="font-semibold text-sm truncate">{data[activeIndex].name}</p>
                    <p className="text-red-600 text-sm">{formatCurrency(data[activeIndex].value * -1)}</p>
                    <p className="text-gray-500 text-xs">{data[activeIndex].percentage.toFixed(2)}%</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Lado derecho: Lista de categorías exactamente como en la imagen */}
          <div className="w-[55%] flex flex-col justify-between h-full pl-0 -ml-3">
            {data.slice(0, 4).map((item) => (
              <div key={item.categoryId} className="flex items-center py-1">
                {/* Círculo con icono */}
                <div className="relative mr-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    {/* Indicador de color */}
                    <div 
                      className="absolute left-0 top-0 w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    {/* Icono */}
                    <span className="text-xl">{item.icon}</span>
                  </div>
                </div>
                
                {/* Información de la categoría */}
                <div className="flex-grow">
                  <div className="text-base font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.count} {item.count === 1 ? 'transacción' : 'transacciones'}
                  </div>
                </div>
                
                {/* Valores y porcentajes */}
                <div className="text-right mr-8">
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