import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, TrendingUp, X } from 'lucide-react';
import { Category, Transaction } from '@/types';

interface IncomeFiltersProps {
  transactions: Transaction[];
  categories: Category[];
  onFilterChange: (filteredTransactions: Transaction[]) => void;
  onExportClick?: () => void;
}

const IncomeFilters = ({
  transactions,
  categories = [],
  onFilterChange,
  onExportClick,
}: IncomeFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Actualizar filtros cuando cambia cualquiera de las condiciones
  useEffect(() => {
    if (filtersApplied) {
      applyFilters();
    }
  }, [filtersApplied, selectedCategory, dateRange, priceRange]);

  // Filtrar las transacciones según los criterios
  const applyFilters = () => {
    // Solo procesar transacciones de tipo ingreso
    const incomeTransactions = transactions.filter((t) => t.type === "income");
    
    // Aplicar filtros
    const filtered = incomeTransactions.filter((transaction) => {
      // Filtro de categoría
      if (selectedCategory !== "all" && transaction.categoryId !== parseInt(selectedCategory)) {
        return false;
      }

      // Filtro de fecha de inicio
      if (dateRange.start && new Date(transaction.date) < new Date(dateRange.start)) {
        return false;
      }

      // Filtro de fecha final
      if (dateRange.end && new Date(transaction.date) > new Date(dateRange.end)) {
        return false;
      }

      // Filtro de precio mínimo
      if (priceRange.min && Number(transaction.amount) < Number(priceRange.min)) {
        return false;
      }

      // Filtro de precio máximo
      if (priceRange.max && Number(transaction.amount) > Number(priceRange.max)) {
        return false;
      }

      return true;
    });

    // Informar de los cambios
    onFilterChange(filtered);
    setFiltersApplied(true);
  };

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSelectedCategory("all");
    setDateRange({ start: "", end: "" });
    setPriceRange({ min: "", max: "" });
    setFiltersApplied(false);
    
    // Restaurar a todas las transacciones de tipo income
    const incomeTransactions = transactions.filter((t) => t.type === "income");
    onFilterChange(incomeTransactions);
  };

  return (
    <div>
      {/* Versión desktop del header (oculta en móvil) */}
      <div className="hidden sm:block bg-[#34C759] dark:bg-[#30BE54] rounded-2xl p-4 mb-5 shadow-md border border-[#34C759]/50 relative overflow-hidden transition-all duration-300">
        {/* Forma decorativa */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
        
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center">
            <div className="mr-3.5 p-2.5 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div className="flex flex-col justify-center h-[36px]">
              <span className="text-white font-semibold leading-none">
                Lista de Ingresos
                {filtersApplied && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-lg bg-white text-[#34C759] text-xs font-semibold shadow-sm ml-2">
                    ✓
                  </span>
                )}
              </span>
              <span className="text-white/80 text-[11px] font-medium mt-0.5">
                {filtersApplied ? 'Filtros personalizados aplicados' : 'Visualizando todos los ingresos'}
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            {/* Botón de exportar ingresos (visible siempre) */}
            {onExportClick && (
              <Button 
                variant="secondary" 
                size="sm"
                className="rounded-xl bg-white hover:bg-white/90 text-[#34C759] transition-all duration-200 shadow-sm px-4 py-2"
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
                  : "bg-white text-[#34C759] hover:bg-white/90"
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Ocultar filtros" : "Filtrar"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Versión móvil - solo el botón de filtrar en la esquina derecha */}
      <div className="sm:hidden mb-2 flex justify-end">
        <Button 
          variant="secondary" 
          size="sm"
          className="rounded-full bg-[#F5F5F5] hover:bg-gray-200 text-gray-700 transition-all duration-200 shadow-sm px-3 py-1.5"
          onClick={() => setShowFilters(!showFilters)}
        >
          {filtersApplied && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#34C759] text-white text-xs font-semibold mr-1.5">
              ✓
            </span>
          )}
          <span className="font-medium">{showFilters ? "Ocultar" : "Filtrar"}</span>
        </Button>
      </div>
      
      {showFilters && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-5 mb-5 relative overflow-hidden">
            {/* Barra superior verde */}
            <div className="absolute top-0 right-0 w-full h-1 bg-[#34C759]"></div>
            
            <h3 className="text-base font-medium text-[#1D1D1F] mb-4 flex items-center">
              <div className="mr-3 bg-[#34C759] p-1.5 rounded-lg text-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="20" x2="12" y2="10" />
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="16" />
                </svg>
              </div>
              Filtrar ingresos
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
                    <SelectTrigger className="w-full h-10 text-sm rounded-lg border-gray-200 focus:border-[#34C759] focus:ring-[#34C759]/10">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories
                        .filter(cat => cat.type === 'income')
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
                    className="h-10 text-sm w-full rounded-lg border-gray-200 focus:border-[#34C759] focus:ring-[#34C759]/10"
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
                    className="h-10 text-sm w-full rounded-lg border-gray-200 focus:border-[#34C759] focus:ring-[#34C759]/10"
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
                      className="h-10 text-sm w-full rounded-lg pl-7 border-gray-200 focus:border-[#34C759] focus:ring-[#34C759]/10"
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
                      className="h-10 text-sm w-full rounded-lg pl-7 border-gray-200 focus:border-[#34C759] focus:ring-[#34C759]/10"
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
                  className="rounded-xl bg-[#34C759] hover:bg-[#34C759]/90 text-white px-4 py-2 transition-all duration-200"
                  onClick={applyFilters}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
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

export default IncomeFilters;