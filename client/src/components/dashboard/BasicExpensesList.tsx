import React, { useState, useEffect } from "react";
import type { DashboardBlockProps } from "@/types/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

// Categorías predefinidas
const CATEGORIES = {
  "Alquiler": { icon: "🏢", color: "#e74c3c" },
  "Suministros": { icon: "💡", color: "#f39c12" },
  "Material": { icon: "📎", color: "#3498db" },
  "Internet": { icon: "🌐", color: "#9b59b6" },
  "Telefonía": { icon: "📱", color: "#e84393" },
  "Otros": { icon: "📦", color: "#95a5a6" }
};

// Detectar categoría por descripción
const detectCategory = (description: string): string => {
  const desc = description.toLowerCase();
  if (desc.includes('alquiler') || desc.includes('oficina')) return 'Alquiler';
  if (desc.includes('luz') || desc.includes('agua') || desc.includes('gas')) return 'Suministros';
  if (desc.includes('material') || desc.includes('informático')) return 'Material';
  if (desc.includes('internet') || desc.includes('fibra')) return 'Internet';
  if (desc.includes('teléfono') || desc.includes('móvil')) return 'Telefonía';
  return 'Otros';
};

// Componente principal
const BasicExpensesList: React.FC<DashboardBlockProps> = ({ data, isLoading: dashboardLoading }) => {
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);

  // Obtener transacciones
  const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  // Procesar datos
  useEffect(() => {
    if (transactions) {
      setIsProcessing(true);

      // Filtrar gastos
      const expenses = transactions.filter(tx => tx.type === 'expense');
      
      // Calcular total
      const totalAmount = expenses.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
      setTotal(totalAmount);

      // Agrupar por categoría
      const categoriesMap: Record<string, { amount: number, count: number }> = {};
      
      expenses.forEach(tx => {
        const category = detectCategory(tx.description || '');
        const amount = Math.abs(parseFloat(tx.amount));
        
        if (!categoriesMap[category]) {
          categoriesMap[category] = { amount: 0, count: 0 };
        }
        
        categoriesMap[category].amount += amount;
        categoriesMap[category].count += 1;
      });
      
      // Convertir a array
      const result = Object.entries(categoriesMap).map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count,
        icon: CATEGORIES[name as keyof typeof CATEGORIES]?.icon || "📦",
        color: CATEGORIES[name as keyof typeof CATEGORIES]?.color || "#95a5a6",
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }));
      
      // Ordenar por monto
      result.sort((a, b) => b.amount - a.amount);
      
      setExpensesByCategory(result);
      setIsProcessing(false);
    }
  }, [transactions]);

  // Estado de carga
  const isLoading = dashboardLoading || transactionsLoading || isProcessing;
  
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-hidden shadow-sm">
        <div className="p-4">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (expensesByCategory.length === 0) {
    return (
      <div className="rounded-lg border overflow-hidden shadow-sm">
        <div className="p-4 text-center">
          <p className="text-gray-500">No hay gastos registrados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-sm bg-white">
      <div className="p-4">
        <h3 className="text-lg font-medium mb-4">Gastos por Categoría</h3>
        
        <div className="space-y-3">
          {expensesByCategory.map((category, index) => (
            <div key={index} className="flex items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <span className="text-lg">{category.icon}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">{category.name}</span>
                  <span className="font-bold text-red-600">{formatCurrency(-category.amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{category.count} transacciones</span>
                  <span>{category.percentage.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <div className="flex justify-between">
            <span className="font-medium">Total gastos</span>
            <span className="font-bold text-red-600">{formatCurrency(-total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicExpensesList;