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

// Año predeterminado fijo para facilitar desarrollo y pruebas
const CURRENT_YEAR = 2025;
// Generamos los últimos 3 años para seleccionar
const availableYears = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// Define colores para diferentes categorías
const categoryColors: Record<number, string> = {
  1: '#FF6B6B', // Comida y bebida
  2: '#4ECDC4', // Transporte
  3: '#FF9F1C', // Vivienda
  4: '#2EC4B6', // Compras
  5: '#FFBF69', // Salud
  6: '#CBF3F0', // Educación
  7: '#FFCBF2', // Tecnología
  8: '#C8E7FF', // Regalos
  9: '#F4F1DE', // Entretenimiento
  10: '#E07A5F', // Servicios profesionales
  0: '#6B705C', // Otros
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

const ExpensesCategorySimple: React.FC<ExpensesByCategoryProps> = ({ 
  expensesByCategory: propExpensesByCategory, 
  period = `${CURRENT_YEAR}-all`,
  periodLabel = `Año ${CURRENT_YEAR} completo`, 
  onPeriodChange 
}) => {
  // Estados simples sin complejidad
  const [selectedPeriod, setSelectedPeriod] = useState<string>(period);
  
  // Obtener datos
  const { data: dashboardData } = useDashboardData();
  
  // Actualizar cuando cambie el período
  useEffect(() => {
    setSelectedPeriod(period);
  }, [period]);
  
  // Usar datos de props o de dashboardData
  const expensesByCategory = useMemo(() => {
    if (propExpensesByCategory && Object.keys(propExpensesByCategory).length > 0) {
      return propExpensesByCategory;
    } else if (dashboardData?.expensesByCategory) {
      return dashboardData.expensesByCategory;
    }
    return {};
  }, [propExpensesByCategory, dashboardData?.expensesByCategory, selectedPeriod]);

  // Manejar cambio de período
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    if (onPeriodChange) {
      onPeriodChange(value);
    }
  };

  // Si no hay datos
  if (Object.keys(expensesByCategory).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por categoría</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[300px]">
          <p>No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  // Lista simple de categorías 
  const categories = Object.entries(expensesByCategory).map(([categoryId, item]) => {
    const numericId = parseInt(categoryId);
    return {
      id: numericId,
      name: categoryNames[numericId] || 'Categoría desconocida',
      icon: categoryIcons[numericId] || <MdMoreHoriz />,
      color: categoryColors[numericId] || '#888888',
      amount: item.amount,
      count: item.count
    };
  }).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  // Calcular total para porcentajes
  const totalAmount = categories.reduce((total, cat) => total + Math.abs(cat.amount), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gastos por categoría</CardTitle>
        
        <Select 
          value={selectedPeriod}
          onValueChange={handlePeriodChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => [
              <SelectItem key={`${year}-all`} value={`${year}-all`}>Año {year} completo</SelectItem>,
              <SelectItem key={`${year}-q1`} value={`${year}-q1`}>Q1 {year} (Ene-Mar)</SelectItem>,
              <SelectItem key={`${year}-q2`} value={`${year}-q2`}>Q2 {year} (Abr-Jun)</SelectItem>,
              <SelectItem key={`${year}-q3`} value={`${year}-q3`}>Q3 {year} (Jul-Sep)</SelectItem>,
              <SelectItem key={`${year}-q4`} value={`${year}-q4`}>Q4 {year} (Oct-Dic)</SelectItem>,
            ])}
          </SelectContent>
        </Select>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {categories.map(category => {
            const percentage = totalAmount ? (Math.abs(category.amount) / totalAmount) * 100 : 0;
            
            return (
              <div key={category.id} className="flex items-center space-x-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" 
                     style={{ backgroundColor: category.color }}>
                  {category.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{category.name}</span>
                    <span className="font-medium">{formatCurrency(category.amount)}</span>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: category.color 
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpensesCategorySimple;