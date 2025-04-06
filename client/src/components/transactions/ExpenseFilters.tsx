import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface Category {
  id: number;
  name: string;
  type?: "income" | "expense";
  color?: string;
  icon?: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  categoryId: number | null;
  paymentMethod?: string;
  attachments?: string[];
  tax?: number | string;
  notes?: string;
}

interface ExpenseFiltersProps {
  transactions: Transaction[];
  categories: Category[];
  onFilterChange: (filteredTransactions: Transaction[]) => void;
}

const ExpenseFilters = ({
  transactions,
  categories,
  onFilterChange,
}: ExpenseFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: "", 
    end: ""
  });
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({
    min: "", 
    max: ""
  });

  // Restablecer los filtros cuando se oculta el panel
  useEffect(() => {
    if (!showFilters) {
      clearFilters();
    }
  }, [showFilters]);

  // Aplicar filtros a las transacciones
  const applyFilters = () => {
    // Solo filtramos las transacciones que son gastos
    const expenseTransactions = transactions.filter(tx => tx.type === "expense");

    // Aplicar todos los filtros de forma combinada
    const filtered = expenseTransactions.filter(transaction => {
      // 1. Filtro por categoría
      if (selectedCategory !== "all" && transaction.categoryId !== null) {
        if (Number(selectedCategory) !== transaction.categoryId) {
          return false;
        }
      }
      
      // 2. Filtro por rango de fechas
      if (dateRange.start || dateRange.end) {
        const transactionDate = new Date(transaction.date);
        
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          if (transactionDate < startDate) {
            return false;
          }
        }
        
        if (dateRange.end) {
          // Añadir un día a la fecha final para incluir todo el día
          const endDate = new Date(dateRange.end);
          endDate.setDate(endDate.getDate() + 1);
          
          if (transactionDate > endDate) {
            return false;
          }
        }
      }
      
      // 3. Filtro por rango de precios
      const minPrice = priceRange.min ? parseFloat(priceRange.min) : null;
      const maxPrice = priceRange.max ? parseFloat(priceRange.max) : null;
      
      if (minPrice !== null && transaction.amount < minPrice) {
        return false;
      }
      
      if (maxPrice !== null && transaction.amount > maxPrice) {
        return false;
      }
      
      // Si pasa todos los filtros, incluir en los resultados
      return true;
    });
    
    onFilterChange(filtered);
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSelectedCategory("all");
    setDateRange({ start: "", end: "" });
    setPriceRange({ min: "", max: "" });
    onFilterChange([]);
  };

  return (
    <div>
      <div className="bg-red-600 rounded-md p-3 mb-4 flex justify-between items-center">
        <h2 className="text-white font-medium flex items-center">
          <span className="mr-2">Lista de Gastos</span>
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white text-red-600 border-white hover:bg-red-50 hover:text-red-700"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? "Ocultar filtros" : "Filtrar"}
        </Button>
      </div>
      
      {showFilters && (
        <div className="bg-white rounded-md border border-red-100 shadow-sm p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filtrar gastos por:</h3>
          
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-4">
              {/* Filtro de categorías */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Categorías
                </label>
                <Select 
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories
                      .filter(cat => cat.type === 'expense')
                      .map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center">
                            <span 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: category.color }}
                            ></span>
                            {category.icon && <span className="mr-1">{category.icon}</span>}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtro de fecha desde */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Desde
                </label>
                <Input
                  type="date"
                  className="h-9 text-sm w-full"
                  value={dateRange.start}
                  onChange={(e) => {
                    setDateRange({
                      ...dateRange,
                      start: e.target.value
                    });
                  }}
                />
              </div>
              
              {/* Filtro de fecha hasta */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hasta
                </label>
                <Input
                  type="date"
                  className="h-9 text-sm w-full"
                  value={dateRange.end}
                  onChange={(e) => {
                    setDateRange({
                      ...dateRange,
                      end: e.target.value
                    });
                  }}
                />
              </div>
              
              {/* Filtro de importe mínimo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Importe mínimo
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-9 text-sm w-full"
                  value={priceRange.min}
                  onChange={(e) => {
                    setPriceRange({
                      ...priceRange,
                      min: e.target.value
                    });
                  }}
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-4">
              {/* Placeholder para alinear con la primera fila */}
              <div></div>
              
              {/* Placeholder */}
              <div></div>
              
              {/* Placeholder */}
              <div></div>
              
              {/* Filtro de importe máximo */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Importe máximo
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sin límite"
                  className="h-9 text-sm w-full"
                  value={priceRange.max}
                  onChange={(e) => {
                    setPriceRange({
                      ...priceRange,
                      max: e.target.value
                    });
                  }}
                />
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
              
              <Button 
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={applyFilters}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseFilters;