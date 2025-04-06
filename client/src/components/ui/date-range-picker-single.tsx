import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Componente de selección de fecha simple que muestra un calendario
 * y permite seleccionar una única fecha.
 */
export function DatePickerSingle({
  date,
  setDate,
  label,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="grid gap-2">
      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`date-picker-${label.toLowerCase().replace(/\s+/g, "-")}`}
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "PPP", { locale: es })
            ) : (
              <span>Seleccionar fecha</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 z-[9999]"
          align="start"
          onEscapeKeyDown={() => setIsOpen(false)}
          onInteractOutside={() => setIsOpen(false)}
        >
          <div 
            className="bg-white p-2 rounded-md shadow-lg"
            style={{ zIndex: 9999 }}
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                // Cerrar el popover cuando se seleccione una fecha
                setTimeout(() => setIsOpen(false), 100);
              }}
              locale={es}
              initialFocus
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DateRangePickerProps {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  setDateRange: React.Dispatch<
    React.SetStateAction<{
      from: Date | undefined;
      to: Date | undefined;
    }>
  >;
  disabled?: boolean;
}

/**
 * Componente que implementa un selector de rango de fechas mediante
 * dos selectores de fecha individual, uno para la fecha de inicio
 * y otro para la fecha de fin.
 */
export function DateRangePickerSeparate({
  dateRange,
  setDateRange,
  disabled = false,
}: DateRangePickerProps) {
  // Handlers para actualizar las fechas del rango
  const handleFromChange = (date: Date | undefined) => {
    setDateRange((prev) => ({ ...prev, from: date }));
  };

  const handleToChange = (date: Date | undefined) => {
    setDateRange((prev) => ({ ...prev, to: date }));
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <span className="text-sm font-medium mb-1 block">Desde</span>
        <DatePickerSingle
          date={dateRange.from}
          setDate={handleFromChange}
          label="Desde"
          disabled={disabled}
        />
      </div>
      <div>
        <span className="text-sm font-medium mb-1 block">Hasta</span>
        <DatePickerSingle
          date={dateRange.to}
          setDate={handleToChange}
          label="Hasta"
          disabled={disabled}
        />
      </div>
    </div>
  );
}