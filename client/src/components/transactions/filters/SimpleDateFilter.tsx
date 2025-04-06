import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface DateFilterProps {
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
}

/**
 * Un componente simple para filtrar por fecha que evita usar popovers
 * para los calendarios, lo que soluciona los problemas de superposición.
 */
export function SimpleDateFilter({
  dateRange,
  setDateRange,
  isDateFilterActive,
  setIsDateFilterActive,
}: DateFilterProps) {
  // Estado para controlar si se muestra el calendario o no
  const [showCalendars, setShowCalendars] = useState(false);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "No seleccionada";
    return format(date, "dd/MM/yyyy", { locale: es });
  };

  // Aplicar filtros predefinidos
  const applyCurrentMonth = () => {
    const now = new Date();
    setDateRange({
      from: startOfMonth(now),
      to: endOfMonth(now),
    });
    setIsDateFilterActive(true);
    setShowCalendars(false);
  };

  const applyPreviousMonth = () => {
    const prevMonth = subMonths(new Date(), 1);
    setDateRange({
      from: startOfMonth(prevMonth),
      to: endOfMonth(prevMonth),
    });
    setIsDateFilterActive(true);
    setShowCalendars(false);
  };

  return (
    <div className="border-t pt-4">
      <Label htmlFor="date-range" className="font-medium block mb-2">
        Rango de fechas
      </Label>

      <div className="space-y-4">
        {/* Resumen de fechas seleccionadas */}
        <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-md">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Desde:</span>
            <span className="text-sm">{formatDate(dateRange.from)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Hasta:</span>
            <span className="text-sm">{formatDate(dateRange.to)}</span>
          </div>
        </div>

        {/* Opciones rápidas */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={applyCurrentMonth}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Este mes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={applyPreviousMonth}
            className="flex-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Mes anterior
          </Button>
        </div>

        {/* Activar/desactivar filtro */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enableDateFilter"
            checked={isDateFilterActive}
            onChange={(e) => setIsDateFilterActive(e.target.checked)}
            className="h-4 w-4 mr-2"
          />
          <Label htmlFor="enableDateFilter" className="cursor-pointer text-sm">
            Activar filtro por fecha
          </Label>
        </div>

        {/* Input nativo de fechas - más compatible */}
        {isDateFilterActive && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label htmlFor="date-from" className="text-xs mb-1 block">
                Desde
              </Label>
              <input
                type="date"
                id="date-from"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : undefined;
                  setDateRange({
                    ...dateRange,
                    from: date,
                  });
                }}
              />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-xs mb-1 block">
                Hasta
              </Label>
              <input
                type="date"
                id="date-to"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const date = e.target.value
                    ? new Date(e.target.value)
                    : undefined;
                  setDateRange({
                    ...dateRange,
                    to: date,
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}