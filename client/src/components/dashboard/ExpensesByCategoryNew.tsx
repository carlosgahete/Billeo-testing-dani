import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Filter, TrendingDown } from 'lucide-react';
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
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";

// Tipo para los datos de gastos por categoría
interface ExpenseByCategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
  categoryId?: number | string;
}

// Colores para el gráfico - Estilo Apple
const COLORS = [
  '#000000', // Negro
  '#5E5CE6', // Violeta
  '#007AFF', // Azul
  '#64D2FF', // Azul claro
  '#5AC8FA', // Cyan
  '#00C7BE', // Turquesa
  '#30C48D', // Verde turquesa
  '#34C759', // Verde
  '#BFD641', // Verde lima
  '#FFD60A', // Amarillo
  '#FF9500', // Naranja
  '#FF3B30', // Rojo
  '#FF2D55', // Rosa
  '#AF52DE', // Morado
  '#A2845E', // Marrón
];

const ExpensesByCategory: React.FC<{
  transactions: any[];  // Transacciones
  categories: any[];    // Categorías
  period?: string;      // Período seleccionado
}> = ({ transactions, categories, period }) => {
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filteredData, setFilteredData] = useState<ExpenseByCategoryData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period || "2025-all");
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>(transactions || []);
  const [forceUpdate, setForceUpdate] = useState<number>(0); // Contador para forzar la actualización
  
  // Efecto para generar la etiqueta del período seleccionado
  // Función para formatear el período y obtener las fechas de inicio y fin
  const formatPeriodAndGetDates = (periodStr: string): { 
    label: string, 
    startDate: Date | null, 
    endDate: Date | null 
  } => {
    const currentYear = new Date().getFullYear();
    const result = { label: "", startDate: null as Date | null, endDate: null as Date | null };
    
    try {
      if (!periodStr) {
        // Sin período especificado, usar año actual
        result.startDate = new Date(currentYear, 0, 1);
        result.endDate = new Date(currentYear, 11, 31);
        
        const formattedStart = format(result.startDate, "d MMM yyyy", { locale: es });
        const formattedEnd = format(result.endDate, "d MMM yyyy", { locale: es });
        
        result.label = `${formattedStart} - ${formattedEnd}`;
        return result;
      }
      
      // Formato: year-quarter o year-month o year-all o year-week1, etc.
      const parts = periodStr.split('-');
      const year = parts[0];
      
      // Verificar que el año es un número válido
      if (year === 'all') {
        result.label = "Todos los períodos";
        return result;
      }
      
      const yearNum = parseInt(year);
      if (isNaN(yearNum)) {
        result.label = "Período actual";
        return result;
      }
      
      if (parts.length > 1) {
        const timePeriod = parts[1];
        
        if (timePeriod === 'all') {
          // Año completo
          result.startDate = new Date(yearNum, 0, 1);
          result.endDate = new Date(yearNum, 11, 31);
          
          const formattedStart = format(result.startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(result.endDate, "d MMM yyyy", { locale: es });
          
          result.label = `${formattedStart} - ${formattedEnd}`;
        } else if (timePeriod.startsWith('q') || timePeriod.startsWith('Q')) {
          // Período trimestral - 'q1', 'Q1', etc.
          const quarterStr = timePeriod.substring(1);
          const quarter = parseInt(quarterStr);
          
          if (isNaN(quarter) || quarter < 1 || quarter > 4) {
            result.label = `Año ${yearNum}`;
            result.startDate = new Date(yearNum, 0, 1);
            result.endDate = new Date(yearNum, 11, 31);
            return result;
          }
          
          const startMonth = (quarter - 1) * 3;
          const endMonth = startMonth + 2;
          
          result.startDate = new Date(yearNum, startMonth, 1);
          result.endDate = new Date(yearNum, endMonth + 1, 0);
          
          const formattedStart = format(result.startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(result.endDate, "d MMM yyyy", { locale: es });
          
          result.label = `${formattedStart} - ${formattedEnd}`;
        } else if (timePeriod.startsWith('w') || timePeriod.startsWith('W')) {
          // Semana del año - 'w1', 'W1', etc.
          const weekStr = timePeriod.substring(1);
          const weekNum = parseInt(weekStr);
          
          if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
            result.label = `Año ${yearNum}`;
            result.startDate = new Date(yearNum, 0, 1);
            result.endDate = new Date(yearNum, 11, 31);
            return result;
          }
          
          // Calcular la fecha de la semana (esto es aproximado)
          const firstDayOfYear = new Date(yearNum, 0, 1);
          const dayOffset = firstDayOfYear.getDay(); // 0 = domingo, 1 = lunes, etc.
          const daysToAdd = (weekNum - 1) * 7 - dayOffset + 1; // Ajustar al lunes de esa semana
          
          result.startDate = new Date(yearNum, 0, 1 + daysToAdd);
          result.endDate = new Date(yearNum, 0, 1 + daysToAdd + 6); // 6 días después = domingo
          
          const formattedStart = format(result.startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(result.endDate, "d MMM yyyy", { locale: es });
          
          result.label = `${formattedStart} - ${formattedEnd}`;
        } else {
          // Período mensual - asumimos que es un número del 1-12
          const monthNum = parseInt(timePeriod);
          
          if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            result.label = `Año ${yearNum}`;
            result.startDate = new Date(yearNum, 0, 1);
            result.endDate = new Date(yearNum, 11, 31);
            return result;
          }
          
          const month = monthNum - 1; // Ajustar a índice 0-11
          result.startDate = new Date(yearNum, month, 1);
          result.endDate = new Date(yearNum, month + 1, 0);
          
          const formattedStart = format(result.startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(result.endDate, "d MMM yyyy", { locale: es });
          
          result.label = `${formattedStart} - ${formattedEnd}`;
        }
      } else {
        // Año completo
        result.startDate = new Date(yearNum, 0, 1);
        result.endDate = new Date(yearNum, 11, 31);
        
        const formattedStart = format(result.startDate, "d MMM yyyy", { locale: es });
        const formattedEnd = format(result.endDate, "d MMM yyyy", { locale: es });
        
        result.label = `${formattedStart} - ${formattedEnd}`;
      }
    } catch (error) {
      console.error("Error al formatear el período:", error);
      result.label = "Período actual";
    }
    
    return result;
  };

  // Efecto para procesar el período seleccionado
  useEffect(() => {
    // Si selectedPeriod es 'temp-reset', no hagas nada, es un valor temporal
    if (selectedPeriod === 'temp-reset') return;

    const periodData = formatPeriodAndGetDates(selectedPeriod);
    setPeriodLabel(periodData.label);
    
    // Filtrar transacciones por período si hay fechas
    if (periodData.startDate && periodData.endDate) {
      const filtered = transactions.filter(t => {
        if (!t.date) return false;
        
        const txDate = new Date(t.date);
        
        // Log para depuración extendida
        console.log(`Comparando fecha: ${txDate.toISOString()}`);
        console.log(`Con periodo: ${periodData.startDate?.toISOString()} - ${periodData.endDate?.toISOString()}`);
        console.log(`Resultado: ${txDate >= periodData.startDate! && txDate <= periodData.endDate!}`);
        
        // Formato año/mes para comparación más simple
        const txYearMonth = txDate.getFullYear() + '-' + (txDate.getMonth() + 1);
        const startYearMonth = periodData.startDate!.getFullYear() + '-' + (periodData.startDate!.getMonth() + 1);
        const endYearMonth = periodData.endDate!.getFullYear() + '-' + (periodData.endDate!.getMonth() + 1);
        
        // Para filtros de mes específico, solo comparamos año-mes
        if (selectedPeriod.split('-').length === 2 && !selectedPeriod.includes('q')) {
          const month = parseInt(selectedPeriod.split('-')[1]);
          if (!isNaN(month) && month >= 1 && month <= 12) {
            const targetYearMonth = selectedPeriod.split('-')[0] + '-' + month;
            console.log(`Comparando año-mes: ${txYearMonth} con ${targetYearMonth}`);
            return txYearMonth === targetYearMonth;
          }
        }
        
        // Para otros filtros (trimestres, año completo) usamos comparación de fechas normal
        return txDate >= periodData.startDate! && txDate <= periodData.endDate!;
      });
      
      // Log para depuración
      console.log(`Filtrando por período: ${selectedPeriod}, encontradas ${filtered.length} transacciones`);
      
      setFilteredTransactions(filtered);
    } else {
      console.log(`Usando todas las transacciones para: ${selectedPeriod}`);
      setFilteredTransactions(transactions);
    }
  }, [selectedPeriod, transactions]);

  // Modificación para utilizar las transacciones filtradas por período
  useEffect(() => {
    // Forzar la actualización cuando cambie el contador
    console.log(`Actualizando datos con forceUpdate=${forceUpdate}`);

    if (filteredTransactions && categories && filteredTransactions.length > 0) {
      // Filtrar solo los gastos
      const expenses = filteredTransactions.filter(t => t.type === 'expense');
      const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Agrupar gastos por categoría
      const expensesByCategory: Record<string, { amount: number, count: number, name: string }> = {};
      
      // Añadir categoría "Sin categoría"
      expensesByCategory['uncategorized'] = { 
        amount: 0, 
        count: 0,
        name: 'Sin categoría'
      };
      
      // Procesar todas las transacciones de gasto
      expenses.forEach((transaction) => {
        // Si no tiene categoría, añadir a "Sin categoría"
        if (!transaction.categoryId) {
          expensesByCategory['uncategorized'].amount += Number(transaction.amount);
          expensesByCategory['uncategorized'].count += 1;
          return;
        }
        
        // Buscar la categoría
        const category = categories.find(c => c.id === transaction.categoryId);
        
        if (category) {
          // Si la categoría existe en nuestro agrupamiento, actualizar
          if (expensesByCategory[category.id]) {
            expensesByCategory[category.id].amount += Number(transaction.amount);
            expensesByCategory[category.id].count += 1;
          } else {
            // Si no existe, crear nueva entrada
            expensesByCategory[category.id] = {
              amount: Number(transaction.amount),
              count: 1,
              name: category.name
            };
          }
        } else {
          // Si no se encuentra la categoría, añadir a "Sin categoría"
          expensesByCategory['uncategorized'].amount += Number(transaction.amount);
          expensesByCategory['uncategorized'].count += 1;
        }
      });
      
      // Convertir a array y ordenar por monto (de mayor a menor)
      const sortedData = Object.entries(expensesByCategory)
        .map(([id, data], index) => {
          // Buscar la categoría para obtener el icono
          const category = id !== 'uncategorized'
            ? categories.find(c => c.id.toString() === id.toString())
            : null;
          
          return {
            name: data.name,
            value: data.amount,
            count: data.count,
            color: id === 'uncategorized' ? '#000000' : category?.color || COLORS[index % COLORS.length],
            percentage: (data.amount / totalExpenses) * 100,
            icon: category?.icon || '📊', // Emoji por defecto si no se encuentra
            categoryId: id
          };
        })
        .filter(item => item.value > 0) // Eliminar categorías sin gastos
        .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor
      
      setData(sortedData);
    }
  }, [filteredTransactions, categories, forceUpdate]);

  // Efecto para filtrar los datos según las categorías seleccionadas
  useEffect(() => {
    if (data.length > 0) {
      // Si no hay filtros, mostrar todos los datos
      if (selectedCategories.length === 0) {
        setFilteredData(data);
        return;
      }
      
      // Filtrar los datos según las categorías seleccionadas
      const filtered = data.filter(item => 
        selectedCategories.includes(item.categoryId?.toString() || '')
      );
      
      // Recalcular los porcentajes
      const totalValue = filtered.reduce((sum, item) => sum + item.value, 0);
      const recalculated = filtered.map(item => ({
        ...item,
        percentage: (item.value / totalValue) * 100
      }));
      
      setFilteredData(recalculated);
    }
  }, [data, selectedCategories]);

  // Renderizado condicional si no hay datos
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

  // Función para manejar la selección/deselección de categorías
  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Si ya está seleccionada, la quitamos
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      // Si no está seleccionada, la añadimos
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Función para limpiar todos los filtros
  const clearFilters = () => {
    setSelectedCategories([]);
    // También resetear el período si es diferente al período por defecto
    if (selectedPeriod !== (period || '2025-all')) {
      setSelectedPeriod(period || '2025-all');
      
      // Forzar el reseteo de las transacciones
      setFilteredTransactions(transactions);
      // Incrementar contador para forzar actualización
      setForceUpdate(prev => prev + 1);
    }
  };

  // Datos a mostrar (filtrados o todos)
  const displayData = selectedCategories.length > 0 ? filteredData : data;

  return (
    <Card className="h-full overflow-hidden fade-in dashboard-card">
      <CardHeader className="bg-red-50 p-3 flex flex-row justify-between items-center">
        <CardTitle className="text-base text-red-700 flex items-center">
          <TrendingDown className="mr-2 h-4 w-4" />
          Gastos por Categoría
        </CardTitle>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs bg-white border-gray-200 hover:bg-gray-50"
            >
              <Filter className="h-3.5 w-3.5 mr-1" />
              Filtrar
              {(selectedCategories.length > 0 || selectedPeriod !== (period || '2025-all')) && (
                <span className="ml-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                  {selectedCategories.length + (selectedPeriod !== (period || '2025-all') ? 1 : 0)}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-2">
              <div className="tabs w-full mb-2">
                <div className="tab active">
                  <div className="text-sm font-semibold">Período</div>
                  <div className="mt-2 space-y-2">
                    <Select 
                      value={selectedPeriod}
                      onValueChange={(value) => setSelectedPeriod(value)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Seleccionar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-all">Año 2025 completo</SelectItem>
                        <SelectItem value="2025-q1">Q1 2025 (Ene-Mar)</SelectItem>
                        <SelectItem value="2025-q2">Q2 2025 (Abr-Jun)</SelectItem>
                        <SelectItem value="2025-q3">Q3 2025 (Jul-Sep)</SelectItem>
                        <SelectItem value="2025-q4">Q4 2025 (Oct-Dic)</SelectItem>
                        <SelectItem value="2025-1">Enero 2025</SelectItem>
                        <SelectItem value="2025-2">Febrero 2025</SelectItem>
                        <SelectItem value="2025-3">Marzo 2025</SelectItem>
                        <SelectItem value="2025-4">Abril 2025</SelectItem>
                        <SelectItem value="2025-5">Mayo 2025</SelectItem>
                        <SelectItem value="2025-6">Junio 2025</SelectItem>
                        <SelectItem value="2025-7">Julio 2025</SelectItem>
                        <SelectItem value="2025-8">Agosto 2025</SelectItem>
                        <SelectItem value="2025-9">Septiembre 2025</SelectItem>
                        <SelectItem value="2025-10">Octubre 2025</SelectItem>
                        <SelectItem value="2025-11">Noviembre 2025</SelectItem>
                        <SelectItem value="2025-12">Diciembre 2025</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="text-sm font-semibold">Categorías</div>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1 pr-1">
                    {data.map((category) => (
                      <div 
                        key={category.categoryId?.toString()} 
                        className="flex items-center space-x-2"
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <label 
                          htmlFor={`category-${category.categoryId}`}
                          className="text-sm flex-1 cursor-pointer"
                        >
                          {category.name}
                        </label>
                        <input
                          type="checkbox"
                          id={`category-${category.categoryId}`}
                          checked={selectedCategories.includes(category.categoryId?.toString() || '')}
                          onChange={() => handleCategoryToggle(category.categoryId?.toString() || '')}
                          className="rounded border-gray-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-2 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-7"
                  disabled={selectedCategories.length === 0 && selectedPeriod === (period || '2025-all')}
                >
                  Limpiar filtros
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Incrementar el contador para forzar la actualización
                    setForceUpdate(prev => prev + 1);
                    // Forzar directamente la filtración de transacciones
                    const periodData = formatPeriodAndGetDates(selectedPeriod);
                    
                    if (periodData.startDate && periodData.endDate) {
                      const filtered = transactions.filter(t => {
                        if (!t.date) return false;
                        
                        const txDate = new Date(t.date);
                        
                        // Para filtros de mes específico, solo comparamos año-mes
                        if (selectedPeriod.split('-').length === 2 && !selectedPeriod.includes('q')) {
                          const month = parseInt(selectedPeriod.split('-')[1]);
                          if (!isNaN(month) && month >= 1 && month <= 12) {
                            console.log(`Filtrando mes ${month} para fecha ${txDate.toISOString()}`);
                            return txDate.getFullYear() === parseInt(selectedPeriod.split('-')[0]) && 
                                  (txDate.getMonth() + 1) === month;
                          }
                        }
                        
                        // Para otros filtros (trimestres, año completo) usamos comparación de fechas normal
                        return txDate >= periodData.startDate! && txDate <= periodData.endDate!;
                      });
                      console.log(`Aplicando filtro: ${selectedPeriod}, encontradas ${filtered.length} transacciones`);
                      setFilteredTransactions(filtered);
                    }
                    
                    // Cerrar el popover
                    document.dispatchEvent(new MouseEvent('click'));
                  }}
                  className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mostrar período a la izquierda */}
        {periodLabel && (
          <div className="text-left text-sm text-gray-500 pt-3 pb-1 pl-4">
            {periodLabel}
          </div>
        )}
        
        {/* Layout en dos columnas como antes pero con elementos centrados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Columna izquierda: Gráfico de donut */}
          <div className="flex justify-center p-2 h-[280px]">
            <div className="flex items-start pt-2">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={displayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={105}
                    paddingAngle={1}
                    dataKey="value"
                  >
                    {displayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '8px',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.06)',
                      border: 'none',
                      padding: '6px',
                      fontSize: '10px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Columna derecha: Lista de categorías */}
          <div 
            className="flex justify-center p-2 pr-3 overflow-y-auto h-[280px]"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6',
            }}
          >
            <div className="space-y-2 w-full max-w-[350px]">
              {displayData.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
                    style={{ 
                      backgroundColor: `${item.color}15`, // Color con 15% de opacidad
                      color: item.color
                    }}>
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                      <span className="font-medium text-gray-900 text-sm">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{item.count} transacciones</span>
                      <span>{item.percentage.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesByCategory;