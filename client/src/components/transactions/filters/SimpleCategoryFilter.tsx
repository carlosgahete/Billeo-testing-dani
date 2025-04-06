import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
}

interface CategoryFilterProps {
  categories: Category[] | undefined;
  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number | null) => void;
  isCategoryFilterActive: boolean;
  setIsCategoryFilterActive: (active: boolean) => void;
  currentTab: string;
}

/**
 * Componente simple para filtrar por categoría
 */
export function SimpleCategoryFilter({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  isCategoryFilterActive,
  setIsCategoryFilterActive,
  currentTab,
}: CategoryFilterProps) {
  return (
    <div>
      <Label htmlFor="category" className="font-medium block mb-2">Categoría</Label>
      <div className="flex flex-col space-y-3">
        <Select
          value={selectedCategoryId?.toString() || "all"}
          onValueChange={(value) => {
            if (value && value !== "all") {
              setSelectedCategoryId(parseInt(value));
              setIsCategoryFilterActive(true);
            } else {
              setSelectedCategoryId(null);
              setIsCategoryFilterActive(false);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Array.isArray(categories) && categories
              .filter(c => currentTab === 'all' || c.type === (currentTab === 'income' ? 'income' : 'expense'))
              .map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center">
                    <span className="mr-2">{category.icon || '📂'}</span>
                    <span>{category.name}</span>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableCategoryFilter"
            checked={isCategoryFilterActive}
            onChange={(e) => setIsCategoryFilterActive(e.target.checked)}
            className="h-4 w-4 mr-2"
          />
          <Label htmlFor="enableCategoryFilter" className="cursor-pointer text-sm">
            Activar filtro por categoría
          </Label>
        </div>
      </div>
    </div>
  );
}