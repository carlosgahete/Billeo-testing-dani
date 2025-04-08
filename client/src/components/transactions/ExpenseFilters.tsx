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
      <div className="bg-gradient-to-r from-[#F2F2F7] to-[#F9F9FB] dark:from-[#1D1D1F] dark:to-[#2C2C2E] rounded-2xl p-5 mb-5 shadow-md backdrop-blur-lg border border-gray-200/50 relative overflow-hidden transition-all duration-300 hover:shadow-lg">
        {/* Elementos decorativos con formas Apple */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#007AFF]/10 to-[#5AC8FA]/5 rounded-full transform translate-x-8 -translate-y-8 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#FF9500]/5 to-[#FF2D55]/10 rounded-full transform -translate-x-6 translate-y-6 blur-xl"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-[#007AFF] rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-[#1D1D1F] dark:text-white font-semibold text-xl flex items-center">
                <span className="mr-2">Lista de Gastos</span>
                {filtersApplied && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#34C759] text-white text-xs font-semibold animate-pulse shadow-sm">
                    ✓
                  </span>
                )}
              </h2>
              <p className="text-[#6E6E73] text-xs mt-0.5">
                {filtersApplied ? 'Filtros personalizados aplicados' : 'Visualizando todos los gastos'}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {/* Botón de exportar gastos (visible siempre) */}
            {onExportClick && (
              <Button 
                variant="ghost" 
                size="sm"
                className="rounded-full hover:bg-[#007AFF]/10 hover:text-[#007AFF] transition-all duration-300 border border-gray-200/70 backdrop-blur-sm bg-white/90 px-5 py-2.5 hover:scale-105 shadow-sm hover:shadow"
                onClick={onExportClick}
              >
                <FileDown className="h-4 w-4 mr-2 text-[#007AFF]" />
                <span className="text-[#1D1D1F] dark:text-white font-medium">Exportar</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              className={`rounded-full transition-all duration-300 border border-gray-200/70 backdrop-blur-sm px-5 py-2.5 hover:scale-105 shadow-sm hover:shadow ${
                showFilters 
                  ? "bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white hover:from-[#0062CC] hover:to-[#4DB8EA]" 
                  : "bg-white/90 hover:bg-[#007AFF]/10 hover:text-[#007AFF]"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar filtros" : "Filtrar"}
            </Button>
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div className="relative animate-in fade-in slide-in-from-top-4 duration-500">
          {/* Elementos decorativos */}
          <div className="absolute top-0 left-1/4 w-28 h-28 bg-gradient-to-br from-[#34C759]/5 to-[#007AFF]/10 rounded-full blur-2xl z-0"></div>
          <div className="absolute bottom-20 right-1/3 w-36 h-36 bg-gradient-to-tr from-[#FF2D55]/5 to-[#5AC8FA]/10 rounded-full blur-3xl z-0"></div>
          
          <div className="bg-gradient-to-b from-white/95 to-white/90 dark:from-[#1D1D1F]/95 dark:to-[#2C2C2E]/90 rounded-2xl border border-gray-200/60 shadow-lg p-6 mb-5 backdrop-blur-md relative z-10 overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-[#007AFF] via-[#5AC8FA] to-[#34C759]"></div>
            
            <h3 className="text-base font-semibold text-[#1D1D1F] mb-5 flex items-center">
              <div className="mr-3 p-1.5 bg-gradient-to-r from-[#5AC8FA] to-[#007AFF] rounded-md shadow-md flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
              </div>
              <span className="bg-gradient-to-r from-[#1D1D1F] to-[#1D1D1F] bg-clip-text text-transparent dark:from-white dark:to-gray-200">
                Personalizar filtros
              </span>
            </h3>
            
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-4">
                {/* Filtro de categorías */}
                <div className="group">
                  <label className="block text-xs font-medium text-[#6E6E73] mb-2 transition-all duration-300 group-hover:text-[#007AFF]">
                    Categorías
                  </label>
                  <Select 
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="w-full h-11 text-sm rounded-xl border-gray-200/80 bg-[#F5F5F7]/70 focus:border-[#007AFF] focus:ring-[#007AFF]/10 transition-all duration-300 hover:border-[#007AFF]/30 shadow-sm">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
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
                <div className="group">
                  <label className="block text-xs font-medium text-[#6E6E73] mb-2 transition-all duration-300 group-hover:text-[#007AFF]">
                    Desde
                  </label>
                  <Input
                    type="date"
                    className="h-11 text-sm w-full rounded-xl border-gray-200/80 bg-[#F5F5F7]/70 shadow-sm
                      focus:border-[#007AFF] focus:ring-[#007AFF]/10 transition-all duration-300 hover:border-[#007AFF]/30"
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
                <div className="group">
                  <label className="block text-xs font-medium text-[#6E6E73] mb-2 transition-all duration-300 group-hover:text-[#007AFF]">
                    Hasta
                  </label>
                  <Input
                    type="date"
                    className="h-11 text-sm w-full rounded-xl border-gray-200/80 bg-[#F5F5F7]/70 shadow-sm
                      focus:border-[#007AFF] focus:ring-[#007AFF]/10 transition-all duration-300 hover:border-[#007AFF]/30"
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
                <div className="group">
                  <label className="block text-xs font-medium text-[#6E6E73] mb-2 transition-all duration-300 group-hover:text-[#007AFF]">
                    Importe mínimo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8E8E93]">€</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-11 text-sm w-full rounded-xl pl-7 border-gray-200/80 bg-[#F5F5F7]/70 shadow-sm
                        focus:border-[#007AFF] focus:ring-[#007AFF]/10 transition-all duration-300 hover:border-[#007AFF]/30"
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
              </div>
              
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-4">
                {/* Placeholder para alinear con la primera fila */}
                <div></div>
                
                {/* Placeholder */}
                <div></div>
                
                {/* Placeholder */}
                <div></div>
                
                {/* Filtro de importe máximo */}
                <div className="group">
                  <label className="block text-xs font-medium text-[#6E6E73] mb-2 transition-all duration-300 group-hover:text-[#007AFF]">
                    Importe máximo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8E8E93]">€</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Sin límite"
                      className="h-11 text-sm w-full rounded-xl pl-7 border-gray-200/80 bg-[#F5F5F7]/70 shadow-sm
                        focus:border-[#007AFF] focus:ring-[#007AFF]/10 transition-all duration-300 hover:border-[#007AFF]/30"
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
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearFilters}
                  className="rounded-full px-5 py-2.5 border-gray-300 text-[#1D1D1F] hover:bg-gray-100 transition-all duration-300 hover:scale-105"
                >
                  <X className="h-4 w-4 mr-2 text-[#8E8E93]" />
                  Limpiar filtros
                </Button>
                
                <Button 
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] hover:from-[#0062CC] hover:to-[#4DB8EA] 
                    text-white px-5 py-2.5 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
                  onClick={applyFilters}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                  Aplicar filtros
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseFilters;