import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface Category {
  id: number;
  name: string;
  type?: "income" | "expense";
  color?: string;
  icon?: string;
}

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface PriceRange {
  min: string;
  max: string;
}

interface ExpenseFiltersProps {
  categories: Category[];
  selectedCategories: number[];
  setSelectedCategories: (categories: number[]) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  priceRange: PriceRange;
  setPriceRange: (range: PriceRange) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

export function ExpenseFilters({
  categories,
  selectedCategories,
  setSelectedCategories,
  dateRange,
  setDateRange,
  priceRange,
  setPriceRange,
  onApplyFilters,
  onClearFilters
}: ExpenseFiltersProps) {
  return (
    <div className="w-64 p-3 bg-white border-r border-red-100">
      <div className="text-sm font-medium mb-3 text-red-700">Filtrar gastos por:</div>
      
      <div className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClearFilters}
          >
            Limpiar filtros
          </Button>
          
          <Button 
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={onApplyFilters}
          >
            Aplicar filtros
          </Button>
        </div>
      </div>
    </div>
  );
}