import { useState, useRef, useEffect } from "react";
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
import { createPortal } from "react-dom";

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

interface FloatingFiltersProps {
  transactions: Transaction[];
  categories: Category[];
  onFilterChange: (filteredTransactions: Transaction[]) => void;
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const FloatingFilters = ({
  transactions,
  categories,
  onFilterChange,
  onClose,
  buttonRef
}: FloatingFiltersProps) => {
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>({
    start: null, 
    end: null
  });
  const [priceRange, setPriceRange] = useState<{min: string, max: string}>({
    min: '', 
    max: ''
  });
  const [position, setPosition] = useState({ top: 80, right: 20 });
  const [mounted, setMounted] = useState(false);
  
  // Montar el componente al DOM
  useEffect(() => {
    setMounted(true);
    
    // Calcular la posición del panel basada en el botón de referencia
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 10, // 10px de espacio
        right: window.innerWidth - rect.right - window.scrollX
      });
    }
    
    return () => setMounted(false);
  }, [buttonRef]);

  // Manejar clic fuera para cerrar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Aplicar filtros a las transacciones
  const applyFilters = () => {
    const filtered = transactions.filter(transaction => {
      // 1. Filtro por categoría
      if (selectedCategories.length > 0 && transaction.categoryId) {
        if (!selectedCategories.includes(transaction.categoryId)) {
          return false;
        }
      }
      
      // 2. Filtro por rango de fechas
      if (dateRange.start || dateRange.end) {
        const transactionDate = new Date(transaction.date);
        
        if (dateRange.start && transactionDate < dateRange.start) {
          return false;
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
    setSelectedCategories([]);
    setDateRange({ start: null, end: null });
    setPriceRange({ min: '', max: '' });
    onFilterChange([]);
  };

  // Renderizar el panel de filtros en un portal fijo
  const filterPanel = (
    <div 
      ref={filterPanelRef}
      className="fixed z-[1000] w-80 p-4 bg-white rounded-md shadow-xl border border-red-100 max-h-[90vh] overflow-y-auto"
      style={{ 
        top: `${position.top}px`, 
        right: `${position.right}px`,
      }}
    >
      <div className="text-base font-semibold mb-3 text-gray-700 flex justify-between items-center">
        <span>Filtrar gastos por:</span>
        <Button 
          onClick={onClose} 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full"
        >
          ✕
        </Button>
      </div>
      
      <div className="space-y-3">
        {/* Filtro de categorías */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Categorías
          </label>
          <Select 
            value={selectedCategories.length > 0 ? selectedCategories.join(',') : "all"} 
            onValueChange={(value) => {
              if (value === "all") {
                setSelectedCategories([]);
              } else {
                setSelectedCategories(value.split(',').map(id => parseInt(id)));
              }
            }}
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
                      <span className="mr-2" style={{color: category.color}}>{category.icon}</span>
                      {category.name}
                    </div>
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        
        {/* Filtro de fechas */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha desde
          </label>
          <Input
            type="date"
            className="h-9 text-sm w-full mb-2"
            value={dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              setDateRange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null
              });
            }}
          />
          
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha hasta
          </label>
          <Input
            type="date"
            className="h-9 text-sm w-full"
            value={dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              setDateRange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null
              });
            }}
          />
        </div>
        
        {/* Filtro de precios */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Importe mínimo (€)
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="h-9 text-sm w-full mb-2"
            value={priceRange.min}
            onChange={(e) => {
              setPriceRange({
                ...priceRange,
                min: e.target.value
              });
            }}
          />
          
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Importe máximo (€)
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
        
        {/* Botones de acción */}
        <div className="flex justify-between gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearFilters}
          >
            Limpiar
          </Button>
          
          <Button 
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={applyFilters}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
  
  // Usar createPortal para renderizar en un nodo fuera del DOM principal
  return mounted ? createPortal(filterPanel, document.body) : null;
};

export default FloatingFilters;