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
  
  // Efecto para generar la etiqueta del período seleccionado
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    
    try {
      if (period) {
        // Formato: year-quarter o year-month o 'all'
        const parts = period.split('-');
        const year = parts[0];
        
        // Verificar que el año es un número válido
        if (year === 'all') {
          setPeriodLabel("Todos los períodos");
          return;
        }
        
        const yearNum = parseInt(year);
        if (isNaN(yearNum)) {
          setPeriodLabel(`Período actual`);
          return;
        }
        
        if (parts.length > 1) {
          const timePeriod = parts[1];
          
          if (timePeriod.startsWith('q') || timePeriod.startsWith('Q')) {
            // Período trimestral - 'q1', 'Q1', etc.
            const quarterStr = timePeriod.substring(1);
            const quarter = parseInt(quarterStr);
            
            if (isNaN(quarter) || quarter < 1 || quarter > 4) {
              setPeriodLabel(`Año ${yearNum}`);
              return;
            }
            
            const startMonth = (quarter - 1) * 3;
            const endMonth = startMonth + 2;
            
            const startDate = new Date(yearNum, startMonth, 1);
            const endDate = new Date(yearNum, endMonth + 1, 0);
            
            const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
            const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
            
            setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
          } else {
            // Período mensual - asumimos que es un número del 1-12
            const monthNum = parseInt(timePeriod);
            
            if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
              setPeriodLabel(`Año ${yearNum}`);
              return;
            }
            
            const month = monthNum - 1; // Ajustar a índice 0-11
            const startDate = new Date(yearNum, month, 1);
            const endDate = new Date(yearNum, month + 1, 0);
            
            const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
            const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
            
            setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
          }
        } else {
          // Año completo
          const startDate = new Date(yearNum, 0, 1);
          const endDate = new Date(yearNum, 11, 31);
          
          const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
          const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
          
          setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
        }
      } else {
        // Sin período especificado, mostrar año actual
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31);
        
        const formattedStart = format(startDate, "d MMM yyyy", { locale: es });
        const formattedEnd = format(endDate, "d MMM yyyy", { locale: es });
        
        setPeriodLabel(`${formattedStart} - ${formattedEnd}`);
      }
    } catch (error) {
      console.error("Error al formatear el período:", error);
      setPeriodLabel("Período actual");
    }
  }, [period]);

  useEffect(() => {
    if (transactions && categories && transactions.length > 0) {
      // Filtrar solo los gastos
      const expenses = transactions.filter(t => t.type === 'expense');
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
  }, [transactions, categories]);

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
              {selectedCategories.length > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                  {selectedCategories.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-2">
              <div className="text-sm font-medium">Filtrar por categoría</div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
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
              
              <div className="border-t pt-2 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs h-7"
                  disabled={selectedCategories.length === 0}
                >
                  Limpiar filtros
                </Button>
                <Button
                  size="sm"
                  onClick={() => document.dispatchEvent(new MouseEvent('click'))}
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