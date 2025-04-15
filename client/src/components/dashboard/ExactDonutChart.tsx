import React, { useState, useEffect } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

// Colores predefinidos para las categorías
const CATEGORY_COLORS: Record<string, string> = {
  "Oficina": "#e74c3c",       // rojo intenso
  "Suministros": "#f39c12",   // naranja
  "Material oficina": "#3498db", // azul
  "Internet": "#9b59b6",      // púrpura
  "Telefonía": "#e84393",     // rosa
  "Seguros": "#2ecc71",       // verde
  "Otros": "#95a5a6"          // gris
};

// Función para detectar categoría basada en descripción
const detectCategory = (description: string): string => {
  const descriptionLower = description.toLowerCase();
  
  if (descriptionLower.includes('oficina') || 
      descriptionLower.includes('alquiler') || 
      descriptionLower.includes('local')) 
    return 'Oficina';
  
  if (descriptionLower.includes('luz') || 
      descriptionLower.includes('agua') || 
      descriptionLower.includes('electricidad')) 
    return 'Suministros';
  
  if (descriptionLower.includes('material') || 
      descriptionLower.includes('papelería') || 
      descriptionLower.includes('informático')) 
    return 'Material oficina';
  
  if (descriptionLower.includes('internet') || 
      descriptionLower.includes('fibra')) 
    return 'Internet';
  
  if (descriptionLower.includes('teléfono') || 
      descriptionLower.includes('móvil') || 
      descriptionLower.includes('movil')) 
    return 'Telefonía';
  
  return 'Otros';
};

// Interfaz para datos de categoría
interface CategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  percentage: number;
  icon?: string;
}

// Componente principal que replica exactamente la imagen compartida
const ExactDonutChart: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);

  // Obtener datos
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: categoryData, isLoading: categoriesLoading } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  // Procesamiento de datos
  useEffect(() => {
    if (transactions) {
      setIsProcessing(true);

      // Filtrar transacciones de gastos
      const expenseTransactions = transactions.filter(
        transaction => transaction.type === 'expense'
      );

      // Agrupar por categoría
      const expensesByCategory: Record<string, { 
        total: number, 
        count: number, 
        color: string
      }> = {};

      // Procesar cada transacción
      expenseTransactions.forEach(tx => {
        const categoryName = detectCategory(tx.description || '');
        const amount = parseFloat(tx.amount);

        // Inicializar categoría si no existe
        if (!expensesByCategory[categoryName]) {
          expensesByCategory[categoryName] = {
            total: 0,
            count: 0,
            color: CATEGORY_COLORS[categoryName] || "#95a5a6"
          };
        }

        // Acumular datos
        expensesByCategory[categoryName].total += Math.abs(amount);
        expensesByCategory[categoryName].count += 1;
      });

      // Calcular total
      const totalExpenses = Object.values(expensesByCategory)
        .reduce((sum, cat) => sum + cat.total, 0);
      
      setTotal(totalExpenses);

      // Convertir a array y calcular porcentajes
      const categoriesArray: CategoryData[] = Object.entries(expensesByCategory)
        .map(([name, data]) => {
          const percentage = totalExpenses > 0 
            ? parseFloat(((data.total * 100) / totalExpenses).toFixed(2))
            : 0;
            
          return {
            name,
            value: data.total,
            count: data.count,
            color: data.color,
            percentage
          };
        })
        .sort((a, b) => b.value - a.value); // Ordenar de mayor a menor

      setCategories(categoriesArray);
      setIsProcessing(false);
    }
  }, [transactions]);
  
  // Estado de carga
  const isLoading = dashboardLoading || transactionsLoading || categoriesLoading || isProcessing;
  
  // Mostrar skeleton durante la carga
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden shadow-sm bg-white">
        <div className="p-4">
          <div className="flex">
            <div className="flex-1">
              <Skeleton className="h-40 w-40 rounded-full mx-auto" />
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sin datos
  if (categories.length === 0) {
    return (
      <div className="rounded-lg border overflow-hidden shadow-sm bg-white p-6">
        <p className="text-center text-gray-500">No hay gastos registrados para mostrar</p>
      </div>
    );
  }

  // Procesar datos para la rosquilla
  let cumulativePercent = 0;
  const segments = categories.map(category => {
    const startPercent = cumulativePercent;
    cumulativePercent += category.percentage;
    
    return {
      ...category,
      startPercent,
      endPercent: cumulativePercent
    };
  });
  
  // Si solo hay una categoría, creamos un círculo completo
  const singleCategory = segments.length === 1;
  
  // Tomar solo las primeras categorías para mostrar (max 5)
  const topCategories = categories.slice(0, 5);
  
  return (
    <div className="rounded-lg border overflow-hidden shadow-sm bg-white p-4">
      <div className="flex">
        {/* Gráfico de rosquilla a la izquierda */}
        <div className="flex-1 relative">
          <div className="w-full h-auto" style={{ maxWidth: '220px', margin: '0 auto' }}>
            <svg viewBox="0 0 100 100" className="w-full h-auto">
              {singleCategory ? (
                // Para una sola categoría, dibujamos un círculo
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill={topCategories[0].color} 
                />
              ) : (
                // Para múltiples categorías, dibujamos sectores
                segments.map((segment, index) => {
                  // Convertir porcentajes a ángulos (1% = 3.6 grados)
                  const startAngle = segment.startPercent * 3.6 - 90; // -90 para comenzar desde arriba
                  const endAngle = segment.endPercent * 3.6 - 90;
                  
                  // Convertir ángulos a coordenadas
                  const startRad = startAngle * (Math.PI / 180);
                  const endRad = endAngle * (Math.PI / 180);
                  
                  // Calcular puntos del arco
                  const x1 = 50 + 45 * Math.cos(startRad);
                  const y1 = 50 + 45 * Math.sin(startRad);
                  const x2 = 50 + 45 * Math.cos(endRad);
                  const y2 = 50 + 45 * Math.sin(endRad);
                  
                  // Determinar si es arco largo (más de 180 grados)
                  const largeArcFlag = segment.endPercent - segment.startPercent > 50 ? 1 : 0;
                  
                  return (
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                    />
                  );
                })
              )}
              
              {/* Círculo interno blanco para crear efecto de rosquilla */}
              <circle cx="50" cy="50" r="20" fill="white" />
            </svg>
          </div>
        </div>
        
        {/* Leyenda a la derecha */}
        <div className="flex-1 pl-4 flex flex-col justify-center">
          {topCategories.map((category, index) => (
            <div key={index} className="mb-4">
              <div className="flex items-center mb-1">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                <span className="text-lg font-medium">{category.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-red-600">
                  {formatCurrency(-category.value)}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-sm text-gray-600">{category.count} trans.</span>
                  <span className="text-sm text-gray-600">{category.percentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExactDonutChart;