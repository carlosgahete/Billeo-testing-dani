import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
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
import { X, FileDown } from "lucide-react";
import { Transaction, Category } from "@/types";

interface ExpenseFiltersProps {
  transactions: Transaction[];
  categories: Category[];
  onFilterChange: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onExportClick?: () => void;
}

const ExpenseFilters = ({
  transactions,
  categories,
  onFilterChange,
  onExportClick,
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
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Restablecer los filtros cuando se oculta el panel
  useEffect(() => {
    if (!showFilters) {
      clearFilters();
    }
  }, [showFilters]);

  // Marcar filtros como aplicados cuando hay criterios seleccionados
  useEffect(() => {
    const hasCategory = selectedCategory !== "all";
    const hasDateFilter = dateRange.start !== "" || dateRange.end !== "";
    const hasPriceFilter = priceRange.min !== "" || priceRange.max !== "";
    
    setFiltersApplied(hasCategory || hasDateFilter || hasPriceFilter);
  }, [selectedCategory, dateRange, priceRange]);

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
    setFiltersApplied(false);
    onFilterChange([]);
  };

  return (
    <div>
      <div className="bg-[#F5F5F7] dark:bg-[#1D1D1F] rounded-xl p-4 mb-4 shadow-sm backdrop-blur-sm border border-gray-200/50">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h2 className="text-[#1D1D1F] dark:text-white font-medium text-lg flex items-center">
              <span className="mr-2">Lista de Gastos</span>
              {filtersApplied && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white text-xs font-semibold">
                  ✓
                </span>
              )}
            </h2>
          </div>
          <div className="flex space-x-2">
            {/* Botón de exportar gastos (visible siempre) */}
            {onExportClick && (
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-full hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-all duration-200 border border-gray-200/70 backdrop-blur-sm bg-white/80 px-4"
                onClick={onExportClick}
              >
                <FileDown className="h-4 w-4 mr-1.5 text-[#007AFF]" />
                <span className="text-[#1D1D1F] dark:text-white font-medium">Exportar</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              className={`rounded-full transition-all duration-200 border border-gray-200/70 backdrop-blur-sm px-4 ${
                showFilters 
                  ? "bg-[#007AFF] text-white hover:bg-[#0071EB]" 
                  : "bg-white/80 hover:bg-[#007AFF]/10 hover:text-[#007AFF]"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar filtros" : "Filtrar"}
            </Button>
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div className="bg-white/90 rounded-xl border border-gray-200/60 shadow-sm p-5 mb-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-medium text-[#1D1D1F] mb-4 flex items-center">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#007AFF] text-white text-xs font-semibold mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            </span>
            Filtrar gastos por
          </h3>
          
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-4">
              {/* Filtro de categorías */}
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                  Categorías
                </label>
                <Select 
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full h-10 text-sm rounded-lg border-gray-200/80 bg-[#F5F5F7]/50 focus:border-[#007AFF] focus:ring-[#007AFF]/10">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
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
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                  Desde
                </label>
                <Input
                  type="date"
                  className="h-10 text-sm w-full rounded-lg border-gray-200/80 bg-[#F5F5F7]/50 focus:border-[#007AFF] focus:ring-[#007AFF]/10"
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
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                  Hasta
                </label>
                <Input
                  type="date"
                  className="h-10 text-sm w-full rounded-lg border-gray-200/80 bg-[#F5F5F7]/50 focus:border-[#007AFF] focus:ring-[#007AFF]/10"
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
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                  Importe mínimo
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="h-10 text-sm w-full rounded-lg border-gray-200/80 bg-[#F5F5F7]/50 focus:border-[#007AFF] focus:ring-[#007AFF]/10"
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
            
            <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-4">
              {/* Placeholder para alinear con la primera fila */}
              <div></div>
              
              {/* Placeholder */}
              <div></div>
              
              {/* Placeholder */}
              <div></div>
              
              {/* Filtro de importe máximo */}
              <div>
                <label className="block text-xs font-medium text-[#6E6E73] mb-1.5">
                  Importe máximo
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sin límite"
                  className="h-10 text-sm w-full rounded-lg border-gray-200/80 bg-[#F5F5F7]/50 focus:border-[#007AFF] focus:ring-[#007AFF]/10"
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
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearFilters}
                className="rounded-full px-4 border-gray-300 text-[#1D1D1F] hover:bg-gray-100 transition-all duration-200"
              >
                Limpiar filtros
              </Button>
              
              <Button 
                size="sm"
                className="rounded-full bg-[#007AFF] hover:bg-[#0071EB] text-white px-4 transition-all duration-200"
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