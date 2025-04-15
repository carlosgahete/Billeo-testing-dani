import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, TrendingDown } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Colores predefinidos para las categorías
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CF5', '#FF6B6B', '#4ECDC4'];

interface ExpenseByCategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
  categoryId?: number | string;
}

interface ExpensesByCategoryProps {
  transactions: any[];
  categories: any[];
  period?: string;
}

const NewExpensesByCategory: React.FC<ExpensesByCategoryProps> = ({ 
  transactions,
  categories,
  period = '2025-all'
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [periodLabel, setPeriodLabel] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  const [filteredData, setFilteredData] = useState<ExpenseByCategoryData[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>(transactions);

  // Obtener etiqueta del período seleccionado
  const getPeriodLabel = (periodStr: string): string => {
    const parts = periodStr.split('-');
    
    if (parts.length !== 2) return "Todos los períodos";
    
    const [year, periodType] = parts;
    
    if (periodType === 'all') return `Año ${year} completo`;
    
    if (periodType.startsWith('q')) {
      const quarter = parseInt(periodType.substring(1));
      if (isNaN(quarter) || quarter < 1 || quarter > 4) return `Año ${year}`;
      
      const quarterNames = ["Q1 (Ene-Mar)", "Q2 (Abr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dic)"];
      return `${year} - ${quarterNames[quarter-1]}`;
    }
    
    const month = parseInt(periodType);
    if (isNaN(month) || month < 1 || month > 12) return `Año ${year}`;
    
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    
    return `${monthNames[month-1]} ${year}`;
  };
  
  // Función para filtrar transacciones por período
  const filterTransactionsByPeriod = (periodStr: string, txList: any[]): any[] => {
    console.log(`💹 Filtrando transacciones por período: ${periodStr}`);
    
    if (!periodStr || periodStr === '2025-all') {
      console.log('Devolviendo todas las transacciones');
      return txList;
    }
    
    const parts = periodStr.split('-');
    if (parts.length !== 2) {
      console.log('Formato de período incorrecto, devolviendo todo');
      return txList;
    }
    
    const [yearStr, periodType] = parts;
    const year = parseInt(yearStr);
    
    if (isNaN(year)) {
      console.log('Año inválido, devolviendo todo');
      return txList;
    }
    
    // Filtrar solo gastos
    const expenses = txList.filter(tx => tx.type === 'expense');
    
    if (periodType === 'all') {
      // Filtrar por año completo
      console.log(`Filtrando por año completo: ${year}`);
      return expenses.filter(tx => {
        if (!tx.date) return false;
        const txDate = new Date(tx.date);
        const isMatch = txDate.getFullYear() === year;
        console.log(`Tx ${tx.id}: ${txDate.toISOString()} - Match año ${year}: ${isMatch}`);
        return isMatch;
      });
    }
    
    if (periodType.startsWith('q')) {
      // Filtrar por trimestre
      const quarter = parseInt(periodType.substring(1));
      if (isNaN(quarter) || quarter < 1 || quarter > 4) {
        console.log('Trimestre inválido, devolviendo todo el año');
        return expenses.filter(tx => {
          if (!tx.date) return false;
          return new Date(tx.date).getFullYear() === year;
        });
      }
      
      const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
      const endMonth = startMonth + 2; // 2, 5, 8, 11
      
      console.log(`Filtrando por trimestre ${quarter} (meses ${startMonth+1}-${endMonth+1}) de ${year}`);
      
      return expenses.filter(tx => {
        if (!tx.date) return false;
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth(); // 0-11
        
        const isMatch = txYear === year && txMonth >= startMonth && txMonth <= endMonth;
        console.log(`Tx ${tx.id}: ${txDate.toISOString()} - Match: ${isMatch}`);
        
        return isMatch;
      });
    }
    
    // Filtrar por mes específico
    const month = parseInt(periodType);
    if (isNaN(month) || month < 1 || month > 12) {
      console.log('Mes inválido, devolviendo todo el año');
      return expenses.filter(tx => {
        if (!tx.date) return false;
        return new Date(tx.date).getFullYear() === year;
      });
    }
    
    console.log(`Filtrando por mes ${month} de ${year}`);
    
    return expenses.filter(tx => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth() + 1; // getMonth() devuelve 0-11
      
      const isMatch = txYear === year && txMonth === month;
      console.log(`Tx ${tx.id} (${tx.date}): ${txDate.toISOString()} - Año=${txYear}, Mes=${txMonth} - Match: ${isMatch}`);
      
      return isMatch;
    });
  };

  // Función para procesar los datos según las transacciones filtradas
  const processTransactions = (transactions: any[]) => {
    console.log(`📊 Procesando ${transactions.length} transacciones`);
    
    if (!categories || !transactions.length) {
      console.log('No hay categorías o transacciones, retornando array vacío');
      setData([]);
      setFilteredData([]);
      return;
    }
    
    // Filtrar solo los gastos
    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) {
      console.log('No hay gastos, retornando array vacío');
      setData([]);
      setFilteredData([]);
      return;
    }
    
    console.log(`Procesando ${expenses.length} gastos`);
    
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    console.log(`Total de gastos: ${totalExpenses}`);
    
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
    const processedData = Object.entries(expensesByCategory)
      .map(([id, data], index) => {
        // Buscar la categoría para obtener el icono
        const category = id !== 'uncategorized'
          ? categories.find(c => c.id.toString() === id.toString())
          : null;
        
        return {
          name: data.name,
          value: data.amount,
          count: data.count,
          color: id === 'uncategorized' ? '#999999' : category?.color || COLORS[index % COLORS.length],
          percentage: (data.amount / totalExpenses) * 100,
          icon: category?.icon || '📊', // Emoji por defecto si no se encuentra
          categoryId: id
        };
      })
      .filter(item => item.value > 0) // Eliminar categorías sin gastos
      .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor
      
    console.log(`Datos procesados: ${processedData.length} categorías`);
    setData(processedData);
    setFilteredData(processedData);
  };
  
  // Aplicar filtro por período
  const applyPeriodFilter = () => {
    console.log(`🔄 Aplicando filtro de período: ${selectedPeriod}`);
    
    // Establecer la etiqueta del período
    const label = getPeriodLabel(selectedPeriod);
    setPeriodLabel(label);
    
    // Filtrar transacciones por período
    const filtered = filterTransactionsByPeriod(selectedPeriod, transactions);
    console.log(`Filtrado completado: ${filtered.length} transacciones`);
    
    // Actualizar las transacciones filtradas
    setFilteredTransactions(filtered);
    
    // Procesar los datos con las transacciones filtradas
    processTransactions(filtered);
  };
  
  // Extraer los años disponibles de las transacciones
  const getAvailableYears = (txs: any[]): number[] => {
    const yearsSet = new Set<number>();
    
    txs.forEach(tx => {
      if (tx.date) {
        const txDate = new Date(tx.date);
        yearsSet.add(txDate.getFullYear());
      }
    });
    
    // Convertir a array y ordenar
    return Array.from(yearsSet).sort((a, b) => b - a); // Ordenar de más reciente a más antiguo
  };
  
  // Obtener los años disponibles
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Inicialización
  useEffect(() => {
    console.log("Inicializando componente ExpensesByCategory");
    
    // Detectar años disponibles
    const years = getAvailableYears(transactions);
    console.log("Años disponibles:", years);
    setAvailableYears(years);
    
    // Usar el año más reciente si no se especifica uno
    const defaultYear = years.length > 0 ? years[0] : new Date().getFullYear();
    const initialPeriod = period || `${defaultYear}-all`;
    
    // Configurar período y etiqueta inicial
    setSelectedPeriod(initialPeriod);
    setPeriodLabel(getPeriodLabel(initialPeriod));
    
    // Filtrar transacciones iniciales por período
    const filtered = filterTransactionsByPeriod(initialPeriod, transactions);
    setFilteredTransactions(filtered);
    
    // Procesar las transacciones iniciales
    processTransactions(filtered);
  }, [transactions]);
  
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
  
  // Función para manejar la selección/deselección de categorías
  const handleCategoryToggle = (categoryId: string) => {
    console.log(`Toggle categoría: ${categoryId}`);
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
    console.log('Limpiando filtros');
    setSelectedCategories([]);
    
    if (selectedPeriod !== period) {
      console.log(`Restaurando período predeterminado: ${period}`);
      setSelectedPeriod(period || '2025-all');
      // Aplicar el filtro con el período restaurado
      setTimeout(() => applyPeriodFilter(), 0);
    }
  };
  
  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Renderizado condicional si no hay datos
  if (!data.length) {
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
                {(selectedCategories.length > 0 || selectedPeriod !== period) && (
                  <span className="ml-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                    {selectedCategories.length + (selectedPeriod !== period ? 1 : 0)}
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
                          {/* Si no hay años disponibles, mostrar el año actual */}
                          {availableYears.length === 0 && (
                            <React.Fragment>
                              <SelectItem value={`${new Date().getFullYear()}-all`}>Año {new Date().getFullYear()} completo</SelectItem>
                            </React.Fragment>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2 flex justify-between mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs h-7"
                      disabled={selectedCategories.length === 0 && selectedPeriod === period}
                    >
                      Limpiar filtros
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        applyPeriodFilter();
                        
                        // Cerrar el popover
                        document.dispatchEvent(new MouseEvent('click'));
                      }}
                      className="text-xs h-7 bg-red-600 hover:bg-red-700 text-white"
                    >
                      Aplicar
                    </Button>
                  </div>
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
          
          <div className="flex items-center justify-center h-[280px]">
            <div className="text-center text-gray-500">
              <p>No hay gastos registrados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
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
              {(selectedCategories.length > 0 || selectedPeriod !== period) && (
                <span className="ml-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
                  {selectedCategories.length + (selectedPeriod !== period ? 1 : 0)}
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
                        {/* Si no hay años disponibles, mostrar el año actual */}
                        {availableYears.length === 0 && (
                          <React.Fragment>
                            <SelectItem value={`${new Date().getFullYear()}-all`}>Año {new Date().getFullYear()} completo</SelectItem>
                          </React.Fragment>
                        )}
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
                  disabled={selectedCategories.length === 0 && selectedPeriod === period}
                >
                  Limpiar filtros
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    applyPeriodFilter();
                    
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
        
        {/* Layout en dos columnas con elementos centrados */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* Columna izquierda: Gráfico de donut - movida hacia la flecha de la izquierda */}
          <div className="relative md:col-span-2 p-0">
            <div className="absolute" style={{ top: "50px", left: "-120px" }}>
              <ResponsiveContainer width={300} height={300}>
                <PieChart>
                  <Pie
                    data={displayData}
                    cx={150}
                    cy={150}
                    innerRadius={60}
                    outerRadius={95}
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
            className="flex justify-start md:col-span-3 p-2 pl-0 pr-3 overflow-y-auto h-[280px]"
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

export default NewExpensesByCategory;