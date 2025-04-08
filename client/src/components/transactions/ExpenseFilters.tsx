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
      <div className="bg-[#FF9F0A] dark:bg-[#FF9500] rounded-2xl p-4 mb-5 shadow-md border border-[#FF9F0A]/50 relative overflow-hidden transition-all duration-300">
        {/* Forma decorativa */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center">
            <div className="mr-3.5 p-2.5 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF9F0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div className="-mt-1.5">
              <h2 className="text-white font-semibold text-xl">
                Lista de Gastos
                {filtersApplied && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-lg bg-white text-[#FF9F0A] text-xs font-semibold shadow-sm ml-2">
                    ✓
                  </span>
                )}
              </h2>
              <p className="text-white/80 text-xs font-medium -mt-0.5">
                {filtersApplied ? 'Filtros personalizados aplicados' : 'Visualizando todos los gastos'}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {/* Botón de exportar gastos (visible siempre) */}
            {onExportClick && (
              <Button 
                variant="secondary" 
                size="sm"
                className="rounded-xl bg-white hover:bg-white/90 text-[#FF9F0A] transition-all duration-200 shadow-sm px-4 py-2"
                onClick={onExportClick}
              >
                <FileDown className="h-4 w-4 mr-2" />
                <span className="font-medium">Exportar</span>
              </Button>
            )}
            
            <Button 
              variant="secondary" 
              size="sm"
              className={`rounded-xl transition-all duration-200 px-4 py-2 shadow-sm ${
                showFilters 
                  ? "bg-white/20 text-white border border-white/40 hover:bg-white/30" 
                  : "bg-white text-[#FF9F0A] hover:bg-white/90"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar filtros" : "Filtrar"}
            </Button>
          </div>
        </div>
      </div>
      
      {showFilters && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-5 mb-5 relative overflow-hidden">
            {/* Barra superior naranja */}
            <div className="absolute top-0 right-0 w-full h-1 bg-[#FF9F0A]"></div>
            
            <h3 className="text-base font-medium text-[#1D1D1F] mb-4 flex items-center">
              <div className="mr-3 bg-[#FF9F0A] p-1.5 rounded-lg text-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
                </svg>
              </div>
              Filtrar gastos
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
                    <SelectTrigger className="w-full h-10 text-sm rounded-lg border-gray-200 focus:border-[#FF9F0A] focus:ring-[#FF9F0A]/10">
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
                    className="h-10 text-sm w-full rounded-lg border-gray-200 focus:border-[#FF9F0A] focus:ring-[#FF9F0A]/10"
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
                    className="h-10 text-sm w-full rounded-lg border-gray-200 focus:border-[#FF9F0A] focus:ring-[#FF9F0A]/10"
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
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8E8E93] flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-10 text-sm w-full rounded-lg pl-7 border-gray-200 focus:border-[#FF9F0A] focus:ring-[#FF9F0A]/10"
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
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#8E8E93] flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Sin límite"
                      className="h-10 text-sm w-full rounded-lg pl-7 border-gray-200 focus:border-[#FF9F0A] focus:ring-[#FF9F0A]/10"
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
                  className="rounded-xl px-4 py-2 border-gray-300 text-[#1D1D1F] hover:bg-gray-100 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Limpiar
                </Button>
                
                <Button 
                  size="sm"
                  className="rounded-xl bg-[#FF9F0A] hover:bg-[#FF9F0A]/90 text-white px-4 py-2 transition-all duration-200"
                  onClick={applyFilters}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
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