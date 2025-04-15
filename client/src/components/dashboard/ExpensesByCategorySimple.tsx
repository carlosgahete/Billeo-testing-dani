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
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

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

const ExpensesByCategorySimple: React.FC<ExpensesByCategoryProps> = ({ 
  transactions,
  categories,
  period = '2025-all'
}) => {
  const [periodLabel, setPeriodLabel] = useState("Año 2025 completo");
  const [data, setData] = useState<ExpenseByCategoryData[]>([]);
  
  // Procesamiento de datos
  useEffect(() => {
    // Filtrar solo los gastos
    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) {
      setData([]);
      return;
    }
    
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
    
    setData(processedData);
  }, [transactions, categories]);
  
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
        </CardHeader>
        <CardContent className="p-4 flex items-center justify-center h-[280px]">
          <div className="text-center text-gray-500">
            <p>No hay datos de gastos para mostrar en este período</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Mostrar solo las 5 primeras categorías para simplificar
  const displayData = data.slice(0, 5);
  
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
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-2">
              <div className="tabs w-full mb-2">
                <div className="tab active">
                  <div className="text-sm font-semibold">Período</div>
                  <div className="mt-2 space-y-2">
                    <Select 
                      value="2025-all"
                      onValueChange={(value) => console.log(value)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Seleccionar período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-all">Año 2025 completo</SelectItem>
                        <SelectItem value="2025-q1">Q1 2025 (Ene-Mar)</SelectItem>
                        <SelectItem value="2025-q2">Q2 2025 (Abr-Jun)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Limpiar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="p-4">
        {periodLabel && (
          <div className="text-sm text-gray-500 mb-2 font-medium">
            {periodLabel}
          </div>
        )}
        
        {/* Layout con dos columnas perfectamente balanceado */}
        <div className="flex">
          {/* Columna izquierda: Gráfico donut (50% del ancho) */}
          <div className="w-1/2 flex justify-center items-center">
            <div className="donut-chart-container">
              <PieChart width={220} height={220}>
                <Pie
                  data={displayData}
                  cx={110}
                  cy={110}
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
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
            </div>
          </div>
          
          {/* Columna derecha: Lista de categorías (50% del ancho) */}
          <div className="w-1/2 overflow-y-auto h-[250px] pl-4">
            <div className="space-y-3">
              {displayData.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
                    style={{ 
                      backgroundColor: `${item.color}15`, // Color con 15% de opacidad
                      color: item.color
                    }}>
                    <span className="text-base">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                      <span className="font-medium text-gray-900 text-sm">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{item.count} transacciones</span>
                      <span>{item.percentage.toFixed(1)}%</span>
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

export default ExpensesByCategorySimple;