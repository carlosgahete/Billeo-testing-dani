import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SimpleDateFilter } from "./SimpleDateFilter";
import { SimpleCategoryFilter } from "./SimpleCategoryFilter";
import { startOfMonth, endOfMonth } from "date-fns";
import { CheckCircle2 } from "lucide-react";

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
}

interface FilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  setDateRange: (dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
  isDateFilterActive: boolean;
  setIsDateFilterActive: (active: boolean) => void;
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  isCategoryFilterActive: boolean;
  setIsCategoryFilterActive: (active: boolean) => void;
  categories: Category[] | undefined;
  currentTab: string;
}

/**
 * Componente de diálogo para filtros que evita usar componentes con
 * problemas de superposición.
 */
export function FilterDialog({
  isOpen,
  onOpenChange,
  dateRange,
  setDateRange,
  isDateFilterActive,
  setIsDateFilterActive,
  selectedCategoryId,
  setSelectedCategoryId,
  isCategoryFilterActive,
  setIsCategoryFilterActive,
  categories,
  currentTab,
}: FilterDialogProps) {
  // Función para restablecer todos los filtros
  const resetFilters = () => {
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    });
    setSelectedCategoryId(null);
    setIsDateFilterActive(false);
    setIsCategoryFilterActive(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtrar transacciones</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Filtro de categoría */}
          <SimpleCategoryFilter
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            isCategoryFilterActive={isCategoryFilterActive}
            setIsCategoryFilterActive={setIsCategoryFilterActive}
            currentTab={currentTab}
          />

          {/* Filtro de fechas */}
          <SimpleDateFilter
            dateRange={dateRange}
            setDateRange={setDateRange}
            isDateFilterActive={isDateFilterActive}
            setIsDateFilterActive={setIsDateFilterActive}
          />
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={resetFilters}
          >
            Restablecer
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Aplicar filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}